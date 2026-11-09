import React, { useState } from 'react';
import { 
  EvolutionReport, 
  Student,
  ReportPeriodType,
  StudentReportGoal,
  ReportPeriodStatus,
  ReportAchievement,
  DailyLivingIndicator
} from '../../types';
import { useApp } from '../../context/AppContext';
import { generateEvolutionReport } from '../../utils/evolutionReportEngine';
import { 
  X, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Calendar, 
  Flame, 
  Award, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Printer, 
  Sparkles, 
  Plus, 
  Trash2, 
  Zap, 
  Activity, 
  HeartPulse, 
  Scale, 
  Dumbbell, 
  ShieldCheck, 
  Trophy, 
  FileText 
} from 'lucide-react';
import { StudentAvatar } from '../common/StudentAvatar';

interface NewEvolutionReportWizardModalProps {
  student: Student;
  reportToEdit?: EvolutionReport | null;
  onClose: () => void;
  onSaved: (report: EvolutionReport) => void;
}

export const NewEvolutionReportWizardModal: React.FC<NewEvolutionReportWizardModalProps> = ({
  student,
  reportToEdit,
  onClose,
  onSaved
}) => {
  const { 
    sessions, 
    assessments, 
    routines, 
    exercises, 
    trainerProfile, 
    functionalAssessments,
    functionalGoals,
    schedule,
    scheduleRecurrences,
    saveEvolutionReport 
  } = useApp();

  // Wizard Steps:
  // 1: Parâmetros & Período
  // 2: Dashboard & Métricas-Chave (Score, Adesão, Força, Dobras/Funcional)
  // 3: Parecer Técnico do Treinador
  // 4: Metas & Planejamento do Próximo Ciclo
  // 5: Revisão & Finalização
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Period Form State
  const defaultPeriodType: ReportPeriodType = reportToEdit?.periodType || 'Trimestral';
  const defaultGoal: StudentReportGoal = (student.goal as StudentReportGoal) || 'Longevidade funcional';
  
  const todayStr = new Date().toISOString().split('T')[0];
  const ninetyDaysAgoStr = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [periodType, setPeriodType] = useState<ReportPeriodType>(defaultPeriodType);
  const [startDate, setStartDate] = useState<string>(reportToEdit?.startDate || ninetyDaysAgoStr);
  const [endDate, setEndDate] = useState<string>(reportToEdit?.endDate || todayStr);
  const [primaryGoal, setPrimaryGoal] = useState<StudentReportGoal>(reportToEdit?.primaryGoal || defaultGoal);
  const [customTitle, setCustomTitle] = useState<string>(reportToEdit?.title || '');

  // Generated / Editable Report Draft
  const [draftReport, setDraftReport] = useState<EvolutionReport>(() => {
    if (reportToEdit) return reportToEdit;
    return generateEvolutionReport({
      student,
      startDate: ninetyDaysAgoStr,
      endDate: todayStr,
      periodType: 'Trimestral',
      primaryGoal: defaultGoal,
      sessions,
      assessments,
      functionalAssessments: functionalAssessments || [],
      functionalGoals: functionalGoals || [],
      appointments: schedule || [],
      recurrences: scheduleRecurrences || [],
      routines,
      trainerProfile,
      initialReportState: {
        title: `Relatório de Performance & Evolução — Trimestral`
      }
    });
  });

  // UI state for adding items
  const [newAchievementTitle, setNewAchievementTitle] = useState<string>('');
  const [newAchievementDesc, setNewAchievementDesc] = useState<string>('');
  const [newGoalText, setNewGoalText] = useState<string>('');
  const [newMaintainText, setNewMaintainText] = useState<string>('');
  const [newProgressText, setNewProgressText] = useState<string>('');
  const [newPrioritizeText, setNewPrioritizeText] = useState<string>('');
  const [newMonitorText, setNewMonitorText] = useState<string>('');

  // Handle recalculation when period parameters change
  const handleRecalculateEngine = () => {
    const generated = generateEvolutionReport({
      student,
      startDate,
      endDate,
      periodType,
      primaryGoal,
      sessions,
      assessments,
      functionalAssessments: functionalAssessments || [],
      functionalGoals: functionalGoals || [],
      appointments: schedule || [],
      recurrences: scheduleRecurrences || [],
      routines,
      trainerProfile,
      initialReportState: {
        title: customTitle || `Relatório de Performance & Evolução — ${periodType}`
      }
    });

    // Merge trainer opinion and next cycle if previously edited
    if (reportToEdit || draftReport) {
      generated.trainerOpinion = {
        ...generated.trainerOpinion,
        summaryStatement: draftReport.trainerOpinion?.summaryStatement || generated.trainerOpinion.summaryStatement,
        observedEvolution: draftReport.trainerOpinion?.observedEvolution || generated.trainerOpinion.observedEvolution,
        keyAchievements: draftReport.trainerOpinion?.keyAchievements || generated.trainerOpinion.keyAchievements,
        challengesFaced: draftReport.trainerOpinion?.challengesFaced || generated.trainerOpinion.challengesFaced,
        improvementAreas: draftReport.trainerOpinion?.improvementAreas || generated.trainerOpinion.improvementAreas
      };
      generated.nextCyclePlan = {
        ...generated.nextCyclePlan,
        maintainList: draftReport.nextCyclePlan?.maintainList || generated.nextCyclePlan.maintainList,
        progressList: draftReport.nextCyclePlan?.progressList || generated.nextCyclePlan.progressList,
        prioritizeList: draftReport.nextCyclePlan?.prioritizeList || generated.nextCyclePlan.prioritizeList,
        monitorList: draftReport.nextCyclePlan?.monitorList || generated.nextCyclePlan.monitorList
      };
    }

    setDraftReport(generated);
    setCurrentStep(2);
  };

  // Handler for adding achievement
  const handleAddAchievement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAchievementTitle.trim()) return;

    const newAch: ReportAchievement = {
      id: `ach-${Date.now()}`,
      title: newAchievementTitle.trim(),
      description: newAchievementDesc.trim() || 'Conquista personalizada registrada pelo treinador.',
      category: 'custom'
    };

    setDraftReport(prev => ({
      ...prev,
      achievements: [...prev.achievements, newAch]
    }));

    setNewAchievementTitle('');
    setNewAchievementDesc('');
  };

  const handleRemoveAchievement = (id: string) => {
    setDraftReport(prev => ({
      ...prev,
      achievements: prev.achievements.filter(a => a.id !== id)
    }));
  };

  const handleUpdateIndicatorScore = (id: string, newScore: number) => {
    setDraftReport(prev => ({
      ...prev,
      dailyLivingImpact: {
        ...prev.dailyLivingImpact,
        indicators: prev.dailyLivingImpact.indicators.map(ind => 
          ind.id === id ? { ...ind, score: Math.max(0, Math.min(10, newScore)) } : ind
        )
      }
    }));
  };

  // Save as Draft or Finalize
  const handleSave = async (finalize: boolean = false) => {
    const finalObj: EvolutionReport = {
      ...draftReport,
      status: finalize ? 'finalized' : 'draft',
      finalizedAt: finalize ? new Date().toISOString() : draftReport.finalizedAt,
      updatedAt: new Date().toISOString()
    };

    await saveEvolutionReport(finalObj);
    onSaved(finalObj);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Modal Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn">
        
        {/* Top Header */}
        <div className="p-4 sm:p-6 bg-[#F8F9FA] border-b border-[#E5E7EB] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#374151]/15 border border-[#374151]/30 flex items-center justify-center text-[#374151] shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#27272A] text-[10px] font-black uppercase tracking-wider text-white">
                  TFIVE PRO
                </span>
                <span className="text-xs text-[#4B5563] font-bold">
                  {reportToEdit ? 'Editar Relatório' : 'Novo Relatório de Performance'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-[#1F2937] tracking-tight mt-0.5">
                {student.name} — {draftReport.title}
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

        {/* Step Indicator Bar */}
        <div className="px-4 sm:px-6 py-3 bg-[#0D0D0D] border-b border-[#E5E7EB] flex items-center justify-between overflow-x-auto scrollbar-none gap-2">
          {[
            { step: 1, label: '1. Parâmetros' },
            { step: 2, label: '2. Métricas & Score' },
            { step: 3, label: '3. Parecer Técnico' },
            { step: 4, label: '4. Próximo Ciclo' },
            { step: 5, label: '5. Finalização' }
          ].map((st) => (
            <button
              key={st.step}
              onClick={() => setCurrentStep(st.step)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-display uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 ${
                currentStep === st.step
                  ? 'bg-[#374151] text-white shadow-sm'
                  : currentStep > st.step
                  ? 'bg-[#F8F9FA] text-emerald-400 border border-emerald-500/30'
                  : 'bg-[#F8F9FA] text-[#4B5563] border border-[#E5E7EB]'
              }`}
            >
              {currentStep > st.step && <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{st.label}</span>
            </button>
          ))}
        </div>

        {/* Modal Body: Dynamic Step Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* STEP 1: PARÂMETROS DO RELATÓRIO */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border border-[#E5E7EB] shrink-0">
                  <StudentAvatar student={student} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{student.name}</h3>
                  <p className="text-xs text-[#4B5563]">
                    {student.planName ? `${student.planName} • ` : ''}Objetivo: {student.goal || 'Performance Geral'}
                  </p>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Period Preset */}
                <div>
                  <label className="text-xs font-bold text-[#4B5563] uppercase tracking-wider block mb-2">
                    Tipo de Período
                  </label>
                  <select
                    value={periodType}
                    onChange={(e) => {
                      const val = e.target.value as ReportPeriodType;
                      setPeriodType(val);
                      const now = Date.now();
                      if (val === 'Trimestral') {
                        setStartDate(new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                      } else if (val === 'Semestral') {
                        setStartDate(new Date(now - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                      } else if (val === 'Anual') {
                        setStartDate(new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                      }
                    }}
                    className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs text-[#262626] focus:outline-none focus:border-[#374151]"
                  >
                    <option value="Trimestral">Trimestral (90 dias)</option>
                    <option value="Semestral">Semestral (180 dias)</option>
                    <option value="Anual">Anual (365 dias)</option>
                    <option value="Personalizado">Personalizado</option>
                  </select>
                </div>

                {/* Primary Goal */}
                <div>
                  <label className="text-xs font-bold text-[#4B5563] uppercase tracking-wider block mb-2">
                    Objetivo Principal do Ciclo
                  </label>
                  <select
                    value={primaryGoal}
                    onChange={(e) => setPrimaryGoal(e.target.value as StudentReportGoal)}
                    className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs text-[#262626] focus:outline-none focus:border-[#374151]"
                  >
                    <option value="Longevidade funcional">Longevidade funcional</option>
                    <option value="Hipertrofia">Hipertrofia</option>
                    <option value="Emagrecimento">Emagrecimento</option>
                    <option value="Recomposição corporal">Recomposição corporal</option>
                    <option value="Ganho de força">Ganho de força</option>
                    <option value="Condicionamento físico">Condicionamento físico</option>
                    <option value="Qualidade de vida">Qualidade de vida</option>
                    <option value="Performance esportiva">Performance esportiva</option>
                    <option value="Retorno à atividade">Retorno à atividade</option>
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="text-xs font-bold text-[#4B5563] uppercase tracking-wider block mb-2">
                    Data Inicial
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs text-[#262626] focus:outline-none focus:border-[#374151]"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="text-xs font-bold text-[#4B5563] uppercase tracking-wider block mb-2">
                    Data Final
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs text-[#262626] focus:outline-none focus:border-[#374151]"
                  />
                </div>

              </div>

              {/* Custom Title */}
              <div>
                <label className="text-xs font-bold text-[#4B5563] uppercase tracking-wider block mb-2">
                  Título do Relatório (Opcional)
                </label>
                <input
                  type="text"
                  placeholder={`Ex: Relatório de Performance & Evolução — ${periodType}`}
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs text-[#262626] placeholder:text-[#737373] focus:outline-none focus:border-[#374151]"
                />
              </div>

              <div className="bg-[#F8F9FA]/50 border border-[#E5E7EB] rounded-2xl p-4 text-xs text-[#4B5563] flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-[#374151] shrink-0" />
                <span>
                  O TFIVE PRO consolidará automaticamente todas as sessões de treino, cargas registradas, avaliações físicas e baterias funcionais existentes no período especificado.
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: DASHBOARD & MÉTRICAS-CHAVE */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              {/* Executive Score Preview */}
              <div className="bg-gradient-to-r from-[#18181B] to-[#121212] border border-[#E5E7EB] rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] text-[#4B5563] uppercase font-bold tracking-wider block">
                    TFIVE Evolution Score
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-4xl font-black text-[#1F2937] font-mono-nums flex items-center gap-2">
                      <Zap className="w-7 h-7 text-[#374151] fill-[#374151]" />
                      {draftReport.evolutionScore?.overallScore || 0}
                    </span>
                    <span className="text-xs text-[#4B5563] font-bold">/100 pts</span>
                  </div>
                  <div className="mt-2 inline-block px-2.5 py-0.5 rounded bg-[#F3F4F6] text-[#374151] border border-[#374151]/30 text-xs font-bold uppercase">
                    Status: {draftReport.periodStatus}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs w-full sm:w-64 border-t sm:border-t-0 sm:border-l border-[#E5E7EB] pt-3 sm:pt-0 sm:pl-4">
                  {Object.entries(draftReport.evolutionScore?.dimensions || {}).map(([key, dim]) => (
                    <div key={key} className="flex items-center justify-between text-[11px]">
                      <span className="text-[#4B5563]">{dim.label}:</span>
                      <span className="text-[#1F2937] font-bold font-mono-nums">{dim.score}/100</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Indicators Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3.5 text-center">
                  <span className="text-[10px] text-[#4B5563] uppercase font-bold block">Taxa de Adesão</span>
                  <span className="text-2xl font-black font-display text-emerald-400 font-mono-nums">
                    {draftReport.adherence?.adherenceRatePercent || 0}%
                  </span>
                  <span className="text-[10px] text-[#4B5563] block mt-0.5">
                    {draftReport.adherence?.completedSessions} treinos feitos
                  </span>
                </div>

                <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3.5 text-center">
                  <span className="text-[10px] text-[#4B5563] uppercase font-bold block">Exercícios Monitorados</span>
                  <span className="text-2xl font-black text-[#1F2937] font-mono-nums">
                    {draftReport.exerciseProgressions?.length || 0}
                  </span>
                  <span className="text-[10px] text-[#4B5563] block mt-0.5">
                    {draftReport.performanceHighlights?.length || 0} destaques
                  </span>
                </div>

                <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3.5 text-center">
                  <span className="text-[10px] text-[#4B5563] uppercase font-bold block">Composição Corporal</span>
                  <span className="text-2xl font-black text-[#1F2937] font-mono-nums">
                    {draftReport.physicalComparison?.hasData ? 'Disponível' : '—'}
                  </span>
                  <span className="text-[10px] text-[#4B5563] block mt-0.5">
                    {draftReport.physicalComparison?.hasData ? `${draftReport.physicalComparison.metrics.length} métricas` : 'Sem avaliação'}
                  </span>
                </div>

                <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3.5 text-center">
                  <span className="text-[10px] text-[#4B5563] uppercase font-bold block">Bateria Funcional</span>
                  <span className="text-2xl font-black font-display text-emerald-400 font-mono-nums">
                    {draftReport.functionalComparison?.hasData ? `${draftReport.functionalComparison.tests.length} testes` : '—'}
                  </span>
                  <span className="text-[10px] text-[#4B5563] block mt-0.5">
                    Longevidade
                  </span>
                </div>
              </div>

              {/* Conquistas / Achievements Manager */}
              <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Conquistas & Destaques do Ciclo ({draftReport.achievements.length})
                    </h3>
                  </div>
                </div>

                {/* Add Achievement Form */}
                <form onSubmit={handleAddAchievement} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Título da conquista (ex: Novo PR no Supino)"
                    value={newAchievementTitle}
                    onChange={(e) => setNewAchievementTitle(e.target.value)}
                    className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#262626] placeholder:text-[#737373] focus:outline-none focus:border-[#374151]"
                  />
                  <input
                    type="text"
                    placeholder="Descrição breve..."
                    value={newAchievementDesc}
                    onChange={(e) => setNewAchievementDesc(e.target.value)}
                    className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#262626] placeholder:text-[#737373] focus:outline-none focus:border-[#374151]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Conquista</span>
                  </button>
                </form>

                {/* List of achievements */}
                <div className="space-y-2">
                  {draftReport.achievements.map((ach) => (
                    <div key={ach.id} className="bg-white border border-[#E5E7EB] rounded-xl p-3 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-[#262626] block">{ach.title}</strong>
                        <span className="text-[#4B5563] text-[11px]">{ach.description}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAchievement(ach.id)}
                        className="p-1 text-[#4B5563] hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily Living Impact Sliders */}
              {draftReport.dailyLivingImpact?.indicators && draftReport.dailyLivingImpact.indicators.length > 0 && (
                <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 space-y-3">
                  <h3 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#374151]" />
                    <span>Impacto na Vida Diária (Escala 0 a 10)</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {draftReport.dailyLivingImpact.indicators.map((ind) => (
                      <div key={ind.id} className="bg-white border border-[#E5E7EB] rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#262626] font-medium">{ind.name}</span>
                          <span className="font-bold text-[#374151] font-mono-nums">{ind.score}/10</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="1"
                          value={ind.score}
                          onChange={(e) => handleUpdateIndicatorScore(ind.id, parseInt(e.target.value, 10))}
                          className="w-full accent-[#374151] cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* STEP 3: PARECER TÉCNICO */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <label className="text-xs font-bold text-[#1F2937] uppercase tracking-wider block mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#374151]" />
                  <span>Síntese Técnica do Personal Trainer</span>
                </label>
                <textarea
                  rows={4}
                  value={draftReport.trainerOpinion?.summaryStatement || ''}
                  onChange={(e) => setDraftReport(prev => ({
                    ...prev,
                    trainerOpinion: {
                      ...prev.trainerOpinion,
                      summaryStatement: e.target.value
                    }
                  }))}
                  className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3.5 text-xs text-[#262626] placeholder:text-[#737373] focus:outline-none focus:border-[#374151] leading-relaxed"
                  placeholder="Escreva a análise técnica sobre o desempenho, evolução e resposta do aluno aos estímulos..."
                />
              </div>

              {/* Observed Evolution */}
              <div>
                <label className="text-xs font-bold text-emerald-600 uppercase tracking-wider block mb-2">
                  Evolução Observada & Conquistas de Destaque
                </label>
                <textarea
                  rows={2}
                  value={draftReport.trainerOpinion?.observedEvolution || ''}
                  onChange={(e) => setDraftReport(prev => ({
                    ...prev,
                    trainerOpinion: {
                      ...prev.trainerOpinion,
                      observedEvolution: e.target.value
                    }
                  }))}
                  className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3 text-xs text-[#262626] placeholder:text-[#737373] focus:outline-none focus:border-[#374151]"
                  placeholder="Ex: Houve expressivo ganho de força e mobilidade escapular..."
                />
              </div>

              {/* Improvement Areas */}
              <div>
                <label className="text-xs font-bold text-amber-600 uppercase tracking-wider block mb-2">
                  Pontos de Atenção & Oportunidades de Melhoria
                </label>
                <textarea
                  rows={2}
                  value={draftReport.trainerOpinion?.improvementAreas || ''}
                  onChange={(e) => setDraftReport(prev => ({
                    ...prev,
                    trainerOpinion: {
                      ...prev.trainerOpinion,
                      improvementAreas: e.target.value
                    }
                  }))}
                  className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3 text-xs text-[#262626] placeholder:text-[#737373] focus:outline-none focus:border-[#374151]"
                  placeholder="Ex: Regularidade aos finais de semana e hidratação intra-treino..."
                />
              </div>

              {/* Trainer Signature & CREF info */}
              <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-4 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[#4B5563] block text-[10px] uppercase">Profissional Responsável</span>
                  <strong className="text-[#262626] text-sm">{draftReport.trainerOpinion?.trainerName || trainerProfile.name}</strong>
                  <span className="text-[#4B5563] block">CREF: {draftReport.trainerOpinion?.trainerCref || trainerProfile.cref || '—'}</span>
                </div>
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          )}

          {/* STEP 4: PRÓXIMO CICLO */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* New Primary Goal */}
                <div>
                  <label className="text-xs font-bold text-[#4B5563] uppercase tracking-wider block mb-2">
                    Meta Principal Próximo Ciclo
                  </label>
                  <input
                    type="text"
                    value={draftReport.nextCyclePlan?.newPrimaryGoal || ''}
                    onChange={(e) => setDraftReport(prev => ({
                      ...prev,
                      nextCyclePlan: {
                        ...prev.nextCyclePlan,
                        newPrimaryGoal: e.target.value
                      }
                    }))}
                    className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs text-[#262626] placeholder:text-[#737373] focus:outline-none focus:border-[#374151]"
                    placeholder="Ex: Hipertrofia de membros inferiores e ganho de força no agachamento"
                  />
                </div>

                {/* Target Date */}
                <div>
                  <label className="text-xs font-bold text-[#4B5563] uppercase tracking-wider block mb-2">
                    Previsão Próxima Avaliação / Relatório
                  </label>
                  <input
                    type="date"
                    value={draftReport.nextCyclePlan?.nextAssessmentTargetDate || ''}
                    onChange={(e) => setDraftReport(prev => ({
                      ...prev,
                      nextCyclePlan: {
                        ...prev.nextCyclePlan,
                        nextAssessmentTargetDate: e.target.value
                      }
                    }))}
                    className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs text-[#262626] focus:outline-none focus:border-[#374151]"
                  />
                </div>

              </div>

              {/* 4 Quadrants: Manter / Progredir / Priorizar / Monitorar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Manter */}
                <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-4 space-y-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase block">Manter</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Adicionar item..."
                      value={newMaintainText}
                      onChange={(e) => setNewMaintainText(e.target.value)}
                      className="flex-1 bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-xs text-[#262626] placeholder:text-[#737373]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newMaintainText.trim()) return;
                        setDraftReport(prev => ({
                          ...prev,
                          nextCyclePlan: {
                            ...prev.nextCyclePlan,
                            maintainList: [...prev.nextCyclePlan.maintainList, newMaintainText.trim()]
                          }
                        }));
                        setNewMaintainText('');
                      }}
                      className="px-3 py-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold rounded-lg"
                    >
                      +
                    </button>
                  </div>
                  <ul className="text-xs text-[#4B5563] space-y-1 pt-1">
                    {draftReport.nextCyclePlan.maintainList.map((item, idx) => (
                      <li key={idx} className="flex justify-between items-center bg-white px-2 py-1 rounded">
                        <span className="text-[#262626]">• {item}</span>
                        <button
                          type="button"
                          onClick={() => setDraftReport(prev => ({
                            ...prev,
                            nextCyclePlan: {
                              ...prev.nextCyclePlan,
                              maintainList: prev.nextCyclePlan.maintainList.filter((_, i) => i !== idx)
                            }
                          }))}
                          className="text-[#4B5563] hover:text-rose-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Progredir */}
                <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-4 space-y-2">
                  <span className="text-xs font-bold text-[#374151] uppercase block">Progredir</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Adicionar item..."
                      value={newProgressText}
                      onChange={(e) => setNewProgressText(e.target.value)}
                      className="flex-1 bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-xs text-[#262626] placeholder:text-[#737373]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newProgressText.trim()) return;
                        setDraftReport(prev => ({
                          ...prev,
                          nextCyclePlan: {
                            ...prev.nextCyclePlan,
                            progressList: [...prev.nextCyclePlan.progressList, newProgressText.trim()]
                          }
                        }));
                        setNewProgressText('');
                      }}
                      className="px-3 py-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold rounded-lg"
                    >
                      +
                    </button>
                  </div>
                  <ul className="text-xs text-[#4B5563] space-y-1 pt-1">
                    {draftReport.nextCyclePlan.progressList.map((item, idx) => (
                      <li key={idx} className="flex justify-between items-center bg-white px-2 py-1 rounded">
                        <span className="text-[#262626]">• {item}</span>
                        <button
                          type="button"
                          onClick={() => setDraftReport(prev => ({
                            ...prev,
                            nextCyclePlan: {
                              ...prev.nextCyclePlan,
                              progressList: prev.nextCyclePlan.progressList.filter((_, i) => i !== idx)
                            }
                          }))}
                          className="text-[#4B5563] hover:text-rose-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Priorizar */}
                <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-4 space-y-2">
                  <span className="text-xs font-bold text-amber-600 uppercase block">Priorizar</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Adicionar item..."
                      value={newPrioritizeText}
                      onChange={(e) => setNewPrioritizeText(e.target.value)}
                      className="flex-1 bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-xs text-[#262626] placeholder:text-[#737373]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newPrioritizeText.trim()) return;
                        setDraftReport(prev => ({
                          ...prev,
                          nextCyclePlan: {
                            ...prev.nextCyclePlan,
                            prioritizeList: [...prev.nextCyclePlan.prioritizeList, newPrioritizeText.trim()]
                          }
                        }));
                        setNewPrioritizeText('');
                      }}
                      className="px-3 py-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold rounded-lg"
                    >
                      +
                    </button>
                  </div>
                  <ul className="text-xs text-[#4B5563] space-y-1 pt-1">
                    {draftReport.nextCyclePlan.prioritizeList.map((item, idx) => (
                      <li key={idx} className="flex justify-between items-center bg-white px-2 py-1 rounded">
                        <span className="text-[#262626]">• {item}</span>
                        <button
                          type="button"
                          onClick={() => setDraftReport(prev => ({
                            ...prev,
                            nextCyclePlan: {
                              ...prev.nextCyclePlan,
                              prioritizeList: prev.nextCyclePlan.prioritizeList.filter((_, i) => i !== idx)
                            }
                          }))}
                          className="text-[#4B5563] hover:text-rose-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Monitorar */}
                <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-4 space-y-2">
                  <span className="text-xs font-bold text-sky-600 uppercase block">Monitorar</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Adicionar item..."
                      value={newMonitorText}
                      onChange={(e) => setNewMonitorText(e.target.value)}
                      className="flex-1 bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-xs text-[#262626] placeholder:text-[#737373]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newMonitorText.trim()) return;
                        setDraftReport(prev => ({
                          ...prev,
                          nextCyclePlan: {
                            ...prev.nextCyclePlan,
                            monitorList: [...prev.nextCyclePlan.monitorList, newMonitorText.trim()]
                          }
                        }));
                        setNewMonitorText('');
                      }}
                      className="px-3 py-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold rounded-lg"
                    >
                      +
                    </button>
                  </div>
                  <ul className="text-xs text-[#4B5563] space-y-1 pt-1">
                    {draftReport.nextCyclePlan.monitorList.map((item, idx) => (
                      <li key={idx} className="flex justify-between items-center bg-white px-2 py-1 rounded">
                        <span className="text-[#262626]">• {item}</span>
                        <button
                          type="button"
                          onClick={() => setDraftReport(prev => ({
                            ...prev,
                            nextCyclePlan: {
                              ...prev.nextCyclePlan,
                              monitorList: prev.nextCyclePlan.monitorList.filter((_, i) => i !== idx)
                            }
                          }))}
                          className="text-[#4B5563] hover:text-rose-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            </div>
          )}

          {/* STEP 5: FINALIZAÇÃO & REVISÃO */}
          {currentStep === 5 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="bg-[#F8F9FA] border border-emerald-500/30 rounded-2xl p-5 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="text-base font-bold text-[#1F2937]">Relatório Pronto para Emissão</h3>
                <p className="text-xs text-[#4B5563] max-w-lg mx-auto leading-relaxed">
                  Ao <strong>Finalizar</strong>, os dados serão consolidados como um instantâneo imutável (Snapshot) para este período, garantindo a integridade histórica da evolução do aluno.
                </p>
              </div>

              {/* Review summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-[#F8F9FA] p-4 rounded-xl border border-[#E5E7EB]">
                  <span className="text-[10px] text-[#4B5563] uppercase block font-bold">Resumo Geral</span>
                  <div className="text-[#1F2937] font-bold mt-1">{draftReport.title}</div>
                  <div className="text-[#4B5563] text-[11px] mt-0.5">{draftReport.startDate} a {draftReport.endDate} ({draftReport.durationDays} dias)</div>
                  <div className="text-emerald-400 font-bold mt-1">Score: {draftReport.evolutionScore?.overallScore}/100</div>
                </div>

                <div className="bg-[#F8F9FA] p-4 rounded-xl border border-[#E5E7EB]">
                  <span className="text-[10px] text-[#4B5563] uppercase block font-bold">Assinatura do Relatório</span>
                  <div className="text-[#1F2937] font-bold mt-1">{draftReport.trainerOpinion?.trainerName || trainerProfile.name}</div>
                  <div className="text-[#4B5563] text-[11px] mt-0.5">CREF: {draftReport.trainerOpinion?.trainerCref || trainerProfile.cref || 'Não informado'}</div>
                  <div className="text-[#4B5563] text-[11px]">Metas Próximo Ciclo: {draftReport.nextCyclePlan.maintainList.length + draftReport.nextCyclePlan.progressList.length} itens</div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 bg-[#F8F9FA] border-t border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                className="px-4 py-2.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold font-display uppercase tracking-wider transition-all flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep === 1 ? (
              <button
                type="button"
                onClick={handleRecalculateEngine}
                className="px-5 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all shadow-md shadow-xs flex items-center gap-2"
              >
                <span>Calcular & Avançar</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : currentStep < 5 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
                className="px-5 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all shadow-md shadow-xs flex items-center gap-2"
              >
                <span>Avançar</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold font-display uppercase tracking-wider transition-all"
                >
                  Salvar Rascunho
                </button>

                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black font-display uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Finalizar & Emitir</span>
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
