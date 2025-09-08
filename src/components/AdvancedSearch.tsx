import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFeatureFlags } from '../context/FeatureFlagsContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

type Props = {
  className?: string;
};

const AdvancedSearch: React.FC<Props> = ({ className }) => {
  const { flags } = useFeatureFlags();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const isV2 = flags.UNBORKED_V2;

  const containerCls = isV2
    ? 'w-full mb-6'
    : 'w-full mb-6';

  const inputCls = isV2
    ? 'w-full px-4 py-3 bg-[#0D0221] text-[#00FFF1] border border-[#00FFF1] focus:outline-none focus:ring-2 focus:ring-[#FF003C] placeholder-[#7DF9FF]'
    : 'w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400';

  const listCls = isV2
    ? 'mt-2 border border-[#00FFF1] bg-[#0D0221] text-[#00FFF1]'
    : 'mt-2 border border-gray-200 bg-white text-gray-900';

  const itemCls = isV2
    ? 'px-3 py-2 hover:bg-[#140638] cursor-pointer'
    : 'px-3 py-2 hover:bg-gray-50 cursor-pointer';

  const debouncedFetch = useMemo(() => {
    return (q: string) => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(async () => {
        if (!q) {
          setSuggestions([]);
          setError(null);
          return;
        }
        setLoading(true);
        setError(null);
        try {
          const url = `${API_BASE_URL}/api/products/search?autocomplete=1&q=${encodeURIComponent(q)}`;
          const res = await fetch(url);
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || res.statusText);
          }
          const data = await res.json();
          if (Array.isArray(data)) setSuggestions(data);
        } catch (e: any) {
          setError(e?.message || 'Search failed');
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      }, 500);
    };
  }, []);

  useEffect(() => {
    debouncedFetch(query);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [query, debouncedFetch]);

  if (!flags.ADVANCED_FILTERING) return null;

  return (
    <div className={`${containerCls} ${className || ''}`}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={isV2 ? 'SEARCH.PRODUCTS' : 'Search products'}
        className={inputCls}
        aria-label="Search products"
      />
      {loading && (
        <div className={isV2 ? 'text-[#7DF9FF] text-sm mt-2' : 'text-gray-500 text-sm mt-2'}>
          {isV2 ? 'QUERYING…' : 'Searching…'}
        </div>
      )}
      {error && (
        <div className={isV2 ? 'text-[#FF003C] text-sm mt-2' : 'text-red-600 text-sm mt-2'}>
          {error}
        </div>
      )}
      {!loading && suggestions.length > 0 && (
        <ul className={`${listCls}`}>
          {suggestions.map((s, idx) => (
            <li key={`${s}-${idx}`} className={itemCls}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdvancedSearch;

