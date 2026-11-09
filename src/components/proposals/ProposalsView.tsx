/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Trash2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Proposal, ProposalTemplate, ProposalStatus } from '../../types/proposal';
import { useApp } from '../../context/AppContext';
import { ProposalListView } from './ProposalListView';
import { ProposalEditorView } from './ProposalEditorView';
import { ProposalDetailModal } from './ProposalDetailModal';
import { ProposalPDFModal } from './ProposalPDFModal';
import { ProposalTemplatesModal } from './ProposalTemplatesModal';

interface ProposalsViewProps {
  studentIdFilter?: string;
}

export const ProposalsView: React.FC<ProposalsViewProps> = ({ studentIdFilter }) => {
  const {
    proposals,
    students,
    saveProposal,
    deleteProposal,
    duplicateProposal,
    createProposalRevision,
    updateProposalStatus,
    createProposalFromTemplate
  } = useApp();

  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [detailProposal, setDetailProposal] = useState<Proposal | null>(null);
  const [pdfProposal, setPdfProposal] = useState<Proposal | null>(null);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState<boolean>(false);
  const [proposalToDelete, setProposalToDelete] = useState<Proposal | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleNewProposal = () => {
    setEditingProposal(null);
    setViewMode('editor');
  };

  const handleEditProposal = (proposal: Proposal) => {
    setEditingProposal(proposal);
    setViewMode('editor');
  };

  const handleSaveProposal = async (proposal: Proposal) => {
    await saveProposal(proposal);
    setViewMode('list');
    setEditingProposal(null);
    setToast({ type: 'success', message: 'Proposta salva com sucesso!' });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSelectTemplate = async (template: ProposalTemplate) => {
    const student = studentIdFilter ? students.find(s => s.id === studentIdFilter) : null;
    const created = await createProposalFromTemplate(template, student);
    setEditingProposal(created);
    setViewMode('editor');
  };

  const handleStatusChange = async (id: string, status: ProposalStatus) => {
    await updateProposalStatus(id, status);
    if (detailProposal && detailProposal.id === id) {
      setDetailProposal(prev => prev ? { ...prev, status } : null);
    }
    if (pdfProposal && pdfProposal.id === id) {
      setPdfProposal(prev => prev ? { ...prev, status } : null);
    }
  };

  const handleRequestDelete = (id: string) => {
    const target = proposals.find(p => p.id === id);
    if (target) {
      setProposalToDelete(target);
    } else {
      setProposalToDelete({ id, title: 'Proposta Comercial' } as Proposal);
    }
  };

  const handleConfirmDelete = async () => {
    if (!proposalToDelete) return;
    try {
      setIsDeleting(true);
      await deleteProposal(proposalToDelete.id);
      if (detailProposal?.id === proposalToDelete.id) {
        setDetailProposal(null);
      }
      setProposalToDelete(null);
      setToast({ type: 'success', message: 'Proposta comercial excluída com sucesso!' });
      setTimeout(() => setToast(null), 3500);
    } catch (err: any) {
      console.error('Erro ao excluir proposta:', err);
      setToast({ type: 'error', message: err?.message || 'Não foi possível excluir a proposta no servidor. Tente novamente.' });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {viewMode === 'list' ? (
        <ProposalListView
          proposals={studentIdFilter ? proposals.filter(p => p.studentId === studentIdFilter) : proposals}
          onNewProposal={handleNewProposal}
          onSelectProposal={p => setDetailProposal(p)}
          onEditProposal={handleEditProposal}
          onOpenPDF={p => setPdfProposal(p)}
          onOpenTemplates={() => setIsTemplatesOpen(true)}
          onDuplicate={p => duplicateProposal(p)}
          onCreateRevision={p => createProposalRevision(p)}
          onDelete={handleRequestDelete}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <ProposalEditorView
          initialProposal={editingProposal}
          selectedStudentId={studentIdFilter}
          onSave={handleSaveProposal}
          onCancel={() => {
            setViewMode('list');
            setEditingProposal(null);
          }}
          onOpenTemplates={() => setIsTemplatesOpen(true)}
          onOpenPDF={p => setPdfProposal(p)}
        />
      )}

      {/* Detail Modal */}
      {detailProposal && (
        <ProposalDetailModal
          proposal={detailProposal}
          onClose={() => setDetailProposal(null)}
          onEdit={p => {
            setDetailProposal(null);
            handleEditProposal(p);
          }}
          onOpenPDF={p => {
            setDetailProposal(null);
            setPdfProposal(p);
          }}
          onDuplicate={p => duplicateProposal(p)}
          onCreateRevision={p => createProposalRevision(p)}
          onDelete={handleRequestDelete}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* PDF Modal */}
      {pdfProposal && (
        <ProposalPDFModal
          proposal={pdfProposal}
          onClose={() => setPdfProposal(null)}
          onStatusChange={newStatus => handleStatusChange(pdfProposal.id, newStatus)}
        />
      )}

      {/* Templates Modal */}
      {isTemplatesOpen && (
        <ProposalTemplatesModal
          onClose={() => setIsTemplatesOpen(false)}
          onSelectTemplate={handleSelectTemplate}
        />
      )}

      {/* Delete Confirmation Modal */}
      {proposalToDelete && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Excluir Proposta Comercial</h3>
                <p className="text-xs text-[#9CA3AF]">Esta operação é permanente e irreversível.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#121212] border border-[#27272A] mb-5">
              <p className="text-xs text-[#9CA3AF] mb-1">Proposta selecionada:</p>
              <p className="text-sm font-semibold text-white truncate">{proposalToDelete.title || 'Proposta Comercial'}</p>
              {proposalToDelete.studentSnapshot?.name && (
                <p className="text-xs text-[#9CA3AF] mt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Cliente: <span className="text-zinc-200 font-medium">{proposalToDelete.studentSnapshot.name}</span>
                </p>
              )}
            </div>

            <p className="text-xs text-zinc-300 mb-6 leading-relaxed">
              Tem certeza que deseja apagar esta proposta? Ela será removida permanentemente do histórico.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setProposalToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{isDeleting ? 'Excluindo...' : 'Sim, Excluir'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[80] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl transition-all ${
          toast.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-800 text-emerald-200' 
            : 'bg-rose-950/90 border-rose-800 text-rose-200'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
};
