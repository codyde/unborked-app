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
    
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const VAULT_API_KEY = import.meta.env.VITE_PAYMENT_VAULT_API_KEY;
    
    if (!API_BASE_URL || !VAULT_API_KEY) {
      throw new Error('Payment vault configuration missing');
    }
    
    const response = await fetch(`${API_BASE_URL}/api/payment-vault/retrieve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': VAULT_API_KEY,
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
    
    if (vaultData.success && vaultData.encryptedPaymentData) {
      logger.info('Decrypting stored payment method');
      
      try {
        const encryptedData = vaultData.encryptedPaymentData;
        
        if (!encryptedData) {
          logger.warn('No encrypted payment data found in vault response');
          return null;
        }
        
        logger.info(`Decrypting card data with keyId: ${encryptedData.keyId}`);
        
        const decryptionResponse = await fetch(`${API_BASE_URL}/api/payment-vault/decrypt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': VAULT_API_KEY,
          },
          body: JSON.stringify({
            encryptedData: encryptedData.encryptedCardData,
            keyId: encryptedData.keyId,
            algorithm: encryptedData.algorithm
          })
        });

        if (!decryptionResponse.ok) {
          throw new Error(`Decryption service failed: ${decryptionResponse.statusText}`);
        }

        const decryptionResult = await decryptionResponse.json();
        
        if (!decryptionResult.success || !decryptionResult.decryptedPayment) {
          throw new Error('Failed to decrypt payment method');
        }
        
        const decryptedPayment = {
          cardNumber: decryptionResult.decryptedPayment.card_number,
          expiryMonth: decryptionResult.decryptedPayment.expiry_month,
          expiryYear: decryptionResult.decryptedPayment.expiry_year,
          cvv: decryptionResult.decryptedPayment.security_code,
          cardholderName: decryptionResult.decryptedPayment.card_holder_name
        };
        
        logger.info('Payment method decrypted successfully');
        return decryptedPayment;
        
      } catch (decryptionError) {
        logger.error('Failed to decrypt payment method', { error: decryptionError as Error });
        
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

export function formatPaymentDetailsForAPI(details: PaymentDetails) {
  return {
    cardNumber: details.cardNumber,
    expiryMonth: details.expiryMonth,
    expiryYear: details.expiryYear,
    cvv: details.cvv,
    cardholderName: details.cardholderName
  };
}
