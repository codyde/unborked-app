import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as Sentry from '@sentry/node';

interface AuthRequest extends Request {
  user?: {
    userId: number;
    username: string;
    [key: string]: unknown;
  };
}

interface PaymentRequest {
  amount: number;
  currency: string;
  customer_id: number;
  payment_method: string;
  items: Array<{ id: string; quantity: number }>;
}

interface GatewayConfig {
  endpoint: string;
  api_key: string | undefined;
  test_mode: boolean;
}

interface PaymentResult {
  status: string;
  decline_code?: string;
  transaction_id?: string;
  receipt_url?: string;
  message?: string;
}

interface CheckoutPayload {
  items: Array<{ id: string; quantity: number }>;
  total: number;
  paymentMethod?: string;
  paymentDetails?: {
    cardNumber: string;
    expiryMonth: number;
    expiryYear: number;
    cvv: string;
    cardholderName: string;
  };
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

const router = express.Router();
const { logger } = Sentry;

router.post('/borkedpay', authenticateToken, async (req: AuthRequest, res: Response) => {
  return await Sentry.startSpan(
    {
      op: 'checkout.process',
      name: 'Process Checkout Payment',
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

        const { items, total, paymentMethod, paymentDetails, billingAddress, shippingAddress } = req.body || {};
        if (!Array.isArray(items) || !total) {
          span?.setAttributes({ 'error': true, 'error.type': 'validation_failed' });
          return res.status(400).json({ error: 'Invalid checkout payload' });
        }

        logger.info(logger.fmt`Processing payment for user ${req.user.username}, amount: ${total}`);
        
       
        await new Promise((r) => setTimeout(r, Math.random() * 500 + 200));

        logger.info('Starting checkout payload validation');
        validateCheckoutPayload({ items, total, paymentMethod, paymentDetails, billingAddress, shippingAddress });
        logger.info('Checkout payload validation completed successfully');

        const paymentRequest = {
          amount: total,
          currency: 'USD',
          customer_id: req.user.userId,
          payment_method: paymentMethod || 'card',
          items: items.map(item => ({ id: item.id, quantity: item.quantity })),
          billing_address: billingAddress,
          shipping_address: shippingAddress
        };

        const gatewayConfig = {
          endpoint: 'https://api-test.paymentgateway.com/v1/charges',
          api_key: process.env.PAYMENT_GATEWAY_TEST_KEY, 
          test_mode: true 
        };

        let paymentResult;
        try {
          paymentResult = await processPayment(paymentRequest, gatewayConfig);
        } catch (networkError: unknown) {
          if ((networkError as { code?: string }).code === 'ECONNREFUSED') {
            span?.setAttributes({ 'error': true, 'error.type': 'gateway_unreachable' });
            return res.status(503).json({ error: 'Payment service temporarily unavailable' });
          }
          throw networkError;
        }

        if (paymentResult.status !== 'approved') {
          const errorCode = paymentResult.decline_code || 'card_declined';
          const errorMessage = getPaymentErrorMessage(errorCode);
          
          span?.setAttributes({ 
            'error': true, 
            'error.type': 'payment_declined', 
            'payment.decline_code': errorCode 
          });
          
          logger.warn(logger.fmt`Payment declined for user ${req.user.username}: ${errorCode}`);
          
          return res.status(402).json({ 
            error: errorMessage, 
            code: errorCode,
            retry_allowed: isRetryableError(errorCode)
          });
        }

        return res.json({ 
          success: true, 
          transaction_id: paymentResult.transaction_id,
          receipt_url: paymentResult.receipt_url 
        });

      } catch (err: unknown) {
        const errorMessage = (err as Error)?.message || 'Unknown error';
        logger.error(logger.fmt`Checkout error caught: ${errorMessage}`, { stack: (err as Error)?.stack });
        span?.setAttributes({ 'error': true, 'error.message': errorMessage });
        
        Sentry.withScope((scope) => {
          scope.setTag('endpoint', 'checkout');
          scope.setTag('user_id', req.user?.userId);
          scope.setLevel('error');
          Sentry.captureException(err);
        });
        
        return res.status(500).json({ error: errorMessage });
      }
    }
  );
});

// Mock payment processing function that simulates real gateway behavior
async function processPayment(request: PaymentRequest, config: GatewayConfig): Promise<PaymentResult> {
  // Test mode processing - simulate successful payment
  if (config.test_mode) {
    return {
      status: 'approved',
      transaction_id: 'test_txn_' + Math.random().toString(36).substr(2, 9),
      receipt_url: '/receipts/test_' + Math.random().toString(36).substr(2, 9)
    };
  }
  
  // Production logic would be here
  return {
    status: 'approved',
    transaction_id: 'txn_' + Math.random().toString(36).substr(2, 9),
    receipt_url: '/receipts/' + Math.random().toString(36).substr(2, 9)
  };
}

function getPaymentErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'insufficient_funds': 'Your card has insufficient funds for this transaction.',
    'card_declined': 'Your card was declined. Please try a different payment method.',
    'expired_card': 'Your card has expired. Please update your payment information.',
    'invalid_cvc': 'The security code you entered is invalid.',
    'processing_error': 'There was an error processing your payment. Please try again.'
  };
  return messages[code] || 'Your payment could not be processed. Please try again.';
}

function isRetryableError(code: string): boolean {
  const retryableCodes = ['processing_error', 'temporary_decline'];
  return retryableCodes.includes(code);
}

// Validates checkout payload to ensure all required fields are present
function validateCheckoutPayload(payload: CheckoutPayload): void {
  // Basic validation
  if (!payload.items || payload.items.length === 0) {
    throw new Error('Items are required for checkout');
  }
  
  if (!payload.total || payload.total <= 0) {
    throw new Error('Valid total amount is required');
  }

  // Payment method validation
  const validPaymentMethods = ['card', 'paypal', 'apple_pay', 'google_pay'];
  if (payload.paymentMethod && !validPaymentMethods.includes(payload.paymentMethod)) {
    throw new Error(`Invalid payment method: ${payload.paymentMethod}`);
  }

  // Payment details validation for card payments
  if (payload.paymentMethod === 'card' || !payload.paymentMethod) {
    if (!payload.paymentDetails) {
      throw new Error('Payment details are required for card payments');
    }

    // Validate required payment fields
    if (!payload.paymentDetails.cardNumber || payload.paymentDetails.cardNumber.length < 13) {
      throw new Error('Invalid card number format');
    }
    if (!payload.paymentDetails.cvv || payload.paymentDetails.cvv.length < 3) {
      throw new Error('Invalid security code format');
    }
    if (!payload.paymentDetails.cardholderName) {
      throw new Error('Cardholder name is required');
    }
    if (!payload.paymentDetails.expiryMonth || payload.paymentDetails.expiryMonth < 1 || payload.paymentDetails.expiryMonth > 12) {
      throw new Error('Invalid expiry date');
    }
  }

  // Shipping address validation
  if (payload.shippingAddress && !payload.shippingAddress.zipCode) {
    throw new Error('Shipping address must include zip code');
  }

  // Item validation
  for (const item of payload.items) {
    const itemId = (item as any).id || (item as any).productId;
    if (!itemId || item.quantity <= 0) {
      throw new Error('All items must have valid ID and quantity');
    }
  }
}

export default router;


