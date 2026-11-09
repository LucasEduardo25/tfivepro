/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TFIVE PRO — MODO ALUNO: TELA PERFIL
 * 
 * Exibe:
 * 1. Dados cadastrais do aluno (nome, foto, e-mail, telefone)
 * 2. Plano atual e modalidade de atendimento (Presencial x Consultoria)
 * 3. Garantias de privacidade e segurança dos dados
 * 4. Botão de logout seguro (limpeza de sessão e cache)
 */

import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  LogOut, 
  CreditCard, 
  CheckCircle2, 
  Lock, 
  Loader2 
} from 'lucide-react';
import { StudentDashboardData } from '../../services/studentDataService';
import { authService } from '../../services/authService';

interface StudentProfileTabProps {
  data: StudentDashboardData;
}

export const StudentProfileTab: React.FC<StudentProfileTabProps> = ({ data }) => {
  const { student, modalityInfo, activePlan } = data;
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (!confirm('Deseja realmente sair do Modo Aluno?')) {
      return;
    }
    try {
      setLoggingOut(true);
      await authService.logout();
    } catch (err) {
      console.error('Erro ao realizar logout:', err);
      setLoggingOut(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="pt-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1">
          <User className="w-3.5 h-3.5 text-[#D90429]" />
          <span>Conta do Aluno</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          Meu Perfil
        </h1>
        <p className="text-xs text-[#A1A1AA] mt-0.5">
          Suas informações cadastrais e dados de atendimento
        </p>
      </div>

      {/* Card Principal de Identificação */}
      <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-4">
          {student.photo ? (
            <img 
              src={student.photo} 
              alt={student.name}
              className="w-16 h-16 rounded-2xl object-cover border border-[#27272A]"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-[#18181B] border border-[#27272A] flex items-center justify-center text-white font-black text-xl">
              {student.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <h2 className="text-lg font-black text-white truncate">
              {student.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Aluno Ativo
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#18181B] text-zinc-300 border border-[#27272A]">
                {modalityInfo.modality === 'PRESENCIAL' ? 'Presencial' : 'Consultoria'}
              </span>
            </div>
          </div>
        </div>

        {/* Dados Cadastrais */}
        <div className="pt-3 border-t border-[#27272A] space-y-2 text-xs">
          {student.email && (
            <div className="flex items-center gap-2.5 text-[#A1A1AA]">
              <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
              <span className="text-white truncate">{student.email}</span>
            </div>
          )}

          {student.phone && (
            <div className="flex items-center gap-2.5 text-[#A1A1AA]">
              <Phone className="w-4 h-4 text-zinc-500 shrink-0" />
              <span className="text-white">{student.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Card do Plano Contratado */}
      <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#18181B] border border-[#27272A] text-[#D90429]">
              <CreditCard className="w-4 h-4" />
            </span>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Plano & Atendimento
            </h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Ativo
          </span>
        </div>

        <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-3.5 space-y-1.5">
          <span className="text-[10px] text-[#A1A1AA] uppercase font-bold block">
            Serviço Vigente
          </span>
          <h4 className="text-sm font-black text-white">
            {activePlan?.name || modalityInfo.serviceName || student.planName || 'Personal Training'}
          </h4>
          <p className="text-xs text-[#A1A1AA]">
            Modalidade: <strong className="text-zinc-200">{modalityInfo.modality === 'PRESENCIAL' ? 'Personal Training Presencial com Agenda' : 'Consultoria Online de Treinamento'}</strong>
          </p>
        </div>
      </div>

      {/* Card de Privacidade e Isolamento de Dados */}
      <div className="p-4 rounded-xl bg-[#121212] border border-[#27272A] text-xs space-y-2">
        <div className="flex items-center gap-2 text-white font-bold">
          <ShieldCheck className="w-4 h-4 text-[#D90429]" />
          <span>Privacidade e Segurança TFIVE</span>
        </div>
        <p className="text-[#A1A1AA] text-[11px] leading-relaxed">
          Seus dados de treino, avaliações e histórico são estritamente isolados e protegidos por controle de acesso em nível de linha (RLS). Apenas você e seu Personal Trainer têm autorização de acesso.
        </p>
      </div>

      {/* Botão de Logout Seguro */}
      <div className="pt-2">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full py-3 px-4 rounded-xl bg-[#18181B] hover:bg-rose-950/40 border border-[#27272A] hover:border-rose-800/50 text-[#A1A1AA] hover:text-rose-400 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          {loggingOut ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#D90429]" />
          ) : (
            <LogOut className="w-4 h-4 text-rose-500" />
          )}
          <span>Encerrar Sessão Segura</span>
        </button>
      </div>

    </div>
  );
};
