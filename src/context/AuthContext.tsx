import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/api';
import * as Sentry from '@sentry/react';

// Only destructure used logger functions
const { info, error: logError, fmt } = Sentry.logger;

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Attempt to load user from localStorage if token exists
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const response = await authService.login(username, password);
      console.log(`Login successful for: ${username}`)
      setUser(response.user);
      setToken(response.token);
      setIsAuthenticated(true);
      
      // --- Set Sentry user context ---
      info(fmt`Setting Sentry user context (frontend) for: ${response.user.username}`);
      Sentry.setUser({
        id: response.user.id,
        username: response.user.username
      });
      // -----------------------------

      // Store in localStorage
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      info(fmt`Login successful for: ${response.user.username}`);
    } catch (err: any) {
      logError(fmt`Login error for ${username}: ${err?.message}`, { stack: err?.stack, errorObject: err });
      setAuthError(err?.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, password: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      await authService.register(username, password);
      // After registration, log the user in
      await login(username, password);
    } catch (err: any) {
      logError(fmt`Registration error: ${err?.message}`, { stack: err?.stack, errorObject: err });
      setAuthError(err?.message || 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // --- Clear Sentry user context ---
    Sentry.setUser(null);
    info('Cleared Sentry user context on logout.'); // Add log
    // --------------------------------

    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const value = {
    user,
    token,
    isAuthenticated,
    isLoading,
    error: authError,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};