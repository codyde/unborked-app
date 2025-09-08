import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bug, ShoppingCart, Menu, X, LogIn, LogOut, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const Header: React.FC = () => {
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
    <header className="bg-black text-white py-4 px-6 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 hover:text-red-500 transition-colors">
          <Bug className="w-8 h-8 text-red-500" />
          <span className="text-2xl font-bold">Unborked</span>
        </Link>
        
        {/* Removed Home menu item - logo now serves as home link */}
        {isMenuOpen && (
          <nav className="absolute top-full left-0 right-0 bg-black p-4">
            {/* Mobile menu items can be added here if needed */}
          </nav>
        )}

        <div className="flex items-center space-x-4">
          <Link
            to="/cart"
            className="relative hover:text-red-500 transition-colors p-2"
            data-testid="header-cart-button"
          >
            <ShoppingCart className="w-6 h-6" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-black rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {itemCount}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <div className="relative">
              <button
                className="flex items-center space-x-1 hover:text-red-500 transition-colors"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              >
                <User className="w-5 h-5" />
                <span className="hidden md:block">{user?.username}</span>
              </button>
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 text-black z-50">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center space-x-1 hover:text-red-500 transition-colors"
            >
              <LogIn className="w-5 h-5" />
              <span className="hidden md:block">Login</span>
            </Link>
          )}

          <button 
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;