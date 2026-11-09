/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  User, 
  Calendar, 
  Printer, 
  Edit, 
  Copy, 
  Trash2, 
  GitBranch, 
  CheckCircle, 
  CheckCircle2,
  Clock, 
  XCircle, 
  AlertCircle, 
  Loader2,
  Share2, 
  CreditCard, 
  Star, 
  Users, 
  Layers, 
  ShieldCheck, 
  Sparkles,
  Lock
} from 'lucide-react';
import { Proposal, ProposalStatus } from '../../types/proposal';
import { 
  formatCurrencyCents, 
  formatPlanTypeLabel, 
  formatBenefitLabel,
  resolveProposalIdentifiers 
} from '../../utils/proposalCalculations';
import { getActivePlanRepository } from '../../repositories/repositoryConfig';
import { ActivePlan } from '../../types/activePlan';
import { useApp } from '../../context/AppContext';
import { ActivatePlanModal } from '../plans/ActivatePlanModal';
import { TouchButton } from '../common/TouchButton';

interface ProposalDetailModalProps {
  proposal: Proposal;
  onClose: () => void;
  onEdit: (proposal: Proposal) => void;
  onOpenPDF: (proposal: Proposal) => void;
  onDuplicate: (proposal: Proposal) => void;
  onCreateRevision: (proposal: Proposal) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: ProposalStatus) => void;
}

const STATUS_CONFIG: Record<ProposalStatus, { label: string; bg: string; text: string; border: string; icon: any }> = {
  draft: {
    label: 'Rascunho',
    bg: 'bg-zinc-800/60',
    text: 'text-zinc-300',
    border: 'border-zinc-700',
    icon: Clock
  },
  sent: {
    label: 'Enviada ao Aluno',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    icon: Clock
  },
  accepted: {
    label: 'Proposta Aceita',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    icon: CheckCircle
  },
  rejected: {
    label: 'Não Aceita / Recusada',
    bg: 'bg-rose-500/15',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    icon: XCircle
  },
  expired: {
    label: 'Validade Expirada',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    icon: AlertCircle
  }
};

export const ProposalDetailModal: React.FC<ProposalDetailModalProps> = ({
  proposal,
  onClose,
  onEdit,
  onOpenPDF,
  onDuplicate,
  onCreateRevision,
  onDelete,
  onStatusChange
}) => {
  const { students, activePlans } = useApp();
  const [associatedActivePlan, setAssociatedActivePlan] = useState<ActivePlan | null>(null);
  const [isActivateModalOpen, setIsActivateModalOpen] = useState<boolean>(false);
  const [activePlanSuccessMessage, setActivePlanSuccessMessage] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState<boolean>(false);
  const [statusToast, setStatusToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const resolved = resolveProposalIdentifiers(proposal);
    const fromContext = activePlans?.find(ap => ap.proposalId && resolved.allIds.includes(ap.proposalId));
    if (fromContext) {
      setAssociatedActivePlan(fromContext);
      return;
    }

    // Try finding via Supabase repository
    if (proposal.studentId) {
      getActivePlanRepository().getByStudentId(proposal.studentId).then(plans => {
        if (!isMounted) return;
        const found = plans.find(ap => ap.proposalId && resolved.allIds.includes(ap.proposalId));
        setAssociatedActivePlan(found || null);
      }).catch(() => {
        if (isMounted) setAssociatedActivePlan(null);
      });
    } else {
      setAssociatedActivePlan(null);
    }

    return () => {
      isMounted = false;
    };
  }, [proposal.id, proposal.uuid, proposal.legacyId, proposal.status, proposal.studentId, activePlans]);

  const handleAcceptProposal = async () => {
    if (proposal.status === 'accepted') return;
    try {
      setIsAccepting(true);
      await onStatusChange(proposal.id, 'accepted');
      setStatusToast({ message: 'Proposta aceita e registrada no histórico comercial com sucesso!', type: 'success' });
      setTimeout(() => setStatusToast(null), 4000);
    } catch (err: any) {
      console.error('Erro ao aceitar proposta:', err);
      setStatusToast({ message: 'Erro ao aceitar proposta no servidor. Verifique sua conexão.', type: 'error' });
      setTimeout(() => setStatusToast(null), 4000);
    } finally {
      setIsAccepting(false);
    }
  };

  const currentStatus = STATUS_CONFIG[proposal.status] || STATUS_CONFIG.draft;
  const StatusIcon = currentStatus.icon;
  const recommendedPlan = proposal.plans.find(p => p.isRecommended) || proposal.plans[0];
  const participants = proposal.participants || [
    { nameSnapshot: proposal.studentSnapshot.name, role: 'holder' as const }
  ];
  const planType = proposal.planType || 'individual';

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '—';
    try {
      const parts = isoStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    } catch {
      // Fallback
    }
    return isoStr;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#121212] border border-[#27272A] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-[#18181B] border-b border-[#27272A] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#374151]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight font-display">
                  {proposal.title}
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#374151] text-white">
                  {formatPlanTypeLabel(planType)}
                </span>
              </div>
              <p className="text-xs text-[#4B5563]">
                Titular: <span className="text-white font-bold">{proposal.studentSnapshot.name}</span> · Criada em {formatDate(proposal.createdAt)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#27272A] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Toast de Notificação de Status */}
          {statusToast && (
            <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn border ${
              statusToast.type === 'success' 
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
            }`}>
              {statusToast.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              <span>{statusToast.message}</span>
            </div>
          )}

          {/* Toast de Sucesso ao Ativar */}
          {activePlanSuccessMessage && (
            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{activePlanSuccessMessage}</span>
            </div>
          )}

          {/* Status Bar */}
          <div className="p-4 rounded-2xl bg-[#18181B] border border-[#27272A] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-zinc-400">Status Atual:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 ${currentStatus.bg} ${currentStatus.text} ${currentStatus.border}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                <span>{currentStatus.label}</span>
              </span>
              {proposal.status === 'accepted' && proposal.acceptedAt && (
                <span className="text-xs font-medium text-emerald-400/90 font-mono-nums">
                  em {formatDate(proposal.acceptedAt)}
                </span>
              )}
            </div>

            {/* Ações de Mudança de Status */}
            <div className="flex items-center flex-wrap gap-2">
              {proposal.status !== 'accepted' && (
                <button
                  type="button"
                  onClick={handleAcceptProposal}
                  disabled={isAccepting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
                >
                  {isAccepting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5" />
                  )}
                  <span>{isAccepting ? 'Aceitando...' : 'Aceitar Proposta'}</span>
                </button>
              )}

              <div className="flex items-center gap-1">
                <span className="text-[11px] text-[#4B5563] mr-1">Alterar:</span>
                {(['draft', 'sent', 'rejected', 'expired'] as ProposalStatus[]).map(st => {
                  if (st === proposal.status) return null;
                  const conf = STATUS_CONFIG[st];
                  return (
                    <button
                      key={st}
                      type="button"
                      disabled={isAccepting}
                      onClick={() => onStatusChange(proposal.id, st)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {conf.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* BANNER PROPOSTA ACEITA -> ATIVAR PLANO */}
          {proposal.status === 'accepted' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#18181B] to-[#18181B] border border-emerald-500/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 tracking-wider">
                        ACEITA
                      </span>
                      {proposal.acceptedAt && (
                        <span className="text-xs text-emerald-300 font-mono-nums">
                          Aceita em {formatDate(proposal.acceptedAt)}
                        </span>
                      )}
                      {associatedActivePlan && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#27272A] text-zinc-300 border border-zinc-700">
                          PLANO GERADO ({associatedActivePlan.status})
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-black text-white uppercase font-display mt-0.5">
                      {associatedActivePlan ? `Plano Ativo: ${associatedActivePlan.name}` : 'Proposta Aceita • Histórico Comercial Permanente'}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      {associatedActivePlan 
                        ? `Plano ativo vinculado ao perfil do aluno até ${formatDate(associatedActivePlan.endDate)}.`
                        : 'Esta proposta foi aceita e permanece no histórico comercial do aluno. Você pode ativar o plano no perfil a qualquer momento.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {associatedActivePlan ? (
                    <span className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" />
                      <span>Plano Ativo Vinculado</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsActivateModalOpen(true)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2 whitespace-nowrap cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>ATIVAR PLANO</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">
                Serviço &amp; Formato
              </span>
              <p className="text-xs font-bold text-white">
                {proposal.service}
              </p>
              <span className="text-[11px] text-[#374151] font-bold">
                {formatPlanTypeLabel(planType)} ({participants.length}p)
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">
                Validade Comercial
              </span>
              <p className="text-xs font-bold text-amber-400">
                Até {formatDate(proposal.validUntil)}
              </p>
              <span className="text-[11px] text-zinc-600">
                Versão {proposal.version || 1}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">
                Investimento Total
              </span>
              <p className="text-xs font-black text-[#374151] font-mono-nums">
                {recommendedPlan ? formatCurrencyCents(recommendedPlan.pricing.finalAmountCents) : '—'}
              </p>
              {recommendedPlan && (
                <span className="text-[11px] text-zinc-600">
                  {recommendedPlan.pricing.installments}× de {formatCurrencyCents(recommendedPlan.pricing.installmentAmountCents)}
                </span>
              )}
            </div>
          </div>

          {/* Participants Card */}
          <div className="p-4 rounded-2xl bg-[#18181B] border border-[#27272A] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-[#374151]" />
                <span>Participantes ({participants.length})</span>
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {participants.map((p, idx) => (
                <div key={p.id || idx} className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-[#374151]" />
                    <span className="text-xs font-bold text-white">{p.nameSnapshot}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    p.role === 'holder' 
                      ? 'bg-[#F3F4F6] text-[#374151]' 
                      : 'bg-zinc-800 text-zinc-600'
                  }`}>
                    {p.role === 'holder' ? 'Titular' : 'Participante'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Plans Summary */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              Planos Configurados ({proposal.plans.length})
            </h3>
            
            <div className="space-y-3">
              {proposal.plans.map((p, idx) => (
                <div 
                  key={p.id || idx}
                  className={`p-4 rounded-xl border ${
                    p.isRecommended 
                      ? 'bg-[#18181B] border-[#D1D5DB]' 
                      : 'bg-zinc-900/60 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{p.name}</span>
                      <span className="text-xs text-zinc-600 font-medium">({p.durationMonths} meses · {p.frequency})</span>
                      {p.isRecommended && (
                        <span className="text-[10px] font-black px-2 py-0.5 bg-[#374151] text-white rounded">
                          Recomendado
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-white font-mono-nums">
                        {formatCurrencyCents(p.pricing.finalAmountCents)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-zinc-600 block text-[10px]">Valor Regular:</span>
                      <span className="line-through text-zinc-600 font-mono-nums">
                        {formatCurrencyCents(p.pricing.originalAmountCents)}
                      </span>
                    </div>

                    <div>
                      <span className="text-zinc-600 block text-[10px]">{formatBenefitLabel(p.pricing)}:</span>
                      <span className="text-emerald-400 font-bold font-mono-nums">
                        - {formatCurrencyCents(p.pricing.discountAmountCents)}
                      </span>
                    </div>

                    <div>
                      <span className="text-zinc-600 block text-[10px]">Mensalidade Total:</span>
                      <span className="text-white font-bold font-mono-nums">
                        {formatCurrencyCents(p.pricing.equivalentMonthlyAmountCents)}/mês
                      </span>
                    </div>

                    <div>
                      <span className="text-zinc-600 block text-[10px]">Por Pessoa / Mês:</span>
                      <span className="text-[#374151] font-bold font-mono-nums">
                        {formatCurrencyCents(p.pricing.perPersonEquivalentMonthlyAmountCents || Math.round(p.pricing.equivalentMonthlyAmountCents / participants.length))}/mês
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-6 bg-[#18181B] border-t border-[#27272A] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {associatedActivePlan ? (
              <span
                className="p-2.5 rounded-xl bg-zinc-900/80 text-zinc-500 border border-zinc-800 cursor-not-allowed flex items-center justify-center select-none"
                title="Esta proposta está vinculada a um plano ativo e não pode ser excluída."
              >
                <Lock className="w-4 h-4 text-zinc-500" />
              </span>
            ) : (
              <TouchButton
                type="button"
                debugId="modal_delete_open"
                onAction={() => {
                  const res = resolveProposalIdentifiers(proposal);
                  console.log(`[TFIVE PROPOSAL DEBUG] button=delete_open (modal) proposalId=${res.id} uuid=${res.uuid} legacyId=${res.legacyId}`);
                  setDeleteError(null);
                  setShowDeleteConfirm(true);
                }}
                className="p-2.5 rounded-xl bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors border border-zinc-700 hover:border-rose-500/30 cursor-pointer"
                title="Excluir proposta"
              >
                <Trash2 className="w-4 h-4" />
              </TouchButton>
            )}

            <TouchButton
              type="button"
              debugId="modal_duplicate"
              onAction={() => onDuplicate(proposal)}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold transition-all border border-zinc-700 flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>Duplicar</span>
            </TouchButton>

            <TouchButton
              type="button"
              debugId="modal_create_revision"
              onAction={() => onCreateRevision(proposal)}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold transition-all border border-zinc-700 flex items-center gap-1.5 cursor-pointer"
            >
              <GitBranch className="w-4 h-4 text-zinc-400" />
              <span>Criar Nova Versão</span>
            </TouchButton>
          </div>

          <div className="flex items-center gap-2">
            <TouchButton
              type="button"
              debugId="modal_edit"
              onAction={() => onEdit(proposal)}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all border border-zinc-700 flex items-center gap-2 cursor-pointer"
            >
              <Edit className="w-4 h-4 text-zinc-400" />
              <span>Editar Proposta</span>
            </TouchButton>

            <TouchButton
              type="button"
              debugId="modal_pdf"
              onAction={() => onOpenPDF(proposal)}
              className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-wider transition-all border border-zinc-700 shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Gerar PDF Oficial</span>
            </TouchButton>
          </div>
        </div>

      </div>

      {/* Modal de Ativação do Plano */}
      {isActivateModalOpen && (
        <ActivatePlanModal
          proposal={proposal}
          students={students}
          onClose={() => setIsActivateModalOpen(false)}
          onSuccess={async (newPlanId) => {
            setIsActivateModalOpen(false);
            setActivePlanSuccessMessage('Plano Ativo gerado e vinculado ao cliente com sucesso!');
            const updatedPlan = await getActivePlanRepository().getById(newPlanId);
            setAssociatedActivePlan(updatedPlan);
            setTimeout(() => setActivePlanSuccessMessage(null), 5000);
          }}
        />
      )}

      {/* Modal de Confirmação para Exclusão de Proposta */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto touch-manipulation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) {
              console.log('[TFIVE PROPOSAL DEBUG] button=delete_cancel (modal backdrop tap)');
              setShowDeleteConfirm(false);
              setDeleteError(null);
            }
          }}
        >
          <div 
            className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scaleIn space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Excluir proposta?</h3>
                <p className="text-xs text-zinc-400">Esta ação removerá esta proposta do histórico do aluno.</p>
              </div>
            </div>

            <div className="bg-[#121212] border border-[#27272A] rounded-xl p-3 text-xs space-y-1">
              <div className="font-bold text-white truncate">{proposal.title}</div>
              <div className="text-zinc-400 flex items-center justify-between text-[11px]">
                <span>Serviço: <strong className="text-zinc-200">{proposal.service}</strong></span>
                <span className="font-mono uppercase text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  {proposal.status}
                </span>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
              <TouchButton
                type="button"
                debugId="modal_delete_cancel"
                onAction={() => {
                  console.log('[TFIVE PROPOSAL DEBUG] button=delete_cancel (modal)');
                  if (!isDeleting) {
                    setShowDeleteConfirm(false);
                    setDeleteError(null);
                  }
                }}
                disabled={isDeleting}
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </TouchButton>
              <TouchButton
                type="button"
                debugId="modal_delete_confirm"
                onAction={async () => {
                  if (isDeleting) return;
                  const res = resolveProposalIdentifiers(proposal);
                  console.log(`[TFIVE PROPOSAL DEBUG] button=delete_confirm (modal) proposalId=${res.id} uuid=${res.uuid} legacyId=${res.legacyId}`);
                  setIsDeleting(true);
                  setDeleteError(null);
                  try {
                    if (associatedActivePlan) {
                      throw new Error('Esta proposta está vinculada a um plano ativo e não pode ser excluída.');
                    }
                    await onDelete(proposal.id);
                    setShowDeleteConfirm(false);
                    onClose();
                  } catch (err: any) {
                    console.error('[TFIVE PROPOSAL DEBUG] Falha ao excluir proposta no Supabase:', err);
                    setDeleteError(err?.message || 'Falha ao excluir proposta no Supabase. Tente novamente.');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir proposta</span>
                  </>
                )}
              </TouchButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
