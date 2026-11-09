import React from 'react';
import { SearchX, RotateCcw } from 'lucide-react';

export interface EmptyFilterStateProps {
  title?: string;
  description?: string;
  searchTerm?: string;
  onClearFilters?: () => void;
  actionButton?: React.ReactNode;
  className?: string;
}

export const EmptyFilterState: React.FC<EmptyFilterStateProps> = ({
  title = 'Nenhum resultado encontrado',
  description = 'Tente ajustar sua busca ou remover alguns filtros para encontrar o que procura.',
  searchTerm,
  onClearFilters,
  actionButton,
  className = ''
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white border border-[#E5E7EB] rounded-2xl sm:rounded-3xl space-y-4 max-w-lg mx-auto my-6 shadow-xs ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#4B5563]">
        <SearchX className="w-7 h-7 text-[#4B5563]" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-base sm:text-lg font-bold text-[#1F2937]">
          {title}
        </h3>
        {searchTerm ? (
          <p className="text-xs sm:text-sm text-[#4B5563] max-w-sm">
            Nenhum registro corresponde ao termo <span className="text-[#1F2937] font-semibold">"{searchTerm}"</span> com os filtros atuais.
          </p>
        ) : (
          <p className="text-xs sm:text-sm text-[#4B5563] max-w-sm">
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F3F4F6] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-xs font-semibold text-[#1F2937] transition-all shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#4B5563]" />
            <span>Limpar Busca & Filtros</span>
          </button>
        )}
        {actionButton}
      </div>
    </div>
  );
};
