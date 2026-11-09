import React, { useState } from 'react';
import { 
  EvolutionReport, 
  Student 
} from '../../types';
import { useApp } from '../../context/AppContext';
import { 
  ArrowLeft, 
  Calendar, 
  Flame, 
  Award, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Printer, 
  Share2, 
  Edit, 
  Zap, 
  Activity, 
  HeartPulse, 
  Scale, 
  Dumbbell, 
  ShieldCheck, 
  Trophy, 
  FileText, 
  Check, 
  AlertTriangle 
} from 'lucide-react';
import { StudentAvatar } from '../common/StudentAvatar';

interface EvolutionReportDetailViewProps {
  report: EvolutionReport;
  onBack: () => void;
  onEdit: (report: EvolutionReport) => void;
  onPrint: (report: EvolutionReport) => void;
}

export const EvolutionReportDetailView: React.FC<EvolutionReportDetailViewProps> = ({
  report,
  onBack,
  onEdit,
  onPrint
}) => {
  const { students, trainerProfile } = useApp();
  const [copiedShareLink, setCopiedShareLink] = useState<boolean>(false);

  const student = students.find(s => s.id === report.studentId);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: report.title,
          text: `Relatório de Performance & Evolução de ${report.studentName} — TFIVE PRO Score: ${report.evolutionScore?.overallScore}/100`,
          url: window.location.href
        });
        return;
      } catch (err) {
        // fallback
      }
    }

    try {
      await navigator.clipboard.writeText(
        `*TFIVE PRO — Relatório de Evolução*\nAluno: ${report.studentName}\nPeríodo: ${report.startDate} a ${report.endDate}\nEvolution Score: ${report.evolutionScore?.overallScore}/100\nAdesão: ${report.adherence?.adherenceRatePercent}%\nStatus: ${report.periodStatus}`
      );
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const isFinalized = report.status === 'finalized';

  return (
    <div className="space-y-6 select-none animate-fadeIn pb-12">
      {/* Top Action Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] text-[#374151] hover:text-white border border-[#E5E7EB] transition-all flex items-center gap-2 text-xs font-bold font-display uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                isFinalized 
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}>
                {isFinalized ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {isFinalized ? 'Finalizado' : 'Rascunho'}
              </span>

              <span className="text-xs text-[#4B5563] font-bold">
                {report.periodType} ({report.durationDays} dias)
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-[#1F2937] tracking-tight mt-0.5">
              {report.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="px-3.5 py-2.5 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] text-[#374151] hover:text-white text-xs font-bold font-display uppercase tracking-wider border border-[#E5E7EB] transition-all flex items-center gap-1.5"
            title="Compartilhar resumo"
          >
            {copiedShareLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-[#4B5563]" />}
            <span>{copiedShareLink ? 'Copiado!' : 'Compartilhar'}</span>
          </button>

          <button
            onClick={() => onEdit(report)}
            className="px-3.5 py-2.5 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] text-[#374151] hover:text-white text-xs font-bold font-display uppercase tracking-wider border border-[#E5E7EB] transition-all flex items-center gap-1.5"
            title="Editar relatório"
          >
            <Edit className="w-4 h-4 text-[#4B5563]" />
            <span>Editar</span>
          </button>

          <button
            onClick={() => onPrint(report)}
            className="px-4 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all shadow-md shadow-xs flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Gerar PDF / Imprimir</span>
          </button>
        </div>
      </div>

      {/* EXECUTIVE HERO SCORE & PROFILE CARD */}
      <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#374151]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
          
          {/* Left: Student info */}
          <div className="flex items-center gap-5 w-full lg:w-auto">
            {student && (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-[#374151] shadow-lg shrink-0">
                <StudentAvatar student={student} className="w-full h-full object-cover" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded bg-[#F8F9FA] text-[10px] font-black uppercase tracking-wider text-white border border-[#E5E7EB]">
                  TFIVE PRO RELATÓRIO
                </span>
                <span className="text-xs text-[#4B5563] font-mono-nums">
                  {report.startDate} a {report.endDate}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#1F2937] tracking-tight">
                {report.studentName}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#4B5563] mt-1">
                <span>Objetivo: <strong className="text-white">{report.primaryGoal}</strong></span>
                <span>•</span>
                <span>Treinador: <strong className="text-white">{report.trainerOpinion?.trainerName || report.trainerProfile?.name || trainerProfile.name}</strong></span>
              </div>
            </div>
          </div>

          {/* Right: Big Score Radial Indicator */}
          <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto shrink-0 shadow-lg">
            <div className="text-center sm:text-left">
              <span className="text-[11px] text-[#4B5563] uppercase font-bold tracking-wider block mb-1">
                TFIVE Evolution Score
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-[#1F2937] font-mono-nums tracking-tighter flex items-center gap-2">
                  <Zap className="w-8 h-8 text-[#374151] fill-[#374151]" />
                  {report.evolutionScore?.overallScore || 0}
                </span>
                <span className="text-sm font-bold text-[#4B5563]">/100</span>
              </div>
              <div className="mt-1.5 inline-block px-3 py-1 rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] text-[#374151] text-xs font-black uppercase tracking-wider">
                {report.periodStatus}
              </div>
            </div>

            {/* Score Dimensions Breakdown */}
            <div className="space-y-1.5 w-full sm:w-56 text-[11px] pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-[#E5E7EB] sm:pl-5">
              {Object.entries(report.evolutionScore?.dimensions || {}).map(([key, dim]) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span className="text-[#4B5563] truncate">{dim.label}</span>
                  <div className="flex items-center gap-1.5 shrink-0 font-mono-nums font-bold">
                    <div className="w-12 h-1.5 bg-[#27272A] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#374151] rounded-full" 
                        style={{ width: `${Math.min(100, Math.max(0, dim.score))}%` }}
                      />
                    </div>
                    <span className="text-white text-[10px] w-6 text-right">{dim.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* 4 KEY EXECUTIVE CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Adherence */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-[#4B5563] mb-2">
            <span className="font-bold uppercase tracking-wider">Taxa de Adesão</span>
            <Flame className="w-4 h-4 text-[#374151]" />
          </div>
          <p className="text-3xl font-black font-display text-emerald-400 font-mono-nums">
            {report.adherence?.adherenceRatePercent || 0}%
          </p>
          <div className="text-xs text-[#4B5563] mt-2 space-y-0.5">
            <div><strong>{report.adherence?.completedSessions || 0}</strong> de {report.adherence?.plannedSessions || 0} treinos</div>
            <div>Média: <strong>{report.adherence?.avgWeeklyFrequency || 0}x / semana</strong></div>
          </div>
        </div>

        {/* Strength Progression */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-[#4B5563] mb-2">
            <span className="font-bold uppercase tracking-wider">Exercícios Monitorados</span>
            <Dumbbell className="w-4 h-4 text-[#374151]" />
          </div>
          <p className="text-3xl font-black text-[#1F2937] font-mono-nums">
            {report.exerciseProgressions?.length || 0}
          </p>
          <div className="text-xs text-[#4B5563] mt-2 space-y-0.5">
            <div>Exercícios avaliados</div>
            <div><strong>{report.performanceHighlights?.length || 0} recordes / destaques</strong></div>
          </div>
        </div>

        {/* Physical Assessment */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-[#4B5563] mb-2">
            <span className="font-bold uppercase tracking-wider">Composição Corporal</span>
            <Scale className="w-4 h-4 text-[#374151]" />
          </div>
          {report.physicalComparison?.hasData ? (
            <div>
              <p className="text-3xl font-black text-[#1F2937] font-mono-nums">
                {report.physicalComparison.metrics?.find(m => m.key === 'weight')?.final || '—'} <span className="text-sm font-normal text-[#4B5563]">kg</span>
              </p>
              <div className="text-xs text-[#4B5563] mt-2 space-y-0.5">
                <div>% Gordura: <strong>{report.physicalComparison.metrics?.find(m => m.key === 'bodyFat')?.final || '—'}%</strong></div>
                <div>Massa Magra: <strong>{report.physicalComparison.metrics?.find(m => m.key === 'leanMass')?.final || '—'} kg</strong></div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xl font-bold text-[#4B5563] mt-2">Sem avaliação</p>
              <p className="text-xs text-[#4B5563] mt-1">Nenhum dado cadastrado</p>
            </div>
          )}
        </div>

        {/* Functional Longevity */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-[#4B5563] mb-2">
            <span className="font-bold uppercase tracking-wider">Longevidade Funcional</span>
            <HeartPulse className="w-4 h-4 text-[#374151]" />
          </div>
          {report.functionalComparison?.hasData ? (
            <div>
              <p className="text-3xl font-black font-display text-emerald-400 font-mono-nums">
                {report.evolutionScore?.dimensions?.functionalCapacity?.score || 0} <span className="text-sm font-normal text-[#4B5563]">pts</span>
              </p>
              <div className="text-xs text-[#4B5563] mt-2 space-y-0.5">
                <div>{report.functionalComparison.tests?.length || 0} testes aplicados</div>
                <div className="text-emerald-400 font-bold">Capacidade Otimizada</div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xl font-bold text-[#4B5563] mt-2">Sem testes</p>
              <p className="text-xs text-[#4B5563] mt-1">Bateria não vinculada</p>
            </div>
          )}
        </div>

      </div>

      {/* ACHIEVEMENTS GRID */}
      {report.achievements && report.achievements.length > 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black text-[#1F2937] uppercase tracking-wider">
              Conquistas & Destaques do Ciclo
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {report.achievements.map((ach) => (
              <div key={ach.id} className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5">{ach.title}</h4>
                  <p className="text-[11px] text-[#4B5563] leading-relaxed">{ach.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STRENGTH PROGRESSION TABLE */}
      {report.exerciseProgressions && report.exerciseProgressions.length > 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-[#374151]" />
              <h3 className="text-base font-black text-[#1F2937] uppercase tracking-wider">
                Evolução de Cargas & Força
              </h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-[#4B5563] uppercase font-bold text-[10px]">
                  <th className="pb-3 pr-4">Exercício</th>
                  <th className="pb-3 px-3 text-center">Carga Inicial</th>
                  <th className="pb-3 px-3 text-center">Carga Final</th>
                  <th className="pb-3 px-3 text-center">Delta (kg)</th>
                  <th className="pb-3 px-3 text-center">Evolução (%)</th>
                  <th className="pb-3 pl-3 text-right">Melhor Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]/50">
                {report.exerciseProgressions.map((ex, idx) => (
                  <tr key={idx} className="hover:bg-[#F8F9FA]/50 transition-colors">
                    <td className="py-3.5 pr-4 font-bold text-white">
                      {ex.exerciseName}
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono-nums text-[#4B5563]">
                      {ex.initialLoadKg} kg
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono-nums text-[#1F2937] font-bold">
                      {ex.finalLoadKg} kg
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono-nums font-bold">
                      <span className={ex.deltaKg >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {ex.deltaKg >= 0 ? `+${ex.deltaKg}` : ex.deltaKg} kg
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono-nums font-bold">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        ex.deltaPercent >= 0 
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}>
                        {ex.deltaPercent >= 0 ? `+${ex.deltaPercent}%` : `${ex.deltaPercent}%`}
                      </span>
                    </td>
                    <td className="py-3.5 pl-3 text-right font-mono-nums text-[#4B5563]">
                      {ex.bestSetVolumeKg?.toLocaleString('pt-BR')} kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TWO COLUMNS: PHYSICAL COMP & FUNCTIONAL TESTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Physical Assessment Details */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#374151]" />
            <h3 className="text-base font-black text-[#1F2937] uppercase tracking-wider">
              Composição Corporal
            </h3>
          </div>

          {report.physicalComparison?.hasData ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-xs">
                {(report.physicalComparison.metrics || []).slice(0, 6).map((m, i) => (
                  <div key={i} className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E7EB]">
                    <span className="text-[10px] text-[#4B5563] uppercase block font-bold truncate">{m.label}</span>
                    <div className="font-bold text-white font-mono-nums mt-1">
                      {m.initial} → {m.final} {m.unit}
                    </div>
                    <span className={`text-[10px] font-bold ${m.deltaPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {m.deltaPercent >= 0 ? `+${m.deltaPercent}%` : `${m.deltaPercent}%`}
                    </span>
                  </div>
                ))}
              </div>

              {report.physicalComparison.skinfoldSumInitial !== undefined && (
                <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E7EB] flex items-center justify-between text-xs font-mono-nums">
                  <span className="text-[#4B5563]">Soma das Dobras Cutâneas:</span>
                  <span className="text-[#1F2937] font-bold">
                    {report.physicalComparison.skinfoldSumInitial} → {report.physicalComparison.skinfoldSumFinal} mm ({report.physicalComparison.skinfoldSumDeltaPercent}%)
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-[#4B5563] py-8 text-center">
              Nenhuma avaliação física cadastrada no período.
            </div>
          )}
        </div>

        {/* Functional Longevity Tests */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-[#374151]" />
            <h3 className="text-base font-black text-[#1F2937] uppercase tracking-wider">
              Testes de Longevidade Funcional
            </h3>
          </div>

          {report.functionalComparison?.hasData && report.functionalComparison.tests?.length ? (
            <div className="space-y-2.5">
              {report.functionalComparison.tests.map((t, idx) => (
                <div key={idx} className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">{t.testName}</div>
                    <div className="text-[11px] text-[#4B5563]">{t.domain}</div>
                  </div>
                  <div className="text-right font-mono-nums">
                    <span className="font-bold text-white block">
                      {t.initialValue ? `${t.initialValue} → ` : ''}{t.finalValue} {t.unit || ''}
                    </span>
                    <span className="text-[10px] text-emerald-400 uppercase font-bold">
                      {t.statusLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-[#4B5563] py-8 text-center">
              Nenhuma bateria funcional realizada no período.
            </div>
          )}
        </div>

      </div>

      {/* DAILY LIFE IMPACT */}
      {report.dailyLivingImpact?.indicators && report.dailyLivingImpact.indicators.length > 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#374151]" />
              <h3 className="text-base font-black text-[#1F2937] uppercase tracking-wider">
                Impacto na Vida Diária & Funcionalidade
              </h3>
            </div>
            <span className="text-xs text-[#4B5563]">Escala de 0 a 10</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {report.dailyLivingImpact.indicators.map((item, idx) => (
              <div key={idx} className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">{item.name}</span>
                  <span className="font-black font-display text-[#374151] font-mono-nums">
                    {item.score}/10
                  </span>
                </div>
                <div className="w-full h-2 bg-[#27272A] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#374151] rounded-full" 
                    style={{ width: `${(item.score / 10) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TRAINER PROFESSIONAL OPINION & NEXT CYCLE PLAN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Trainer Opinion */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#374151]" />
            <h3 className="text-base font-black text-[#1F2937] uppercase tracking-wider">
              Parecer Técnico do Treinador
            </h3>
          </div>

          <div className="text-xs text-[#262626] leading-relaxed bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-4">
            {report.trainerOpinion?.summaryStatement || 'Nenhum parecer técnico registrado.'}
          </div>

          {/* Observed Evolution & Improvement Areas */}
          <div className="space-y-3 pt-2">
            {report.trainerOpinion?.observedEvolution && (
              <div>
                <h4 className="text-xs font-bold text-emerald-400 uppercase mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Evolução Observada</span>
                </h4>
                <p className="text-xs text-[#374151] leading-relaxed bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E7EB]">
                  {report.trainerOpinion.observedEvolution}
                </p>
              </div>
            )}

            {report.trainerOpinion?.improvementAreas && (
              <div>
                <h4 className="text-xs font-bold text-amber-400 uppercase mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Oportunidades de Melhoria</span>
                </h4>
                <p className="text-xs text-[#374151] leading-relaxed bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E7EB]">
                  {report.trainerOpinion.improvementAreas}
                </p>
              </div>
            )}
          </div>

          {/* Trainer Signature */}
          <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-white">{report.trainerOpinion?.trainerName || trainerProfile.name}</div>
              <div className="text-[11px] text-[#4B5563]">CREF: {report.trainerOpinion?.trainerCref || trainerProfile.cref || 'Não informado'}</div>
            </div>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* Next Cycle Plan */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#374151]" />
            <h3 className="text-base font-black text-[#1F2937] uppercase tracking-wider">
              Planejamento do Próximo Ciclo
            </h3>
          </div>

          <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-4 space-y-3 text-xs">
            {report.nextCyclePlan?.newPrimaryGoal && (
              <div>
                <span className="text-[10px] text-[#4B5563] uppercase font-bold block">Meta Principal</span>
                <span className="text-white font-semibold">
                  {report.nextCyclePlan.newPrimaryGoal}
                </span>
              </div>
            )}

            {report.nextCyclePlan?.nextAssessmentTargetDate && (
              <div>
                <span className="text-[10px] text-[#4B5563] uppercase font-bold block">Previsão Próximo Relatório</span>
                <span className="text-[#374151] font-mono-nums">
                  {report.nextCyclePlan.nextAssessmentTargetDate}
                </span>
              </div>
            )}
          </div>

          {/* 4 Quadrants: Manter / Progredir / Priorizar / Monitorar */}
          {report.nextCyclePlan && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {report.nextCyclePlan.maintainList?.length > 0 && (
                <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E7EB]">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold block mb-1">Manter</span>
                  <ul className="text-[11px] text-[#4B5563] space-y-1">
                    {report.nextCyclePlan.maintainList.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {report.nextCyclePlan.progressList?.length > 0 && (
                <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E7EB]">
                  <span className="text-[10px] text-[#374151] uppercase font-bold block mb-1">Progredir</span>
                  <ul className="text-[11px] text-[#4B5563] space-y-1">
                    {report.nextCyclePlan.progressList.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {report.nextCyclePlan.prioritizeList?.length > 0 && (
                <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E7EB]">
                  <span className="text-[10px] text-amber-400 uppercase font-bold block mb-1">Priorizar</span>
                  <ul className="text-[11px] text-[#4B5563] space-y-1">
                    {report.nextCyclePlan.prioritizeList.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {report.nextCyclePlan.monitorList?.length > 0 && (
                <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E7EB]">
                  <span className="text-[10px] text-sky-400 uppercase font-bold block mb-1">Monitorar</span>
                  <ul className="text-[11px] text-[#4B5563] space-y-1">
                    {report.nextCyclePlan.monitorList.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
