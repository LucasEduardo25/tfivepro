/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TFIVE PRO — MODO ALUNO: TELA AGENDA (APENAS ALUNO PRESENCIAL)
 * 
 * Exibe:
 * 1. Próximos horários agendados do aluno
 * 2. Status das sessões (agendada, realizada, cancelada)
 * 3. Histórico recente de atendimentos presenciais
 */

import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Dumbbell, 
  History 
} from 'lucide-react';
import { StudentDashboardData } from '../../services/studentDataService';

interface StudentScheduleTabProps {
  data: StudentDashboardData;
}

export const StudentScheduleTab: React.FC<StudentScheduleTabProps> = ({ data }) => {
  const { upcomingAppointments, pastAppointments } = data;
  const [activeFilter, setActiveFilter] = useState<'upcoming' | 'history'>('upcoming');

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="pt-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1">
          <Calendar className="w-3.5 h-3.5 text-[#D90429]" />
          <span>Atendimento Presencial</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          Minha Agenda
        </h1>
        <p className="text-xs text-[#A1A1AA] mt-0.5">
          Horários confirmados para sessões presenciais com seu Personal Trainer
        </p>
      </div>

      {/* Alternador de Filtro: Próximos x Histórico */}
      <div className="flex bg-[#121212] border border-[#27272A] p-1 rounded-xl">
        <button
          onClick={() => setActiveFilter('upcoming')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeFilter === 'upcoming'
              ? 'bg-[#18181B] text-white border border-[#27272A] shadow'
              : 'text-[#A1A1AA] hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-[#D90429]" />
          <span>Próximos ({upcomingAppointments.length})</span>
        </button>

        <button
          onClick={() => setActiveFilter('history')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeFilter === 'history'
              ? 'bg-[#18181B] text-white border border-[#27272A] shadow'
              : 'text-[#A1A1AA] hover:text-white'
          }`}
        >
          <History className="w-3.5 h-3.5 text-[#A1A1AA]" />
          <span>Histórico ({pastAppointments.length})</span>
        </button>
      </div>

      {/* Lista de Próximos Atendimentos */}
      {activeFilter === 'upcoming' && (
        <div className="space-y-3">
          {upcomingAppointments.length > 0 ? (
            upcomingAppointments.map((appt) => {
              const apptDate = new Date(`${appt.date}T12:00:00`);
              const dateFormatted = new Intl.DateTimeFormat('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long'
              }).format(apptDate);

              return (
                <div
                  key={appt.id}
                  className="bg-[#121212] border border-[#27272A] rounded-2xl p-4 shadow-md space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white capitalize block">
                        {dateFormatted}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-[#A1A1AA] mt-1">
                        <Clock className="w-3.5 h-3.5 text-[#D90429]" />
                        <strong className="text-white text-sm">{appt.time}</strong>
                        <span>({appt.durationMinutes || 60} min)</span>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Confirmado
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#27272A] flex items-center justify-between text-xs text-[#A1A1AA]">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{appt.notes || 'Atendimento Presencial com Personal'}</span>
                    </div>

                    {appt.workoutLetter && (
                      <span className="flex items-center gap-1 font-bold text-zinc-300">
                        <Dumbbell className="w-3 h-3 text-[#D90429]" />
                        Treino {appt.workoutLetter}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-8 text-center space-y-2">
              <Calendar className="w-8 h-8 text-zinc-600 mx-auto mb-1" />
              <p className="text-sm font-bold text-white">Nenhum próximo treino agendado</p>
              <p className="text-xs text-[#A1A1AA]">
                Seu Personal Trainer registrará seus próximos horários presenciais aqui.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Lista de Histórico de Atendimentos */}
      {activeFilter === 'history' && (
        <div className="space-y-3">
          {pastAppointments.length > 0 ? (
            pastAppointments.map((appt) => {
              const apptDate = new Date(`${appt.date}T12:00:00`);
              const dateFormatted = new Intl.DateTimeFormat('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              }).format(apptDate);

              return (
                <div
                  key={appt.id}
                  className="bg-[#121212] border border-[#27272A] rounded-2xl p-4 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-white block">
                      {dateFormatted} às {appt.time}
                    </span>
                    <span className="text-[#A1A1AA] text-[11px] block">
                      {appt.notes || 'Atendimento Presencial'}
                    </span>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Realizado
                  </span>
                </div>
              );
            })
          ) : (
            <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-8 text-center space-y-2">
              <History className="w-8 h-8 text-zinc-600 mx-auto mb-1" />
              <p className="text-sm font-bold text-white">Nenhum histórico anterior</p>
              <p className="text-xs text-[#A1A1AA]">
                Os treinos realizados aparecerão nesta seção após a conclusão.
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
