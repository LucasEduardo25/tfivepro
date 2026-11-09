import React, { useState, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  Flame, 
  TrendingDown, 
  TrendingUp, 
  Activity, 
  Award, 
  Layers, 
  Ruler, 
  Camera,
  Maximize2,
  Minimize2,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { Student, PhysicalAssessment } from '../../types';
import { 
  formatNumberBR, 
  formatPercentagePointsBR, 
  formatDeltaValueBR, 
  compareAssessments,
  calculateSumOf7Skinfolds,
  SKINFOLD_LABELS_PT,
  CIRCUMFERENCE_LABELS_PT
} from '../../utils/assessmentCalculations';
import { 
  getBodyFatClassification,
  getBMIClassification,
  getWHRClassification
} from '../../utils/assessmentClassifications';

interface PhysicalAssessmentStudentModeModalProps {
  student: Student;
  assessment: PhysicalAssessment;
  previousAssessment?: PhysicalAssessment;
  onClose: () => void;
}

export const PhysicalAssessmentStudentModeModal: React.FC<PhysicalAssessmentStudentModeModalProps> = ({
  student,
  assessment,
  previousAssessment,
  onClose
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [viewSection, setViewSection] = useState<'composition' | 'skinfolds' | 'circumferences' | 'photos'>('composition');

  const comparison = previousAssessment ? compareAssessments(assessment, previousAssessment) : null;

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

  const sumSkinfolds = assessment.sumOfSkinfolds || (assessment.skinfolds ? calculateSumOf7Skinfolds(assessment.skinfolds) : 0);

  const fatPercentage = assessment.bodyFatPercentage || 0;
  const leanPercentage = assessment.leanMassPercentage || Number((100 - fatPercentage).toFixed(1));
  const fatRadius = 65;
  const circumferenceLength = 2 * Math.PI * fatRadius;
  const fatStrokeDash = (fatPercentage / 100) * circumferenceLength;
  const leanStrokeDash = (leanPercentage / 100) * circumferenceLength;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F8F9FA] flex flex-col overflow-y-auto animate-in fade-in select-none">
      
      {/* ========================================================================= */}
      {/* STUDENT MODE TOP BAR */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-6 border-b border-[#1E1E24] bg-[#0D0D0F] flex items-center justify-between gap-4 sticky top-0 z-20 backdrop-blur-md bg-opacity-90">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#374151] text-white flex items-center justify-center font-black shadow-lg shadow-xs">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#374151]">
                TFIVE PRO
              </span>
              <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#F8F9FA] text-[#4B5563] border border-[#E5E7EB]">
                MODO ALUNO
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black font-display uppercase tracking-wide text-white">
              {student.name}
            </h1>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono-nums text-[#4B5563] bg-[#F8F9FA] px-3.5 py-2 rounded-xl border border-[#E5E7EB] hidden sm:inline-block">
            {new Date(assessment.date).toLocaleDateString('pt-BR', { dateStyle: 'long' })}
          </span>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] border border-[#E5E7EB] text-[#4B5563] hover:text-white transition-all cursor-pointer hidden sm:flex items-center justify-center"
            title="Alternar Tela Cheia"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl bg-[#374151]/15 hover:bg-[#374151]/25 text-[#374151] border border-[#374151]/30 transition-all cursor-pointer"
            title="Sair do Modo Aluno"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION SELECTOR PILLS */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-center gap-2 py-3 bg-[#0A0A0C] border-b border-[#1E1E24] px-4 overflow-x-auto">
        {[
          { id: 'composition', label: 'Composição Corporal', icon: Flame },
          { id: 'skinfolds', label: 'Dobras Cutâneas', icon: Layers },
          { id: 'circumferences', label: 'Perimetria & Medidas', icon: Ruler },
          { id: 'photos', label: 'Evolução Visual', icon: Camera }
        ].map(s => {
          const Icon = s.icon;
          const isActive = viewSection === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setViewSection(s.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                isActive 
                  ? 'bg-[#374151] text-white shadow-lg shadow-xs' 
                  : 'bg-[#F8F9FA] text-[#4B5563] hover:text-white border border-[#E5E7EB]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* PRESENTATION BODY */}
      {/* ========================================================================= */}
      <div className="max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6 flex-1">

        {/* VIEW SECTION 1: COMPOSIÇÃO CORPORAL */}
        {viewSection === 'composition' && (
          <div className="space-y-6 animate-in fade-in">
            {/* HERO HIGHLIGHT CALLOUT */}
            <div className="bg-gradient-to-r from-[#121212] via-[#1A1A24] to-[#121212] border border-[#E5E7EB] rounded-3xl p-5 sm:p-6 text-center space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-[#374151] block">
                {comparison ? 'EVOLUÇÃO FÍSICA COMPROVADA' : 'RESULTADO OFICIAL'}
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-display uppercase text-white">
                {comparison ? (
                  <>
                    {comparison.deltas.bodyFatPercentage < 0 ? (
                      <span className="text-emerald-400">
                        −{Math.abs(comparison.deltas.bodyFatPercentage).toString().replace('.', ',')} p.p. na gordura corporal
                      </span>
                    ) : (
                      <span>Composição Atualizada</span>
                    )}
                    {comparison.deltas.leanMassKg > 0 && (
                      <span className="text-white"> • +{formatNumberBR(comparison.deltas.leanMassKg)} kg de massa magra</span>
                    )}
                  </>
                ) : (
                  'Primeira Avaliação — Linha de Base Registrada'
                )}
              </h2>
              {bfClassification && (
                <div className="pt-2">
                  <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${bfClassification.badgeStyle.bg} ${bfClassification.badgeStyle.text} ${bfClassification.badgeStyle.border}`}>
                    <Award className="w-4 h-4" />
                    {bfClassification.label}
                  </span>
                </div>
              )}
            </div>

            {/* DONUT & 4 BIG CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
              
              {/* DONUT (5 cols) */}
              <div className="md:col-span-5 bg-white border border-[#E5E7EB] rounded-3xl p-6 flex flex-col items-center justify-between text-center">
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Distribuição da Massa Corporal
                </span>

                <div className="relative w-56 h-56 flex items-center justify-center my-4">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                    <circle cx="80" cy="80" r={fatRadius} fill="transparent" stroke="#1E1E24" strokeWidth="18" />
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
                    />
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
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-[10px] uppercase font-bold text-[#4B5563]">PESO TOTAL</span>
                    <p className="text-3xl sm:text-4xl font-black font-mono-nums text-white">
                      {formatNumberBR(assessment.weightKg)}
                    </p>
                    <span className="text-xs font-bold text-[#4B5563]">kg</span>
                  </div>
                </div>

                <div className="w-full grid grid-cols-2 gap-3 pt-3 border-t border-[#1E1E24]">
                  <div className="bg-[#F8F9FA] p-3 rounded-2xl border border-[#E5E7EB] text-left">
                    <span className="text-[10px] font-black uppercase text-emerald-400 block">Massa Magra</span>
                    <p className="text-lg font-black font-mono-nums text-white mt-0.5">{formatNumberBR(assessment.leanMassKg)} kg</p>
                    <span className="text-xs font-mono-nums text-emerald-400 font-bold">{formatNumberBR(leanPercentage)}%</span>
                  </div>
                  <div className="bg-[#F8F9FA] p-3 rounded-2xl border border-[#E5E7EB] text-left">
                    <span className="text-[10px] font-black uppercase text-[#374151] block">Massa Gorda</span>
                    <p className="text-lg font-black font-mono-nums text-white mt-0.5">{formatNumberBR(assessment.fatMassKg)} kg</p>
                    <span className="text-xs font-mono-nums text-[#374151] font-bold">{formatNumberBR(fatPercentage)}%</span>
                  </div>
                </div>
              </div>

              {/* 4 HERO CARDS (7 cols) */}
              <div className="md:col-span-7 grid grid-cols-2 gap-4">
                {/* 1. % GORDURA */}
                <div className="bg-white border-2 border-[#374151] p-5 sm:p-6 rounded-3xl flex flex-col justify-between shadow-xl shadow-xs">
                  <span className="text-xs font-black uppercase tracking-wider text-[#374151] block">
                    % GORDURA
                  </span>
                  <p className="text-3xl sm:text-4xl md:text-5xl font-black font-mono-nums text-white my-2">
                    {formatNumberBR(assessment.bodyFatPercentage)}%
                  </p>
                  {comparison && (
                    <div className={`inline-flex items-center gap-1 text-xs font-black font-mono-nums px-2.5 py-1 rounded-xl w-fit ${
                      comparison.deltas.bodyFatPercentage <= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-300'
                    }`}>
                      {comparison.deltas.bodyFatPercentage <= 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                      <span>{formatPercentagePointsBR(comparison.deltas.bodyFatPercentage)}</span>
                    </div>
                  )}
                </div>

                {/* 2. MASSA MAGRA */}
                <div className="bg-white border border-[#E5E7EB] p-5 sm:p-6 rounded-3xl flex flex-col justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400 block">
                    MASSA MAGRA
                  </span>
                  <p className="text-3xl sm:text-4xl md:text-5xl font-black font-mono-nums text-white my-2">
                    {formatNumberBR(assessment.leanMassKg)} <span className="text-base font-bold text-[#4B5563]">kg</span>
                  </p>
                  {comparison && (
                    <div className={`inline-flex items-center gap-1 text-xs font-black font-mono-nums px-2.5 py-1 rounded-xl w-fit ${
                      comparison.deltas.leanMassKg >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                    }`}>
                      {comparison.deltas.leanMassKg >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      <span>{formatDeltaValueBR(comparison.deltas.leanMassKg, 'kg')}</span>
                    </div>
                  )}
                </div>

                {/* 3. MASSA GORDA */}
                <div className="bg-white border border-[#E5E7EB] p-5 sm:p-6 rounded-3xl flex flex-col justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-[#4B5563] block">
                    MASSA GORDA
                  </span>
                  <p className="text-3xl sm:text-4xl md:text-5xl font-black font-mono-nums text-white my-2">
                    {formatNumberBR(assessment.fatMassKg)} <span className="text-base font-bold text-[#4B5563]">kg</span>
                  </p>
                  {comparison && (
                    <div className={`inline-flex items-center gap-1 text-xs font-black font-mono-nums px-2.5 py-1 rounded-xl w-fit ${
                      comparison.deltas.fatMassKg <= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-300'
                    }`}>
                      {comparison.deltas.fatMassKg <= 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                      <span>{formatDeltaValueBR(comparison.deltas.fatMassKg, 'kg')}</span>
                    </div>
                  )}
                </div>

                {/* 4. PESO TOTAL */}
                <div className="bg-white border border-[#E5E7EB] p-5 sm:p-6 rounded-3xl flex flex-col justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-[#4B5563] block">
                    PESO TOTAL
                  </span>
                  <p className="text-3xl sm:text-4xl md:text-5xl font-black font-mono-nums text-white my-2">
                    {formatNumberBR(assessment.weightKg)} <span className="text-base font-bold text-[#4B5563]">kg</span>
                  </p>
                  {comparison && (
                    <div className="inline-flex items-center gap-1 text-xs font-black font-mono-nums px-2.5 py-1 rounded-xl w-fit bg-[#F8F9FA] text-white">
                      <span>{formatDeltaValueBR(comparison.deltas.weightKg, 'kg')}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* VIEW SECTION 2: DOBRAS CUTÂNEAS */}
        {viewSection === 'skinfolds' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#374151] block">
                  JACKSON & POLLOCK — 7 DOBRAS
                </span>
                <h3 className="text-2xl font-black font-display uppercase text-white mt-1">
                  Mapeamento de Gordura Subcutânea
                </h3>
              </div>

              <div className="bg-[#F8F9FA] p-4 rounded-2xl border border-[#E5E7EB] text-center shrink-0 min-w-[150px]">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] block">
                  SOMA TOTAL (Σ7)
                </span>
                <p className="text-2xl sm:text-3xl font-black font-mono-nums text-white mt-0.5">
                  {sumSkinfolds > 0 ? formatNumberBR(sumSkinfolds) : '—'} <span className="text-xs text-[#4B5563]">mm</span>
                </p>
                {comparison?.deltas.sumOfSkinfolds !== undefined && (
                  <div className={`mt-1 inline-flex items-center gap-1 text-xs font-black font-mono-nums px-2 py-0.5 rounded-lg ${
                    comparison.deltas.sumOfSkinfolds <= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-300'
                  }`}>
                    {comparison.deltas.sumOfSkinfolds <= 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                    <span>{formatDeltaValueBR(comparison.deltas.sumOfSkinfolds, 'mm')}</span>
                  </div>
                )}
              </div>
            </div>

            {assessment.skinfolds && Object.keys(assessment.skinfolds).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {Object.entries(SKINFOLD_LABELS_PT).map(([k, label]) => {
                  const curr = (assessment.skinfolds as any)?.[k];
                  const prev = (previousAssessment?.skinfolds as any)?.[k];
                  const diff = (typeof curr === 'number' && typeof prev === 'number') 
                    ? Number((curr - prev).toFixed(1)) 
                    : undefined;

                  return (
                    <div key={k} className="bg-white border border-[#E5E7EB] p-4 rounded-2xl space-y-2">
                      <span className="text-xs font-bold text-white block">{label}</span>
                      <div className="flex items-baseline justify-between">
                        {prev !== undefined ? (
                          <span className="text-xs text-[#4B5563] font-mono-nums">
                            {formatNumberBR(prev)} → <strong className="text-white text-base font-black">{formatNumberBR(curr)}</strong> mm
                          </span>
                        ) : (
                          <strong className="text-white text-xl font-black font-mono-nums">
                            {curr !== undefined ? `${formatNumberBR(curr)} mm` : '—'}
                          </strong>
                        )}

                        {diff !== undefined && (
                          <span className={`text-xs font-black font-mono-nums px-2 py-0.5 rounded-md ${
                            diff <= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-300'
                          }`}>
                            {formatDeltaValueBR(diff, 'mm')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-xs text-[#4B5563] py-8">
                Dobras cutâneas individuais não registradas.
              </p>
            )}
          </div>
        )}

        {/* VIEW SECTION 3: PERIMETRIA & MEDIDAS */}
        {viewSection === 'circumferences' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6">
              <span className="text-xs font-black uppercase tracking-wider text-[#374151] block">
                PERIMETRIA COMPLETA
              </span>
              <h3 className="text-2xl font-black font-display uppercase text-white mt-1">
                Circunferências Corporais (cm)
              </h3>
            </div>

            {assessment.circumferences && Object.keys(assessment.circumferences).length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {Object.entries(assessment.circumferences).map(([k, val]) => {
                  const label = (CIRCUMFERENCE_LABELS_PT as any)[k] || k;
                  const prev = (previousAssessment?.circumferences as any)?.[k];
                  const diff = (typeof val === 'number' && typeof prev === 'number') 
                    ? Number((val - prev).toFixed(1)) 
                    : undefined;

                  return (
                    <div key={k} className="bg-white border border-[#E5E7EB] p-4 rounded-2xl space-y-1">
                      <span className="text-[11px] text-[#4B5563] font-bold block truncate">{label}</span>
                      <p className="text-xl font-black font-mono-nums text-white">
                        {formatNumberBR(val)} <span className="text-xs text-[#4B5563]">cm</span>
                      </p>
                      {diff !== undefined && (
                        <span className={`text-[11px] font-bold font-mono-nums ${
                          diff <= 0 ? 'text-emerald-400' : 'text-amber-300'
                        }`}>
                          {formatDeltaValueBR(diff, 'cm')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-xs text-[#4B5563] py-8">
                Nenhuma circunferência registrada.
              </p>
            )}
          </div>
        )}

        {/* VIEW SECTION 4: EVOLUÇÃO VISUAL / FOTOS */}
        {viewSection === 'photos' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6">
              <span className="text-xs font-black uppercase tracking-wider text-[#374151] block">
                EVOLUÇÃO VISUAL
              </span>
              <h3 className="text-2xl font-black font-display uppercase text-white mt-1">
                Registros Fotográficos
              </h3>
            </div>

            {assessment.photos && Object.values(assessment.photos).some(p => !!p) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Vista Frontal', photo: assessment.photos.front },
                  { label: 'Lateral Direita', photo: assessment.photos.rightSide },
                  { label: 'Lateral Esquerda', photo: assessment.photos.leftSide },
                  { label: 'Vista Posterior', photo: assessment.photos.back }
                ].map(p => (
                  <div key={p.label} className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 space-y-2 text-center">
                    <span className="text-xs font-bold text-white block">{p.label}</span>
                    {p.photo ? (
                      <div className="aspect-[3/4] rounded-xl overflow-hidden bg-black border border-[#E5E7EB]">
                        <img 
                          src={p.photo} 
                          alt={p.label} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[3/4] rounded-xl bg-[#F8F9FA] border border-dashed border-[#E5E7EB] flex items-center justify-center text-xs text-[#4B5563]">
                        Sem foto
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-xs text-[#4B5563] py-8">
                Nenhuma foto registrada para esta avaliação.
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
