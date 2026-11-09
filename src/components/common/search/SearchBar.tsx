import React, { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showClearButton?: boolean;
  onClear?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Buscar...',
  autoFocus = false,
  className = '',
  size = 'md',
  showClearButton = true,
  onClear
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleClear = () => {
    onChange('');
    if (onClear) onClear();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const sizeClasses = {
    sm: 'py-2 pl-9 pr-8 text-xs',
    md: 'py-2.5 pl-10 pr-9 text-xs sm:text-sm',
    lg: 'py-3.5 pl-11 pr-10 text-sm sm:text-base'
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5 left-3',
    md: 'w-4 h-4 left-3.5',
    lg: 'w-5 h-5 left-4'
  };

  const clearSizes = {
    sm: 'right-2.5 p-0.5',
    md: 'right-3 p-1',
    lg: 'right-3.5 p-1'
  };

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <Search
        className={`text-[#4B5563] absolute pointer-events-none transition-colors ${iconSizes[size]}`}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] rounded-xl text-[#1F2937] placeholder-[#6B7280] 
          focus:outline-none focus:border-[#4B5563] focus:ring-1 focus:ring-[#4B5563]/20 transition-all font-sans ${sizeClasses[size]}`}
      />
      {showClearButton && value.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          title="Limpar busca"
          className={`absolute text-[#4B5563] hover:text-[#1F2937] rounded-md bg-[#F3F4F6] hover:bg-[#E5E7EB] transition-all ${clearSizes[size]}`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
