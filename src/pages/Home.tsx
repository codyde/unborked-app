import { useEffect, useState } from 'react';
import ProductCard from '../components/ProductCard';
import { Product } from '../types';
import { productService } from '../services/api';
import AdvancedSearch from '../components/AdvancedSearch';
import { useFeatureFlags } from '../context/FeatureFlagsContext';

function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { flags } = useFeatureFlags();

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

  useEffect(() => {
    fetchProducts();
  }, []);

  // Sentry is configured but examples are removed

  return (
    <>
      {/* Hero Section */}
      <div className="relative h-[600px] overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1555099962-4199c345e5dd?w=1600)',
            filter: 'brightness(0.6)'
          }}
        />
        <div className="relative max-w-7xl mx-auto h-full flex items-center px-4">
          <div className="max-w-xl">
            <h1 className="text-6xl font-bold text-white mb-6 leading-tight">
              Buggy code happens; Unbork it
            </h1>
            <p className="text-2xl text-gray-200 mb-8">
              Stop screaming in the void and pushing angry commit messages; get back to shipping good vibes today.
            </p>
            <button className="bg-red-500 text-black px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-black transition-colors duration-300">
              Shop Solutions
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-16 px-4">

        <h2 className="text-3xl font-bold text-center mb-12">
          Featured Products
        </h2>
        {flags.ADVANCED_FILTERING && (
          <div className="max-w-3xl mx-auto">
            <AdvancedSearch />
          </div>
        )}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <h2 className="text-2xl font-bold mb-4">Error</h2>
            <p className="text-red-500">{error}</p>
            <button 
              onClick={fetchProducts}
              className="mt-4 bg-black text-white px-4 py-2 rounded hover:bg-red-500 hover:text-black"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            data-testid="product-grid"
          >
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

export default Home;
