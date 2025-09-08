import { Product, User, Purchase } from '../types';
import { getCurrentFlagMap } from '../utils/featureFlags';
import * as Sentry from '@sentry/react';

// Use environment variable for base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'; // Fallback if not set

// Authentication Services
export const authService = {
  login: async (username: string, password: string): Promise<{ token: string; user: User }> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    return response.json();
  },

  register: async (username: string, password: string): Promise<{ message: string; userId: number }> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    return response.json();
  },
};

// Product Services
export const productService = {
  getProducts: async (): Promise<Product[]> => {
    // Check the feature flag using the central utility
    const flags = await getCurrentFlagMap();
    const useGoodsQuery = flags['GOODS_PRODUCTQUERY'] as boolean ?? false; // Check the new flag
    const useV2Query = flags['STOREQUERY_V2'] as boolean ?? false; // Existing flag check

    let productsEndpoint: string;
    let flagUsed: string;

    if (useGoodsQuery) {
      productsEndpoint = `${API_BASE_URL}/api/product-query`;
      flagUsed = `GOODS_PRODUCTQUERY=${useGoodsQuery}`;
    } else {
      productsEndpoint = useV2Query ? `${API_BASE_URL}/api/products/v2` : `${API_BASE_URL}/api/products`;
      flagUsed = `STOREQUERY_V2=${useV2Query}`;
    }

    console.log(`Fetching products using endpoint: ${productsEndpoint} (${flagUsed})`);

    const response = await fetch(productsEndpoint);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})); // Try to get error details
      Sentry.captureException(new Error(`Failed to fetch products from ${productsEndpoint}: ${errorData.error || response.statusText}`));
      throw new Error(`Failed to fetch products from ${productsEndpoint}: ${errorData.error || response.statusText}`);
    }

    return response.json();
  },

  getProductById: async (id: number): Promise<Product> => {
    const response = await fetch(`${API_BASE_URL}/api/products/${id}`);

    if (!response.ok) {
      throw new Error('Failed to fetch product');
    }

    return response.json();
  },
};

// Purchase Services
export const purchaseService = {
  createPurchase: async (items: any[], total: string, token: string): Promise<{ message: string; purchase: Purchase }> => {
    const response = await fetch(`${API_BASE_URL}/api/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ items, total }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Purchase failed');
    }

    return response.json();
  },

  getPurchaseHistory: async (token: string): Promise<Purchase[]> => {
    const response = await fetch(`${API_BASE_URL}/api/purchases`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch purchase history');
    }

    return response.json();
  },
};