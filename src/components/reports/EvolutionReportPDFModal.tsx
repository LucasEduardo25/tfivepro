import React, { useRef } from 'react';
import { 
  X, 
  Printer, 
  Dumbbell, 
  Trophy, 
  Calendar, 
  Flame, 
  Award, 
  Zap, 
  Activity, 
  HeartPulse, 
  Scale, 
  CheckCircle2, 
  ShieldCheck, 
  FileText
} from 'lucide-react';
import { 
  EvolutionReport, 
  Student 
} from '../../types';
import { useApp } from '../../context/AppContext';

interface EvolutionReportPDFModalProps {
  report: EvolutionReport;
  student: Student;
  onClose: () => void;
}

export const EvolutionReportPDFModal: React.FC<EvolutionReportPDFModalProps> = ({
  report,
  student,
  onClose
}) => {
  const { trainerProfile } = useApp();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Container */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn">
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="no-print p-4 bg-[#F8F9FA] border-b border-[#E5E7EB] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#374151]/15 border border-[#374151]/30 flex items-center justify-center text-[#374151]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#262626]">
                Visualização de Impressão & Exportação PDF
              </h2>
              <p className="text-[11px] text-[#4B5563]">
                {report.title} — {student.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all shadow-md shadow-xs flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#4B5563] hover:text-white hover:bg-[#27272A] transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Container */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-[#0A0A0A]">
          
          {/* Printable Sheet */}
          <div 
            ref={printRef}
            className="print-container bg-white text-zinc-900 rounded-2xl p-6 sm:p-10 max-w-4xl mx-auto shadow-xl space-y-6 font-sans"
            style={{
              colorScheme: 'light',
              color: '#18181B'
            }}
          >
            
            {/* DOCUMENT HEADER */}
            <div className="flex items-start justify-between border-b-2 border-[#374151] pb-5 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-[#374151] text-white text-[11px] font-black tracking-widest px-2.5 py-0.5 rounded uppercase">
                    TFIVE PRO
                  </span>
                  <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">
                    Relatório Oficial de Evolução & Performance
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
                  {report.title}
                </h1>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Período Analisado: <strong>{report.startDate} a {report.endDate}</strong> ({report.durationDays} dias) • Tipo: <strong>{report.periodType}</strong>
                </p>
              </div>

              {/* Student & Trainer Quick Badge */}
              <div className="text-right shrink-0">
                <p className="text-sm font-black text-zinc-950">{student.name}</p>
                <p className="text-[11px] text-zinc-600">Meta: <strong>{report.primaryGoal}</strong></p>
                <p className="text-[11px] text-zinc-600">Personal: {report.trainerOpinion?.trainerName || report.trainerProfile?.name || trainerProfile.name}</p>
                <p className="text-[10px] text-zinc-600">CREF: {report.trainerOpinion?.trainerCref || report.trainerProfile?.cref || trainerProfile.cref || '—'}</p>
              </div>
            </div>

            {/* EXECUTIVE SCORE & HIGHLIGHTS HERO */}
            <div className="bg-zinc-900 text-white rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 break-inside-avoid">
              <div>
                <span className="text-[11px] text-zinc-600 uppercase font-bold tracking-wider block">
                  TFIVE Evolution Score
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-5xl font-black font-mono text-white flex items-center gap-2">
                    <Zap className="w-8 h-8 text-[#374151] fill-[#374151]" />
                    {report.evolutionScore?.overallScore || 0}
                  </span>
                  <span className="text-sm text-zinc-600 font-bold">/100 pts</span>
                </div>
                <div className="mt-2 inline-block px-3 py-1 rounded bg-[#374151] text-white text-xs font-black uppercase tracking-wider">
                  Status: {report.periodStatus}
                </div>
              </div>

              {/* Mini Dimension Indicators */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-zinc-700 pt-4 sm:pt-0 sm:pl-6">
                {Object.entries(report.evolutionScore?.dimensions || {}).map(([k, dim]) => (
                  <div key={k} className="flex items-center justify-between gap-3">
                    <span className="text-zinc-300">{dim.label}:</span>
                    <span className="font-mono font-bold text-white">{dim.score}/100</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 4 SUMMARY STATS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 break-inside-avoid">
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 text-center">
                <span className="text-[10px] text-zinc-600 uppercase font-bold block">Adesão ao Plano</span>
                <span className="text-2xl font-black font-mono text-emerald-600">
                  {report.adherence?.adherenceRatePercent || 0}%
                </span>
                <span className="text-[10px] text-zinc-600 block mt-0.5">
                  {report.adherence?.completedSessions || 0} treinos feitos
                </span>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 text-center">
                <span className="text-[10px] text-zinc-600 uppercase font-bold block">Exercícios Avaliados</span>
                <span className="text-2xl font-black font-mono text-zinc-900">
                  {report.exerciseProgressions?.length || 0}
                </span>
                <span className="text-[10px] text-zinc-600 block mt-0.5">
                  {report.performanceHighlights?.length || 0} recordes/marcas
                </span>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 text-center">
                <span className="text-[10px] text-zinc-600 uppercase font-bold block">Composição Corporal</span>
                <span className="text-2xl font-black font-mono text-zinc-900">
                  {report.physicalComparison?.hasData ? `${report.physicalComparison.metrics?.find(m => m.key === 'weight')?.final || '—'} kg` : '—'}
                </span>
                <span className="text-[10px] text-zinc-600 block mt-0.5">
                  {report.physicalComparison?.hasData ? `${report.physicalComparison.metrics?.find(m => m.key === 'bodyFat')?.final || '—'}% gordura` : 'Sem avaliação'}
                </span>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 text-center">
                <span className="text-[10px] text-zinc-600 uppercase font-bold block">Score Funcional</span>
                <span className="text-2xl font-black font-mono text-emerald-600">
                  {report.evolutionScore?.dimensions?.functionalCapacity?.score || 0} pts
                </span>
                <span className="text-[10px] text-zinc-600 block mt-0.5">
                  {report.functionalComparison?.tests?.length || 0} testes aplicados
                </span>
              </div>
            </div>

            {/* ACHIEVEMENTS */}
            {report.achievements && report.achievements.length > 0 && (
              <div className="border border-zinc-200 rounded-xl p-4 break-inside-avoid space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-950 flex items-center gap-1.5 border-b border-zinc-200 pb-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>Conquistas & Destaques de Performance</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {report.achievements.map(ach => (
                    <div key={ach.id} className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-200 text-xs">
                      <strong className="text-zinc-950 block">{ach.title}</strong>
                      <span className="text-zinc-600 text-[11px]">{ach.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STRENGTH PROGRESSION */}
            {report.exerciseProgressions && report.exerciseProgressions.length > 0 && (
              <div className="border border-zinc-200 rounded-xl p-4 break-inside-avoid space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-zinc-950 flex items-center gap-1.5">
                    <Dumbbell className="w-4 h-4 text-[#374151]" />
                    <span>Progressão de Cargas & Força</span>
                  </h3>
                </div>

                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-600 uppercase text-[10px]">
                      <th className="pb-2">Exercício</th>
                      <th className="pb-2 text-center">Carga Inicial</th>
                      <th className="pb-2 text-center">Carga Final</th>
                      <th className="pb-2 text-center">Evolução (%)</th>
                      <th className="pb-2 text-right">Melhor Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-mono">
                    {report.exerciseProgressions.map((ex, i) => (
                      <tr key={i}>
                        <td className="py-2 font-sans font-bold text-zinc-900">{ex.exerciseName}</td>
                        <td className="py-2 text-center text-zinc-600">{ex.initialLoadKg} kg</td>
                        <td className="py-2 text-center font-bold text-zinc-950">{ex.finalLoadKg} kg</td>
                        <td className="py-2 text-center font-bold text-emerald-600">
                          {ex.deltaPercent >= 0 ? `+${ex.deltaPercent}%` : `${ex.deltaPercent}%`}
                        </td>
                        <td className="py-2 text-right text-zinc-600">{ex.bestSetVolumeKg?.toLocaleString('pt-BR')} kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* PHYSICAL & FUNCTIONAL COMPARISONS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 break-inside-avoid">
              
              {/* Physical */}
              <div className="border border-zinc-200 rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-950 flex items-center gap-1.5 border-b border-zinc-200 pb-2">
                  <Scale className="w-4 h-4 text-[#374151]" />
                  <span>Composição Corporal</span>
                </h3>
                {report.physicalComparison?.hasData ? (
                  <div className="space-y-1.5 text-xs">
                    {(report.physicalComparison.metrics || []).slice(0, 4).map((m, idx) => (
                      <div key={idx} className="flex justify-between py-1 border-b border-zinc-100">
                        <span className="text-zinc-600">{m.label}:</span>
                        <span className="font-mono font-bold text-zinc-900">
                          {m.initial} → {m.final} {m.unit} ({m.deltaPercent >= 0 ? `+${m.deltaPercent}%` : `${m.deltaPercent}%`})
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600 py-3 text-center">Sem dados de avaliação física</p>
                )}
              </div>

              {/* Functional */}
              <div className="border border-zinc-200 rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-950 flex items-center gap-1.5 border-b border-zinc-200 pb-2">
                  <HeartPulse className="w-4 h-4 text-[#374151]" />
                  <span>Longevidade & Capacidade Funcional</span>
                </h3>
                {report.functionalComparison?.hasData && report.functionalComparison.tests?.length ? (
                  <div className="space-y-1.5 text-xs">
                    {report.functionalComparison.tests.slice(0, 4).map((t, idx) => (
                      <div key={idx} className="flex justify-between py-1 border-b border-zinc-100">
                        <span className="text-zinc-600">{t.testName}:</span>
                        <span className="font-mono font-bold text-zinc-900">
                          {t.finalValue} {t.unit || ''} ({t.statusLabel})
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600 py-3 text-center">Sem bateria funcional vinculada</p>
                )}
              </div>

            </div>

            {/* TRAINER OPINION */}
            <div className="border border-zinc-200 rounded-xl p-4 break-inside-avoid space-y-2.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-950 flex items-center gap-1.5 border-b border-zinc-200 pb-2">
                <FileText className="w-4 h-4 text-[#374151]" />
                <span>Parecer Técnico do Personal Trainer</span>
              </h3>
              <p className="text-xs text-zinc-700 leading-relaxed bg-zinc-50 p-3 rounded-lg border border-zinc-200 italic">
                &quot;{report.trainerOpinion?.summaryStatement || 'O aluno cumpriu o planejamento com consistência e dedicação.'}&quot;
              </p>

              {report.trainerOpinion?.observedEvolution && (
                <p className="text-xs text-zinc-700">
                  <strong className="text-zinc-950">Evolução Observada: </strong>
                  {report.trainerOpinion.observedEvolution}
                </p>
              )}
            </div>

            {/* NEXT CYCLE PLAN & SIGNATURE */}
            <div className="border-t-2 border-zinc-300 pt-6 flex items-center justify-between text-xs text-zinc-600 break-inside-avoid">
              <div>
                <p className="font-black text-zinc-950 text-sm">TFIVE PRO</p>
                <p className="text-[10px]">Sistema Oficial de Treinamento & Alta Performance</p>
                {report.nextCyclePlan?.newPrimaryGoal && (
                  <p className="text-[11px] text-zinc-700 mt-1">
                    Próxima Meta: <strong>{report.nextCyclePlan.newPrimaryGoal}</strong>
                  </p>
                )}
              </div>

              <div className="text-center">
                <div className="w-52 border-b border-zinc-400 mb-1" />
                <p className="font-black text-zinc-950">{report.trainerOpinion?.trainerName || report.trainerProfile?.name || trainerProfile.name}</p>
                <p className="text-[10px] text-zinc-600">CREF: {report.trainerOpinion?.trainerCref || report.trainerProfile?.cref || trainerProfile.cref || 'Personal Trainer'}</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
