import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { CartItem } from '../types';
import * as Sentry from '@sentry/react';
import { useAuth } from './AuthContext'; 
import { useFeatureFlags } from './FeatureFlagsContext'; 

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: string } 
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } } 
  | { type: 'CLEAR_CART' }
  | { type: 'SET_CART'; payload: CartItem[] }; 

interface CartContextType {
  state: CartState;
  dispatch: (action: CartAction) => void;
}

const CartContext = createContext<CartContextType | null>(null);

const { info, warn, error: logError, fmt } = Sentry.logger;

const cartReducer = (state: CartState, action: CartAction): CartState => {
  info(fmt`Cart Action: ${action.type}`);
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.id === action.payload.id);
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + action.payload.quantity }
              : item
          ),
        };
      }
      return { ...state, items: [...state.items, action.payload] };
    }
    case 'REMOVE_ITEM': {
      info(fmt`Cart Action: REMOVE_ITEM - Product ID: ${action.payload}`);
      return {
        ...state,
        items: state.items.filter(item => String(item.id) !== String(action.payload)),
      };
    }
    case 'UPDATE_QUANTITY': {
      const idToUpdate = String(action.payload.id);
      info(fmt`Cart Action: UPDATE_QUANTITY - Product ID: ${idToUpdate}, New Quantity: ${action.payload.quantity}`);
      return {
        ...state,
        items: state.items.map(item =>
          String(item.id) === idToUpdate
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      };
    }
    case 'CLEAR_CART':
      info('Cart Action: CLEAR_CART');
      return { ...state, items: [] };
    case 'SET_CART': 
      info(fmt`Reducer SET_CART: Received payload: ${JSON.stringify(action.payload)}`);
      return { ...state, items: action.payload };
    default:
      return state;
  }
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''; // Default to empty string if not set
const API_ENDPOINT = `${API_BASE_URL}/api/v2/cart`; 

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  const { isAuthenticated, token, user } = useAuth();
  const { flags, isInitialized } = useFeatureFlags(); 

  const initialLoadDone = useRef(false);
  const isSaving = useRef(false); // Keep track of save in progress
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for debouncing saves

  useEffect(() => {
    const loadCart = async () => {
      if (!isInitialized) {
        return; 
      }

      if (isAuthenticated && flags.CARTAPI_V2 && token && !initialLoadDone.current) {
        try {
          const response = await fetch(API_ENDPOINT, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();

            if (data && data.cartData) {
              const validatedItems: CartItem[] = (data.cartData as any[]).map(item => ({
                ...item,
                quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
              }));
              dispatch({ type: 'SET_CART', payload: validatedItems });
              info(fmt`Cart loaded successfully from API for user: ${user?.username}`);
            } else {
              dispatch({ type: 'SET_CART', payload: [] });
            }
            initialLoadDone.current = true; 
          } else if (response.status === 404) {
            info(fmt`No cart found on server for user: ${user?.username}. Starting with empty cart.`);
            dispatch({ type: 'SET_CART', payload: [] }); 
            initialLoadDone.current = true; 
          } else {
            warn(fmt`Failed to load cart from API. Status: ${response.status}. User: ${user?.username}`);
          }
        } catch (err: any) {
          logError(fmt`Error loading cart from API: ${err?.message}`, { stack: err?.stack, errorObject: err });
        }
      } else if (!flags.CARTAPI_V2) {
        initialLoadDone.current = true; 
      } else if (!isAuthenticated) {
        if (state.items.length > 0) { // Only dispatch if cart isn't already empty
          dispatch({ type: 'SET_CART', payload: [] }); 
        }
        initialLoadDone.current = false; // Reset flag for next login
      }
    };

    loadCart();
  }, [isAuthenticated, flags, token, user?.id, isInitialized]); 

  const saveCartToServer = async () => {
    if (!isAuthenticated || !flags.CARTAPI_V2 || !token || isSaving.current) {
      return;
    }

    isSaving.current = true;
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ cartData: state.items }),
      });

      if (!response.ok) {
        warn(fmt`saveCartToServer: Failed. Status: ${response.status}. User: ${user?.username}`);
      } else {
        info(fmt`saveCartToServer: Success. User: ${user?.username}`);
      }
    } catch (err: any) {
      logError(fmt`saveCartToServer: Error saving cart. User: ${user?.username}, Error: ${err.message}`, { stack: err.stack, errorObject: err });
    } finally {
      isSaving.current = false;
    }
  };

  const dispatchWithSave = (action: CartAction) => {
    dispatch(action);
  };

  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (initialLoadDone.current && flags.CARTAPI_V2 && isAuthenticated && token) {
      saveTimeoutRef.current = setTimeout(() => {
        saveCartToServer();
      }, 500); 
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.items, initialLoadDone.current, flags.CARTAPI_V2, isAuthenticated, token]); 

  return (
    <CartContext.Provider value={{ state, dispatch: dispatchWithSave }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return { state: context.state, dispatch: context.dispatch }; 
};