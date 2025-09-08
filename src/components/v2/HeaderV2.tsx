import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bug, ShoppingCart, Menu, X, LogIn, LogOut, User } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

const HeaderV2: React.FC = () => {
  const { state } = useCart();
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const itemCount = state.items.reduce((acc, item) => acc + item.quantity, 0);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsProfileMenuOpen(false);
  };

  return (
    <header className="bg-[#0D0221] py-4 px-6 sticky top-0 z-50 border-b border-[#00FFF1]/30">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 group">
          <div className="w-10 h-10 bg-[#0D0221] flex items-center justify-center border border-[#00FFF1] rounded group-hover:border-[#FF003C] transition-colors duration-300 relative">
            <Bug className="w-6 h-6 text-[#00FFF1] group-hover:text-[#FF003C] transition-colors duration-300" />
            {/* Glow effect */}
            <div className="absolute inset-0 rounded bg-[#00FFF1]/20 group-hover:bg-[#FF003C]/20 blur-xs -z-10"></div>
          </div>
          <span className="text-2xl font-bold text-[#00FFF1] group-hover:text-[#FF003C] transition-colors duration-300">UNBORKED</span>
        </Link>
        
        {isMenuOpen && (
          <nav className="absolute top-full left-0 right-0 bg-[#0D0221] p-4 border-b border-[#00FFF1]/30">
            {/* Mobile menu items can be added here if needed */}
          </nav>
        )}

        <div className="flex items-center space-x-4">
          <Link
            to="/cart"
            className="relative p-2.5 bg-[#0D0221] border border-[#00FFF1] hover:border-[#FF003C] transition-colors duration-300 group"
          >
            <ShoppingCart className="w-6 h-6 text-[#00FFF1] group-hover:text-[#FF003C] transition-colors duration-300" />
            {/* Glow effect */}
            <div className="absolute inset-0 bg-[#00FFF1]/10 group-hover:bg-[#FF003C]/10 -z-10 blur-xs"></div>
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-[#FF003C] text-white border border-[#FF003C] w-6 h-6 flex items-center justify-center text-xs font-bold">
                {itemCount}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <div className="relative">
              <button
                className="flex items-center space-x-1 text-[#00FFF1] bg-[#0D0221] border border-[#00FFF1] px-4 py-1.5 hover:text-[#FF003C] hover:border-[#FF003C] transition-colors duration-300 group"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              >
                <User className="w-5 h-5" />
                <span className="hidden md:block">{user?.username}</span>
                {/* Glow effect */}
                <div className="absolute inset-0 bg-[#00FFF1]/10 group-hover:bg-[#FF003C]/10 -z-10 blur-xs"></div>
              </button>
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#0D0221] border border-[#00FFF1] py-1 text-[#00FFF1] z-50">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center px-4 py-2 text-sm hover:bg-[#00FFF1]/10 hover:text-[#FF003C]"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    LOGOUT
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center space-x-1 text-[#00FFF1] bg-[#0D0221] border border-[#00FFF1] px-4 py-1.5 hover:text-[#FF003C] hover:border-[#FF003C] transition-colors duration-300 group relative"
            >
              <LogIn className="w-5 h-5" />
              <span className="hidden md:block">LOGIN</span>
              {/* Glow effect */}
              <div className="absolute inset-0 bg-[#00FFF1]/10 group-hover:bg-[#FF003C]/10 -z-10 blur-xs"></div>
            </Link>
          )}

          <button 
            className="md:hidden bg-[#0D0221] border border-[#00FFF1] p-1.5 hover:border-[#FF003C] transition-colors duration-300 group relative"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-[#00FFF1] group-hover:text-[#FF003C]" />
            ) : (
              <Menu className="w-6 h-6 text-[#00FFF1] group-hover:text-[#FF003C]" />
            )}
            {/* Glow effect */}
            <div className="absolute inset-0 bg-[#00FFF1]/10 group-hover:bg-[#FF003C]/10 -z-10 blur-xs"></div>
          </button>
        </div>
      </div>
    </header>
  );
};

export default HeaderV2; 