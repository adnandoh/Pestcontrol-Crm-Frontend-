import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Briefcase, FileText, X, Loader2, Bell, Globe } from 'lucide-react';
import { enhancedApiService } from '../../services/api.enhanced';
import type { GlobalSearchResult } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

interface GlobalSearchProps {
  onSelectClient: (clientId: number) => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ onSelectClient }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const input = searchRef.current?.querySelector('input');
        input?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = async (val: string) => {
    if (val.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await enhancedApiService.getGlobalSearch(val);
      setResults(data);
      setShowResults(true);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      handleSearch(val);
    }, 300);
  };

  const handleSelect = (result: GlobalSearchResult) => {
    setShowResults(false);
    setQuery('');

    if (result.type === 'Customer') {
      onSelectClient(result.id);
      return;
    }

    if (result.type === 'Booking' && result.client_id) {
      onSelectClient(result.client_id);
    }

    if (result.link) {
      navigate(result.link);
      return;
    }

    if (result.type === 'Booking') {
      navigate(`/jobcards/edit/${result.id}`);
    } else if (result.type === 'CRM Inquiry') {
      navigate(`/crm-inquiries?focus=${result.id}`);
    } else if (result.type === 'Website Lead') {
      navigate(`/inquiries?focus=${result.id}`);
    } else if (result.type === 'Reminder') {
      navigate('/jobcards?tab=reminders');
    }
  };

  const getIcon = (type: GlobalSearchResult['type']) => {
    switch (type) {
      case 'Customer':
        return <User className="h-4 w-4 text-blue-600" />;
      case 'Booking':
        return <Briefcase className="h-4 w-4 text-emerald-600" />;
      case 'CRM Inquiry':
        return <FileText className="h-4 w-4 text-orange-600" />;
      case 'Website Lead':
        return <Globe className="h-4 w-4 text-purple-600" />;
      case 'Reminder':
        return <Bell className="h-4 w-4 text-amber-600" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const tagClass = (type: GlobalSearchResult['type']) => {
    switch (type) {
      case 'Customer':
        return 'bg-blue-100 text-blue-700';
      case 'Booking':
        return 'bg-emerald-100 text-emerald-700';
      case 'CRM Inquiry':
        return 'bg-orange-100 text-orange-700';
      case 'Website Lead':
        return 'bg-purple-100 text-purple-700';
      case 'Reminder':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="relative flex-1 max-w-2xl mx-auto px-4 md:px-8" ref={searchRef}>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
          {loading ? (
            <Loader2 className="h-4.5 w-4.5 text-blue-600 animate-spin" />
          ) : (
            <Search className="h-4.5 w-4.5 text-gray-400 group-focus-within:text-blue-600 transition-all duration-300 group-focus-within:scale-110" />
          )}
        </div>
        <input
          type="text"
          className="block w-full pl-11 pr-14 py-2.5 border-2 border-gray-100 rounded-2xl bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-300 outline-none text-[15px] font-bold text-gray-900 placeholder:text-gray-400 placeholder:font-semibold shadow-sm hover:shadow-md hover:border-blue-200"
          placeholder="Search Customer, Mobile or Booking ID..."
          value={query}
          onChange={onInputChange}
          onFocus={() => query.length >= 2 && setShowResults(true)}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 gap-2 z-10">
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
              }}
              className="p-1.5 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500 transition-all active:scale-90"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 border border-gray-200 rounded-lg bg-white text-[10px] font-black text-gray-400 uppercase tracking-tighter shadow-xs">
              <span className="text-[9px]">⌘</span>K
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showResults && (results.length > 0 || (query.length >= 2 && !loading)) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className="absolute mt-3 w-full left-0 bg-white rounded-2xl shadow-[0_20px_50px_rgba(8,112,184,0.12)] border border-blue-50 z-[100] overflow-hidden"
          >
            {results.length > 0 ? (
              <div className="max-h-[450px] overflow-y-auto">
                <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                  <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-blue-500" />
                    Top Results
                  </p>
                  <span className="text-[9px] font-bold text-gray-400 uppercase">{results.length} found</span>
                </div>
                <div className="py-1">
                  {results.map((result, idx) => (
                    <button
                      key={`${result.type}-${result.id}-${idx}`}
                      type="button"
                      onClick={() => handleSelect(result)}
                      className="w-full flex items-center px-4 py-3.5 hover:bg-blue-50/50 transition-all border-b border-gray-50 last:border-0 group text-left relative overflow-hidden"
                    >
                      <div className="absolute inset-y-0 left-0 w-1 bg-blue-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-200" />
                      <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center mr-4 group-hover:bg-blue-100 group-hover:scale-110 transition-all duration-300">
                        {getIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-[14px] font-black text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                            {result.title}
                          </p>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md tracking-tighter uppercase shrink-0 ${tagClass(result.type)}`}>
                            {result.type}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-gray-500 truncate group-hover:text-gray-600">
                          {result.subtitle}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : query.length >= 2 && !loading ? (
              <div className="p-10 text-center bg-gray-50/30">
                <div className="h-16 w-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-gray-100">
                  <Search className="h-8 w-8 text-gray-200" />
                </div>
                <h3 className="text-[15px] font-black text-gray-800 mb-1">No Results Found</h3>
                <p className="text-xs font-bold text-gray-400 px-10 leading-relaxed uppercase tracking-tight">
                  We couldn&apos;t find any customer or booking matching &quot;{query}&quot;
                </p>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export { GlobalSearch };
