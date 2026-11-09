/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowUpDown, 
  FileText, 
  Printer, 
  Edit, 
  Copy, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  LayoutTemplate,
  Star,
  ChevronDown,
  TrendingUp,
  User,
  GitBranch,
  MoreVertical,
  Calendar
} from 'lucide-react';
import { Proposal, ProposalStatus } from '../../types/proposal';
import { useApp } from '../../context/AppContext';
import { formatCurrencyCents, formatPlanTypeLabel } from '../../utils/proposalCalculations';

interface ProposalListViewProps {
  proposals: Proposal[];
  onNewProposal: () => void;
  onSelectProposal: (proposal: Proposal) => void;
  onEditProposal: (proposal: Proposal) => void;
  onOpenPDF: (proposal: Proposal) => void;
  onOpenTemplates: () => void;
  onDuplicate: (proposal: Proposal) => void;
  onCreateRevision: (proposal: Proposal) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: ProposalStatus) => void;
}

type SortOption = 'created_desc' | 'created_asc' | 'student_asc' | 'amount_desc' | 'validity_asc';

const STATUS_TABS: { id: 'all' | ProposalStatus; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'draft', label: 'Rascunhos' },
  { id: 'sent', label: 'Enviadas' },
  { id: 'accepted', label: 'Aceitas' },
  { id: 'rejected', label: 'Recusadas' },
  { id: 'expired', label: 'Expiradas' }
];

