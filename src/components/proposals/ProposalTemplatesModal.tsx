/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  LayoutTemplate, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Sparkles, 
  ArrowRight,
  Layers,
  Star,
  FileCheck,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { ProposalTemplate } from '../../types/proposal';
import { useApp } from '../../context/AppContext';
import { formatCurrencyCents } from '../../utils/proposalCalculations';

interface ProposalTemplatesModalProps {
  onClose: () => void;
  onSelectTemplate: (template: ProposalTemplate) => void;
}

export const ProposalTemplatesModal: React.FC<ProposalTemplatesModalProps> = ({
  onClose,
  onSelectTemplate
}) => {
  const { 
    proposalTemplates, 
    deleteProposalTemplate, 
    duplicateProposalTemplate, 
    saveProposalTemplate 
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);

  const filteredTemplates = proposalTemplates.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.service.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDuplicate = async (template: ProposalTemplate) => {
    try {
      await duplicateProposalTemplate(template);
    } catch (err) {
      console.error('Falha ao duplicar modelo:', err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;
    try {
      setIsDeletingTemplate(true);
      await deleteProposalTemplate(templateToDelete.id);
      setTemplateToDelete(null);
    } catch (err) {
      console.error('Falha ao excluir modelo:', err);
    } finally {
      setIsDeletingTemplate(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#121212] border border-[#27272A] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn">
        
        {/* Header */}
        <div className="p-4 sm:p-6 bg-[#18181B] border-b border-[#27272A] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#374151]">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight font-display">
                Modelos de Propostas Comerciais
              </h2>
              <p className="text-xs text-[#4B5563]">
                Reutilize estruturas comerciais pré-configuradas para criar propostas em segundos.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#4B5563] hover:text-white hover:bg-[#27272A] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* Search Input */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar modelos por nome ou serviço..."
              className="flex-1 bg-[#18181B] border border-[#27272A] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#374151] transition-colors"
            />
          </div>

          {/* Templates Grid */}
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[#27272A] rounded-2xl p-8 space-y-3">
              <LayoutTemplate className="w-10 h-10 text-zinc-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">Nenhum modelo encontrado</h3>
              <p className="text-xs text-[#4B5563] max-w-md mx-auto">
                Você pode salvar qualquer proposta em elaboração como um modelo comercial clicando em &quot;Salvar como Modelo&quot; no editor.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map(template => {
                const firstPlan = template.plans[0];
                return (
                  <div
                    key={template.id}
                    className="bg-[#18181B] border border-[#27272A] hover:border-[#374151]/50 rounded-2xl p-5 transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-black text-white uppercase tracking-tight">
                          {template.name}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {template.service}
                        </span>
                      </div>

                      {firstPlan && (
                        <div className="bg-[#121212] rounded-xl p-3 border border-[#27272A] space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-600 font-medium">Plano Base:</span>
                            <span className="font-bold text-white">{firstPlan.name} ({firstPlan.durationMonths} meses)</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-600 font-medium">Equivalente:</span>
                            <span className="font-bold text-[#374151] font-mono-nums">
                              {formatCurrencyCents(firstPlan.pricing.equivalentMonthlyAmountCents)}/mês
                            </span>
                          </div>
                        </div>
                      )}

                      {template.plans.length > 1 && (
                        <span className="text-[11px] text-[#4B5563] font-bold block">
                          + {template.plans.length - 1} plano(s) alternativo(s) configurado(s)
                        </span>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[#27272A] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDuplicate(template)}
                          className="p-2 rounded-xl text-[#4B5563] hover:text-white hover:bg-[#27272A] transition-all"
                          title="Duplicar Modelo"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setTemplateToDelete({ id: template.id, name: template.name })}
                          className="p-2 rounded-xl text-[#4B5563] hover:text-rose-400 hover:bg-[#27272A] transition-all cursor-pointer"
                          title="Excluir Modelo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          onSelectTemplate(template);
                          onClose();
                        }}
                        className="px-4 py-2 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-xs"
                      >
                        <span>Usar Modelo</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Confirmation Modal for deleting template */}
        {templateToDelete && (
          <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scaleIn">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Excluir Modelo Comercial</h3>
                  <p className="text-xs text-[#9CA3AF]">Ação permanente e irreversível.</p>
                </div>
              </div>
              <p className="text-xs text-zinc-300 mb-6">
                Tem certeza que deseja excluir o modelo <strong className="text-white font-semibold">"{templateToDelete.name}"</strong>?
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setTemplateToDelete(null)}
                  disabled={isDeletingTemplate}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeletingTemplate}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isDeletingTemplate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>{isDeletingTemplate ? 'Excluindo...' : 'Excluir Modelo'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
