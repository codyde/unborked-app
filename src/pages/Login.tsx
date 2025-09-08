import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFeatureFlags } from '../context/FeatureFlagsContext';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || '/';
  const { flags } = useFeatureFlags();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const outerCls = flags.UNBORKED_V2 ? 'min-h-screen flex items-center justify-center bg-[#0D0221] py-12 px-4' : 'min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4';
  const cardCls = flags.UNBORKED_V2 ? 'max-w-md w-full space-y-8 bg-[#0D0221] border border-[#00FFF1] p-10 rounded-md' : 'max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-md';
  const titleCls = flags.UNBORKED_V2 ? 'text-3xl font-extrabold text-[#00FFF1] font-[\'Orbitron\',sans-serif] uppercase' : 'text-3xl font-extrabold text-gray-900';
  const textMuted = flags.UNBORKED_V2 ? 'mt-2 text-[#7DF9FF]' : 'mt-2 text-gray-600';
  const inputCls = flags.UNBORKED_V2 ? 'appearance-none rounded-none relative block w-full px-3 py-2 border border-[#00FFF1] placeholder-[#7DF9FF] text-[#00FFF1] rounded-t-md focus:outline-none focus:ring-2 focus:ring-[#FF003C] focus:border-[#FF003C] focus:z-10 bg-[#0D0221]' : 'appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-hidden focus:ring-[#39ff14] focus:border-[#39ff14] focus:z-10';
  const inputClsBottom = flags.UNBORKED_V2 ? 'appearance-none rounded-none relative block w-full px-3 py-2 border border-[#00FFF1] placeholder-[#7DF9FF] text-[#00FFF1] rounded-b-md focus:outline-none focus:ring-2 focus:ring-[#FF003C] focus:border-[#FF003C] focus:z-10 bg-[#0D0221]' : 'appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-hidden focus:ring-[#39ff14] focus:border-[#39ff14] focus:z-10';
  const btnCls = flags.UNBORKED_V2 ? 'group relative w-full flex justify-center py-2 px-4 text-sm font-medium rounded-md text-[#0D0221] bg-[#00FFF1] hover:bg-[#7DF9FF] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF003C] disabled:opacity-50 disabled:cursor-not-allowed' : 'group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#1a1a2e] hover:bg-[#39ff14] hover:text-[#1a1a2e] focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#39ff14] disabled:opacity-50 disabled:cursor-not-allowed';
  const errorCls = flags.UNBORKED_V2 ? 'border border-[#FF003C] text-[#FF003C] px-4 py-3 rounded' : 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative';

  return (
    <div className={outerCls}>
      <div className={cardCls}>
        <div className="text-center">
          <h2 className={titleCls}>Sign in to your account</h2>
          <p className={textMuted}>
            Or{' '}
            <Link to="/register" className={flags.UNBORKED_V2 ? 'text-[#FF003C] hover:underline' : 'text-[#39ff14] hover:underline'}>
              create a new account
            </Link>
          </p>
        </div>
        
        {error && (
          <div className={errorCls}>
            {error}
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-xs -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputCls}
                placeholder="Username"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClsBottom}
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={btnCls}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <p className={flags.UNBORKED_V2 ? 'text-sm text-[#7DF9FF]' : 'text-sm text-gray-600'}>
            Demo account: <span className="font-medium">demo / demo123</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