export const ProposalListView: React.FC<ProposalListViewProps> = ({
  proposals,
  onNewProposal,
  onSelectProposal,
  onEditProposal,
  onOpenPDF,
  onOpenTemplates,
  onDuplicate,
  onCreateRevision,
  onDelete,
  onStatusChange
}) => {
  const { students } = useApp();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProposalStatus>('all');
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('created_desc');
  const [activeMenuProposalId, setActiveMenuProposalId] = useState<string | null>(null);

  // Filter and Sort Pipeline
  const filteredProposals = useMemo(() => {
    return proposals.filter(p => {
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(query);
        const matchesStudent = p.studentSnapshot.name.toLowerCase().includes(query);
        const matchesService = p.service.toLowerCase().includes(query);
        if (!matchesTitle && !matchesStudent && !matchesService) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false;
      }

      // Student filter
      if (selectedStudentFilter !== 'all') {
        const selStudent = students.find(s => s.id === selectedStudentFilter || s.uuid === selectedStudentFilter || s.legacyId === selectedStudentFilter);
        const matchesDirect = p.studentId === selectedStudentFilter;
        const matchesResolved = selStudent && (
          p.studentId === selStudent.id ||
          (selStudent.uuid && (p.studentId === selStudent.uuid || p.studentUuid === selStudent.uuid)) ||
          (selStudent.legacyId && p.studentId === selStudent.legacyId) ||
          p.participants?.some(pt => pt.studentId === selStudent.id || (selStudent.uuid && pt.studentId === selStudent.uuid) || (selStudent.legacyId && pt.studentId === selStudent.legacyId))
        );
        if (!matchesDirect && !matchesResolved) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'created_desc') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'created_asc') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'student_asc') {
        return a.studentSnapshot.name.localeCompare(b.studentSnapshot.name);
      }
      if (sortBy === 'amount_desc') {
        const amountA = a.plans[0]?.pricing.finalAmountCents || 0;
        const amountB = b.plans[0]?.pricing.finalAmountCents || 0;
        return amountB - amountA;
      }
      if (sortBy === 'validity_asc') {
        const valA = a.validUntil ? new Date(a.validUntil).getTime() : Infinity;
        const valB = b.validUntil ? new Date(b.validUntil).getTime() : Infinity;
        return valA - valB;
      }
      return 0;
    });
  }, [proposals, searchTerm, statusFilter, selectedStudentFilter, sortBy]);

  // Commercial Metrics
  const metrics = useMemo(() => {
    const totalCount = proposals.length;
    const acceptedCount = proposals.filter(p => p.status === 'accepted').length;
    const sentCount = proposals.filter(p => p.status === 'sent').length;
    const conversionRate = totalCount > 0 ? Math.round((acceptedCount / (acceptedCount + proposals.filter(p => p.status === 'rejected').length || 1)) * 100) : 0;
    
    const totalAcceptedVolumeCents = proposals
      .filter(p => p.status === 'accepted')
      .reduce((acc, p) => acc + (p.plans[0]?.pricing.finalAmountCents || 0), 0);

    const totalOpenVolumeCents = proposals
      .filter(p => p.status === 'sent' || p.status === 'draft')
      .reduce((acc, p) => acc + (p.plans[0]?.pricing.finalAmountCents || 0), 0);

    return {
      totalCount,
      acceptedCount,
      sentCount,
      conversionRate,
      totalAcceptedVolumeCents,
      totalOpenVolumeCents
    };
  }, [proposals]);

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

  const getStatusBadge = (status: ProposalStatus) => {
    switch (status) {
      case 'draft':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-600 border border-zinc-700 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Rascunho</span>
          </span>
        );
      case 'sent':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Enviada</span>
          </span>
        );
      case 'accepted':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Aceita</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            <span>Recusada</span>
          </span>
        );
      case 'expired':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>Expirada</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-fadeIn">
      
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121212] border border-[#27272A] rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#374151] shadow-lg shadow-xs">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-display">
              Propostas Comerciais
            </h1>
            <p className="text-xs text-[#4B5563]">
              Crie apresentações comerciais elegantes, personalizadas e gere o PDF TFIVE PRO para seus alunos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenTemplates}
            className="px-4 py-2.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-zinc-300 hover:text-white text-xs font-bold transition-all border border-[#27272A] flex items-center gap-2"
          >
            <LayoutTemplate className="w-4 h-4 text-[#374151]" />
            <span>Modelos Salvos</span>
          </button>

          <button
            onClick={onNewProposal}
            className="px-5 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Proposta</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      {proposals.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block">
              Total de Propostas
            </span>
            <div className="text-2xl font-black text-white font-mono-nums">
              {metrics.totalCount}
            </div>
            <span className="text-[10px] text-zinc-600 block">
              {metrics.sentCount} enviada(s) em aberto
            </span>
          </div>

          <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block">
              Propostas Fechadas / Aceitas
            </span>
            <div className="text-2xl font-black text-emerald-400 font-mono-nums flex items-center gap-2">
              <span>{metrics.acceptedCount}</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-emerald-500/80 block">
              Taxa de conversão: {metrics.conversionRate}%
            </span>
          </div>

          <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block">
              Volume Fechado (Aceito)
            </span>
            <div className="text-xl font-black text-emerald-400 font-mono-nums">
              {formatCurrencyCents(metrics.totalAcceptedVolumeCents)}
            </div>
            <span className="text-[10px] text-zinc-600 block">
              Em contratos aceitos
            </span>
          </div>

          <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block">
              Volume em Negociação
            </span>
            <div className="text-xl font-black text-[#374151] font-mono-nums">
              {formatCurrencyCents(metrics.totalOpenVolumeCents)}
            </div>
            <span className="text-[10px] text-zinc-600 block">
              Em rascunho / enviadas
            </span>
          </div>
        </div>
      )}

      {/* Global Filter & Search Bar */}
      <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-4 space-y-4">
        
        {/* Top Search & Filter row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome do aluno, título da proposta ou serviço..."
              className="w-full bg-[#18181B] border border-[#27272A] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#374151] transition-colors"
            />
          </div>

          {/* Student Filter */}
          <div className="sm:w-60">
            <select
              value={selectedStudentFilter}
              onChange={e => setSelectedStudentFilter(e.target.value)}
              className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#374151] transition-colors"
            >
              <option value="all">Todos os Alunos</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="sm:w-52">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#374151] transition-colors"
            >
              <option value="created_desc">Mais Recentes</option>
              <option value="created_asc">Mais Antigas</option>
              <option value="student_asc">Aluno (A-Z)</option>
              <option value="amount_desc">Maior Valor</option>
              <option value="validity_asc">Vencimento Próximo</option>
            </select>
          </div>
        </div>

        {/* Status Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {STATUS_TABS.map(tab => {
            const count = tab.id === 'all' 
              ? proposals.length 
              : proposals.filter(p => p.status === tab.id).length;

            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-[#374151] text-white shadow-md shadow-xs'
                    : 'bg-[#18181B] text-[#4B5563] hover:text-white border border-[#27272A]'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${statusFilter === tab.id ? 'bg-black/25 text-white' : 'bg-zinc-800 text-zinc-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Proposals Grid */}
      {filteredProposals.length === 0 ? (
        <div className="bg-[#121212] border border-dashed border-[#27272A] rounded-2xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#18181B] border border-[#27272A] flex items-center justify-center text-zinc-600 mx-auto">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Nenhuma proposta encontrada</h3>
            <p className="text-xs text-[#4B5563] max-w-sm mx-auto mt-1">
              {searchTerm || statusFilter !== 'all' 
                ? 'Tente alterar os termos de busca ou os filtros aplicados.' 
                : 'Crie sua primeira proposta comercial profissional para apresentar seus planos de acompanhamento.'}
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={onOpenTemplates}
              className="px-4 py-2.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-zinc-300 hover:text-white text-xs font-bold transition-all border border-[#27272A] flex items-center gap-2"
            >
              <LayoutTemplate className="w-4 h-4 text-[#374151]" />
              <span>Ver Modelos</span>
            </button>

            <button
              onClick={onNewProposal}
              className="px-5 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-xs flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Proposta</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProposals.map(proposal => {
            const recommendedPlan = proposal.plans.find(p => p.isRecommended) || proposal.plans[0];
            const isMenuOpen = activeMenuProposalId === proposal.id;

            return (
              <div
                key={proposal.id}
                className="bg-[#121212] border border-[#27272A] hover:border-[#374151]/50 rounded-2xl p-5 transition-all flex flex-col justify-between space-y-4 group shadow-lg relative"
              >
                {/* Top Card Header */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(proposal.status)}
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {formatPlanTypeLabel(proposal.planType || 'individual')}
                      </span>
                    </div>

                    {/* Quick Menu Button */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuProposalId(isMenuOpen ? null : proposal.id)}
                        className="p-1 rounded-lg text-zinc-600 hover:text-white hover:bg-[#27272A] transition-all"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-0 top-7 z-30 w-44 bg-[#18181B] border border-[#27272A] rounded-xl shadow-2xl p-1 text-xs space-y-0.5 animate-fadeIn">
                          <button
                            onClick={() => {
                              onSelectProposal(proposal);
                              setActiveMenuProposalId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-[#27272A] transition-all flex items-center gap-2"
                          >
                            <FileText className="w-3.5 h-3.5 text-zinc-600" />
                            <span>Ver Detalhes</span>
                          </button>

                          <button
                            onClick={() => {
                              onDuplicate(proposal);
                              setActiveMenuProposalId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-[#27272A] transition-all flex items-center gap-2"
                          >
                            <Copy className="w-3.5 h-3.5 text-zinc-600" />
                            <span>Duplicar</span>
                          </button>

                          <button
                            onClick={() => {
                              onCreateRevision(proposal);
                              setActiveMenuProposalId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-[#27272A] transition-all flex items-center gap-2"
                          >
                            <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Criar Revisão</span>
                          </button>

                          <div className="border-t border-[#27272A] my-1" />

                          <button
                            onClick={() => {
                              setActiveMenuProposalId(null);
                              onDelete(proposal.id);
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 
                      onClick={() => onSelectProposal(proposal)}
                      className="text-base font-black text-white uppercase tracking-tight font-display hover:text-[#1F2937] cursor-pointer transition-colors line-clamp-1"
                    >
                      {proposal.title}
                    </h3>
                    <p className="text-xs text-zinc-600 flex items-center gap-1.5 mt-0.5">
                      <User className="w-3.5 h-3.5 text-[#374151]" />
                      <span className="font-bold text-white">
                        {proposal.participants && proposal.participants.length > 1
                          ? proposal.participants.map(p => p.nameSnapshot?.trim()).filter(Boolean).join(' & ') || proposal.studentSnapshot.name
                          : proposal.studentSnapshot.name}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Plan Highlights */}
                {recommendedPlan && (
                  <div className="bg-[#18181B] rounded-xl p-3.5 border border-[#27272A] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-600 font-medium">
                        {recommendedPlan.name} ({recommendedPlan.durationMonths}m)
                      </span>
                      <span className="text-[#374151] font-black font-mono-nums">
                        {formatCurrencyCents(recommendedPlan.pricing.equivalentMonthlyAmountCents)}/mês
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-600 border-t border-zinc-800 pt-1.5">
                      <span>Total: {formatCurrencyCents(recommendedPlan.pricing.finalAmountCents)}</span>
                      <span>{recommendedPlan.pricing.installments}× {formatCurrencyCents(recommendedPlan.pricing.installmentAmountCents)}</span>
                    </div>
                  </div>
                )}

                {/* Bottom Footer Details & Quick Action Buttons */}
                <div className="space-y-3 pt-2 border-t border-[#27272A]">
                  <div className="flex items-center justify-between text-[11px] text-zinc-600">
                    <span>Criada: {formatDate(proposal.createdAt)}</span>
                    {proposal.validUntil && (
                      <span className="text-amber-400/90 font-medium">
                        Válida até: {formatDate(proposal.validUntil)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => onEditProposal(proposal)}
                      className="flex-1 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-zinc-300 hover:text-white text-xs font-bold transition-all border border-[#27272A] flex items-center justify-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => onOpenPDF(proposal)}
                      className="flex-1 py-2 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Ver PDF</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
