import React, { useEffect } from 'react';
import { X, Filter, RotateCcw, Check } from 'lucide-react';

export interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  onClearAll?: () => void;
  onApply?: () => void;
  activeCount?: number;
  children: React.ReactNode;
}

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  title = 'Filtros Avançados',
  onClearAll,
  onApply,
  activeCount = 0,
  children
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      {/* Backdrop click */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Drawer / Sheet Box */}
      <div
        className="relative z-10 w-full sm:max-w-lg bg-[#121212] border border-[#27272A] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] text-white animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#27272A] flex items-center justify-between bg-[#0A0A0A] rounded-t-3xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] text-[#374151]">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold font-display uppercase tracking-wide text-white">
                {title}
              </h3>
              {activeCount > 0 && (
                <p className="text-[11px] text-[#374151] font-semibold">
                  {activeCount} {activeCount === 1 ? 'filtro ativo' : 'filtros ativos'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onClearAll && activeCount > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs text-[#4B5563] hover:text-[#1F2937] font-medium px-2 py-1 transition-colors"
              >
                Limpar
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[#71717A] hover:text-white hover:bg-[#18181B] transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {children}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#27272A] bg-[#0A0A0A] rounded-b-3xl flex items-center justify-between gap-3">
          {onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#27272A] bg-[#18181B] text-xs font-bold text-[#4B5563] hover:text-white transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Redefinir</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (onApply) onApply();
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs sm:text-sm font-bold font-display uppercase tracking-wider transition-all shadow-md shadow-xs"
          >
            <Check className="w-4 h-4" />
            <span>Ver Resultados</span>
          </button>
        </div>
      </div>
    </div>
  );
};
