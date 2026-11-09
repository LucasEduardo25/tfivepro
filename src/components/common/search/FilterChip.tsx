import React from 'react';

export interface FilterChipProps {
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'accent';
  className?: string;
  size?: 'sm' | 'md';
}

export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  count,
  isActive,
  onClick,
  icon,
  variant = 'default',
  className = '',
  size = 'md'
}) => {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-1.5 text-xs';

  let activeClass = '';
  if (isActive) {
    activeClass = 'bg-[#374151] text-white border-[#374151] font-semibold shadow-xs';
  } else {
    activeClass = 'bg-white text-[#4B5563] hover:text-[#1F2937] hover:bg-[#F3F4F6] border-[#E5E7EB] font-medium';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-xl border transition-all shrink-0 select-none whitespace-nowrap ${sizeClasses} ${activeClass} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
      {typeof count === 'number' && (
        <span
          className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono-nums ${
            isActive ? 'bg-black/25 text-white' : 'bg-[#F3F4F6] text-[#4B5563]'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
};
