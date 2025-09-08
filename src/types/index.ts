export interface Product {
  id: number;
  name: string;
  price: string;
  description: string;
  image: string;
  category?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface FeatureFlags {
  cryptoPayment: boolean;
  classicCash: boolean;
}

export interface User {
  id: number;
  username: string;
}

export interface Purchase {
  id: number;
  userId: number;
  items: CartItem[];
  total: string;
  createdAt: string;
}