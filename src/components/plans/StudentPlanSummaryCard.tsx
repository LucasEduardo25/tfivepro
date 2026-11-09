/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Calendar, 
  Clock, 
  CheckCircle, 
  PauseCircle, 
  ChevronRight, 
  Sparkles,
  Users,
  FileText
} from 'lucide-react';
import { Student, Proposal } from '../../types';
import { ActivePlan } from '../../types/activePlan';
import { getActivePlanRepository } from '../../repositories/repositoryConfig';
import { formatPlanTypeLabel, formatCurrencyCents, resolveProposalIdentifiers } from '../../utils/proposalCalculations';
import { isUUID } from '../../utils/supabaseHelpers';
import { TouchButton } from '../common/TouchButton';

interface StudentPlanSummaryCardProps {
  student: Student;
  proposals?: Proposal[];
  onOpenPlanTab: () => void;
}

export const StudentPlanSummaryCard: React.FC<StudentPlanSummaryCardProps> = ({
  student,
  proposals = [],
  onOpenPlanTab
}) => {
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    getActivePlanRepository().getByStudentId(student.id).then(plans => {
      if (isMounted) {
        setActivePlan(plans && plans.length > 0 ? plans[0] : null);
        setIsLoading(false);
      }
    }).catch(() => {
      if (isMounted) {
        setActivePlan(null);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [student.id]);

  const acceptedProposal = useMemo(() => {
    if (activePlan) return null;
    const studentUuid = student.uuid || (isUUID(student.id) ? student.id : null);
    const studentLegacyId = student.legacyId || (!isUUID(student.id) ? student.id : null);

    return (proposals || []).find((p) => {
      if (p.status !== 'accepted') return false;
      if (p.studentId === student.id) return true;
      if (studentUuid && (p.studentId === studentUuid || p.studentUuid === studentUuid)) return true;
      if (studentLegacyId && (p.studentId === studentLegacyId || p.legacyId === studentLegacyId)) return true;
      if (p.participants?.some(pt => pt.studentId === student.id || (studentUuid && pt.studentId === studentUuid) || (studentLegacyId && pt.studentId === studentLegacyId))) return true;
      if (!p.studentId && p.studentSnapshot?.name?.trim().toLowerCase() === student.name.trim().toLowerCase()) return true;
      return false;
    }) || null;
  }, [activePlan, proposals, student]);

  if (isLoading || (!activePlan && !acceptedProposal)) {
    return null;
  }

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

  // Card para quando NÃO há plano ativo em execução, mas há Proposta Comercial Aceita
  if (!activePlan && acceptedProposal) {
    const mainPlan = acceptedProposal.plans?.[0];
    const finalAmountCents = mainPlan?.pricing?.finalAmountCents || 0;

    return (
      <div className="p-4 sm:p-5 rounded-2xl border transition-all bg-gradient-to-r from-emerald-950/30 via-[#121212] to-[#121212] border-emerald-500/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center border bg-emerald-500/15 border-emerald-500/30 text-emerald-400">
              <CheckCircle className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded border flex items-center gap-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 tracking-wider">
                  <CheckCircle className="w-3 h-3" />
                  PROPOSTA ACEITA
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#27272A] text-zinc-300">
                  {formatPlanTypeLabel(acceptedProposal.planType || 'individual')}
                </span>
                {acceptedProposal.acceptedAt && (
                  <span className="text-[11px] font-mono text-emerald-300 font-bold hidden sm:inline">
                    Aceita em {formatDateBR(acceptedProposal.acceptedAt)}
                  </span>
                )}
              </div>

              <h4 className="text-sm font-black text-white uppercase font-display mt-1">
                {acceptedProposal.title}
              </h4>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400 mt-0.5">
                <span>Serviço: <strong className="text-white">{acceptedProposal.service}</strong></span>
                {mainPlan && (
                  <>
                    <span>·</span>
                    <span>{mainPlan.durationMonths} {mainPlan.durationMonths === 1 ? 'mês' : 'meses'} ({mainPlan.frequency})</span>
                  </>
                )}
                {finalAmountCents > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-emerald-400 font-bold font-mono">
                      {formatCurrencyCents(finalAmountCents)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <TouchButton
            type="button"
            debugId="summary_open_plan_tab"
            onAction={onOpenPlanTab}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 whitespace-nowrap self-end sm:self-center cursor-pointer"
          >
            <span>Ver Proposta / Contrato</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </TouchButton>
        </div>
      </div>
    );
  }

  if (!activePlan) return null;

  const isSuspended = activePlan.status === 'SUSPENDED';

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
      isSuspended 
        ? 'bg-amber-950/20 border-amber-500/30' 
        : 'bg-[#121212] border-[#27272A]'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        <div className="flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
            isSuspended 
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' 
              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
          }`}>
            <ShieldCheck className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border flex items-center gap-1 ${
                isSuspended 
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {isSuspended ? <PauseCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                {isSuspended ? 'Plano Suspenso' : 'Plano Ativo'}
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#27272A] text-zinc-300">
                {formatPlanTypeLabel(activePlan.type)}
              </span>
            </div>

            <h4 className="text-sm font-black text-white uppercase font-display mt-1">
              {activePlan.name}
            </h4>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#4B5563] mt-0.5">
              <span>{activePlan.service} · {activePlan.frequencyPerWeek}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#374151]" />
                Vigência até <strong>{formatDateBR(activePlan.endDate)}</strong>
              </span>
              {activePlan.participants.length > 1 && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-zinc-300">
                    <Users className="w-3 h-3 text-[#374151]" />
                    {activePlan.participants.length} participantes
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <TouchButton
          type="button"
          debugId="summary_manage_plan"
          onAction={onOpenPlanTab}
          className="px-4 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold uppercase tracking-wider transition-all border border-zinc-700 flex items-center justify-center gap-1.5 whitespace-nowrap self-end sm:self-center"
        >
          <span>Gerenciar Plano</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </TouchButton>

      </div>
    </div>
  );
};
