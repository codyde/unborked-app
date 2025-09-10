import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Minus, Plus, Trash2, CreditCard, ShoppingBag, AlertTriangle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { purchaseService } from '../services/api';
import * as Sentry from '@sentry/react';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import { GetPaymentDetails, formatPaymentDetailsForAPI, PaymentDetails } from '../utils/paymentUtils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const { debug, info, warn, error, fmt } = Sentry.logger;

function Cart() {
  const { state, dispatch } = useCart();
  const { isAuthenticated, token } = useAuth();
  const navigate = useNavigate();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<number | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const { flags } = useFeatureFlags();

  const updateQuantity = (id: string, quantity: number) => {
    info(fmt`Updating quantity for item ID: ${id} to ${quantity}`);
    if (quantity < 1) {
      dispatch({ type: 'REMOVE_ITEM', payload: id });
    } else {
      dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
    }
  };

  const removeItem = (id: string) => {
    info(fmt`Removing item ID: ${id} from cart`);
    dispatch({ type: 'REMOVE_ITEM', payload: id });
  };

  const subtotal = state.items.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const handleCheckout = async () => {
    info('Checkout process initiated');
    if (!isAuthenticated) {
      warn('Checkout attempt failed: User not authenticated.');
      navigate('/login', { state: { from: '/cart' } });
      return;
    }

    info(fmt`User ${isAuthenticated ? 'is' : 'is not'} authenticated. Token ${token ? 'present' : 'absent'}.`)

    setIsCheckingOut(true);
    setCheckoutError(null);
    setTransactionId(null); // Reset transaction ID on new attempt
    setCheckoutSuccess(false); // Reset success state

    try {
      // Format cart items according to the API's expected structure
      const formattedItems = state.items.map(item => ({
        productId: typeof item.id === 'string' ? parseInt(item.id) : item.id, // Ensure ID is number if needed by API
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }));

      const purchaseData = {
        items: formattedItems,
        total: total.toFixed(2)
      };

      debug(fmt`Sending purchase data to API for user token: ${token ? '...' : 'N/A'}`, purchaseData);

      const response = await purchaseService.createPurchase(
        purchaseData.items,
        purchaseData.total,
        token! // Token is checked via isAuthenticated above
      );

      info(fmt`Checkout successful. Purchase ID: ${response.purchase.id}`);
      // Store transaction ID and show success message
      setTransactionId(response.purchase.id);
      setCheckoutSuccess(true);

      // Clear cart
      dispatch({ type: 'CLEAR_CART' }); // Already logged in reducer
    } catch (err: any) {
      error(fmt`Checkout error: ${err.message}`, { stack: err.stack, errorObject: err });
      setCheckoutError(err.message || 'Failed to process checkout');
    } finally {
      info('Checkout process finished.');
      setIsCheckingOut(false);
    }
  };

  const handleOneClickCheckout = async () => {
    info('BorkedPay one-click checkout initiated');
    if (!isAuthenticated) {
      warn('One-click failed: User not authenticated.');
      navigate('/login', { state: { from: '/cart' } });
      return;
    }
    setIsCheckingOut(true);
    setCheckoutError(null);
    
    // Declare paymentDetails outside try block to avoid scoping issues in catch block
    let paymentDetails: PaymentDetails | null = null;
    
    try {
      const formattedItems = state.items.map(item => ({
        productId: typeof item.id === 'string' ? parseInt(item.id) : item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }));

      // Retrieve stored payment details for this user
      info('Retrieving payment details for one-click checkout');
      const storedUser = localStorage.getItem('user');
      const userData = storedUser ? JSON.parse(storedUser) : null;
      
      paymentDetails = await GetPaymentDetails({
        userId: userData?.id || 211, // Use stored user ID, fallback to demo user ID
        username: userData?.username || 'unknown',
        total: total,
        items: formattedItems
      });

      const response = await fetch(`${API_BASE_URL}/api/checkout/borkedpay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          items: formattedItems, 
          total: total.toFixed(2),
          paymentMethod: 'card',
          payment: {
            type: 'card',
            details: paymentDetails ? formatPaymentDetailsForAPI(paymentDetails) : undefined
          }
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || response.statusText);
      }

      // Handle successful checkout
      const result = await response.json();
      info(fmt`BorkedPay checkout successful: ${result.transaction_id}`);
      
      // Set success state and transaction details
      setCheckoutSuccess(true);
      setTransactionId(result.transaction_id);
      
      // Clear the cart after successful purchase
      dispatch({ type: 'CLEAR_CART' });
    } catch (err: any) {
      error(fmt`One-click checkout error: ${err.message}`, { stack: err.stack, errorObject: err });
      
      // Capture the checkout error to Sentry with additional context
      Sentry.withScope((scope) => {
        scope.setTag('checkout_type', 'borkedpay');
        scope.setTag('payment_method', 'card');
        scope.setContext('checkout_details', {
          total: total.toFixed(2),
          itemCount: state.items.length,
          hasPaymentDetails: !!paymentDetails
        });
        Sentry.captureException(err);
      });
      
      setCheckoutError(err.message || 'One-click checkout failed');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (checkoutSuccess) {
    return (
      <div className="max-w-7xl mx-auto py-16 px-4">
        <div className="text-center">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6 inline-flex items-center mx-auto">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span className="font-medium">Order placed successfully!</span>
          </div>
          <h2 className="text-2xl font-bold mb-4">Thank you for your purchase</h2>
          <p className="text-gray-600 mb-2">Your transaction ID: <span className="font-semibold">#{transactionId}</span></p>
          <p className="text-gray-600 mb-8">We've sent you a confirmation email with your order details.</p>
          <Link
            to="/"
            className="bg-[#1a1a2e] text-white px-6 py-3 rounded-lg hover:bg-[#39ff14] hover:text-[#1a1a2e] transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (state.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto py-16 px-4">
        <div className="text-center">
          <ShoppingBag className="w-24 h-24 mx-auto text-gray-300 mb-6" />
          <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
          <p className="text-gray-600 mb-8">Looks like your cart needs unborking!</p>
          <Link
            to="/"
            className="bg-[#1a1a2e] text-white px-6 py-3 rounded-lg hover:bg-[#39ff14] hover:text-[#1a1a2e] transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  const containerCls = flags.UNBORKED_V2 ? 'max-w-7xl mx-auto py-16 px-4 text-[#00FFF1]' : 'max-w-7xl mx-auto py-16 px-4';
  const panelCls = flags.UNBORKED_V2
    ? 'bg-[#0D0221] border border-[#00FFF1] rounded-md p-6 h-fit'
    : 'bg-white rounded-lg shadow-md p-6 h-fit';
  const btnPrimaryCls = flags.UNBORKED_V2
    ? 'w-full mt-6 bg-[#00FFF1] text-[#0D0221] py-3 rounded-lg flex items-center justify-center space-x-2 hover:bg-[#7DF9FF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
    : 'w-full mt-6 bg-[#1a1a2e] text-white py-3 rounded-lg flex items-center justify-center space-x-2 hover:bg-[#39ff14] hover:text-[#1a1a2e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className={containerCls}>
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
      
      {checkoutError && (
        <div className={flags.UNBORKED_V2 ? 'border border-[#FF003C] text-[#FF003C] px-4 py-3 rounded mb-6 flex items-center bg-transparent' : 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 flex items-center'}>
          <AlertTriangle className="w-5 h-5 mr-2" />
          <span>{checkoutError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {state.items.map((item) => (
            <div
              key={item.id}
              className={flags.UNBORKED_V2 ? 'rounded-md border border-[#00FFF1] p-6 mb-4 flex items-center bg-[#0D0221] text-[#00FFF1]' : 'bg-white rounded-lg shadow-md p-6 mb-4 flex items-center'}
              data-testid="cart-item"
            >
              <img
                src={item.image}
                alt={item.name}
                className="w-24 h-24 object-cover rounded"
              />
              <div className="ml-6 grow">
                <h3 className={flags.UNBORKED_V2 ? 'text-lg font-semibold text-[#00FFF1]' : 'text-lg font-semibold'}>{item.name}</h3>
                <p className={flags.UNBORKED_V2 ? 'text-[#7DF9FF]' : 'text-gray-600'}>${item.price}</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateQuantity(item.id.toString(), item.quantity - 1)}
                    className={flags.UNBORKED_V2 ? 'p-1 hover:text-[#FF003C]' : 'p-1 hover:text-[#39ff14]'}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id.toString(), item.quantity + 1)}
                    className={flags.UNBORKED_V2 ? 'p-1 hover:text-[#FF003C]' : 'p-1 hover:text-[#39ff14]'}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.id.toString())}
                  className={flags.UNBORKED_V2 ? 'text-[#FF003C] hover:text-[#ff315a]' : 'text-red-500 hover:text-red-700'}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className={panelCls}>
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (10%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleCheckout}
            disabled={isCheckingOut}
            data-testid="checkout-button"
            className={btnPrimaryCls}
          >
            <CreditCard className="w-5 h-5" />
            <span>{isCheckingOut ? 'Processing...' : 'Checkout'}</span>
          </button>

          {flags.EXPERIMENTAL_CHECKOUT && (
            <button
              onClick={handleOneClickCheckout}
              disabled={isCheckingOut}
              className={flags.UNBORKED_V2 ? 'w-full mt-3 bg-[#FF003C] text-white py-3 rounded-lg hover:bg-[#ff315a] transition-colors disabled:opacity-50' : 'w-full mt-3 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50'}
            >
              One‑Click with BorkedPay
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Cart;
