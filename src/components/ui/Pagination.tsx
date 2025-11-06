import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  showPageSizeSelector?: boolean;
  showGoToPage?: boolean;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onPageSizeChange,
  showPageSizeSelector = true,
  showGoToPage = true,
  className = ''
}) => {
  const [goToPageValue, setGoToPageValue] = React.useState('');

  const handleGoToPage = () => {
    const page = parseInt(goToPageValue);
    const safeTotalPages = Math.max(1, totalPages);
    if (page >= 1 && page <= safeTotalPages) {
      onPageChange(page);
      setGoToPageValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleGoToPage();
    }
  };

  // Ensure totalPages is at least 1
  const safeTotalPages = Math.max(1, totalPages);
  
  if (totalItems <= 0) {
    return null;
  }

  return (
    <div className={`flex items-center justify-end gap-1 py-3 ${className}`}>
      {/* First page */}
      <button
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="flex items-center justify-center w-8 h-8 rounded border border-gray-300 bg-white text-gray-400 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="First page"
      >
        <ChevronsLeft className="h-3 w-3" />
      </button>

      {/* Previous page */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center justify-center w-8 h-8 rounded border border-gray-300 bg-white text-gray-400 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Previous page"
      >
        <ChevronLeft className="h-3 w-3" />
      </button>

      {/* Current page indicator */}
      <div className="flex items-center justify-center px-4 py-1.5 text-white rounded text-xs font-medium min-w-[80px] mx-1" style={{backgroundColor: '#2563eb'}}>
        Page {currentPage} of {safeTotalPages}
      </div>

      {/* Next page */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === safeTotalPages}
        className="flex items-center justify-center w-8 h-8 rounded text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        style={{backgroundColor: '#2563eb'}}
        title="Next page"
      >
        <ChevronRight className="h-3 w-3" />
      </button>

      {/* Last page */}
      <button
        onClick={() => onPageChange(safeTotalPages)}
        disabled={currentPage === safeTotalPages}
        className="flex items-center justify-center w-8 h-8 rounded border border-gray-300 bg-gray-100 text-gray-400 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Last page"
      >
        <ChevronsRight className="h-3 w-3" />
      </button>

      {/* Go to page */}
      {showGoToPage && (
        <div className="flex items-center gap-1 ml-3">
          <span className="text-xs text-gray-500">Go to:</span>
          <input
            type="number"
            min="1"
            max={safeTotalPages}
            value={goToPageValue}
            onChange={(e) => setGoToPageValue(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-12 h-6 px-1 text-center text-xs border border-gray-300 rounded focus:outline-none focus:ring-1"
            style={{'--tw-ring-color': '#2563eb', 'borderColor': goToPageValue ? '#2563eb' : undefined} as React.CSSProperties}
            placeholder="1"
          />
          <button
            onClick={handleGoToPage}
            disabled={!goToPageValue || parseInt(goToPageValue) < 1 || parseInt(goToPageValue) > safeTotalPages}
            className="px-2 py-1 text-xs text-white rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{backgroundColor: '#2563eb'}}
          >
            Go
          </button>
        </div>
      )}
    </div>
  );
};