import { useEffect, useState } from 'react';
import { Product } from '../types';
import { productService } from '../services/api';
import { CyberpunkHero, CyberpunkCard, CyberpunkFeaturedProducts } from '../components/v2';
import AdvancedSearch from '../components/AdvancedSearch';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import { useNavigate } from 'react-router-dom';

function HomeV2() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { flags } = useFeatureFlags();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await productService.getProducts();
        setProducts(data);
        setError(null);
      } catch (err) {
        setError('Failed to load products. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Handle navigation to product detail
  const handleProductClick = (productId: number) => {
    navigate(`/product/${productId}`);
  };

  // Format products for CyberpunkCard component
  const formatProducts = () => {
    return products.map(product => ({
      title: product.name,
      price: `$${product.price}`,
      image: product.image,
      onClick: () => handleProductClick(product.id)
    }));
  };

  return (
    <div className="w-full">
      {/* Use the cyberpunk hero component */}
      <CyberpunkHero />

      {/* Show products using the cyberpunk card components */}
      {flags.ADVANCED_FILTERING && (
        <div className="container mx-auto px-6 mt-6">
          <AdvancedSearch />
        </div>
      )}
      {loading ? (
        <div className="flex justify-center items-center h-64 mt-8">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border border-[#00FFF1] animate-pulse"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#00FFF1] font-mono text-xs">LOADING</div>
          </div>
        </div>
      ) : error ? (
        <div className="container mx-auto px-6 py-16 text-center">
          <div className="border border-[#FF003C] p-8 relative">
            <div className="absolute top-0 left-0 w-5 h-5 border-t border-l border-[#FF003C]"></div>
            <div className="absolute top-0 right-0 w-5 h-5 border-t border-r border-[#FF003C]"></div>
            <div className="absolute bottom-0 left-0 w-5 h-5 border-b border-l border-[#FF003C]"></div>
            <div className="absolute bottom-0 right-0 w-5 h-5 border-b border-r border-[#FF003C]"></div>
            
            <h3 className="text-[#FF003C] uppercase font-['Orbitron',sans-serif] mb-4">ERROR.DETECTED</h3>
            <p className="text-gray-300 mb-6">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="cybr-btn py-2 px-4"
            >
              RETRY.SEQUENCE
            </button>
          </div>
        </div>
      ) : (
        <CyberpunkFeaturedProducts products={formatProducts()} />
      )}
    </div>
  );
}

export default HomeV2; 
