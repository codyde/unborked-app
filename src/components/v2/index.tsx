import React from 'react';
import HeaderV2 from './HeaderV2';
// We'll create placeholder components for now and implement them later as needed
import Cart from '../../pages/Cart';
import Login from '../../pages/Login';
import Register from '../../pages/Register';
import ProductDetail from '../../pages/ProductDetail';

// Updated CyberpunkContainer without borders around main content
const CyberpunkContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-full relative">
    {/* Circuit pattern background - global, lower opacity */}
    <div className="fixed inset-0 w-full h-full overflow-hidden opacity-5 pointer-events-none">
      <div className="absolute inset-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCI+CjxyZWN0IHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgZmlsbD0ibm9uZSIgLz4KPHBhdGggZD0iTTAgMCBMNTAgNTAgTTUwIDAgTDAgNTAgTTI1IDAgTDI1IDUwIE0wIDI1IEw1MCAyNSIgc3Ryb2tlPSIjMDBGRkYxIiBzdHJva2Utd2lkdGg9IjAuNSIvPgo8L3N2Zz4=')] bg-size-[50px_50px]"></div>
    </div>
    
    {/* Hexagon accents */}
    <div className="fixed bottom-20 right-10 w-40 h-40 border border-[#FF003C]/20 rotate-45 pointer-events-none"></div>
    <div className="fixed top-40 left-10 w-20 h-20 border border-[#00FFF1]/20 rotate-45 pointer-events-none"></div>
    
    <div className="relative z-10 text-gray-200 font-['Rajdhani',sans-serif]">
      {children}
    </div>
  </div>
);

