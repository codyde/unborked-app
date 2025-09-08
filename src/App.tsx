import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import Home from './pages/Home';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Register from './pages/Register';
import ProductDetail from './pages/ProductDetail';
import FeatureFlags from './pages/FeatureFlags';
import { useSentryToolbar } from '@sentry/toolbar'
import { FeatureFlagAdapter } from './utils/featureFlags';
import { FeatureFlagsProvider, useFeatureFlags } from './context/FeatureFlagsContext';
import { useMemo, useEffect } from 'react';
// Import V2 components
import { 
  HeaderV2, 
  CartV2, 
  LoginV2, 
  RegisterV2, 
  ProductDetailV2 
} from './components/v2';
// Import the dedicated HomeV2 page
import HomeV2 from './pages/HomeV2';
import VersionIndicator from './components/VersionIndicator';

// Get a single instance of the adapter
const featureFlagAdapter = FeatureFlagAdapter();

// Create a component for the V2 cyberpunk tech design
function AppV2() {
  // Dynamically load the required Google Fonts for the cyberpunk theme
  useEffect(() => {
    // Add Google Fonts for cyberpunk theme
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Rajdhani:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(link);
    
    return () => {
      // Clean up on unmount
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0D0221] text-gray-300 relative">
      {/* Animated circuit pattern background */}
      <div className="fixed inset-0 bg-[#0D0221] overflow-hidden opacity-10 pointer-events-none">
        {/* Circuit grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCI+CjxyZWN0IHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgZmlsbD0ibm9uZSIgLz4KPHBhdGggZD0iTTAgMCBMNTAgNTAgTTUwIDAgTDAgNTAgTTI1IDAgTDI1IDUwIE0wIDI1IEw1MCAyNSIgc3Ryb2tlPSIjMDBGRkYxIiBzdHJva2Utd2lkdGg9IjAuNSIvPgo8L3N2Zz4=')] bg-size-[50px_50px]"></div>
        
        {/* Hexagons */}
        <div className="absolute top-20 left-20 w-40 h-40 border border-[#00FFF1]/30 rotate-45"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 border border-[#FF003C]/30 rotate-45"></div>
        <div className="absolute top-1/2 right-1/3 w-20 h-20 border border-[#7DF9FF]/30 rotate-45"></div>
        
        {/* Horizontal scan line effect */}
        <div className="absolute top-0 left-0 right-0 h-px bg-[#00FFF1]/50 animate-scan-line"></div>
      </div>
      
      <HeaderV2 />
      <Routes>
        <Route path="/" element={<HomeV2 />} />
        <Route path="/cart" element={<CartV2 />} />
        <Route path="/login" element={<LoginV2 />} />
        <Route path="/register" element={<RegisterV2 />} />
        <Route path="/product/:id" element={<ProductDetailV2 />} />
        <Route path="/flags" element={<FeatureFlags />} />
      </Routes>
      <VersionIndicator />
    </div>
  );
}

// Create a component for the original design
function AppV1() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/flags" element={<FeatureFlags />} />
      </Routes>
      <VersionIndicator />
    </div>
  );
}

// Conditional app renderer that checks the feature flag
function AppRenderer() {
  const { flags } = useFeatureFlags();
  
  return flags.UNBORKED_V2 ? <AppV2 /> : <AppV1 />;
}

// Separate Sentry toolbar component to prevent re-renders
function SentryToolbarIntegration() {
  // Use Sentry toolbar integration with the singleton adapter
  useSentryToolbar({
    enabled: true,
    initProps: {
      organizationSlug: 'buildwithcode',
      projectIdOrSlug: 'unborked',
      featureFlags: featureFlagAdapter,
    },
  });
  
  return null;
}

// Move adapter creation inside the component to ensure it's created after flags are initialized
function App() {
  return (
    <BrowserRouter>
      <FeatureFlagsProvider>
        <SentryToolbarIntegration />
        <AuthProvider>
          <CartProvider>
            <AppRenderer />
          </CartProvider>
        </AuthProvider>
      </FeatureFlagsProvider>
    </BrowserRouter>
  );
}

export default App;