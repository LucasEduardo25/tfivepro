import React from 'react';
import { 
  X, 
  Sparkles, 
  Scale, 
  TrendingDown, 
  TrendingUp, 
  Activity, 
  Award, 
  Calendar,
  Layers,
  Ruler
} from 'lucide-react';
import { Student, PhysicalAssessment } from '../../types';
import { 
  formatNumberBR, 
  formatPercentagePointsBR, 
  formatDeltaValueBR,
  compareAssessments,
  SKINFOLD_LABELS_PT,
  CIRCUMFERENCE_LABELS_PT,
  SkinfoldMap,
  CircumferenceMap
} from '../../utils/assessmentCalculations';

interface AssessmentStudentPresentationModalProps {
  student: Student;
  assessment: PhysicalAssessment;
  previousAssessment?: PhysicalAssessment;
  onClose: () => void;
}

export const AssessmentStudentPresentationModal: React.FC<AssessmentStudentPresentationModalProps> = ({
  student,
  assessment,
  previousAssessment,
  onClose
}) => {
  const comparison = previousAssessment ? compareAssessments(assessment, previousAssessment) : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
      <div className="bg-white border-2 border-[#374151]/50 rounded-3xl max-w-3xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* PRESENTATION TOP BAR */}
        <div className="p-5 sm:p-6 border-b border-[#E5E7EB] bg-[#F8F9FA]/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#374151] text-white flex items-center justify-center font-black shadow-lg shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#374151] block">
                MODO APRESENTAÇÃO AO ALUNO
              </span>
              <h2 className="text-xl sm:text-2xl font-black font-display uppercase tracking-wide text-white">
                {student.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono-nums text-[#4B5563] bg-white px-3 py-1.5 rounded-xl border border-[#E5E7EB] hidden sm:inline-block">
              {new Date(assessment.date).toLocaleDateString('pt-BR', { dateStyle: 'long' })}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] text-[#4B5563] hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRESENTATION CONTENT */}
        <div className="p-5 sm:p-8 overflow-y-auto flex-1 space-y-6">

          {/* HEADLINE CALLOUT */}
          <div className="bg-gradient-to-r from-[#18181B] via-[#1E1E24] to-[#18181B] border border-[#E5E7EB] rounded-2xl p-5 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
              {comparison ? 'Evolução Física Comprovada' : 'Linha de Base Registrada'}
            </span>
            <h3 className="text-xl sm:text-2xl font-black font-display uppercase text-white mt-1">
              {comparison ? (
                <>
                  {comparison.deltas.bodyFatPercentage < 0 ? (
                    <span className="text-emerald-400">
                      Redução de {Math.abs(comparison.deltas.bodyFatPercentage).toString().replace('.', ',')} p.p. na gordura
                    </span>
                  ) : (
                    <span>Composição Corporal Atualizada</span>
                  )}
                  {comparison.deltas.leanMassKg > 0 && (
                    <span className="text-white"> e +{comparison.deltas.leanMassKg.toString().replace('.', ',')} kg de massa magra</span>
                  )}
                </>
              ) : (
                'Primeira Avaliação de Referência'
              )}
            </h3>
          </div>

          {/* MAIN 4 STATS CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* GORDURA CORPORAL */}
            <div className="bg-[#F8F9FA] border-2 border-[#374151] p-4 sm:p-5 rounded-2xl text-center shadow-lg shadow-xs">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#374151] block">
                % GORDURA
              </span>
              <p className="text-3xl sm:text-4xl font-black font-mono-nums text-white mt-2">
                {formatNumberBR(assessment.bodyFatPercentage)}%
              </p>
              {comparison && (
                <div className={`mt-2 inline-flex items-center gap-1 text-xs font-black font-mono-nums px-2 py-0.5 rounded-lg ${
                  comparison.deltas.bodyFatPercentage <= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                }`}>
                  {comparison.deltas.bodyFatPercentage <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                  <span>{formatPercentagePointsBR(comparison.deltas.bodyFatPercentage)}</span>
                </div>
              )}
            </div>

            {/* MASSA MAGRA */}
            <div className="bg-[#F8F9FA] border border-[#E5E7EB] p-4 sm:p-5 rounded-2xl text-center">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 block">
                MASSA MAGRA
              </span>
              <p className="text-3xl sm:text-4xl font-black font-mono-nums text-white mt-2">
                {formatNumberBR(assessment.leanMassKg)} <span className="text-sm font-bold text-[#4B5563]">kg</span>
              </p>
              {comparison && (
                <div className={`mt-2 inline-flex items-center gap-1 text-xs font-black font-mono-nums px-2 py-0.5 rounded-lg ${
                  comparison.deltas.leanMassKg >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                }`}>
                  {comparison.deltas.leanMassKg >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>{formatDeltaValueBR(comparison.deltas.leanMassKg, 'kg')}</span>
                </div>
              )}
            </div>

            {/* PESO TOTAL */}
            <div className="bg-[#F8F9FA] border border-[#E5E7EB] p-4 sm:p-5 rounded-2xl text-center">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#4B5563] block">
                PESO TOTAL
              </span>
              <p className="text-3xl sm:text-4xl font-black font-mono-nums text-white mt-2">
                {formatNumberBR(assessment.weightKg)} <span className="text-sm font-bold text-[#4B5563]">kg</span>
              </p>
              {comparison && (
                <div className="mt-2 inline-flex items-center gap-1 text-xs font-black font-mono-nums px-2 py-0.5 rounded-lg bg-[#27272A] text-white">
                  <span>{formatDeltaValueBR(comparison.deltas.weightKg, 'kg')}</span>
                </div>
              )}
            </div>

            {/* MASSA GORDA */}
            <div className="bg-[#F8F9FA] border border-[#E5E7EB] p-4 sm:p-5 rounded-2xl text-center">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#4B5563] block">
                MASSA GORDA
              </span>
              <p className="text-3xl sm:text-4xl font-black font-mono-nums text-white mt-2">
                {formatNumberBR(assessment.fatMassKg)} <span className="text-sm font-bold text-[#4B5563]">kg</span>
              </p>
              {comparison && (
                <div className={`mt-2 inline-flex items-center gap-1 text-xs font-black font-mono-nums px-2 py-0.5 rounded-lg ${
                  comparison.deltas.fatMassKg <= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                }`}>
                  {comparison.deltas.fatMassKg <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                  <span>{formatDeltaValueBR(comparison.deltas.fatMassKg, 'kg')}</span>
                </div>
              )}
            </div>
          </div>

          {/* SOMA DAS DOBRAS & COMPARAÇÃO POR PONTO */}
          {comparison && comparison.skinfoldComparisons.length > 0 && (
            <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black font-display uppercase tracking-wider text-white">
                    Evolução das Dobras Cutâneas (mm)
                  </h4>
                  <p className="text-xs text-[#4B5563]">Medidas antropométricas milimétricas</p>
                </div>

                {comparison.deltas.sumOfSkinfolds !== undefined && (
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-[#4B5563] block">Soma das Dobras</span>
                    <span className="text-base font-black font-mono-nums text-white">
                      {formatDeltaValueBR(comparison.deltas.sumOfSkinfolds, 'mm')}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {comparison.skinfoldComparisons.map(item => (
                  <div key={item.key} className="bg-white border border-[#E5E7EB] p-3 rounded-xl">
                    <span className="text-[11px] font-bold text-[#4B5563] block truncate">{item.label}</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-xs text-[#4B5563] font-mono-nums">{item.previous} → <strong className="text-white text-sm">{item.current}</strong> mm</span>
                      <span className={`text-[11px] font-black font-mono-nums ${item.diff <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatDeltaValueBR(item.diff, 'mm')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CIRCUNFERÊNCIAS SE DISPONÍVEIS */}
          {assessment.circumferences && Object.keys(assessment.circumferences).length > 0 && (
            <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-5 space-y-3">
              <h4 className="text-sm font-black font-display uppercase tracking-wider text-white">
                Perímetros & Medidas Corporais (cm)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                {Object.entries(assessment.circumferences).map(([k, val]) => (
                  <div key={k} className="bg-white border border-[#E5E7EB] p-2.5 rounded-xl flex items-center justify-between">
                    <span className="text-[#4B5563] truncate">{(CIRCUMFERENCE_LABELS_PT as any)[k] || k}:</span>
                    <strong className="text-white font-mono-nums">{val} cm</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center pt-2">
            <span className="text-xs text-[#4B5563]">
              Protocolo: {assessment.formulaUsed || 'Jackson & Pollock — 7 Dobras + Siri'}
            </span>
          </div>

        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-5 border-t border-[#E5E7EB] bg-[#F8F9FA]/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all cursor-pointer"
          >
            Fechar Apresentação
          </button>
        </div>

      </div>
    </div>
  );
};