// Cyberpunk Product Card Component
const CyberpunkCard: React.FC<{
  title: string;
  price: string;
  image?: string;
  onClick?: () => void;
}> = ({ title, price, image, onClick }) => (
  <div 
    onClick={onClick}
    className="cybr-card relative overflow-hidden group cursor-pointer h-full transition-all duration-300 hover:scale-[1.02]"
  >
    <div className="bg-[#0D0221] border border-[#00FFF1] h-full pb-4">
      {/* Top corner accents */}
      <div className="absolute top-0 left-0 w-5 h-5 border-t border-l border-[#00FFF1]"></div>
      <div className="absolute top-0 right-0 w-5 h-5 border-t border-r border-[#00FFF1]"></div>
      
      {/* Bottom corner accents */}
      <div className="absolute bottom-0 left-0 w-5 h-5 border-b border-l border-[#00FFF1]"></div>
      <div className="absolute bottom-0 right-0 w-5 h-5 border-b border-r border-[#00FFF1]"></div>
      
      {/* Decorative elements */}
      <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#FF003C]"></div>
      <div className="h-48 bg-gray-800 relative mb-3 overflow-hidden">
        {image && <img src={image} alt={title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />}
        
        {/* Overlay decoration */}
        <div className="absolute inset-0 bg-linear-to-t from-[#0D0221] to-transparent opacity-70"></div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-[#00FFF1]"></div>
        <div className="absolute top-2 left-2 text-xs text-[#00FFF1] font-mono">ID://0x{Math.floor(Math.random() * 10000).toString().padStart(4, '0')}</div>
      </div>
      
      <div className="px-4">
        <h3 className="text-[#00FFF1] text-lg font-bold tracking-wide uppercase">{title}</h3>
        <div className="flex justify-between items-center mt-2">
          <div className="text-[#FF003C] font-mono font-bold">{price}</div>
          <div className="relative">
            <button className="cybr-btn text-xs py-1 px-3">SELECT</button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Hero content for the home page
const CyberpunkHero: React.FC = () => {
  // Function to scroll to products section
  const scrollToProducts = () => {
    const productsSection = document.getElementById('featured-products');
    if (productsSection) {
      productsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full relative">
      {/* Full-width hero container */}
      <div className="relative w-full bg-[#0D0221] overflow-hidden">
        {/* Hero image with overlay */}
        <div className="relative h-[70vh] w-full">
          <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1555099962-4199c345e5dd?w=1600)',
            filter: 'brightness(0.5)'
          }}></div>
          <div className="absolute inset-0 bg-linear-to-r from-[#0D0221] via-[#0D0221]/70 to-transparent"></div>
          
          {/* Accent lines */}
          <div className="absolute bottom-0 left-0 w-full h-px bg-[#00FFF1]"></div>
          <div className="absolute top-1/2 right-0 w-20 h-px bg-[#FF003C]"></div>
          
          {/* Hero content */}
          <div className="absolute inset-0 flex items-center">
            <div className="container mx-auto px-6">
              <div className="max-w-2xl">
                <h1 className="text-5xl font-bold text-white tracking-tight mb-2 uppercase font-['Orbitron',sans-serif]">
                  Buggy code happens; Unbork it
                </h1>
                <h2 className="text-3xl font-bold text-[#FF003C] mb-4 font-['Orbitron',sans-serif]">with Developer Swag</h2>
                <p className="text-gray-300 mb-8 max-w-md">
                  Stop screaming in the void and pushing angry commit messages; get back to shipping good vibes today.
                </p>
                <button 
                  className="cybr-btn py-3 px-8 text-md"
                  onClick={scrollToProducts}
                >
                  SHOP SOLUTIONS
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Featured products section
const CyberpunkFeaturedProducts: React.FC<{products: any[]}> = ({ products }) => (
  <div id="featured-products" className="container mx-auto px-6 py-16">
    <div className="mb-10 flex items-center">
      <div className="w-2 h-10 bg-[#FF003C] mr-4"></div>
      <h2 className="text-3xl font-bold text-white uppercase font-['Orbitron',sans-serif] tracking-wide">Featured Products</h2>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {products.map((product, index) => (
        <CyberpunkCard 
          key={index} 
          title={product.title} 
          price={product.price} 
          image={product.image}
          onClick={product.onClick}
        />
      ))}
    </div>
  </div>
);

// Wrapper components with cyberpunk styling
const HomeV2: React.FC = () => (
  <CyberpunkContainer>
    {/* We're not using the HomeV2 component directly here anymore */}
    {/* The App.tsx will render our HomeV2 page directly */}
    <div className="w-full"></div>
  </CyberpunkContainer>
);

const CartV2: React.FC = () => (
  <CyberpunkContainer>
    <div className="container mx-auto px-6 py-10">
      <div className="mb-6 flex items-center">
        <div className="w-2 h-8 bg-[#FF003C] mr-4"></div>
        <h1 className="text-2xl font-bold text-white uppercase font-['Orbitron',sans-serif]">Shopping Cart</h1>
      </div>
      <Cart />
    </div>
  </CyberpunkContainer>
);

const LoginV2: React.FC = () => (
  <CyberpunkContainer>
    <div className="container mx-auto px-6 py-10">
      <div className="mb-6 flex items-center">
        <div className="w-2 h-8 bg-[#FF003C] mr-4"></div>
        <h1 className="text-2xl font-bold text-white uppercase font-['Orbitron',sans-serif]">Login</h1>
      </div>
      <Login />
    </div>
  </CyberpunkContainer>
);

const RegisterV2: React.FC = () => (
  <CyberpunkContainer>
    <div className="container mx-auto px-6 py-10">
      <div className="mb-6 flex items-center">
        <div className="w-2 h-8 bg-[#FF003C] mr-4"></div>
        <h1 className="text-2xl font-bold text-white uppercase font-['Orbitron',sans-serif]">Register</h1>
      </div>
      <Register />
    </div>
  </CyberpunkContainer>
);

const ProductDetailV2: React.FC = () => (
  <CyberpunkContainer>
    <div className="container mx-auto px-6 py-10">
      <div className="mb-6 flex items-center">
        <div className="w-2 h-8 bg-[#FF003C] mr-4"></div>
        <h1 className="text-2xl font-bold text-white uppercase font-['Orbitron',sans-serif]">Product Details</h1>
      </div>
      <ProductDetail />
    </div>
  </CyberpunkContainer>
);

export {
  HeaderV2,
  HomeV2,
  CartV2,
  LoginV2,
  RegisterV2,
  ProductDetailV2,
  CyberpunkCard,
  CyberpunkHero,
  CyberpunkFeaturedProducts
}; 