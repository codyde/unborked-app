import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingCart, ArrowLeft } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { productService } from '../services/api';
import * as Sentry from '@sentry/react';
import { useFeatureFlags } from '../context/FeatureFlagsContext';

const { info, fmt } = Sentry.logger;

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { dispatch } = useCart();
  const { flags } = useFeatureFlags();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        if (!id) return;
        setLoading(true);
        const data = await productService.getProductById(parseInt(id));
        setProduct(data);
        setError(null);
      } catch (err) {
        setError('Failed to load product details. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleAddToCart = () => {
    if (product) {
      info(fmt`Adding product ID: ${product.id} (Name: ${product.name}) to cart from ProductDetail`);
      dispatch({
        type: 'ADD_ITEM',
        payload: { ...product, quantity: 1 },
      });
    } else {
      // Optionally log if add is attempted when product isn't loaded
      // warn("Attempted to add to cart, but product details not loaded.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#39ff14]"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold mb-4">Error</h2>
        <p className="text-red-500">{error || 'Product not found'}</p>
        <Link to="/" className="inline-block mt-4 text-[#39ff14] hover:underline">
          Back to Products
        </Link>
      </div>
    );
  }

  const isV2 = flags.UNBORKED_V2;
  const outerCls = isV2 ? 'container mx-auto px-4 py-8 text-[#00FFF1]' : 'container mx-auto px-4 py-8';
  const backLinkCls = isV2 ? 'inline-flex items-center text-[#FF003C] hover:underline mb-6' : 'inline-flex items-center text-[#39ff14] hover:underline mb-6';
  const cardCls = isV2 ? 'rounded-md overflow-hidden lg:flex border border-[#00FFF1] bg-[#0D0221]' : 'bg-white rounded-lg shadow-lg overflow-hidden lg:flex';
  const titleCls = isV2 ? 'text-3xl font-bold mb-4 text-[#00FFF1]' : 'text-3xl font-bold mb-4';
  const descCls = isV2 ? 'text-[#7DF9FF] text-lg mb-6' : 'text-gray-700 text-lg mb-6';
  const chipCls = isV2 ? 'inline-block border border-[#00FFF1] rounded-full px-3 py-1 text-sm font-semibold text-[#00FFF1] mb-4' : 'inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mb-4';
  const priceCls = isV2 ? 'text-3xl font-bold text-[#FF003C]' : 'text-3xl font-bold';
  const btnCls = isV2 ? 'bg-[#00FFF1] text-[#0D0221] px-6 py-3 rounded-lg flex items-center space-x-2 hover:bg-[#7DF9FF] transition-colors' : 'bg-[#1a1a2e] text-white px-6 py-3 rounded-lg flex items-center space-x-2 hover:bg-[#39ff14] hover:text-[#1a1a2e] transition-colors';
  const dividerCls = isV2 ? 'border-t border-[#00FFF1] pt-6' : 'border-t border-gray-200 pt-6';
  const sectionTitleCls = isV2 ? 'text-lg font-semibold mb-3 text-[#00FFF1]' : 'text-lg font-semibold mb-3';

  return (
    <div className={outerCls}>
      <Link to="/" className={backLinkCls}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Products
      </Link>
      <div className={cardCls}>
        <div className="lg:w-1/2">
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-8 lg:w-1/2">
          <h1 className={titleCls}>{product.name}</h1>
          {product.category && (
            <span className={chipCls}>
              {product.category}
            </span>
          )}
          <p className={descCls}>{product.description}</p>
          <div className="flex items-center justify-between mb-8">
            <span className={priceCls}>${product.price}</span>
            <button
              onClick={handleAddToCart}
              className={btnCls}
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Add to Cart</span>
            </button>
          </div>
          <div className={dividerCls}>
            <h3 className={sectionTitleCls}>Why You Need This</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>Saves hours of debugging time</li>
              <li>Works with all major programming languages</li>
              <li>Increases your coding productivity</li>
              <li>Reduces frustration and stress</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
