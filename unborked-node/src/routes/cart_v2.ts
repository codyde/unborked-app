import express, { Request, Response } from 'express';
import { db } from '../db';
import { userCarts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';
import * as Sentry from '@sentry/node';

// Define interface for authorized request with user
interface AuthRequest extends Request {
  user?: {
    userId: number;
    username: string;
    [key: string]: any;
  };
}

const router = express.Router();
const { logger } = Sentry;    

// GET user cart
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  return await Sentry.startSpan(
    {
      op: 'cart.get',
      name: 'Get User Cart V2',
      attributes: {
        'endpoint': '/v2/cart',
        'method': 'GET'
      }
    },
    async (span) => {
      logger.info(logger.fmt`Attempting to get cart for username: ${req.user?.username || 'N/A'}`);
      try {
        if (!req.user) {
          logger.warn('Get cart failed: User not authenticated.');
          span?.setAttributes({ 'error': true, 'error.type': 'unauthorized' });
          return res.status(401).json({ error: 'User not authenticated' });
        }
        const userId = req.user.userId;
        span?.setAttribute('user.id', userId);

        logger.info(logger.fmt`Fetching cart for user ${userId} from database`);
        const cart = await db.select()
          .from(userCarts)
          .where(eq(userCarts.userId, userId))
          .limit(1);

        if (cart.length === 0) {
          logger.info(logger.fmt`No cart found for user ${userId}. Returning empty cart.`);
          span?.setAttribute('cart.found', false);
          return res.json({ cartData: [] }); // Return empty array if no cart exists
        }

        span?.setAttribute('cart.found', true);
        logger.info(logger.fmt`Successfully fetched cart for user ID: ${userId}`);
        res.json({ cartData: cart[0].cartData });

      } catch (err: any) {
        logger.error(logger.fmt`Error fetching cart for user ${req.user?.username || 'N/A'}: ${err.message}`, { stack: err.stack });
        span?.setAttributes({ 'error': true, 'error.message': err.message });
        Sentry.captureException(err);
        res.status(500).json({ error: 'Failed to fetch cart' });
      }
    }
  );
});

// POST (Upsert) user cart
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  return await Sentry.startSpan(
    {
      op: 'cart.save',
      name: 'Save User Cart V2',
      attributes: {
        'endpoint': '/v2/cart',
        'method': 'POST'
      }
    },
    async (span) => {
      logger.info(logger.fmt`Attempting to save cart for username: ${req.user?.username || 'N/A'}`);
      try {
        if (!req.user) {
          logger.warn('Save cart failed: User not authenticated.');
          logger.debug(logger.fmt`Cache miss for user`, { userId: 123 });
          span?.setAttributes({ 'error': true, 'error.type': 'unauthorized' });
          return res.status(401).json({ error: 'User not authenticated' });
        }
        const userId = req.user.userId;
        span?.setAttribute('user.id', userId);

        const { cartData } = req.body;

        if (!cartData) {
          logger.warn(logger.fmt`Save cart failed for user ${userId}: Missing cartData.`);
          span?.setAttributes({ 'error': true, 'error.type': 'validation_failed' });
          return res.status(400).json({ error: 'cartData is required' });
        }

        if (!Array.isArray(cartData)) { // Add a check to ensure it's an array
          logger.warn(logger.fmt`Save cart failed for user ${userId}: cartData is not an array.`);
          span?.setAttributes({ 'error': true, 'error.type': 'validation_failed', 'received_type': typeof cartData });
          return res.status(400).json({ error: 'cartData must be an array' });
        }

        logger.info(logger.fmt`Upserting cart for user ${userId} in database`);
        const result = await db.insert(userCarts)
          .values({
            userId: userId,
            cartData: cartData,
            updatedAt: new Date() // Explicitly set updatedAt on insert
          })
          .onConflictDoUpdate({
            target: userCarts.userId,
            set: {
              cartData: cartData,
              updatedAt: new Date()
            }
          })
          .returning();

        span?.setAttribute('cart.saved', true);
        logger.info(logger.fmt`Successfully saved cart for user ID: ${userId}`);
        res.status(200).json({ message: 'Cart saved successfully', cart: result[0] });

      } catch (err: any) {
        logger.error(logger.fmt`Error saving cart for user ${req.user?.username || 'N/A'}: ${err.message}`, { stack: err.stack });
        span?.setAttributes({ 'error': true, 'error.message': err.message });
        Sentry.captureException(err);
        res.status(500).json({ error: 'Failed to save cart' });
      }
    }
  );
});

export default router;
