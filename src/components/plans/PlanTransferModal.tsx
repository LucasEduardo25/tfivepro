/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  UserCheck, 
  ArrowRightLeft, 
  Calendar, 
  AlertCircle, 
  Users, 
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';
import { ActivePlan, FamilyPlanParticipant, Student } from '../../types';
import { activePlanService } from '../../services/activePlanService';

interface PlanTransferModalProps {
  plan: ActivePlan;
  initialFromParticipant?: FamilyPlanParticipant | null;
  students?: Student[];
  onClose: () => void;
  onSuccess: (updatedPlan: ActivePlan) => void;
}

export const PlanTransferModal: React.FC<PlanTransferModalProps> = ({
  plan,
  initialFromParticipant,
  students = [],
  onClose,
  onSuccess
}) => {
  const eligibleParticipants = plan.participants.filter(p => p.status === 'ACTIVE' || p.status === 'SUSPENDED');

  const [fromParticipantId, setFromParticipantId] = useState<string>(
    initialFromParticipant?.id || (eligibleParticipants[0]?.id || '')
  );

  const [targetStudentId, setTargetStudentId] = useState<string>('');
  const [targetName, setTargetName] = useState<string>('');
  const [targetPhone, setTargetPhone] = useState<string>('');
  const [targetEmail, setTargetEmail] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If user selects an existing student, autofill name, phone, email
  const handleSelectStudent = (studentId: string) => {
    setTargetStudentId(studentId);
    if (studentId) {
      const found = students.find(s => s.id === studentId);
      if (found) {
        setTargetName(found.name);
        setTargetPhone(found.phone || '');
        setTargetEmail(found.email || '');
      }
    }
  };

  const fromParticipant = plan.participants.find(p => p.id === fromParticipantId);

  const handleConfirmTransfer = async () => {
    try {
      if (!fromParticipantId) {
        setErrorMessage('Selecione o participante de origem que está deixando a vaga.');
        return;
      }
      if (!targetName.trim()) {
        setErrorMessage('Informe o nome do novo participante que assumirá a vaga.');
        return;
      }

      setIsSubmitting(true);
      setErrorMessage(null);

      const result = await activePlanService.transferParticipantSlot(
        plan.id,
        fromParticipantId,
        {
          studentId: targetStudentId || undefined,
          nameSnapshot: targetName.trim(),
          phoneSnapshot: targetPhone.trim() || undefined,
          emailSnapshot: targetEmail.trim() || undefined
        },
        {
          effectiveDate,
          reason: reason.trim() || undefined
        }
      );

      onSuccess(result.activePlan);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao efetuar transferência de vaga.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#121212] border border-[#27272A] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-scaleIn my-auto max-h-[calc(100dvh-2rem)] flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#18181B] border-b border-[#27272A] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                TRANSFERÊNCIA DE VAGA
              </span>
              <h2 className="text-base font-black text-white uppercase tracking-tight font-display mt-0.5">
                Substituição de Participante
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

          {/* Aviso de Segurança & Isolamento de Dados */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-xs text-blue-300 space-y-1">
            <div className="flex items-center gap-2 font-bold text-blue-200">
              <ShieldAlert className="w-4 h-4 text-blue-400" />
              Isolamento Histórico Garantido
            </div>
            <p className="text-[11px] leading-relaxed">
              A transferência de vaga <strong>NÃO</strong> remove dados do aluno que sai e <strong>NÃO</strong> transfere treinos, avaliações, PRs ou sessões para o novo participante. Os valores comerciais do plano permanecem inalterados.
            </p>
          </div>

          {/* Selecionar Participante de Origem */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
              Participante que está deixando a vaga
            </label>
            <select
              value={fromParticipantId}
              onChange={(e) => setFromParticipantId(e.target.value)}
              className="w-full bg-[#18181B] border border-[#27272A] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
            >
              {eligibleParticipants.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nameSnapshot} ({p.role === 'holder' ? 'Titular' : 'Participante'}) — Status: {p.status}
                </option>
              ))}
            </select>
          </div>

          {/* Data Efetiva da Substituição */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              Data Efetiva da Substituição
            </label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full bg-[#18181B] border border-[#27272A] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Dados do Novo Participante */}
          <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                Dados do Novo Participante
              </span>
              <span className="text-[10px] text-zinc-600">Pode vincular a aluno existente</span>
            </div>

            {/* Vínculo opcional com Aluno existente */}
            {students.length > 0 && (
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-600 block">
                  Vincular a Aluno Cadastrado (Opcional)
                </label>
                <select
                  value={targetStudentId}
                  onChange={(e) => handleSelectStudent(e.target.value)}
                  className="w-full bg-[#121212] border border-[#27272A] text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="">(Cadastrar novo participante abaixo)</option>
                  {students.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.name} {st.phone ? `· ${st.phone}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Nome */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-600 block">
                Nome Completo *
              </label>
              <input
                type="text"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                placeholder="Nome do novo participante"
                className="w-full bg-[#121212] border border-[#27272A] text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Telefone */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-600 block">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={targetPhone}
                  onChange={(e) => setTargetPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-[#121212] border border-[#27272A] text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-600 block">
                  Email
                </label>
                <input
                  type="email"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full bg-[#121212] border border-[#27272A] text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Motivo da Substituição */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
              Motivo da Substituição (Opcional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Mudança de cidade do titular anterior; substituição acordada em família."
              className="w-full bg-[#18181B] border border-[#27272A] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
            />
          </div>

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
            onClick={handleConfirmTransfer}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 disabled:opacity-80"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Transferindo...' : 'Confirmar Transferência de Vaga'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
