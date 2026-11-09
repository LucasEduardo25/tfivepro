import React, { useState, useRef, useEffect } from 'react';
import { ArrowUpDown, Check, ChevronDown } from 'lucide-react';

export interface SortOption<T extends string = string> {
  value: T;
  label: string;
  shortLabel?: string;
}

export interface SortMenuProps<T extends string = string> {
  options: SortOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  className?: string;
  align?: 'left' | 'right';
  size?: 'sm' | 'md';
}

export function SortMenu<T extends string = string>({
  options,
  value,
  onChange,
  label = 'Ordenar',
  className = '',
  align = 'right',
  size = 'md'
}: SortMenuProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentOption = options.find(opt => opt.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const sizeClasses = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs sm:text-sm';

  return (
    <div ref={containerRef} className={`relative inline-block text-left shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-2 bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-[#F9FAFB] rounded-xl text-[#1F2937] font-medium transition-all ${sizeClasses} ${
          isOpen ? 'border-[#374151] ring-1 ring-[#374151]/20' : ''
        }`}
      >
        <ArrowUpDown className="w-3.5 h-3.5 text-[#4B5563]" />
        <span className="text-[#4B5563] hidden sm:inline">{label}:</span>
        <span className="font-semibold text-[#1F2937]">
          {currentOption?.shortLabel || currentOption?.label}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#4B5563] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute z-40 mt-1.5 w-48 sm:w-56 rounded-2xl bg-white border border-[#E5E7EB] shadow-lg p-1.5 animate-in fade-in zoom-in-95 duration-100 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#4B5563] border-b border-[#F3F4F6] mb-1">
            Opções de Ordenação
          </div>
          <div className="space-y-0.5">
            {options.map(opt => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-left transition-all ${
                    isSelected
                      ? 'bg-[#F3F4F6] text-[#1F2937] font-bold'
                      : 'text-[#4B5563] hover:text-[#1F2937] hover:bg-[#F9FAFB]'
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#374151]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
