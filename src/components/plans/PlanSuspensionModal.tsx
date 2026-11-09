/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  PauseCircle, 
  Calendar, 
  Clock, 
  AlertCircle, 
  User, 
  Layers
} from 'lucide-react';
import { ActivePlan, FamilyPlanParticipant } from '../../types';
import { activePlanService } from '../../services/activePlanService';

interface PlanSuspensionModalProps {
  plan: ActivePlan;
  targetParticipant?: FamilyPlanParticipant | null;
  onClose: () => void;
  onSuccess: (updatedPlan: ActivePlan) => void;
}

export const PlanSuspensionModal: React.FC<PlanSuspensionModalProps> = ({
  plan,
  targetParticipant,
  onClose,
  onSuccess
}) => {
  const isParticipantSuspension = Boolean(targetParticipant);

  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [estimatedEndDate, setEstimatedEndDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [extendsPlan, setExtendsPlan] = useState<boolean>(plan.suspensionExtendsPlan);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirmSuspension = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      let updatedPlan: ActivePlan;

      if (isParticipantSuspension && targetParticipant) {
        updatedPlan = await activePlanService.suspendParticipant(plan.id, targetParticipant.id, {
          startDate,
          estimatedEndDate: estimatedEndDate || undefined,
          reason: reason || undefined
        });
      } else {
        updatedPlan = await activePlanService.suspendPlan(plan.id, {
          startDate,
          estimatedEndDate: estimatedEndDate || undefined,
          reason: reason || undefined,
          extendsPlan
        });
      }

      onSuccess(updatedPlan);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao processar suspensão.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#121212] border border-[#27272A] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scaleIn my-auto max-h-[calc(100dvh-2rem)] flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#18181B] border-b border-[#27272A] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <PauseCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {isParticipantSuspension ? 'PAUSAR VAGA DE PARTICIPANTE' : 'SUSPENSÃO DO PLANO'}
              </span>
              <h2 className="text-base font-black text-white uppercase tracking-tight font-display mt-0.5">
                {isParticipantSuspension ? `Suspender: ${targetParticipant?.nameSnapshot}` : 'Suspender Plano'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#4B5563] hover:text-white hover:bg-[#27272A] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-[#18181B] border border-[#27272A] text-xs space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-600 block">Plano</span>
            <span className="font-bold text-white text-sm">{plan.name}</span>
            <p className="text-[11px] text-[#4B5563]">
              {isParticipantSuspension 
                ? `A suspensão é temporária e restrita à vaga de ${targetParticipant?.nameSnapshot}. Os demais participantes continuam ativos.`
                : 'A suspensão é temporária. Todo o plano ficará em pausa até que você clique em Reativar.'}
            </p>
          </div>

          {/* Data de Início */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Data de Início da Suspensão
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-[#18181B] border border-[#27272A] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Previsão de Retorno */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Previsão de Retorno (Opcional)
            </label>
            <input
              type="date"
              value={estimatedEndDate}
              onChange={(e) => setEstimatedEndDate(e.target.value)}
              className="w-full bg-[#18181B] border border-[#27272A] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400"
            />
            <span className="text-[10px] text-zinc-600 block">
              Não reativa automaticamente; serve como referência no histórico e no acompanhamento.
            </span>
          </div>

          {/* Motivo */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
              Motivo da Suspensão (Opcional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Viagem de férias, lesão médica, cirurgia, etc."
              className="w-full bg-[#18181B] border border-[#27272A] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Configuração de Prorrogação (apenas para suspensão do plano inteiro) */}
          {!isParticipantSuspension && (
            <div className="space-y-1.5 pt-2 border-t border-[#27272A]">
              <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                Prorrogar Vigência do Plano ao Reativar?
              </label>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setExtendsPlan(true)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                    extendsPlan
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                      : 'bg-[#18181B] border-[#27272A] text-zinc-600 hover:text-white'
                  }`}
                >
                  SIM (Prorrogar)
                </button>
                <button
                  type="button"
                  onClick={() => setExtendsPlan(false)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                    !extendsPlan
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
                      : 'bg-[#18181B] border-[#27272A] text-zinc-600 hover:text-white'
                  }`}
                >
                  NÃO (Manter Término)
                </button>
              </div>
              <span className="text-[11px] text-zinc-600 block">
                {extendsPlan 
                  ? 'Os dias pausados serão somados à data final do contrato quando você reativar.'
                  : 'A data final do contrato permanecerá inalterada.'}
              </span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-[#18181B] border-t border-[#27272A] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-[#27272A] text-xs font-bold text-[#4B5563] hover:text-white hover:bg-[#27272A] transition-all"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirmSuspension}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-600/30 flex items-center gap-2 disabled:opacity-80"
          >
            <PauseCircle className="w-4 h-4" />
            <span>{isSubmitting ? 'Processando...' : 'Confirmar Suspensão'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
