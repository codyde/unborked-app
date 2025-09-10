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
    
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    
    // Call payment vault service to retrieve encrypted payment data
    const response = await fetch(`${API_BASE_URL}/api/payment-vault/retrieve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa('demo:demo123'),
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
    
    // Extract payment method from vault response
    if (vaultData.success && vaultData.encryptedPaymentData) {
      // Decrypt the payment data (this is where the bug occurs)
      logger.info('Decrypting stored payment method');
      
      try {
        // FIXED: Correct property access to vaultData.encryptedPaymentData
        const encryptedData = vaultData.encryptedPaymentData;
        
        if (!encryptedData) {
          logger.warn('No encrypted payment data found in vault response');
          return null;
        }
        
        // FIXED: For demo purposes, simulate decryption by using mock data
        // In a real app, this would decrypt the encryptedCardData
        logger.info(`Decrypting card data with keyId: ${encryptedData.keyId}`);
        
        // Mock decrypted payment data (in real app, this would come from decryption service)
        // BUG: Developer accidentally used wrong property names from API response
        const decryptedPayment = {
          card_number: '4532123456789012', // Wrong: should be cardNumber
          expiry_month: 12, // Wrong: should be expiryMonth
          expiry_year: 2027, // Wrong: should be expiryYear
          security_code: '123', // Wrong: should be cvv
          cardholder_name: 'John Doe' // Wrong: should be cardholderName
        };
        
        logger.info('Payment method decrypted successfully');
        return decryptedPayment;
        
      } catch (decryptionError) {
        logger.error('Failed to decrypt payment method', { error: decryptionError as Error });
        
        // Capture this decryption failure to Sentry
        Sentry.withScope((scope) => {
          scope.setTag('service', 'payment-vault');
          scope.setTag('operation', 'decrypt-payment-methods');
          scope.setContext('user_context', {
            userId: context.userId,
            username: context.username,
            transactionAmount: context.total
          });
          Sentry.captureException(decryptionError);
        });
        
        return null;
      }
    }
    
    logger.warn('Invalid vault response format');
    return null;
    
  } catch (error) {
    logger.error('Failed to retrieve payment details', { error: error as Error });
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
