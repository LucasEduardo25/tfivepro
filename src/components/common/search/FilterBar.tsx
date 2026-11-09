import React from 'react';
import { FilterChip } from './FilterChip';

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface FilterBarProps {
  options: FilterOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export const FilterBar: React.FC<FilterBarProps> = ({
  options,
  selectedId,
  onSelect,
  className = '',
  size = 'md'
}) => {
  return (
    <div
      className={`flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin scrollbar-thumb-[#27272A] scrollbar-track-transparent ${className}`}
    >
      {options.map(opt => (
        <FilterChip
          key={opt.id}
          label={opt.label}
          count={opt.count}
          icon={opt.icon}
          isActive={selectedId === opt.id}
          onClick={() => onSelect(opt.id)}
          size={size}
        />
      ))}
    </div>
  );
};
