import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { useAuth } from '../context/AuthContext';

const { info, fmt } = Sentry.logger;

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { dispatch } = useCart();
  const { user } = useAuth();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (user) {
      info(fmt`User '${user.username}' added item '${product.name}' (ID: ${product.id}) to cart.`);
    } else {
      info(fmt`Guest added item '${product.name}' (ID: ${product.id}) to cart.`);
    }

    info(fmt`Adding product ID: ${product.id} (Name: ${product.name}) to cart from ProductCard`);
    dispatch({
      type: 'ADD_ITEM',
      payload: { ...product, quantity: 1 },
    });
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:scale-105 cursor-pointer"
      data-testid="product-card" 
    >
      <Link 
        to={`/product/${product.id}`}
        className="block no-underline text-inherit"
      >
        <div 
          className="relative"
        >
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-48 object-cover"
          />
          <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-opacity" />
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-2 truncate">{product.name}</h3>
          <p className="text-gray-600 mb-4">${parseFloat(product.price).toFixed(2)}</p>
        </div>
      </Link>
      {user && (
        <div className="px-4 pb-4 flex justify-end">
          <button 
            onClick={handleAddToCart}
            data-testid="add-to-cart-button"
            className="inline-flex items-center space-x-2 bg-[#1a1a2e] text-white py-2 px-4 rounded hover:bg-[#39ff14] hover:text-[#1a1a2e] transition-colors duration-200"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            <span>Add to Cart</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductCard;