/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Calendar, 
  Users, 
  CreditCard, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  PauseCircle, 
  PlayCircle, 
  ArrowRightLeft, 
  XCircle, 
  FileText, 
  Plus, 
  History, 
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserX,
  Sparkles,
  Eye,
  Trash2,
  Lock,
  Loader2
} from 'lucide-react';
import { Student, Proposal } from '../../types';
import { ActivePlan, FamilyPlanParticipant, PlanAuditLog, PlanSuspension, PlanTransfer } from '../../types/activePlan';
import { getActivePlanRepository } from '../../repositories/repositoryConfig';
import { activePlanService } from '../../services/activePlanService';
import { ProposalEditorView } from '../proposals/ProposalEditorView';
import { ProposalDetailModal } from '../proposals/ProposalDetailModal';
import { ProposalPDFModal } from '../proposals/ProposalPDFModal';
import { TouchButton } from '../common/TouchButton';
import { useApp } from '../../context/AppContext';
import { 
  formatCurrencyCents, 
  formatPlanTypeLabel, 
  resolveProposalIdentifiers, 
  isProposalLinkedToActivePlan 
} from '../../utils/proposalCalculations';
import { isUUID } from '../../utils/supabaseHelpers';
import { ActivatePlanModal } from './ActivatePlanModal';
import { PlanSuspensionModal } from './PlanSuspensionModal';
import { PlanTransferModal } from './PlanTransferModal';

interface StudentPlanTabProps {
  student: Student;
  students: Student[];
  proposals?: Proposal[];
  onNavigateToProposals?: () => void;
  onOpenProposalDetail?: (proposal: Proposal) => void;
  onOpenPDF?: (proposal: Proposal) => void;
}

export const StudentPlanTab: React.FC<StudentPlanTabProps> = ({
  student,
  students,
  proposals = [],
  onNavigateToProposals,
  onOpenProposalDetail,
  onOpenPDF
}) => {
  const [activePlans, setActivePlans] = useState<ActivePlan[]>([]);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState<number>(0);
  const [auditLogs, setAuditLogs] = useState<PlanAuditLog[]>([]);
  const [transfers, setTransfers] = useState<PlanTransfer[]>([]);
  const [suspensions, setSuspensions] = useState<PlanSuspension[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showProposalEditor, setShowProposalEditor] = useState<boolean>(false);
  const { 
    saveProposal, 
    updateProposalStatus, 
    deleteProposal, 
    duplicateProposal, 
    createProposalRevision,
    activePlans: allActivePlans
  } = useApp();

  // Modals state
  const [internalSelectedProposal, setInternalSelectedProposal] = useState<Proposal | null>(null);
  const [internalPDFProposal, setInternalPDFProposal] = useState<Proposal | null>(null);
  const [proposalToActivate, setProposalToActivate] = useState<Proposal | null>(null);
  const [proposalToDelete, setProposalToDelete] = useState<Proposal | null>(null);
  const [isDeletingProposal, setIsDeletingProposal] = useState<boolean>(false);
  const [proposalDeleteError, setProposalDeleteError] = useState<string | null>(null);
  const [suspensionModalPlan, setSuspensionModalPlan] = useState<ActivePlan | null>(null);
  const [suspensionTargetParticipant, setSuspensionTargetParticipant] = useState<FamilyPlanParticipant | null>(null);
  const [transferModalPlan, setTransferModalPlan] = useState<ActivePlan | null>(null);
  const [transferTargetParticipant, setTransferTargetParticipant] = useState<FamilyPlanParticipant | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Verificação robusta de relacionamento com plano ativo (utiliza resolução canônica única)
  const checkIsProposalLinkedToActivePlan = (prop: Proposal): boolean => {
    const combinedPlans = [...activePlans, ...(allActivePlans || [])];
    return isProposalLinkedToActivePlan(prop, combinedPlans);
  };

  const handleConfirmDeleteProposal = async () => {
    if (!proposalToDelete || isDeletingProposal) return;
    const resolved = resolveProposalIdentifiers(proposalToDelete);
    console.log(`[TFIVE PROPOSAL DEBUG] button=delete_confirm proposalId=${resolved.id} uuid=${resolved.uuid} legacyId=${resolved.legacyId}`);
    setIsDeletingProposal(true);
    setProposalDeleteError(null);

    try {
      const combinedPlans = [...activePlans, ...(allActivePlans || [])];
      if (isProposalLinkedToActivePlan(proposalToDelete, combinedPlans)) {
        throw new Error('Esta proposta está vinculada a um plano ativo e não pode ser excluída.');
      }

      await deleteProposal(proposalToDelete.id);
      setProposalToDelete(null);
      setActionSuccessMessage('Proposta excluída com sucesso do histórico do aluno.');
      setTimeout(() => setActionSuccessMessage(null), 3500);
    } catch (err: any) {
      console.error('[TFIVE PROPOSAL DEBUG] Falha ao excluir proposta no Supabase:', err);
      const msg = err?.message || 'Falha ao excluir proposta no Supabase. Tente novamente.';
      setProposalDeleteError(msg);
    } finally {
      setIsDeletingProposal(false);
    }
  };

  const handleOpenProposalDetail = (p: Proposal) => {
    const resolved = resolveProposalIdentifiers(p);
    console.log(`[TFIVE PROPOSAL DEBUG] button=view_proposal proposalId=${resolved.id} uuid=${resolved.uuid} legacyId=${resolved.legacyId}`);
    if (onOpenProposalDetail) {
      onOpenProposalDetail(p);
    } else {
      setInternalSelectedProposal(p);
    }
  };

  const handleOpenPDF = (p: Proposal) => {
    const resolved = resolveProposalIdentifiers(p);
    console.log(`[TFIVE PROPOSAL DEBUG] button=pdf_official proposalId=${resolved.id} uuid=${resolved.uuid} legacyId=${resolved.legacyId}`);
    if (onOpenPDF) {
      onOpenPDF(p);
    } else {
      setInternalPDFProposal(p);
    }
  };

  // Fetch student's plans (preferência para Supabase com fallback local)
  const loadPlans = async () => {
    try {
      setIsLoading(true);
      const plans = await getActivePlanRepository().getByStudentId(student.id).catch(repoErr => {
        console.warn('Erro ao carregar active_plans do repositório remoto:', repoErr);
        return [];
      });
      setActivePlans(plans);

      if (plans.length > 0) {
        const currentPlan = plans[0];
        const [logs, trs, susps] = await Promise.all([
          getActivePlanRepository().getAuditLogs(currentPlan.id).catch(() => []),
          getActivePlanRepository().getTransfers(currentPlan.id).catch(() => []),
          getActivePlanRepository().getSuspensions(currentPlan.id).catch(() => [])
        ]);
        setAuditLogs(logs);
        setTransfers(trs);
        setSuspensions(susps);
      } else {
        setAuditLogs([]);
        setTransfers([]);
        setSuspensions([]);
      }
    } catch (err) {
      console.error('Error loading active plans for student:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [student.id]);

  const currentPlan = activePlans[selectedPlanIndex] || activePlans[0] || null;

  // Filtro estrito e resiliente de propostas relacionadas exclusivamente a este aluno
  const studentProposals = useMemo(() => {
    const studentUuid = student.uuid || (isUUID(student.id) ? student.id : null);
    const studentLegacyId = student.legacyId || (!isUUID(student.id) ? student.id : null);

    return (proposals || []).filter(p => {
      // 1. Vínculo direto por studentId
      if (p.studentId) {
        if (p.studentId === student.id) return true;
        if (studentUuid && (p.studentId === studentUuid || p.studentUuid === studentUuid)) return true;
        if (studentLegacyId && (p.studentId === studentLegacyId || p.legacyId === studentLegacyId)) return true;
        
        // Verifica se o studentId da proposta aponta para o mesmo aluno na base
        const matched = students.find(s => s.id === p.studentId || (s.uuid && s.uuid === p.studentId) || (s.legacyId && s.legacyId === p.studentId));
        if (matched && (matched.id === student.id || (studentLegacyId && matched.id === studentLegacyId) || (studentUuid && (matched.uuid === studentUuid || matched.id === studentUuid)))) {
          return true;
        }
      }

      // 2. Vínculo nos participantes da proposta
      if (p.participants && p.participants.length > 0) {
        const hasParticipant = p.participants.some(pt => {
          if (!pt.studentId) return false;
          if (pt.studentId === student.id) return true;
          if (studentUuid && pt.studentId === studentUuid) return true;
          if (studentLegacyId && pt.studentId === studentLegacyId) return true;
          const matched = students.find(s => s.id === pt.studentId || (s.uuid && s.uuid === pt.studentId) || (s.legacyId && s.legacyId === pt.studentId));
          return matched && (matched.id === student.id || (studentLegacyId && matched.id === studentLegacyId) || (studentUuid && (matched.uuid === studentUuid || matched.id === studentUuid)));
        });
        if (hasParticipant) return true;
      }

      // 3. Fallback seguro: se studentId estiver vazio e houver correspondência exata de nome
      if (!p.studentId && p.studentSnapshot?.name?.trim().toLowerCase() === student.name.trim().toLowerCase()) {
        return true;
      }

      return false;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [proposals, student.id, student.name, student.uuid, student.legacyId, students]);

  // Propostas aceitas prontas para ativação que ainda não viraram active_plan
  const studentAcceptedProposals = useMemo(() => {
    return studentProposals.filter(p => {
      const isAccepted = p.status === 'accepted';
      const alreadyActivated = isProposalLinkedToActivePlan(p);
      return isAccepted && !alreadyActivated;
    });
  }, [studentProposals, activePlans, allActivePlans]);

  const formatDateBR = (isoStr?: string) => {
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

  const handleReactivatePlan = async (plan: ActivePlan) => {
    if (!window.confirm('Deseja realmente reativar este plano?')) return;
    try {
      const updated = await activePlanService.reactivatePlan(plan.id);
      setActionSuccessMessage('Plano reativado com sucesso!');
      await loadPlans();
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Erro ao reativar plano.');
    }
  };

  const handleReactivateParticipant = async (plan: ActivePlan, participantId: string) => {
    if (!window.confirm('Deseja reativar o participante neste plano?')) return;
    try {
      await activePlanService.reactivateParticipant(plan.id, participantId);
      setActionSuccessMessage('Participante reativado com sucesso!');
      await loadPlans();
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Erro ao reativar participante.');
    }
  };

  const handleCancelPlan = async (plan: ActivePlan) => {
    const reason = window.prompt('Informe o motivo do cancelamento / encerramento do plano:');
    if (reason === null) return; // Cancelled prompt
    try {
      await activePlanService.cancelPlan(plan.id, reason || 'Cancelado manualmente pelo treinador');
      setActionSuccessMessage('Plano cancelado.');
      await loadPlans();
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Erro ao cancelar plano.');
    }
  };

  const getStatusBadge = (status: ActivePlan['status']) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            Plano Ativo
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center gap-1.5">
            <PauseCircle className="w-3.5 h-3.5" />
            Plano Suspenso
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            Plano Concluído
          </span>
        );
      case 'CANCELED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            Plano Cancelado
          </span>
        );
      default:
        return null;
    }
  };

  const getParticipantStatusBadge = (st: FamilyPlanParticipant['status']) => {
    switch (st) {
      case 'ACTIVE':
        return (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Ativo
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Suspenso
          </span>
        );
      case 'TRANSFERRED':
        return (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-600 border border-zinc-700">
            Transferido
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center bg-[#121212] border border-[#27272A] rounded-2xl">
        <div className="animate-spin w-8 h-8 border-2 border-[#374151] border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs text-[#4B5563]">Carregando informações do plano contratado...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showProposalEditor ? (
        <div className="bg-[#121212] rounded-2xl p-4 sm:p-6 shadow-xl border border-[#27272A] relative animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-white uppercase tracking-wide">Nova Proposta Comercial</h3>
            <button
              type="button"
              onClick={() => setShowProposalEditor(false)}
              className="text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          <ProposalEditorView
            selectedStudentId={student.id}
            lockStudentSelection={true}
            onSave={async (proposal) => {
              await saveProposal(proposal);
              setShowProposalEditor(false);
            }}
            onCancel={() => setShowProposalEditor(false)}
            onOpenTemplates={() => {}}
            onOpenPDF={() => {}}
          />
        </div>
      ) : (
      <>
        {/* Header da Seção: Propostas e Contratos */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#27272A]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white uppercase tracking-tight font-display">
                Propostas e Contratos
              </h3>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                {studentProposals.length}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Histórico comercial, condições acordadas e contratos vinculados ao aluno {student.name}.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowProposalEditor(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Proposta</span>
          </button>
        </div>
      
      {/* Toast de Ação */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* SEÇÃO PRINCIPAL: LISTA DE PROPOSTAS DO ALUNO */}
      <div className="space-y-4">
        {studentProposals.length === 0 ? (
          <div className="p-8 sm:p-10 rounded-2xl bg-[#121212] border border-dashed border-[#27272A] text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#18181B] border border-[#27272A] flex items-center justify-center text-zinc-600 mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Nenhuma proposta ou contrato registrado</h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                Crie uma proposta comercial personalizada para apresentar planos de acompanhamento com valores e condições oficiais.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowProposalEditor(true)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all border border-zinc-700 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Criar Primeira Proposta</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {studentProposals.map(p => {
              const mainPlan = p.plans?.[0];
              const pricing = mainPlan?.pricing;
              const durationMonths = mainPlan?.durationMonths || 1;
              const frequency = mainPlan?.frequency || 'Conforme combinado';
              const participantsCount = p.participants?.length || 1;
              const isAccepted = p.status === 'accepted';
              const isLinkedToActivePlan = checkIsProposalLinkedToActivePlan(p);

              const originalAmountCents = pricing?.originalAmountCents || 0;
              const discountAmountCents = pricing?.discountAmountCents || 0;
              const finalAmountCents = pricing?.finalAmountCents || 0;

              return (
                <div
                  key={p.id}
                  className={`bg-[#121212] border rounded-2xl p-5 sm:p-6 transition-all space-y-4 shadow-lg ${
                    isAccepted 
                      ? 'border-emerald-500/40 hover:border-emerald-500/60' 
                      : 'border-[#27272A] hover:border-[#374151]'
                  }`}
                >
                  {/* Top Row: Status, Badges & Data */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#27272A]">
                    <div className="flex flex-wrap items-center gap-2">
                      {isAccepted ? (
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm shadow-emerald-500/10">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            ACEITA
                          </span>
                          {p.acceptedAt && (
                            <span className="text-xs font-mono text-emerald-300 font-bold">
                              Aceita em {formatDateBR(p.acceptedAt)}
                            </span>
                          )}
                        </div>
                      ) : p.status === 'sent' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          Enviada
                        </span>
                      ) : p.status === 'rejected' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5" />
                          Recusada
                        </span>
                      ) : p.status === 'expired' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Expirada
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          Rascunho
                        </span>
                      )}

                      <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded bg-zinc-800/90 text-zinc-300 border border-zinc-700/80">
                        {formatPlanTypeLabel(p.planType || 'individual')}
                        {participantsCount > 1 && ` • ${participantsCount} participantes`}
                      </span>

                      {isLinkedToActivePlan && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#27272A] text-emerald-400 border border-emerald-500/30">
                          Plano Ativo Vinculado
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-zinc-500 font-mono">
                      <span>Criada em {formatDateBR(p.createdAt)}</span>
                      {p.validUntil && (
                        <span className="ml-3 text-amber-400/90">
                          Validade: {formatDateBR(p.validUntil)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Content: Title, Service & Technical Specifications */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-base sm:text-lg font-black text-white uppercase font-display tracking-tight">
                        {p.title}
                      </h4>
                      <p className="text-xs text-zinc-400">
                        Serviço: <strong className="text-zinc-200">{p.service}</strong>
                        {mainPlan?.name && mainPlan.name !== p.title && (
                          <span> · Plano: <strong className="text-zinc-200">{mainPlan.name}</strong></span>
                        )}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-zinc-400 pt-1">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                          Período: <strong className="text-white">{durationMonths} {durationMonths === 1 ? 'mês' : 'meses'}</strong>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          Frequência: <strong className="text-white">{frequency}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Financial Values Display (Dados Reais da Proposta) */}
                    <div className="bg-[#18181B] rounded-xl p-3.5 border border-[#27272A] min-w-[240px] space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>Valor Original:</span>
                        <span className={discountAmountCents > 0 ? 'line-through text-zinc-500 font-mono' : 'text-zinc-300 font-mono font-bold'}>
                          {formatCurrencyCents(originalAmountCents)}
                        </span>
                      </div>

                      {discountAmountCents > 0 && (
                        <div className="flex items-center justify-between text-xs text-emerald-400">
                          <span>Desconto:</span>
                          <span className="font-mono font-bold">
                            - {formatCurrencyCents(discountAmountCents)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm font-black border-t border-[#27272A] pt-1.5">
                        <span className="text-zinc-300">Valor Final:</span>
                        <span className="text-emerald-400 font-mono text-base">
                          {formatCurrencyCents(finalAmountCents)}
                        </span>
                      </div>

                      {pricing?.installments && pricing.installments > 1 && (
                        <div className="text-[10px] text-zinc-500 text-right font-mono">
                          {pricing.installments}× de {formatCurrencyCents(pricing.installmentAmountCents)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#27272A]">
                    <div className="flex items-center gap-2">
                      {isAccepted && !isLinkedToActivePlan && (
                        <TouchButton
                          type="button"
                          debugId="activate_plan"
                          onAction={() => {
                            const res = resolveProposalIdentifiers(p);
                            console.log(`[TFIVE PROPOSAL DEBUG] button=activate_plan proposalId=${res.id} uuid=${res.uuid} legacyId=${res.legacyId}`);
                            setProposalToActivate(p);
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Ativar Plano</span>
                        </TouchButton>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                      {/* Ação de Exclusão Segura */}
                      {isLinkedToActivePlan ? (
                        <span
                          className="px-3 py-2 rounded-xl bg-zinc-900/80 text-zinc-500 text-xs font-medium border border-zinc-800 flex items-center gap-1.5 cursor-not-allowed select-none"
                          title="Esta proposta está vinculada a um plano ativo e não pode ser excluída."
                        >
                          <Lock className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Vinculada a plano ativo</span>
                        </span>
                      ) : (
                        <TouchButton
                          type="button"
                          debugId="delete_open"
                          onAction={() => {
                            const res = resolveProposalIdentifiers(p);
                            console.log(`[TFIVE PROPOSAL DEBUG] button=delete_open proposalId=${res.id} uuid=${res.uuid} legacyId=${res.legacyId}`);
                            setProposalDeleteError(null);
                            setProposalToDelete(p);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-zinc-800/80 hover:bg-rose-500/15 text-zinc-400 hover:text-rose-400 text-xs font-bold transition-all border border-zinc-700 hover:border-rose-500/30 flex items-center gap-1.5 cursor-pointer"
                          title="Excluir proposta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </TouchButton>
                      )}

                      <TouchButton
                        type="button"
                        debugId="pdf_official"
                        onAction={() => handleOpenPDF(p)}
                        className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold transition-all border border-zinc-700 flex items-center gap-1.5 cursor-pointer"
                        title="Visualizar e gerar documento PDF oficial"
                      >
                        <FileText className="w-3.5 h-3.5 text-zinc-400" />
                        <span>PDF Oficial</span>
                      </TouchButton>

                      <TouchButton
                        type="button"
                        debugId="view_proposal"
                        onAction={() => handleOpenProposalDetail(p)}
                        className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-wider transition-all border border-zinc-700 flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Ver Proposta</span>
                      </TouchButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SEÇÃO DE EXECUÇÃO: PLANO ATIVO EM ANDAMENTO (QUANDO EXISTIR) */}
      {currentPlan ? (
        <div className="space-y-6 pt-6 border-t border-[#27272A]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight font-display flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Execução do Plano Ativo Contratado</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Vigência, regras de suspensão e acompanhamento de participantes do plano ativo.
              </p>
            </div>
          </div>
          
          {/* Se houver mais de 1 plano (ex: histórico ou múltiplos contratos) */}
          {activePlans.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-bold uppercase text-zinc-600 mr-2">Contratos:</span>
              {activePlans.map((pl, idx) => (
                <button
                  type="button"
                  key={pl.id}
                  onClick={() => setSelectedPlanIndex(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    selectedPlanIndex === idx
                      ? 'bg-zinc-700 text-white shadow-sm'
                      : 'bg-[#18181B] text-zinc-400 border border-[#27272A] hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  {pl.name} · {pl.status}
                </button>
              ))}
            </div>
          )}

          {/* Card Principal do Plano */}
          <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-5 sm:p-6 space-y-6">
            
            {/* Header do Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#27272A]">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#374151]">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white uppercase font-display tracking-tight">
                      {currentPlan.name}
                    </h3>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#27272A] text-zinc-300 border border-zinc-700">
                      {formatPlanTypeLabel(currentPlan.type)}
                    </span>
                  </div>
                  <p className="text-xs text-[#4B5563] mt-0.5">
                    Serviço: <strong className="text-white">{currentPlan.service}</strong> · Frequência: <strong className="text-white">{currentPlan.frequencyPerWeek}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {getStatusBadge(currentPlan.status)}
              </div>
            </div>

            {/* Grid de Vigência e Financeiro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Início */}
              <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#374151]" />
                  Início da Vigência
                </span>
                <span className="text-sm font-bold text-white">
                  {formatDateBR(currentPlan.startDate)}
                </span>
                <span className="text-[11px] text-zinc-600 block mt-0.5">
                  Duração contratual: {currentPlan.durationMonths} meses
                </span>
              </div>

              {/* Término */}
              <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#374151]" />
                  Término do Contrato
                </span>
                <span className="text-sm font-bold text-white">
                  {formatDateBR(currentPlan.endDate)}
                </span>
                {currentPlan.originalEndDate && currentPlan.originalEndDate !== currentPlan.endDate && (
                  <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">
                    Prorrogado por suspensão (original: {formatDateBR(currentPlan.originalEndDate)})
                  </span>
                )}
                {(!currentPlan.originalEndDate || currentPlan.originalEndDate === currentPlan.endDate) && (
                  <span className="text-[11px] text-zinc-600 block mt-0.5">
                    Término regular estimado
                  </span>
                )}
              </div>

              {/* Valor Contratado (Snapshot) */}
              <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block mb-1 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#374151]" />
                  Valor Contratado
                </span>
                <span className="text-sm font-black text-white font-mono">
                  {formatCurrencyCents(currentPlan.pricingSnapshot.finalAmountCents)}
                </span>
                {currentPlan.pricingSnapshot.discountAmountCents > 0 && (
                  <span className="text-[10px] text-emerald-400 font-medium block mt-0.5">
                    Desconto de {formatCurrencyCents(currentPlan.pricingSnapshot.discountAmountCents)}
                  </span>
                )}
              </div>

              {/* Regra de Suspensão */}
              <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">
                  Regra de Suspensão
                </span>
                <span className={`text-xs font-bold block ${currentPlan.suspensionExtendsPlan ? 'text-emerald-400' : 'text-zinc-600'}`}>
                  {currentPlan.suspensionExtendsPlan ? 'SIM — Prorroga Término' : 'NÃO — Mantém Data'}
                </span>
                <span className="text-[10px] text-zinc-600 block mt-0.5">
                  {currentPlan.suspensionExtendsPlan 
                    ? 'Dias em pausa estendem a vigência final' 
                    : 'Data de término fixa independente de pausas'}
                </span>
              </div>

            </div>

            {/* Seção de Participantes */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#374151]" />
                  Participantes Vinculados ({currentPlan.participants.length})
                </h4>
                <span className="text-[11px] text-zinc-600">
                  {currentPlan.type === 'individual' ? 'Plano Individual' : 'Plano Compartilhado'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentPlan.participants.map((part) => {
                  const linkedStudent = part.studentId ? students.find(s => s.id === part.studentId) : null;
                  return (
                    <div 
                      key={part.id}
                      className="p-3.5 rounded-xl bg-[#18181B] border border-[#27272A] flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#27272A] border border-zinc-700 flex items-center justify-center text-white font-bold text-xs">
                            {part.nameSnapshot.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{part.nameSnapshot}</span>
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                                {part.role === 'holder' ? 'Titular' : 'Participante'}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#4B5563] mt-0.5">
                              {part.phoneSnapshot || part.emailSnapshot || 'Contato não cadastrado'}
                            </p>
                            {linkedStudent && (
                              <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                                <UserCheck className="w-3 h-3" /> Vinculado a {linkedStudent.name}
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          {getParticipantStatusBadge(part.status)}
                        </div>
                      </div>

                      {/* Datas de entrada e saída */}
                      <div className="pt-2 border-t border-[#27272A] flex items-center justify-between text-[10px] text-zinc-600">
                        <span>Entrada: <strong className="text-zinc-300">{formatDateBR(part.joinedAt)}</strong></span>
                        {part.leftAt && (
                          <span>Saída: <strong className="text-rose-400">{formatDateBR(part.leftAt)}</strong></span>
                        )}
                      </div>

                      {/* Ações do Participante */}
                      {currentPlan.status !== 'CANCELED' && currentPlan.status !== 'COMPLETED' && (
                        <div className="flex items-center justify-end gap-1.5 pt-1">
                          {part.status === 'ACTIVE' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSuspensionTargetParticipant(part);
                                setSuspensionModalPlan(currentPlan);
                              }}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <PauseCircle className="w-3 h-3" />
                              Pausar Vaga
                            </button>
                          )}

                          {part.status === 'SUSPENDED' && (
                            <button
                              type="button"
                              onClick={() => handleReactivateParticipant(currentPlan, part.id)}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <PlayCircle className="w-3 h-3" />
                              Reativar Vaga
                            </button>
                          )}

                          {part.status !== 'TRANSFERRED' && (
                            <button
                              type="button"
                              onClick={() => {
                                setTransferTargetParticipant(part);
                                setTransferModalPlan(currentPlan);
                              }}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/30 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                              Transferir Vaga
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ações no Plano Geral */}
            <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase text-zinc-600">Ações do Plano:</span>
                
                {/* Suspender Plano Inteiro */}
                {currentPlan.status === 'ACTIVE' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSuspensionTargetParticipant(null);
                      setSuspensionModalPlan(currentPlan);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <PauseCircle className="w-3.5 h-3.5" />
                    <span>Suspender Plano</span>
                  </button>
                )}

                {/* Reativar Plano Inteiro */}
                {currentPlan.status === 'SUSPENDED' && (
                  <button
                    type="button"
                    onClick={() => handleReactivatePlan(currentPlan)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Reativar Plano</span>
                  </button>
                )}

                {/* Transferir Vaga */}
                {currentPlan.status !== 'CANCELED' && currentPlan.status !== 'COMPLETED' && (
                  <button
                    type="button"
                    onClick={() => {
                      setTransferTargetParticipant(null);
                      setTransferModalPlan(currentPlan);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Substituir / Transferir Vaga</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {currentPlan.status !== 'CANCELED' && (
                  <button
                    type="button"
                    onClick={() => handleCancelPlan(currentPlan)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer"
                  >
                    Encerrar Plano
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 border border-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>{showHistory ? 'Ocultar Histórico' : 'Histórico & Auditoria'}</span>
                  {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Histórico & Auditoria (Linha do Tempo Expansível) */}
            {showHistory && (
              <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-[#374151]" />
                    Linha do Tempo de Alterações e Auditoria
                  </h4>
                  <span className="text-[11px] text-zinc-600">
                    Registros imutáveis protegidos
                  </span>
                </div>

                {auditLogs.length === 0 && transfers.length === 0 && suspensions.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic py-2">
                    Nenhum registro de auditoria anterior registrado para este plano.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {/* Auditoria do Plano */}
                    {auditLogs.map((log) => (
                      <div 
                        key={log.id}
                        className="p-2.5 rounded-lg bg-[#121212] border border-[#27272A] flex items-start justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                              {log.eventType}
                            </span>
                            <span className="font-bold text-white">{log.description}</span>
                          </div>
                          {log.details && Object.keys(log.details).length > 0 && (
                            <p className="text-[11px] text-[#4B5563] mt-0.5 font-mono">
                              {JSON.stringify(log.details)}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-600 whitespace-nowrap">
                          {formatDateBR(log.timestamp)}
                        </span>
                      </div>
                    ))}

                    {/* Histórico de Transferências */}
                    {transfers.map((tr) => (
                      <div 
                        key={tr.id}
                        className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-start justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300">
                              TRANSFERÊNCIA DE VAGA
                            </span>
                            <span className="font-bold text-white">
                              {tr.fromNameSnapshot} → {tr.toNameSnapshot}
                            </span>
                          </div>
                          <p className="text-[11px] text-blue-300/80 mt-0.5">
                            Data efetiva: {formatDateBR(tr.effectiveDate)} {tr.reason ? `· Motivo: ${tr.reason}` : ''}
                          </p>
                        </div>
                        <span className="text-[10px] text-zinc-600 whitespace-nowrap">
                          {formatDateBR(tr.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      ) : (
        /* Seção 3: Aluno Sem Plano Ativo */
        <div className="p-8 text-center bg-[#121212] border border-[#27272A] rounded-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#18181B] border border-[#27272A] flex items-center justify-center text-zinc-600 mx-auto">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-black text-white uppercase font-display">
              Nenhum Plano Ativo Vinculado
            </h3>
            <p className="text-xs text-[#4B5563] leading-relaxed">
              Os planos ativos são gerados automaticamente e com segurança a partir de <strong>Propostas Comerciais Aceitas</strong> pelo cliente.
            </p>
          </div>

          {onNavigateToProposals && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onNavigateToProposals}
                className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-wider transition-all border border-zinc-700 shadow-sm inline-flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Ir para Módulo de Propostas</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal de Ativação de Plano */}
      {proposalToActivate && (
        <ActivatePlanModal
          proposal={proposalToActivate}
          students={students}
          onClose={() => setProposalToActivate(null)}
          onSuccess={async (createdPlanId) => {
            setProposalToActivate(null);
            setActionSuccessMessage('Plano ativado com sucesso para este cliente!');
            await loadPlans();
            setTimeout(() => setActionSuccessMessage(null), 4000);
          }}
        />
      )}

      {/* Modal de Suspensão */}
      {suspensionModalPlan && (
        <PlanSuspensionModal
          plan={suspensionModalPlan}
          targetParticipant={suspensionTargetParticipant}
          onClose={() => {
            setSuspensionModalPlan(null);
            setSuspensionTargetParticipant(null);
          }}
          onSuccess={async (updatedPlan) => {
            setSuspensionModalPlan(null);
            setSuspensionTargetParticipant(null);
            setActionSuccessMessage(
              suspensionTargetParticipant 
                ? 'Vaga do participante suspensa com sucesso!' 
                : 'Plano suspenso com sucesso!'
            );
            await loadPlans();
            setTimeout(() => setActionSuccessMessage(null), 4000);
          }}
        />
      )}

      {/* Modal de Transferência */}
      {transferModalPlan && (
        <PlanTransferModal
          plan={transferModalPlan}
          initialFromParticipant={transferTargetParticipant}
          students={students}
          onClose={() => {
            setTransferModalPlan(null);
            setTransferTargetParticipant(null);
          }}
          onSuccess={async (updatedPlan) => {
            setTransferModalPlan(null);
            setTransferTargetParticipant(null);
            setActionSuccessMessage('Vaga transferida com sucesso mantendo todo o histórico isolado!');
            await loadPlans();
            setTimeout(() => setActionSuccessMessage(null), 4000);
          }}
        />
      )}

      {/* Modal de Detalhe da Proposta (Fallback Interno) */}
      {internalSelectedProposal && (
        <ProposalDetailModal
          proposal={internalSelectedProposal}
          onClose={() => setInternalSelectedProposal(null)}
          onEdit={() => {}}
          onOpenPDF={(p) => {
            setInternalSelectedProposal(null);
            setInternalPDFProposal(p);
          }}
          onDuplicate={(p) => duplicateProposal(p)}
          onCreateRevision={(p) => createProposalRevision(p)}
          onDelete={async (id) => {
            await deleteProposal(id);
            setInternalSelectedProposal(null);
          }}
          onStatusChange={async (id, status) => {
            await updateProposalStatus(id, status);
            setInternalSelectedProposal(prev => prev ? { 
              ...prev, 
              status, 
              acceptedAt: status === 'accepted' ? (prev.acceptedAt || new Date().toISOString()) : prev.acceptedAt 
            } : null);
          }}
        />
      )}

      {/* Modal de PDF Oficial da Proposta (Fallback Interno) */}
      {internalPDFProposal && (
        <ProposalPDFModal
          proposal={internalPDFProposal}
          onClose={() => setInternalPDFProposal(null)}
          onStatusChange={async (newStatus) => {
            await updateProposalStatus(internalPDFProposal.id, newStatus);
            setInternalPDFProposal(prev => prev ? { ...prev, status: newStatus } : null);
          }}
        />
      )}

      {/* Modal de Confirmação para Exclusão de Proposta */}
      {proposalToDelete && (
        <div 
          className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto touch-manipulation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeletingProposal) {
              console.log('[TFIVE PROPOSAL DEBUG] button=delete_cancel (backdrop tap)');
              setProposalToDelete(null);
              setProposalDeleteError(null);
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

            {/* Resumo da proposta selecionada */}
            <div className="bg-[#121212] border border-[#27272A] rounded-xl p-3 text-xs space-y-1">
              <div className="font-bold text-white truncate">{proposalToDelete.title}</div>
              <div className="text-zinc-400 flex items-center justify-between text-[11px]">
                <span>Serviço: <strong className="text-zinc-200">{proposalToDelete.service}</strong></span>
                <span className="font-mono uppercase text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  {proposalToDelete.status}
                </span>
              </div>
            </div>

            {proposalDeleteError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{proposalDeleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
              <TouchButton
                type="button"
                debugId="delete_cancel"
                onAction={() => {
                  console.log('[TFIVE PROPOSAL DEBUG] button=delete_cancel');
                  if (!isDeletingProposal) {
                    setProposalToDelete(null);
                    setProposalDeleteError(null);
                  }
                }}
                disabled={isDeletingProposal}
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </TouchButton>
              <TouchButton
                type="button"
                debugId="delete_confirm"
                onAction={handleConfirmDeleteProposal}
                disabled={isDeletingProposal}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingProposal ? (
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

          </>
      )}
    </div>
  );
}