import React from 'react';
import { X, RotateCcw } from 'lucide-react';

export interface ActiveFilterItem {
  id: string;
  label: string;
  valueLabel: string;
}

export interface ActiveFiltersProps {
  filters: ActiveFilterItem[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  className?: string;
}

export const ActiveFilters: React.FC<ActiveFiltersProps> = ({
  filters,
  onRemove,
  onClearAll,
  className = ''
}) => {
  if (filters.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 pt-1 ${className}`}>
      <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider">
        Filtros Ativos:
      </span>

      {filters.map(filter => (
        <span
          key={filter.id}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] text-xs text-[#1F2937]"
        >
          <span className="text-[#4B5563]">{filter.label}:</span>
          <span className="font-semibold text-[#1F2937]">{filter.valueLabel}</span>
          <button
            type="button"
            onClick={() => onRemove(filter.id)}
            className="p-0.5 hover:bg-[#E5E7EB] rounded-md text-[#4B5563] hover:text-[#1F2937] transition-colors ml-0.5"
            title={`Remover filtro ${filter.label}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      {filters.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4B5563] hover:text-[#1F2937] transition-colors ml-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Limpar todos</span>
        </button>
      )}
    </div>
  );
};
