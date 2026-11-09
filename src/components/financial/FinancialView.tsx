import React from 'react';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  CreditCard,
  CheckCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StudentAvatar } from '../common/StudentAvatar';

export const FinancialView: React.FC = () => {
  const { students } = useApp();

  const activeStudents = students.filter(s => s.status === 'active');
  const monthlyRevenue = activeStudents.reduce((sum, s) => sum + (s.priceMonthly || 0), 0);
  const annualProjectedRevenue = monthlyRevenue * 12;
  const averagePlanValue = activeStudents.length > 0 ? Math.round(monthlyRevenue / activeStudents.length) : 0;

  return (
    <div className="space-y-6 pb-16">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="w-5 h-5 text-[#374151]" />
          <h1 className="text-2xl sm:text-3xl font-black font-display text-white">Gestão Financeira & Planos</h1>
        </div>
        <p className="text-xs sm:text-sm text-[#4B5563]">
          Visão consolidada de contratos ativos, receita recorrente mensal e anual
        </p>
      </div>

      {/* 4 Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Alunos Ativos */}
        <div className="bg-[#121212] border border-[#374151]/10 rounded-2xl p-5 shadow-[0_4px_10px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#4B5563] uppercase tracking-wider">Contratos Ativos</span>
            <div className="w-8 h-8 rounded-lg bg-[#050505] border border-white/5 flex items-center justify-center">
              <Users className="w-4 h-4 text-[#374151]" />
            </div>
          </div>
          <p className="text-3xl font-black font-display text-white">{activeStudents.length}</p>
          <p className="text-[11px] text-[#4B5563] font-semibold mt-1">Alunos matriculados</p>
        </div>

        {/* Receita Mensal */}
        <div className="bg-[#121212] border border-[#E5E7EB] rounded-2xl p-5 shadow-[0_4px_15px_rgba(217,4,41,0.15)] bg-radial from-[#374151]/10 to-transparent">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#374151] uppercase tracking-wider">Receita Mensal (MRR)</span>
            <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] border border-[#374151]/50 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-[#374151]" />
            </div>
          </div>
          <p className="text-3xl font-black font-mono-nums text-white">
            R$ {monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-white/80 mt-1">Faturamento recorrente</p>
        </div>

        {/* Ticket Médio */}
        <div className="bg-[#121212] border border-[#374151]/10 rounded-2xl p-5 shadow-[0_4px_10px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#4B5563] uppercase tracking-wider">Valor Médio / Aluno</span>
            <div className="w-8 h-8 rounded-lg bg-[#050505] border border-white/5 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-[#374151]" />
            </div>
          </div>
          <p className="text-3xl font-black font-mono-nums text-white">
            R$ {averagePlanValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-[#4B5563] mt-1">Por mensalidade ativa</p>
        </div>

        {/* Projeção Anual */}
        <div className="bg-[#121212] border border-[#374151]/10 rounded-2xl p-5 shadow-[0_4px_10px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#4B5563] uppercase tracking-wider">Projeção Anual (ARR)</span>
            <div className="w-8 h-8 rounded-lg bg-[#050505] border border-white/5 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-[#374151]" />
            </div>
          </div>
          <p className="text-3xl font-black font-mono-nums text-white">
            R$ {annualProjectedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-[#374151] font-bold mt-1">Estimativa de 12 meses</p>
        </div>

      </div>

      {/* Student Plan Details Table */}
      <div className="bg-[#121212] border border-white/5 rounded-3xl p-6 shadow-[0_4px_10px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold font-display uppercase tracking-wider text-white">
            Detalhamento por Aluno & Planos Ativos
          </h3>
          <span className="text-xs text-[#4B5563]">Dados salvos localmente</span>
        </div>

        <div className="divide-y divide-white/5">
          {activeStudents.length > 0 ? (
            activeStudents.map(st => (
              <div key={st.id} className="py-3.5 flex items-center justify-between gap-3 text-xs hover:bg-[#050505]/40 px-3 rounded-xl transition-all">
                <div className="flex items-center gap-3">
                  <StudentAvatar
                    name={st.name}
                    photo={st.photo}
                    size="md"
                  />
                  <div>
                    <h4 className="font-bold text-white text-sm">{st.name}</h4>
                    <p className="text-[#4B5563] text-xs">{st.planName || 'Personal Trainer'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="font-mono-nums font-bold text-sm text-white block">
                      R$ {(st.priceMonthly || 0).toFixed(2)} / mês
                    </span>
                    <span className="text-[10px] text-[#4B5563]">Início: {new Date(st.startDate).toLocaleDateString('pt-BR')}</span>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-[#16a34a]/20 text-[#16a34a] text-[10px] font-bold uppercase flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Em dia</span>
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#4B5563] py-6 text-center">Nenhum aluno ativo com plano contratado no momento.</p>
          )}
        </div>
      </div>

    </div>
  );
};
