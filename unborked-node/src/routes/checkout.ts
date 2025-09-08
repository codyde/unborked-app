import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as Sentry from '@sentry/node';

interface AuthRequest extends Request {
  user?: {
    userId: number;
    username: string;
    [key: string]: any;
  };
}

const router = express.Router();
const { logger } = Sentry;

// Simulated one-click checkout via BorkedPay (intentionally fails realistically)
router.post('/borkedpay', authenticateToken, async (req: AuthRequest, res: Response) => {
  return await Sentry.startSpan(
    {
      op: 'checkout.borkedpay',
      name: 'BorkedPay One-Click Checkout',
      attributes: {
        endpoint: '/checkout/borkedpay',
        method: 'POST',
      }
    },
    async (span) => {
      try {
        if (!req.user) {
          span?.setAttributes({ 'error': true, 'error.type': 'unauthorized' });
          return res.status(401).json({ error: 'User not authenticated' });
        }

        const { items, total } = req.body || {};
        if (!Array.isArray(items) || !total) {
          span?.setAttributes({ 'error': true, 'error.type': 'validation_failed' });
          return res.status(400).json({ error: 'Invalid checkout payload' });
        }

        // Simulate a gateway interaction and return a realistic failure
        logger.info(logger.fmt`Submitting BorkedPay charge for user ${req.user.username}`);
        await new Promise((r) => setTimeout(r, 250));

        // Intentionally fail with a payment-like status and error
        const failure = {
          code: 'card_declined',
          message: 'BorkedPay gateway declined the charge (3DS verification failed).',
          decline_reason: 'do_not_honor',
          status: 402,
        };
        span?.setAttributes({ 'error': true, 'error.type': 'payment_declined', 'payment.code': failure.code });
        Sentry.captureMessage('BorkedPay decline: do_not_honor', { level: 'warning' });
        return res.status(402).json({ error: failure.message, code: failure.code, reason: failure.decline_reason });
      } catch (err: any) {
        span?.setAttributes({ 'error': true, 'error.message': err?.message || 'Unknown error' });
        Sentry.captureException(err);
        return res.status(500).json({ error: 'Checkout failed unexpectedly' });
      }
    }
  );
});

export default router;

