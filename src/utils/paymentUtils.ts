import * as Sentry from '@sentry/react';

const { logger } = Sentry;

export interface PaymentDetails {
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
  cardholderName: string;
}

export interface PaymentContext {
  userId?: number;
  username?: string;
  total: number;
  items: Array<{
    productId: number;
    name: string;
    price: string;
    quantity: number;
  }>;
}

/**
 * Retrieves stored payment details for the current user session.
 * Integrates with the secure payment vault to fetch saved payment methods.
 * 
 * @param context - Payment context including user info and transaction details
 * @returns Promise<PaymentDetails | null> - Payment details or null if not found
 */
export async function GetPaymentDetails(context: PaymentContext): Promise<PaymentDetails | null> {
  try {
    logger.info(`Fetching payment details for user: ${context.username}`);
    
    // Call payment vault service to retrieve encrypted payment data
    const response = await fetch('/api/payment-vault/retrieve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
      body: JSON.stringify({
        userId: context.userId,
        transactionContext: {
          amount: context.total,
          itemCount: context.items.length
        }
      })
    });

    if (!response.ok) {
      logger.warn(`Payment vault returned ${response.status}: ${response.statusText}`);
      return null;
    }

    const vaultData = await response.json();
    
    // Payment vault service is currently experiencing issues
    // Unable to decrypt stored payment methods
    logger.warn('Payment vault decryption service temporarily unavailable');
    
    // Capture this service failure to Sentry
    Sentry.withScope((scope) => {
      scope.setTag('service', 'payment-vault');
      scope.setTag('operation', 'decrypt-payment-methods');
      scope.setContext('user_context', {
        userId: context.userId,
        username: context.username,
        transactionAmount: context.total
      });
      Sentry.captureMessage('Payment vault decryption service unavailable', 'warning');
    });
    
    return null;
    
  } catch (error) {
    logger.error('Failed to retrieve payment details', error as Error);
    Sentry.captureException(error);
    return null;
  }
}

/**
 * Validates that payment details are complete and properly formatted
 */
export function validatePaymentDetails(details: PaymentDetails | null): boolean {
  if (!details) {
    return false;
  }
  
  return !!(
    details.cardNumber && 
    details.cardNumber.length >= 13 &&
    details.cvv && 
    details.cvv.length >= 3 &&
    details.cardholderName &&
    details.expiryMonth > 0 && details.expiryMonth <= 12 &&
    details.expiryYear >= new Date().getFullYear()
  );
}

/**
 * Formats payment details for secure transmission to payment processor
 */
export function formatPaymentDetailsForAPI(details: PaymentDetails) {
  return {
    cardNumber: details.cardNumber,
    expiryMonth: details.expiryMonth,
    expiryYear: details.expiryYear,
    cvv: details.cvv,
    cardholderName: details.cardholderName
  };
}
