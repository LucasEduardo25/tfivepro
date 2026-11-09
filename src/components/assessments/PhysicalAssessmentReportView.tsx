import React, { useState, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  Scale, 
  TrendingDown, 
  TrendingUp, 
  Activity, 
  Calendar, 
  Layers, 
  Ruler, 
  Printer, 
  Share2, 
  Eye, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Flame, 
  Maximize2,
  Trash2,
  Edit3,
  Camera,
  ArrowRight,
  ShieldCheck,
  Award
} from 'lucide-react';
import { Student, PhysicalAssessment, TrainerProfile } from '../../types';
import { useApp } from '../../context/AppContext';
import { 
  formatNumberBR, 
  formatPercentagePointsBR, 
  formatDeltaValueBR, 
  compareAssessments,
  calculateSumOf7Skinfolds,
  SKINFOLD_LABELS_PT,
  CIRCUMFERENCE_LABELS_PT,
  SkinfoldMap,
  CircumferenceMap
} from '../../utils/assessmentCalculations';
import { 
  getBodyFatClassification,
  getBMIClassification,
  getWHRClassification,
  getWaistCircumferenceClassification
} from '../../utils/assessmentClassifications';

interface PhysicalAssessmentReportViewProps {
  student: Student;
  assessment: PhysicalAssessment;
  allStudentAssessments: PhysicalAssessment[];
  trainerProfile?: TrainerProfile;
  onClose: () => void;
  onOpenStudentMode: () => void;
  onOpenPDF: () => void;
  onOpenStory?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const PhysicalAssessmentReportView: React.FC<PhysicalAssessmentReportViewProps> = ({
  student,
  assessment,
  allStudentAssessments,
  trainerProfile,
  onClose,
  onOpenStudentMode,
  onOpenPDF,
  onOpenStory,
  onEdit,
  onDelete
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const [selectedChartMetric, setSelectedChartMetric] = useState<string>('bodyFat');
  const [activeTab, setActiveTab] = useState<'overview' | 'skinfolds' | 'circumferences' | 'photos'>('overview');

  // Sorted assessments chronologically
  const chronoSortedAssessments = useMemo(() => {
    return [...allStudentAssessments]
      .filter(a => a.studentId === student.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allStudentAssessments, student.id]);

  // Current assessment index in chronological order
  const currentIndex = chronoSortedAssessments.findIndex(a => a.id === assessment.id);
  const previousAssessment = currentIndex > 0 ? chronoSortedAssessments[currentIndex - 1] : undefined;

  // Comparison with previous assessment
  const comparison = previousAssessment ? compareAssessments(assessment, previousAssessment) : null;

  // Scientific Classifications
  const age = assessment.age || (student.birthDate ? (() => {
    const b = new Date(student.birthDate);
    const d = new Date(assessment.date);
    let a = d.getFullYear() - b.getFullYear();
    const m = d.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && d.getDate() < b.getDate())) a--;
    return a;
  })() : 25);

  const gender = assessment.gender || student.gender || 'male';

  const bfClassification = getBodyFatClassification(assessment.bodyFatPercentage, gender, age);
  const bmiClassification = getBMIClassification(assessment.bmi);
  const whrClassification = getWHRClassification(assessment.waistHipRatio, gender, age);
  const waistClassification = getWaistCircumferenceClassification(assessment.circumferences?.waist, gender);

  // Sum of 7 skinfolds
  const sumSkinfolds = assessment.sumOfSkinfolds || (assessment.skinfolds ? calculateSumOf7Skinfolds(assessment.skinfolds) : 0);

  // Bilateral Asymmetry Calculations
  const bilateralPairs = useMemo(() => {
    if (!assessment.circumferences) return [];
    const pairs: Array<{ label: string; right: number; left: number; diff: number }> = [];
    const circ = assessment.circumferences;

    if (circ.rightArmContracted && circ.leftArmContracted) {
      pairs.push({
        label: 'Braço Contraído',
        right: circ.rightArmContracted,
        left: circ.leftArmContracted,
        diff: Number((circ.rightArmContracted - circ.leftArmContracted).toFixed(1))
      });
    }
    if (circ.rightArmRelaxed && circ.leftArmRelaxed) {
      pairs.push({
        label: 'Braço Relaxado',
        right: circ.rightArmRelaxed,
        left: circ.leftArmRelaxed,
        diff: Number((circ.rightArmRelaxed - circ.leftArmRelaxed).toFixed(1))
      });
    }
    if (circ.rightThigh && circ.leftThigh) {
      pairs.push({
        label: 'Coxa',
        right: circ.rightThigh,
        left: circ.leftThigh,
        diff: Number((circ.rightThigh - circ.leftThigh).toFixed(1))
      });
    }
    if (circ.rightCalf && circ.leftCalf) {
      pairs.push({
        label: 'Panturrilha',
        right: circ.rightCalf,
        left: circ.leftCalf,
        diff: Number((circ.rightCalf - circ.leftCalf).toFixed(1))
      });
    }
    if (circ.rightForearm && circ.leftForearm) {
      pairs.push({
        label: 'Antebraço',
        right: circ.rightForearm,
        left: circ.leftForearm,
        diff: Number((circ.rightForearm - circ.leftForearm).toFixed(1))
      });
    }

    return pairs;
  }, [assessment.circumferences]);

  // Composition percentages for donut chart
  const fatPercentage = assessment.bodyFatPercentage || 0;
  const leanPercentage = assessment.leanMassPercentage || Number((100 - fatPercentage).toFixed(1));
  const fatRadius = 60;
  const circumferenceLength = 2 * Math.PI * fatRadius;
  const fatStrokeDash = (fatPercentage / 100) * circumferenceLength;
  const leanStrokeDash = (leanPercentage / 100) * circumferenceLength;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in">
      <div className="bg-[#0A0A0A] border border-[#E5E7EB] rounded-3xl max-w-5xl w-full max-h-[96vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* ========================================================================= */}
        {/* TOP HEADER / ACTION BAR */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-6 border-b border-[#1E1E24] bg-white/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#374151] text-white flex items-center justify-center font-black shadow-lg shadow-xs shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#374151]">
                  TFIVE PRO
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563] bg-[#F8F9FA] px-2 py-0.5 rounded border border-[#E5E7EB]">
                  AVALIAÇÃO FÍSICA
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-display uppercase tracking-wide text-white">
                {student.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#4B5563] mt-0.5">
                <span className="font-mono-nums">
                  {new Date(assessment.date).toLocaleDateString('pt-BR', { dateStyle: 'long' })}
                </span>
                <span>•</span>
                <span>{assessment.formulaUsed || 'Jackson & Pollock — 7 Dobras + Siri'}</span>
                {previousAssessment && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-400 font-bold">
                      Comparação c/ {new Date(previousAssessment.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })} ({comparison?.daysBetween} dias)
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ACTIONS TOOLBAR */}
          <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
            {/* MODO ALUNO */}
            <button
              type="button"
              onClick={onOpenStudentMode}
              className="px-3.5 py-2 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-xs transition-all cursor-pointer"
              title="Apresentar resultado em Modo Aluno (Tela Cheia)"
            >
              <Eye className="w-4 h-4" />
              <span>Modo Aluno</span>
            </button>

            {/* PDF / IMPRIMIR */}
            <button
              type="button"
              onClick={onOpenPDF}
              className="px-3.5 py-2 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] border border-[#E5E7EB] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Gerar PDF Oficial A4 da Avaliação Física"
            >
              <Printer className="w-4 h-4 text-[#374151]" />
              <span>PDF A4</span>
            </button>

            {/* STORY 9:16 */}
            {onOpenStory && (
              <button
                type="button"
                onClick={onOpenStory}
                className="px-3 py-2 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] border border-[#E5E7EB] text-[#4B5563] hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Gerar Story 9:16 para Redes Sociais"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Story</span>
              </button>
            )}

            {/* EDITAR */}
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="p-2 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] border border-[#E5E7EB] text-[#4B5563] hover:text-white transition-all cursor-pointer"
                title="Editar dados da avaliação"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            {/* EXCLUIR */}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="p-2 rounded-xl bg-[#F8F9FA] hover:bg-[#374151]/20 hover:text-[#374151] border border-[#E5E7EB] text-[#4B5563] transition-all cursor-pointer"
                title="Excluir avaliação"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* CLOSE */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] border border-[#E5E7EB] text-[#4B5563] hover:text-white transition-all cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* NAVIGATION TABS */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 bg-white border-b border-[#1E1E24] overflow-x-auto text-xs">
          {[
            { id: 'overview', label: 'Visão Geral & Composição', icon: Activity },
            { id: 'skinfolds', label: 'Dobras Cutâneas (7 Dobras)', icon: Layers },
            { id: 'circumferences', label: 'Perimetria & Assimetrias', icon: Ruler },
            { id: 'photos', label: 'Evolução Visual (Fotos)', icon: Camera }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  isActive 
                    ? 'bg-[#374151] text-white shadow-sm shadow-xs' 
                    : 'bg-[#F8F9FA] text-[#4B5563] hover:text-white border border-[#E5E7EB]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* MAIN SCROLLABLE CONTENT */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: VISÃO GERAL & COMPOSIÇÃO CORPORAL */}
          {activeTab === 'overview' && (
            <>
              {/* HEADLINE SUMMARY CARD */}
              <div className="bg-gradient-to-r from-[#121212] via-[#1A1A22] to-[#121212] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] block">
                    {comparison ? 'Evolução Física Consolidada' : 'Linha de Base Registrada'}
                  </span>
                  <h3 className="text-lg sm:text-xl font-black font-display uppercase text-white mt-0.5">
                    {comparison ? (
                      <>
                        {comparison.deltas.bodyFatPercentage < 0 ? (
                          <span className="text-emerald-400">
                            Redução de {Math.abs(comparison.deltas.bodyFatPercentage).toString().replace('.', ',')} p.p. na gordura corporal
                          </span>
                        ) : comparison.deltas.bodyFatPercentage > 0 ? (
                          <span className="text-amber-300">
                            Variação de +{comparison.deltas.bodyFatPercentage.toString().replace('.', ',')} p.p. na gordura
                          </span>
                        ) : (
                          <span>Gordura corporal estável</span>
                        )}
                        {comparison.deltas.leanMassKg > 0 && (
                          <span className="text-white"> e +{formatNumberBR(comparison.deltas.leanMassKg)} kg de massa magra</span>
                        )}
                      </>
                    ) : (
                      'Primeira Avaliação — Referência Oficial para Acompanhamento'
                    )}
                  </h3>
                  <p className="text-xs text-[#4B5563] mt-1">
                    {comparison 
                      ? `Comparativo direto com avaliação realizada em ${new Date(previousAssessment!.date).toLocaleDateString('pt-BR', { dateStyle: 'long' })}.`
                      : 'Esta avaliação servirá como baseline padrão para calcular ganhos musculares e perda de gordura.'}
                  </p>
                </div>

                {bfClassification && (
                  <div className={`px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wide flex items-center gap-1.5 shrink-0 ${bfClassification.badgeStyle.bg} ${bfClassification.badgeStyle.text} ${bfClassification.badgeStyle.border}`}>
                    <Award className="w-4 h-4" />
                    <span>{bfClassification.label}</span>
                  </div>
                )}
              </div>

              {/* SECTION: BODY COMPOSITION DONUT + 6 KEY EXECUTIVE CARDS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                
                {/* COMPOSITION DONUT (5 COLS) */}
                <div className="lg:col-span-5 bg-white border border-[#E5E7EB] rounded-2xl p-5 flex flex-col justify-between items-center text-center">
                  <div className="w-full flex items-center justify-between border-b border-[#1E1E24] pb-3 mb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-[#374151]" />
                      Composição Corporal
                    </span>
                    <span className="text-[10px] text-[#4B5563] font-mono-nums">
                      Total: {formatNumberBR(assessment.weightKg)} kg
                    </span>
                  </div>

                  {/* SVG DONUT CHART */}
                  <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center my-2">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                      {/* Background track */}
                      <circle
                        cx="80"
                        cy="80"
                        r={fatRadius}
                        fill="transparent"
                        stroke="#1E1E24"
                        strokeWidth="18"
                      />
                      {/* Lean mass segment (Emerald/White) */}
                      <circle
                        cx="80"
                        cy="80"
                        r={fatRadius}
                        fill="transparent"
                        stroke="#10B981"
                        strokeWidth="18"
                        strokeDasharray={`${leanStrokeDash} ${circumferenceLength}`}
                        strokeDashoffset="0"
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                      {/* Fat mass segment (Neutral Graphite) */}
                      <circle
                        cx="80"
                        cy="80"
                        r={fatRadius}
                        fill="transparent"
                        stroke="#292929"
                        strokeWidth="18"
                        strokeDasharray={`${fatStrokeDash} ${circumferenceLength}`}
                        strokeDashoffset={`-${leanStrokeDash}`}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                    </svg>

                    {/* Donut Center */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="text-[10px] uppercase tracking-wider text-[#4B5563] font-bold">
                        PESO TOTAL
                      </span>
                      <p className="text-2xl sm:text-3xl font-black font-mono-nums text-white leading-tight">
                        {formatNumberBR(assessment.weightKg)}
                      </p>
                      <span className="text-[11px] font-bold text-[#4B5563]">kg</span>
                    </div>
                  </div>

                  {/* DONUT LEGEND */}
                  <div className="w-full grid grid-cols-2 gap-3 pt-3 border-t border-[#1E1E24] text-left">
                    <div className="bg-[#F8F9FA] p-2.5 rounded-xl border border-[#E5E7EB]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-[10px] uppercase font-bold text-[#4B5563]">Massa Magra</span>
                      </div>
                      <p className="text-base font-black font-mono-nums text-white mt-1">
                        {formatNumberBR(assessment.leanMassKg)} <span className="text-xs text-[#4B5563]">kg</span>
                      </p>
                      <span className="text-[11px] font-bold text-emerald-400 font-mono-nums">
                        {formatNumberBR(leanPercentage)}%
                      </span>
                    </div>

                    <div className="bg-[#F8F9FA] p-2.5 rounded-xl border border-[#E5E7EB]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#374151] shrink-0" />
                        <span className="text-[10px] uppercase font-bold text-[#4B5563]">Massa Gorda</span>
                      </div>
                      <p className="text-base font-black font-mono-nums text-white mt-1">
                        {formatNumberBR(assessment.fatMassKg)} <span className="text-xs text-[#4B5563]">kg</span>
                      </p>
                      <span className="text-[11px] font-bold text-[#374151] font-mono-nums">
                        {formatNumberBR(fatPercentage)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6 KEY EXECUTIVE STATS CARDS (7 COLS) */}
                <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  
                  {/* 1. GORDURA CORPORAL */}
                  <div className="bg-white border-2 border-[#374151]/80 p-4 rounded-2xl flex flex-col justify-between shadow-lg shadow-xs">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#374151] block">
                        % GORDURA
                      </span>
                      <p className="text-2xl sm:text-3xl font-black font-mono-nums text-white mt-1">
                        {formatNumberBR(assessment.bodyFatPercentage)}%
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#1E1E24] space-y-1">
                      {comparison && (
                        <div className={`inline-flex items-center gap-1 text-[11px] font-black font-mono-nums px-2 py-0.5 rounded-md ${
                          comparison.deltas.bodyFatPercentage <= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-300'
                        }`}>
                          {comparison.deltas.bodyFatPercentage <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                          <span>{formatPercentagePointsBR(comparison.deltas.bodyFatPercentage)}</span>
                        </div>
                      )}
                      {bfClassification && (
                        <span className="text-[10px] font-bold text-[#4B5563] block truncate" title={bfClassification.referenceSource}>
                          {bfClassification.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 2. MASSA MAGRA */}
                  <div className="bg-white border border-[#E5E7EB] p-4 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                        MASSA MAGRA
                      </span>
                      <p className="text-2xl sm:text-3xl font-black font-mono-nums text-white mt-1">
                        {formatNumberBR(assessment.leanMassKg)} <span className="text-xs font-bold text-[#4B5563]">kg</span>
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#1E1E24] space-y-1">
                      {comparison ? (
                        <div className={`inline-flex items-center gap-1 text-[11px] font-black font-mono-nums px-2 py-0.5 rounded-md ${
                          comparison.deltas.leanMassKg >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                        }`}>
                          {comparison.deltas.leanMassKg >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          <span>{formatDeltaValueBR(comparison.deltas.leanMassKg, 'kg')}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-mono-nums text-[#4B5563]">{formatNumberBR(leanPercentage)}% do total</span>
                      )}
                    </div>
                  </div>

                  {/* 3. MASSA GORDA */}
                  <div className="bg-white border border-[#E5E7EB] p-4 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] block">
                        MASSA GORDA
                      </span>
                      <p className="text-2xl sm:text-3xl font-black font-mono-nums text-white mt-1">
                        {formatNumberBR(assessment.fatMassKg)} <span className="text-xs font-bold text-[#4B5563]">kg</span>
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#1E1E24] space-y-1">
                      {comparison ? (
                        <div className={`inline-flex items-center gap-1 text-[11px] font-black font-mono-nums px-2 py-0.5 rounded-md ${
                          comparison.deltas.fatMassKg <= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-300'
                        }`}>
                          {comparison.deltas.fatMassKg <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                          <span>{formatDeltaValueBR(comparison.deltas.fatMassKg, 'kg')}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-mono-nums text-[#4B5563]">{formatNumberBR(fatPercentage)}% do total</span>
                      )}
                    </div>
                  </div>

                  {/* 4. PESO TOTAL */}
                  <div className="bg-white border border-[#E5E7EB] p-4 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] block">
                        PESO CORPORAL
                      </span>
                      <p className="text-2xl sm:text-3xl font-black font-mono-nums text-white mt-1">
                        {formatNumberBR(assessment.weightKg)} <span className="text-xs font-bold text-[#4B5563]">kg</span>
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#1E1E24] space-y-1">
                      {comparison ? (
                        <div className="inline-flex items-center gap-1 text-[11px] font-black font-mono-nums px-2 py-0.5 rounded-md bg-[#F8F9FA] text-white">
                          <span>{formatDeltaValueBR(comparison.deltas.weightKg, 'kg')}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-mono-nums text-[#4B5563]">Altura: {assessment.heightCm} cm</span>
                      )}
                    </div>
                  </div>

                  {/* 5. IMC */}
                  <div className="bg-white border border-[#E5E7EB] p-4 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] block">
                        IMC (ÍNDICE)
                      </span>
                      <p className="text-2xl sm:text-3xl font-black font-mono-nums text-white mt-1">
                        {formatNumberBR(assessment.bmi)}
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#1E1E24] space-y-1">
                      {bmiClassification && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border block truncate ${bmiClassification.badgeStyle.bg} ${bmiClassification.badgeStyle.text} ${bmiClassification.badgeStyle.border}`}>
                          {bmiClassification.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 6. SOMA DAS 7 DOBRAS */}
                  <div className="bg-white border border-[#E5E7EB] p-4 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] block">
                        SOMA DAS DOBRAS
                      </span>
                      <p className="text-2xl sm:text-3xl font-black font-mono-nums text-white mt-1">
                        {sumSkinfolds > 0 ? formatNumberBR(sumSkinfolds) : '—'} <span className="text-xs font-bold text-[#4B5563]">mm</span>
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#1E1E24] space-y-1">
                      {comparison?.deltas.sumOfSkinfolds !== undefined ? (
                        <div className={`inline-flex items-center gap-1 text-[11px] font-black font-mono-nums px-2 py-0.5 rounded-md ${
                          comparison.deltas.sumOfSkinfolds <= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-300'
                        }`}>
                          {comparison.deltas.sumOfSkinfolds <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                          <span>{formatDeltaValueBR(comparison.deltas.sumOfSkinfolds, 'mm')}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#4B5563]">Protocolo 7 Dobras</span>
                      )}
                    </div>
                  </div>

                </div>

              </div>

              {/* SECTION: SCIENTIFIC REFERENCES & METABOLIC RISK CALLOUT */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#1E1E24] pb-2.5">
                  <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Classificações Científicas Validadas
                  </span>
                  <span className="text-[11px] text-[#4B5563]">
                    Protocolo: {gender === 'male' ? 'Masculino' : 'Feminino'}, {age} anos
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* % GORDURA */}
                  <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E7EB] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[#4B5563] font-bold">Gordura Corporal (%):</span>
                      <strong className="text-white font-mono-nums">{formatNumberBR(assessment.bodyFatPercentage)}%</strong>
                    </div>
                    {bfClassification ? (
                      <>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[#4B5563]">Classificação:</span>
                          <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${bfClassification.badgeStyle.bg} ${bfClassification.badgeStyle.text}`}>
                            {bfClassification.label}
                          </span>
                        </div>
                        <span className="text-[9px] text-[#4B5563] block italic">
                          Ref: {bfClassification.referenceSource}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] text-[#4B5563]">Sem tabela cadastrada</span>
                    )}
                  </div>

                  {/* IMC */}
                  <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E7EB] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[#4B5563] font-bold">IMC (kg/m²):</span>
                      <strong className="text-white font-mono-nums">{formatNumberBR(assessment.bmi)}</strong>
                    </div>
                    {bmiClassification ? (
                      <>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[#4B5563]">Classificação:</span>
                          <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${bmiClassification.badgeStyle.bg} ${bmiClassification.badgeStyle.text}`}>
                            {bmiClassification.label}
                          </span>
                        </div>
                        <span className="text-[9px] text-[#4B5563] block italic">
                          Ref: {bmiClassification.referenceSource}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] text-[#4B5563]">Sem tabela cadastrada</span>
                    )}
                  </div>

                  {/* RCQ / CINTURA */}
                  <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E7EB] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[#4B5563] font-bold">Risco Metabólico (Cintura/RCQ):</span>
                      <strong className="text-white font-mono-nums">
                        {assessment.circumferences?.waist ? `${assessment.circumferences.waist} cm` : (assessment.waistHipRatio ? `RCQ ${assessment.waistHipRatio}` : '—')}
                      </strong>
                    </div>
                    {waistClassification ? (
                      <>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[#4B5563]">Risco Cintura:</span>
                          <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${waistClassification.badgeStyle.bg} ${waistClassification.badgeStyle.text}`}>
                            {waistClassification.label}
                          </span>
                        </div>
                        <span className="text-[9px] text-[#4B5563] block italic">
                          Ref: {waistClassification.referenceSource}
                        </span>
                      </>
                    ) : whrClassification ? (
                      <>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[#4B5563]">Classificação RCQ:</span>
                          <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${whrClassification.badgeStyle.bg} ${whrClassification.badgeStyle.text}`}>
                            {whrClassification.label}
                          </span>
                        </div>
                        <span className="text-[9px] text-[#4B5563] block italic">
                          Ref: {whrClassification.referenceSource}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] text-[#4B5563]">Cintura ou quadril não registrados</span>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION: EVOLUÇÃO HISTÓRICA COM SELETOR DE MÉTRICA */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E1E24] pb-3">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-[#374151]" />
                      Sua Evolução Histórica
                    </span>
                    <p className="text-[11px] text-[#4B5563]">
                      Progresso longitudinal em {chronoSortedAssessments.length} avaliações registradas
                    </p>
                  </div>

                  {/* METRIC BUTTONS */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { id: 'bodyFat', label: '% Gordura' },
                      { id: 'leanMass', label: 'Massa Magra (kg)' },
                      { id: 'fatMass', label: 'Massa Gorda (kg)' },
                      { id: 'weight', label: 'Peso Total (kg)' },
                      { id: 'sumSkinfolds', label: 'Soma Dobras (mm)' },
                      { id: 'waist', label: 'Cintura (cm)' }
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedChartMetric(m.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          selectedChartMetric === m.id
                            ? 'bg-[#374151] text-white'
                            : 'bg-[#F8F9FA] text-[#4B5563] hover:text-white border border-[#E5E7EB]'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* VISUAL EVOLUTION BARS */}
                <div className="h-48 bg-[#F8F9FA]/80 border border-[#E5E7EB] rounded-xl p-4 flex items-end justify-between gap-2 overflow-x-auto">
                  {(() => {
                    const values = chronoSortedAssessments.map(a => {
                      let val = 0;
                      let unit = '';
                      if (selectedChartMetric === 'bodyFat') { val = a.bodyFatPercentage || 0; unit = '%'; }
                      else if (selectedChartMetric === 'leanMass') { val = a.leanMassKg || 0; unit = 'kg'; }
                      else if (selectedChartMetric === 'fatMass') { val = a.fatMassKg || 0; unit = 'kg'; }
                      else if (selectedChartMetric === 'weight') { val = a.weightKg || 0; unit = 'kg'; }
                      else if (selectedChartMetric === 'sumSkinfolds') { val = a.sumOfSkinfolds || (a.skinfolds ? calculateSumOf7Skinfolds(a.skinfolds) : 0); unit = 'mm'; }
                      else if (selectedChartMetric === 'waist') { val = a.circumferences?.waist || 0; unit = 'cm'; }
                      return { id: a.id, date: a.date, val, unit, isCurrent: a.id === assessment.id };
                    }).filter(item => item.val > 0);

                    if (values.length === 0) {
                      return (
                        <div className="w-full text-center text-xs text-[#4B5563] self-center py-6">
                          Nenhum dado registrado para esta métrica no histórico.
                        </div>
                      );
                    }

                    const maxVal = Math.max(...values.map(v => v.val)) * 1.15;

                    return values.map((v, i) => {
                      const hPct = Math.max(15, Math.min(100, Math.round((v.val / maxVal) * 100)));
                      return (
                        <div key={v.id || i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group min-w-[54px]">
                          <span className={`text-xs font-mono-nums font-black ${v.isCurrent ? 'text-[#374151]' : 'text-white'}`}>
                            {formatNumberBR(v.val)}
                          </span>
                          <div
                            style={{ height: `${hPct}%` }}
                            className={`w-full max-w-[44px] rounded-t-lg transition-all ${
                              v.isCurrent 
                                ? 'bg-[#374151] shadow-md shadow-xs' 
                                : 'bg-[#3F3F46] group-hover:bg-[#52525B]'
                            }`}
                          />
                          <span className={`text-[10px] font-mono-nums truncate ${v.isCurrent ? 'text-[#1F2937] font-bold' : 'text-[#4B5563]'}`}>
                            {new Date(v.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: DOBRAS CUTÂNEAS (7 DOBRAS JACKSON & POLLOCK) */}
          {activeTab === 'skinfolds' && (
            <div className="space-y-6">
              {/* DOBRAS HEADER CARD */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#374151] block">
                    PROTOCOLO JACKSON & POLLOCK
                  </span>
                  <h3 className="text-xl font-black font-display uppercase text-white mt-0.5">
                    Mapeamento das 7 Dobras Cutâneas
                  </h3>
                  <p className="text-xs text-[#4B5563] mt-1">
                    Peitoral, Axilar Média, Tríceps, Subescapular, Abdominal, Supra-ilíaca e Coxa (medidas em milímetros).
                  </p>
                </div>

                <div className="bg-[#F8F9FA] border border-[#E5E7EB] p-3.5 rounded-xl text-center shrink-0 min-w-[140px]">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] block">
                    SOMA TOTAL (Σ7)
                  </span>
                  <p className="text-2xl font-black font-mono-nums text-white mt-0.5">
                    {sumSkinfolds > 0 ? formatNumberBR(sumSkinfolds) : '—'} <span className="text-xs text-[#4B5563]">mm</span>
                  </p>
                  {comparison?.deltas.sumOfSkinfolds !== undefined && (
                    <div className={`mt-1 inline-flex items-center gap-0.5 text-xs font-black font-mono-nums px-2 py-0.5 rounded ${
                      comparison.deltas.sumOfSkinfolds <= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                    }`}>
                      {comparison.deltas.sumOfSkinfolds <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                      <span>{formatDeltaValueBR(comparison.deltas.sumOfSkinfolds, 'mm')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 7 SKINFOLDS POINT-BY-POINT COMPARISON */}
              {assessment.skinfolds && Object.keys(assessment.skinfolds).length > 0 ? (
                <div className="space-y-4">
                  <span className="text-xs font-black uppercase tracking-wider text-white block">
                    Tabela Comparativa Ponto a Ponto
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Object.entries(SKINFOLD_LABELS_PT).map(([key, label]) => {
                      const currentVal = (assessment.skinfolds as any)?.[key];
                      const prevVal = (previousAssessment?.skinfolds as any)?.[key];
                      const diff = (typeof currentVal === 'number' && typeof prevVal === 'number') 
                        ? Number((currentVal - prevVal).toFixed(1)) 
                        : undefined;
                      const multiMeasures = assessment.skinfoldMeasurements?.[key];

                      return (
                        <div key={key} className="bg-white border border-[#E5E7EB] p-4 rounded-2xl flex flex-col justify-between space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white truncate">{label}</span>
                            {multiMeasures && multiMeasures.length > 1 && (
                              <span className="text-[9px] bg-[#F8F9FA] text-[#4B5563] px-1.5 py-0.5 rounded border border-[#E5E7EB] font-mono-nums">
                                Média ({multiMeasures.length}x)
                              </span>
                            )}
                          </div>

                          <div className="flex items-baseline justify-between pt-1">
                            {prevVal !== undefined ? (
                              <span className="text-xs text-[#4B5563] font-mono-nums">
                                {formatNumberBR(prevVal)} → <strong className="text-white text-base font-black">{formatNumberBR(currentVal)}</strong> mm
                              </span>
                            ) : (
                              <strong className="text-white text-xl font-black font-mono-nums">
                                {currentVal !== undefined ? `${formatNumberBR(currentVal)} mm` : '—'}
                              </strong>
                            )}

                            {diff !== undefined && (
                              <span className={`text-xs font-black font-mono-nums px-1.5 py-0.5 rounded ${
                                diff <= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-300'
                              }`}>
                                {formatDeltaValueBR(diff, 'mm')}
                              </span>
                            )}
                          </div>

                          {/* Mini visual bar comparing against previous */}
                          {currentVal !== undefined && (
                            <div className="w-full bg-[#1E1E24] h-1.5 rounded-full overflow-hidden mt-1">
                              <div
                                style={{ width: `${Math.min(100, Math.max(5, (currentVal / 40) * 100))}%` }}
                                className="bg-[#374151] h-full rounded-full"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 text-center text-xs text-[#4B5563]">
                  Dobras cutâneas individuais não informadas nesta avaliação (protocolo simplificado ou bioimpedância).
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PERIMETRIA & ASSIMETRIAS */}
          {activeTab === 'circumferences' && (
            <div className="space-y-6">
              {/* PERIMETRIA HEADER */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#374151] block">
                    PERIMETRIA CORPORAL
                  </span>
                  <h3 className="text-xl font-black font-display uppercase text-white mt-0.5">
                    Circunferências & Análise de Simetria
                  </h3>
                  <p className="text-xs text-[#4B5563] mt-1">
                    Medidas corporais registradas em centímetros (cm) com análise de equilíbrio bilateral (D × E).
                  </p>
                </div>
              </div>

              {/* BILATERAL ASYMMETRY ANALYSIS */}
              {bilateralPairs.length > 0 && (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#1E1E24] pb-2.5">
                    <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                      <Ruler className="w-4 h-4 text-emerald-400" />
                      Análise de Assimetrias Bilaterais (Direito × Esquerdo)
                    </span>
                    <span className="text-[10px] text-[#4B5563]">
                      Variações de até 1,0 cm são fisiologicamente normais
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {bilateralPairs.map(item => {
                      const isSignificant = Math.abs(item.diff) >= 1.5;
                      return (
                        <div key={item.label} className="bg-[#F8F9FA] border border-[#E5E7EB] p-4 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{item.label}</span>
                            <span className={`text-[10px] font-mono-nums px-2 py-0.5 rounded font-bold ${
                              isSignificant ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/15 text-emerald-400'
                            }`}>
                              Dif: {Math.abs(item.diff).toString().replace('.', ',')} cm
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                            <div className="p-2 rounded-lg bg-white border border-[#E5E7EB]">
                              <span className="text-[10px] text-[#4B5563] block">Direito:</span>
                              <strong className="text-white text-sm font-mono-nums">{formatNumberBR(item.right)} cm</strong>
                            </div>
                            <div className="p-2 rounded-lg bg-white border border-[#E5E7EB]">
                              <span className="text-[10px] text-[#4B5563] block">Esquerdo:</span>
                              <strong className="text-white text-sm font-mono-nums">{formatNumberBR(item.left)} cm</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ALL REGISTERED CIRCUMFERENCES */}
              {assessment.circumferences && Object.keys(assessment.circumferences).length > 0 ? (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3">
                  <span className="text-xs font-black uppercase tracking-wider text-white block">
                    Todas as Circunferências Registradas (cm)
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs">
                    {Object.entries(assessment.circumferences).map(([key, val]) => {
                      const label = (CIRCUMFERENCE_LABELS_PT as any)[key] || key;
                      const prevVal = (previousAssessment?.circumferences as any)?.[key];
                      const diff = (typeof val === 'number' && typeof prevVal === 'number') 
                        ? Number((val - prevVal).toFixed(1)) 
                        : undefined;

                      return (
                        <div key={key} className="bg-[#F8F9FA] border border-[#E5E7EB] p-3 rounded-xl flex flex-col justify-between space-y-1">
                          <span className="text-[10px] text-[#4B5563] font-bold truncate">{label}</span>
                          <p className="text-base font-black font-mono-nums text-white">
                            {formatNumberBR(val)} <span className="text-[10px] text-[#4B5563]">cm</span>
                          </p>
                          {diff !== undefined && (
                            <span className={`text-[10px] font-mono-nums font-bold ${
                              diff <= 0 ? 'text-emerald-400' : 'text-amber-300'
                            }`}>
                              {formatDeltaValueBR(diff, 'cm')}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 text-center text-xs text-[#4B5563]">
                  Nenhuma circunferência registrada nesta avaliação.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: EVOLUÇÃO VISUAL / FOTOS */}
          {activeTab === 'photos' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#374151] block">
                    EVOLUÇÃO VISUAL
                  </span>
                  <h3 className="text-xl font-black font-display uppercase text-white mt-0.5">
                    Registros Fotográficos Padronizados
                  </h3>
                  <p className="text-xs text-[#4B5563] mt-1">
                    Comparação visual de postura, tônus muscular e composição corporal.
                  </p>
                </div>
              </div>

              {assessment.photos && Object.values(assessment.photos).some(p => !!p) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { key: 'front', label: 'Vista Frontal', photo: assessment.photos.front, prevPhoto: previousAssessment?.photos?.front },
                    { key: 'rightSide', label: 'Lateral Direita', photo: assessment.photos.rightSide, prevPhoto: previousAssessment?.photos?.rightSide },
                    { key: 'leftSide', label: 'Lateral Esquerda', photo: assessment.photos.leftSide, prevPhoto: previousAssessment?.photos?.leftSide },
                    { key: 'back', label: 'Vista Posterior', photo: assessment.photos.back, prevPhoto: previousAssessment?.photos?.back }
                  ].map(item => (
                    <div key={item.key} className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 space-y-2">
                      <span className="text-xs font-bold text-white block text-center">{item.label}</span>
                      
                      {item.photo ? (
                        <div className="aspect-[3/4] rounded-xl overflow-hidden bg-black border border-[#E5E7EB]">
                          <img 
                            src={item.photo} 
                            alt={item.label} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="aspect-[3/4] rounded-xl bg-[#F8F9FA] border border-dashed border-[#E5E7EB] flex flex-col items-center justify-center p-4 text-center text-xs text-[#4B5563]">
                          <Camera className="w-6 h-6 mb-1 opacity-70" />
                          <span>Foto não enviada</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 text-center text-xs text-[#4B5563] space-y-2">
                  <Camera className="w-8 h-8 mx-auto opacity-70 text-[#4B5563]" />
                  <p>Nenhuma foto foi anexada a esta avaliação física.</p>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TRAINER CONCLUSIONS & PARECER */}
          {/* ========================================================================= */}
          {(assessment.conclusions || assessment.notes) && (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#374151]" />
                Parecer Técnico & Recomendações do Treinador
              </span>
              <p className="text-xs text-[#374151] leading-relaxed whitespace-pre-line bg-[#F8F9FA] p-4 rounded-xl border border-[#E5E7EB]">
                {assessment.conclusions || assessment.notes}
              </p>
            </div>
          )}

          {/* ========================================================================= */}
          {/* EXPANDABLE TECHNICAL DETAILS ACCORDION */}
          {/* ========================================================================= */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F8F9FA] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#4B5563]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                  {showTechnicalDetails ? 'Ocultar Detalhes Técnicos & Equações' : 'Ver Detalhes Técnicos & Equações de Cálculo'}
                </span>
              </div>
              {showTechnicalDetails ? <ChevronUp className="w-4 h-4 text-[#4B5563]" /> : <ChevronDown className="w-4 h-4 text-[#4B5563]" />}
            </button>

            {showTechnicalDetails && (
              <div className="p-5 border-t border-[#1E1E24] bg-[#0D0D0E] space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E7EB]">
                    <span className="text-[10px] text-[#4B5563] uppercase font-bold block">Protocolo Oficial</span>
                    <strong className="text-white text-xs">{assessment.formulaUsed || 'Jackson & Pollock — 7 Dobras + Siri'}</strong>
                  </div>
                  <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E7EB]">
                    <span className="text-[10px] text-[#4B5563] uppercase font-bold block">Densidade Corporal (D)</span>
                    <strong className="text-white font-mono-nums text-xs">
                      {assessment.bodyDensity ? `${assessment.bodyDensity.toFixed(6)} g/cm³` : '—'}
                    </strong>
                  </div>
                  <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E7EB]">
                    <span className="text-[10px] text-[#4B5563] uppercase font-bold block">Equação de Siri (1956)</span>
                    <strong className="text-white font-mono-nums text-xs">% GC = (495 / D) − 450</strong>
                  </div>
                  <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E7EB]">
                    <span className="text-[10px] text-[#4B5563] uppercase font-bold block">Origem do Registro</span>
                    <strong className="text-white text-xs">
                      {assessment.source === 'photo_import' ? 'Importada via Foto/OCR' : 'TFIVE PRO Oficial'}
                    </strong>
                  </div>
                  <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E7EB]">
                    <span className="text-[10px] text-[#4B5563] uppercase font-bold block">ID da Avaliação</span>
                    <strong className="text-[#4B5563] font-mono text-[11px] truncate block">{assessment.id}</strong>
                  </div>
                  <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E7EB]">
                    <span className="text-[10px] text-[#4B5563] uppercase font-bold block">Data & Hora do Registro</span>
                    <strong className="text-white text-xs">{new Date(assessment.date).toLocaleString('pt-BR')}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
