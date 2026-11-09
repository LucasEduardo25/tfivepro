/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  CheckCircle, 
  Calendar, 
  Users, 
  CreditCard, 
  Clock, 
  AlertCircle, 
  FileText,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { Proposal, Student } from '../../types';
import { formatCurrencyCents, formatPlanTypeLabel } from '../../utils/proposalCalculations';
import { activePlanService, addMonthsToDate } from '../../services/activePlanService';

interface ActivatePlanModalProps {
  proposal: Proposal;
  students?: Student[];
  onClose: () => void;
  onSuccess: (activePlanId: string) => void;
}

interface ParticipantMappingItem {
  originalParticipantId?: string;
  nameSnapshot: string;
  phoneSnapshot?: string;
  emailSnapshot?: string;
  role: 'holder' | 'participant';
  studentId?: string;
}

export const ActivatePlanModal: React.FC<ActivatePlanModalProps> = ({
  proposal,
  students = [],
  onClose,
  onSuccess
}) => {
  const [selectedPlanIndex, setSelectedPlanIndex] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [suspensionExtendsPlan, setSuspensionExtendsPlan] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Participant mappings (allow linking to existing student IDs)
  const initialParticipants: ParticipantMappingItem[] = proposal.participants && proposal.participants.length > 0
    ? proposal.participants.map((p, idx) => ({
        originalParticipantId: p.id,
        nameSnapshot: p.nameSnapshot,
        phoneSnapshot: p.phoneSnapshot,
        emailSnapshot: p.emailSnapshot,
        role: p.role || (idx === 0 ? ('holder' as const) : ('participant' as const)),
        studentId: proposal.studentId || ''
      }))
    : [{
        originalParticipantId: undefined,
        nameSnapshot: proposal.studentSnapshot.name,
        phoneSnapshot: proposal.studentSnapshot.phone,
        emailSnapshot: proposal.studentSnapshot.email,
        role: 'holder' as const,
        studentId: proposal.studentId || ''
      }];

  const [participantsMapping, setParticipantsMapping] = useState<ParticipantMappingItem[]>(initialParticipants);

  const chosenPlan = proposal.plans[selectedPlanIndex] || proposal.plans[0];
  const durationMonths = chosenPlan?.durationMonths || 12;
  const estimatedEndDate = addMonthsToDate(startDate, durationMonths);

  const formatDateBR = (isoStr: string) => {
    if (!isoStr) return '—';
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoStr;
  };

  const handleParticipantStudentChange = (index: number, studentId: string) => {
    setParticipantsMapping(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        studentId: studentId || undefined
      };
      return updated;
    });
  };

  const handleConfirmActivation = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const createdPlan = await activePlanService.activatePlanFromProposal(proposal, {
        planItemIndex: selectedPlanIndex,
        startDate,
        suspensionExtendsPlan,
        participantsMapping,
        notes
      });

      onSuccess(createdPlan.id);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ocorreu um erro ao ativar o plano.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#121212] border border-[#27272A] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-[#18181B] border-b border-[#27272A] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  PROPOSTA ACEITA
                </span>
                <span className="text-xs text-[#4B5563]">·</span>
                <span className="text-xs text-[#4B5563] uppercase font-bold">
                  {formatPlanTypeLabel(proposal.planType || 'individual')}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight font-display mt-0.5">
                Ativar Plano do Cliente
              </h2>
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
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Plano Selecionado (se a proposta tiver mais de uma opção) */}
          {proposal.plans.length > 1 && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                Opção de Plano Contratado na Proposta
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {proposal.plans.map((p, idx) => (
                  <button
                    key={p.id || idx}
                    type="button"
                    onClick={() => setSelectedPlanIndex(idx)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      selectedPlanIndex === idx
                        ? 'bg-[#F3F4F6] border-[#374151] text-white'
                        : 'bg-[#18181B] border-[#27272A] text-[#4B5563] hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase font-display">{p.name}</span>
                      {p.isRecommended && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                          Recomendado
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-xs text-zinc-600">{p.frequency} · {p.durationMonths} meses</span>
                      <span className="text-sm font-black text-white font-mono">
                        {formatCurrencyCents(p.pricing.finalAmountCents)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Resumo dos Dados do Plano Contratado */}
          <div className="p-4 rounded-2xl bg-[#18181B] border border-[#27272A] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#374151]" />
              Resumo da Contratação
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-600 block">Plano</span>
                <span className="font-bold text-white">{chosenPlan?.name || proposal.title}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-600 block">Frequência</span>
                <span className="font-bold text-white">{chosenPlan?.frequency || '3x por semana'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-600 block">Duração</span>
                <span className="font-bold text-white">{durationMonths} meses</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-600 block">Status Inicial</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> ATIVO
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#27272A] grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-600 block">Valor Original</span>
                <span className="text-xs font-medium text-zinc-600 font-mono">
                  {formatCurrencyCents(chosenPlan?.pricing.originalAmountCents || 0)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-600 block">Desconto Aplicado</span>
                <span className="text-xs font-medium text-emerald-400 font-mono">
                  - {formatCurrencyCents(chosenPlan?.pricing.discountAmountCents || 0)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-600 block">Valor Final Contratado</span>
                <span className="text-sm font-black text-white font-mono">
                  {formatCurrencyCents(chosenPlan?.pricing.finalAmountCents || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Participantes & Vínculo com Alunos */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#374151]" />
                Participantes do Plano ({participantsMapping.length})
              </label>
              <span className="text-[11px] text-zinc-600">
                {proposal.planType === 'individual' ? 'Plano Individual' : 'Vincule aos cadastros de alunos'}
              </span>
            </div>

            <div className="space-y-2">
              {participantsMapping.map((part, pIdx) => (
                <div 
                  key={pIdx}
                  className="p-3.5 rounded-xl bg-[#18181B] border border-[#27272A] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#27272A] flex items-center justify-center text-white font-bold text-xs">
                      {part.nameSnapshot.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{part.nameSnapshot}</span>
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-600 border border-zinc-700">
                          {part.role === 'holder' ? 'Titular' : 'Participante'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#4B5563]">
                        {part.phoneSnapshot || part.emailSnapshot || 'Sem dados de contato'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-600 whitespace-nowrap">
                      Vínculo:
                    </label>
                    <select
                      value={part.studentId || ''}
                      onChange={(e) => handleParticipantStudentChange(pIdx, e.target.value)}
                      className="bg-[#121212] border border-[#27272A] text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#374151] max-w-[200px]"
                    >
                      <option value="">(Sem vínculo direto)</option>
                      {students.map(st => (
                        <option key={st.id} value={st.id}>
                          {st.name} {st.phone ? `(${st.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Configurações de Vigência & Início */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#374151]" />
                Data de Início do Plano
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#18181B] border border-[#27272A] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#374151]"
              />
              <span className="text-[11px] text-zinc-600 block">
                Previsão de término: <strong className="text-white">{formatDateBR(estimatedEndDate)}</strong> ({durationMonths} meses)
              </span>
            </div>

            {/* Configuração Explícita de Suspensão */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#374151]" />
                Suspensão Prorroga o Plano?
              </label>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSuspensionExtendsPlan(true)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                    suspensionExtendsPlan
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-[#18181B] border-[#27272A] text-zinc-600 hover:text-white'
                  }`}
                >
                  SIM (Prorroga)
                </button>
                <button
                  type="button"
                  onClick={() => setSuspensionExtendsPlan(false)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                    !suspensionExtendsPlan
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                      : 'bg-[#18181B] border-[#27272A] text-zinc-600 hover:text-white'
                  }`}
                >
                  NÃO (Não Prorroga)
                </button>
              </div>
              <span className="text-[11px] text-zinc-600 block">
                {suspensionExtendsPlan 
                  ? 'Dias de suspensão serão adicionados à data final ao reativar.'
                  : 'A data final do plano não será alterada em caso de pausa.'}
              </span>
            </div>
          </div>

          {/* Observações Opcionais */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
              Observações do Plano (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Aluno treina seg/qua/sex às 07h. Vaga extra ocupada pelo cônjuge."
              rows={2}
              className="w-full bg-[#18181B] border border-[#27272A] text-white text-xs rounded-xl p-3 focus:outline-none focus:border-[#374151] resize-none"
            />
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 bg-[#18181B] border-t border-[#27272A] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-zinc-700 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirmActivation}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{isSubmitting ? 'Ativando...' : 'Confirmar e Ativar Plano'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
