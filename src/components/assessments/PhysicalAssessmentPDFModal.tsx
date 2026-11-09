import React, { useState, useMemo, useRef } from 'react';
import { 
  X, 
  Printer, 
  Download,
  Loader2,
  CheckSquare, 
  Square, 
  Activity, 
  Flame, 
  Layers, 
  Ruler, 
  Camera, 
  ShieldCheck,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Award,
  Share2
} from 'lucide-react';
import { Student, PhysicalAssessment, TrainerProfile } from '../../types';
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
  getWHRClassification,
  getWaistCircumferenceClassification
} from '../../utils/assessmentClassifications';
import { exportElementToPDF } from '../../services/pdfExportService';
import { buildTFIVEFilename } from '../../utils/fileDownloadService';

interface PhysicalAssessmentPDFModalProps {
  student: Student;
  assessment: PhysicalAssessment;
  allStudentAssessments: PhysicalAssessment[];
  trainerProfile?: TrainerProfile;
  onClose: () => void;
}

export const PhysicalAssessmentPDFModal: React.FC<PhysicalAssessmentPDFModalProps> = ({
  student,
  assessment,
  allStudentAssessments,
  trainerProfile,
  onClose
}) => {
  const hasPhotos = Boolean(assessment.photos && Object.values(assessment.photos).some(p => !!p));
  const [includePhotos, setIncludePhotos] = useState<boolean>(hasPhotos);

  // Chronological sort
  const chronoSorted = useMemo(() => {
    return [...allStudentAssessments]
      .filter(a => a.studentId === student.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allStudentAssessments, student.id]);

  const currentIndex = chronoSorted.findIndex(a => a.id === assessment.id);
  const previousAssessment = currentIndex > 0 ? chronoSorted[currentIndex - 1] : undefined;
  const comparison = previousAssessment ? compareAssessments(assessment, previousAssessment) : null;

  const age = assessment.age && assessment.age >= 10 && assessment.age <= 110
    ? assessment.age
    : student.birthDate
      ? (() => {
          const b = new Date(student.birthDate);
          const d = new Date(assessment.date);
          let a = d.getFullYear() - b.getFullYear();
          const m = d.getMonth() - b.getMonth();
          if (m < 0 || (m === 0 && d.getDate() < b.getDate())) a--;
          return a >= 10 && a <= 110 ? a : null;
        })()
      : null;

  const gender = assessment.gender || student.gender || 'male';
  const bfClassification = age !== null ? getBodyFatClassification(assessment.bodyFatPercentage, gender, age) : null;
  const bmiClassification = getBMIClassification(assessment.bmi);
  const whrClassification = age !== null ? getWHRClassification(assessment.waistHipRatio, gender, age) : null;
  const waistClassification = getWaistCircumferenceClassification(assessment.circumferences?.waist, gender);

  const sumSkinfolds = assessment.sumOfSkinfolds || (assessment.skinfolds ? calculateSumOf7Skinfolds(assessment.skinfolds) : 0);

  // Bilateral Asymmetry Calculations
  const bilateralPairs = useMemo(() => {
    if (!assessment.circumferences) return [];
    const pairs: Array<{ label: string; right: number; left: number; diff: number }> = [];
    const circ = assessment.circumferences;

    if (circ.rightArmContracted && circ.leftArmContracted) {
      pairs.push({ label: 'Braço Contraído', right: circ.rightArmContracted, left: circ.leftArmContracted, diff: Number((circ.rightArmContracted - circ.leftArmContracted).toFixed(1)) });
    }
    if (circ.rightArmRelaxed && circ.leftArmRelaxed) {
      pairs.push({ label: 'Braço Relaxado', right: circ.rightArmRelaxed, left: circ.leftArmRelaxed, diff: Number((circ.rightArmRelaxed - circ.leftArmRelaxed).toFixed(1)) });
    }
    if (circ.rightThigh && circ.leftThigh) {
      pairs.push({ label: 'Coxa', right: circ.rightThigh, left: circ.leftThigh, diff: Number((circ.rightThigh - circ.leftThigh).toFixed(1)) });
    }
    if (circ.rightCalf && circ.leftCalf) {
      pairs.push({ label: 'Panturrilha', right: circ.rightCalf, left: circ.leftCalf, diff: Number((circ.rightCalf - circ.leftCalf).toFixed(1)) });
    }
    if (circ.rightForearm && circ.leftForearm) {
      pairs.push({ label: 'Antebraço', right: circ.rightForearm, left: circ.leftForearm, diff: Number((circ.rightForearm - circ.leftForearm).toFixed(1)) });
    }
    return pairs;
  }, [assessment.circumferences]);

  const fatPercentage = assessment.bodyFatPercentage || 0;
  const leanPercentage = assessment.leanMassPercentage || Number((100 - fatPercentage).toFixed(1));
  const fatRadius = 50;
  const circumferenceLength = 2 * Math.PI * fatRadius;
  const fatStrokeDash = (fatPercentage / 100) * circumferenceLength;
  const leanStrokeDash = (leanPercentage / 100) * circumferenceLength;

  const printableRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const handleDownloadPDF = async (action: 'download' | 'share') => {
    if (!printableRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const filename = buildTFIVEFilename(
        'Avaliacao',
        student.name,
        assessment.date,
        'pdf'
      );
      
      const pdfBlob = await exportElementToPDF({
        element: printableRef.current,
        filename,
        onProgress: setExportStatus
      });

      if (action === 'share') {
        const { shareOrDownloadFile } = await import('../../utils/fileDownloadService');
        await shareOrDownloadFile({
          blob: pdfBlob,
          filename,
          title: `Avaliação Física TFIVE - ${student.name}`,
          text: 'Segue o relatório da Avaliação Física TFIVE PRO.'
        });
      } else {
        const { downloadBlob } = await import('../../utils/fileDownloadService');
        downloadBlob(pdfBlob, filename);
      }

    } catch (err) {
      console.error('[TFIVE PDF] Erro ao exportar avaliação:', err);
      window.print();
    } finally {
      setIsExporting(false);
      setExportStatus(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-start p-2 sm:p-4 overflow-y-auto">
      
      {/* ========================================================================= */}
      {/* FLOATING ACTION TOOLBAR (HIDDEN WHEN PRINTING) */}
      {/* ========================================================================= */}
      <div className="print:hidden sticky top-4 z-50 bg-white border border-[#E5E7EB] rounded-2xl p-3 sm:p-4 max-w-3xl w-full flex items-center justify-between shadow-2xl mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#374151] text-white flex items-center justify-center font-black">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#374151] block">
              IMPRESSÃO & PDF A4
            </span>
            <span className="text-sm font-black text-[#1F2937] font-display uppercase">
              Relatório de Avaliação Física • {student.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasPhotos && (
            <label className="flex items-center gap-1.5 text-xs text-[#4B5563] hover:text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includePhotos}
                onChange={e => setIncludePhotos(e.target.checked)}
                className="rounded border-[#E5E7EB] text-[#374151] focus:ring-0 cursor-pointer"
              />
              <span>Incluir Fotos</span>
            </label>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownloadPDF('download')}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-xs transition-all cursor-pointer disabled:opacity-80"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{exportStatus || 'GERANDO PDF...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Baixar PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleDownloadPDF('share')}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] hover:text-white text-[#1F2937] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border border-[#E5E7EB] transition-all cursor-pointer disabled:opacity-80"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Compartilhar PDF</span>
            </button>
            
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-xs transition-all cursor-pointer disabled:opacity-80"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] text-[#4B5563] hover:text-white border border-[#E5E7EB] transition-all cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TRUE A4 PRINTABLE DOCUMENT CONTAINER */}
      {/* ========================================================================= */}
      <div 
        ref={printableRef}
        id="physical-assessment-printable-document" 
        className="w-full max-w-[210mm] bg-white text-[#18181B] shadow-2xl print:shadow-none print:max-w-none print:w-full print:m-0 font-sans"
        style={{
          minHeight: '297mm',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact'
        }}
      >
        
        {/* ======================================================================= */}
        {/* PAGE 1: CABEÇALHO + SUMÁRIO EXECUTIVO + COMPOSIÇÃO CORPORAL */}
        {/* ======================================================================= */}
        <div className="p-8 sm:p-10 flex flex-col justify-between" style={{ minHeight: '297mm', pageBreakAfter: 'always', breakAfter: 'page' }}>
          <div>
            {/* OFFICIAL DOCUMENT HEADER */}
            <div className="border-b-2 border-[#18181B] pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#374151] text-white rounded-xl flex items-center justify-center font-black text-xl tracking-tighter">
                  TF5
                </div>
                <div>
                  <h1 className="text-xl font-black uppercase tracking-wider text-[#18181B] leading-tight">
                    TFIVE PRO
                  </h1>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#374151] block">
                    RELATÓRIO OFICIAL DE AVALIAÇÃO FÍSICA
                  </span>
                </div>
              </div>

              <div className="text-right text-xs space-y-0.5">
                <p className="font-bold text-[#18181B] uppercase">{student.name}</p>
                <p className="text-[#4B5563]">
                  Data: <strong className="text-[#18181B]">{new Date(assessment.date).toLocaleDateString('pt-BR', { dateStyle: 'long' })}</strong>
                </p>
                <p className="text-[#4B5563] text-[10px]">
                  Protocolo: {assessment.formulaUsed || 'Jackson & Pollock — 7 Dobras + Siri'}
                </p>
              </div>
            </div>

            {/* BASELINE / COMPARISON STRIP */}
            <div className="mt-4 p-3 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold uppercase text-[10px] text-zinc-600 block">Status da Avaliação:</span>
                <strong className="text-zinc-900">
                  {previousAssessment 
                    ? `Comparação Evolutiva com Avaliação de ${new Date(previousAssessment.date).toLocaleDateString('pt-BR')} (${comparison?.daysBetween} dias)` 
                    : 'Linha de Base Oficial — Primeira Avaliação Registrada'}
                </strong>
              </div>
              {bfClassification && (
                <div className="px-2.5 py-1 rounded bg-white border border-zinc-300 font-bold text-xs">
                  {bfClassification.label}
                </div>
              )}
            </div>

            {/* BODY COMPOSITION DONUT + NUMERIC BREAKDOWN */}
            <div className="mt-6 border border-zinc-300 rounded-xl p-5 bg-zinc-50/50">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-900 block border-b border-zinc-200 pb-2 mb-4">
                1. Composição Corporal Consolidada
              </span>

              <div className="grid grid-cols-12 gap-6 items-center">
                {/* DONUT SVG */}
                <div className="col-span-5 flex flex-col items-center justify-center">
                  <div className="relative w-40 h-40">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                      <circle cx="70" cy="70" r={fatRadius} fill="transparent" stroke="#E4E4E7" strokeWidth="16" />
                      <circle
                        cx="70"
                        cy="70"
                        r={fatRadius}
                        fill="transparent"
                        stroke="#10B981"
                        strokeWidth="16"
                        strokeDasharray={`${leanStrokeDash} ${circumferenceLength}`}
                        strokeDashoffset="0"
                      />
                      <circle
                        cx="70"
                        cy="70"
                        r={fatRadius}
                        fill="transparent"
                        stroke="#374151"
                        strokeWidth="16"
                        strokeDasharray={`${fatStrokeDash} ${circumferenceLength}`}
                        strokeDashoffset={`-${leanStrokeDash}`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[9px] uppercase font-bold text-zinc-600">PESO TOTAL</span>
                      <strong className="text-2xl font-black text-zinc-900 leading-tight">
                        {formatNumberBR(assessment.weightKg)}
                      </strong>
                      <span className="text-[10px] text-zinc-600 font-bold">kg</span>
                    </div>
                  </div>
                </div>

                {/* LEGEND & METRICS */}
                <div className="col-span-7 space-y-3">
                  <div className="p-3 rounded-lg bg-white border border-zinc-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500" />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-600 block">Massa Magra</span>
                        <strong className="text-lg font-black text-zinc-900">{formatNumberBR(assessment.leanMassKg)} kg</strong>
                      </div>
                    </div>
                    <span className="text-sm font-bold font-mono text-emerald-600">{formatNumberBR(leanPercentage)}%</span>
                  </div>

                  <div className="p-3 rounded-lg bg-white border border-zinc-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[#374151]" />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-600 block">Massa Gorda</span>
                        <strong className="text-lg font-black text-zinc-900">{formatNumberBR(assessment.fatMassKg)} kg</strong>
                      </div>
                    </div>
                    <span className="text-sm font-bold font-mono text-[#374151]">{formatNumberBR(fatPercentage)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 6 EXECUTIVE METRIC CARDS */}
            <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
              {/* GORDURA */}
              <div className="p-3 rounded-lg border-2 border-[#374151] bg-white">
                <span className="text-[9px] font-black uppercase text-[#374151] block">% Gordura</span>
                <p className="text-2xl font-black text-zinc-900 mt-1">{formatNumberBR(assessment.bodyFatPercentage)}%</p>
                {comparison && (
                  <span className="text-[10px] font-bold text-zinc-600 block mt-1">
                    Variação: {formatPercentagePointsBR(comparison.deltas.bodyFatPercentage)}
                  </span>
                )}
              </div>

              {/* MASSA MAGRA */}
              <div className="p-3 rounded-lg border border-zinc-200 bg-white">
                <span className="text-[9px] font-black uppercase text-emerald-700 block">Massa Magra</span>
                <p className="text-2xl font-black text-zinc-900 mt-1">{formatNumberBR(assessment.leanMassKg)} kg</p>
                {comparison && (
                  <span className="text-[10px] font-bold text-zinc-600 block mt-1">
                    Variação: {formatDeltaValueBR(comparison.deltas.leanMassKg, 'kg')}
                  </span>
                )}
              </div>

              {/* MASSA GORDA */}
              <div className="p-3 rounded-lg border border-zinc-200 bg-white">
                <span className="text-[9px] font-black uppercase text-zinc-600 block">Massa Gorda</span>
                <p className="text-2xl font-black text-zinc-900 mt-1">{formatNumberBR(assessment.fatMassKg)} kg</p>
                {comparison && (
                  <span className="text-[10px] font-bold text-zinc-600 block mt-1">
                    Variação: {formatDeltaValueBR(comparison.deltas.fatMassKg, 'kg')}
                  </span>
                )}
              </div>

              {/* PESO TOTAL */}
              <div className="p-3 rounded-lg border border-zinc-200 bg-white">
                <span className="text-[9px] font-black uppercase text-zinc-600 block">Peso Total</span>
                <p className="text-2xl font-black text-zinc-900 mt-1">{formatNumberBR(assessment.weightKg)} kg</p>
                {comparison && (
                  <span className="text-[10px] font-bold text-zinc-600 block mt-1">
                    Variação: {formatDeltaValueBR(comparison.deltas.weightKg, 'kg')}
                  </span>
                )}
              </div>

              {/* IMC */}
              <div className="p-3 rounded-lg border border-zinc-200 bg-white">
                <span className="text-[9px] font-black uppercase text-zinc-600 block">IMC (Índice)</span>
                <p className="text-2xl font-black text-zinc-900 mt-1">{formatNumberBR(assessment.bmi)}</p>
                {bmiClassification && (
                  <span className="text-[10px] font-bold text-zinc-600 block mt-1 truncate">
                    {bmiClassification.label}
                  </span>
                )}
              </div>

              {/* SOMA DAS DOBRAS */}
              <div className="p-3 rounded-lg border border-zinc-200 bg-white">
                <span className="text-[9px] font-black uppercase text-zinc-600 block">Soma 7 Dobras</span>
                <p className="text-2xl font-black text-zinc-900 mt-1">
                  {sumSkinfolds > 0 ? `${formatNumberBR(sumSkinfolds)} mm` : '—'}
                </p>
                {comparison?.deltas.sumOfSkinfolds !== undefined && (
                  <span className="text-[10px] font-bold text-zinc-600 block mt-1">
                    Variação: {formatDeltaValueBR(comparison.deltas.sumOfSkinfolds, 'mm')}
                  </span>
                )}
              </div>
            </div>

            {/* SCIENTIFIC CLASSIFICATION TABLE */}
            <div className="mt-5 border border-zinc-200 rounded-lg p-4 bg-zinc-50 text-xs space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-900 block border-b border-zinc-200 pb-1.5">
                Classificações e Referências Científicas
              </span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-zinc-600 block">Percentual de Gordura:</span>
                  <strong className="text-zinc-900">{bfClassification ? `${bfClassification.label} (${bfClassification.referenceSource})` : '—'}</strong>
                </div>
                <div>
                  <span className="text-zinc-600 block">Índice de Massa Corporal (IMC):</span>
                  <strong className="text-zinc-900">{bmiClassification ? `${bmiClassification.label} (${bmiClassification.referenceSource})` : '—'}</strong>
                </div>
                <div>
                  <span className="text-zinc-600 block">Risco Cintura / Abdominal:</span>
                  <strong className="text-zinc-900">{waistClassification ? `${waistClassification.label} (${waistClassification.referenceSource})` : (whrClassification ? `${whrClassification.label} (${whrClassification.referenceSource})` : '—')}</strong>
                </div>
                <div>
                  <span className="text-zinc-600 block">Metodologia:</span>
                  <strong className="text-zinc-900">{assessment.formulaUsed || 'Jackson & Pollock — 7 Dobras + Siri (1956)'}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* PAGE 1 FOOTER */}
          <div className="border-t border-zinc-200 pt-3 flex items-center justify-between text-[9px] text-zinc-600 uppercase">
            <span>TFIVE PRO • AVALIAÇÃO FÍSICA • {student.name}</span>
            <span>Página 1 de {includePhotos ? '5' : '4'}</span>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* PAGE 2: DOBRAS CUTÂNEAS (7 DOBRAS JACKSON & POLLOCK) */}
        {/* ======================================================================= */}
        <div className="p-8 sm:p-10 flex flex-col justify-between" style={{ minHeight: '297mm', pageBreakAfter: 'always', breakAfter: 'page' }}>
          <div>
            <div className="border-b-2 border-[#18181B] pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-[#374151] tracking-wider block">TFIVE PRO • AVALIAÇÃO FÍSICA</span>
                <h2 className="text-lg font-black uppercase text-[#18181B]">2. Mapeamento das 7 Dobras Cutâneas (mm)</h2>
              </div>
              <span className="text-xs text-zinc-600">{student.name}</span>
            </div>

            <div className="mt-4 p-4 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-600 block">Soma das 7 Dobras (Σ7):</span>
                <strong className="text-xl font-black text-zinc-900">{sumSkinfolds > 0 ? `${formatNumberBR(sumSkinfolds)} mm` : '—'}</strong>
              </div>
              {comparison?.deltas.sumOfSkinfolds !== undefined && (
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-zinc-600 block">Variação Total:</span>
                  <strong className="text-sm font-black text-zinc-900">{formatDeltaValueBR(comparison.deltas.sumOfSkinfolds, 'mm')}</strong>
                </div>
              )}
            </div>

            {/* 7 SKINFOLDS COMPARATIVE TABLE */}
            <div className="mt-6 border border-zinc-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-100 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Localização Anatômica</th>
                    <th className="p-3 text-right">Anterior (mm)</th>
                    <th className="p-3 text-right">Atual (mm)</th>
                    <th className="p-3 text-right">Diferença (mm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {Object.entries(SKINFOLD_LABELS_PT).map(([k, label]) => {
                    const curr = (assessment.skinfolds as any)?.[k];
                    const prev = (previousAssessment?.skinfolds as any)?.[k];
                    const diff = (typeof curr === 'number' && typeof prev === 'number') 
                      ? Number((curr - prev).toFixed(1)) 
                      : undefined;

                    return (
                      <tr key={k} className="hover:bg-zinc-50">
                        <td className="p-3 font-bold text-zinc-900">{label}</td>
                        <td className="p-3 text-right font-mono text-zinc-600">
                          {prev !== undefined ? formatNumberBR(prev) : '—'}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-zinc-900">
                          {curr !== undefined ? formatNumberBR(curr) : '—'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold">
                          {diff !== undefined ? (
                            <span className={diff <= 0 ? 'text-emerald-600' : 'text-zinc-900'}>
                              {formatDeltaValueBR(diff, 'mm')}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* TECHNICAL DENSITY DETAILS */}
            <div className="mt-6 p-4 rounded-lg bg-zinc-50 border border-zinc-200 text-xs space-y-2">
              <span className="text-[10px] font-black uppercase text-zinc-900 block border-b border-zinc-200 pb-1">
                Fundamentação Matemática
              </span>
              <p className="text-zinc-600 text-[11px] leading-relaxed">
                A densidade corporal é calculada pela regressão linear múltipla de Jackson & Pollock (7 dobras), considerando sexo, soma das dobras (Σ7) e idade cronológica ({age ?? 'não informada'} anos). O percentual de gordura é convertido pela Equação de Siri (1956).
              </p>
              <div className="grid grid-cols-2 gap-4 pt-1 font-mono text-[11px]">
                <div>
                  <span className="text-zinc-600">Densidade Corporal (D): </span>
                  <strong className="text-zinc-900">{assessment.bodyDensity ? `${assessment.bodyDensity.toFixed(6)} g/cm³` : '—'}</strong>
                </div>
                <div>
                  <span className="text-zinc-600">Equação: </span>
                  <strong className="text-zinc-900">% GC = (495/D) − 450</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-200 pt-3 flex items-center justify-between text-[9px] text-zinc-600 uppercase">
            <span>TFIVE PRO • AVALIAÇÃO FÍSICA • {student.name}</span>
            <span>Página 2 de {includePhotos ? '5' : '4'}</span>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* PAGE 3: PERIMETRIA & ASSIMETRIAS BILATERAIS */}
        {/* ======================================================================= */}
        <div className="p-8 sm:p-10 flex flex-col justify-between" style={{ minHeight: '297mm', pageBreakAfter: 'always', breakAfter: 'page' }}>
          <div>
            <div className="border-b-2 border-[#18181B] pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-[#374151] tracking-wider block">TFIVE PRO • AVALIAÇÃO FÍSICA</span>
                <h2 className="text-lg font-black uppercase text-[#18181B]">3. Perimetria & Simetria Bilateral (cm)</h2>
              </div>
              <span className="text-xs text-zinc-600">{student.name}</span>
            </div>

            {/* BILATERAL SYMMETRY ANALYSIS */}
            {bilateralPairs.length > 0 && (
              <div className="mt-5 border border-zinc-200 rounded-lg p-4 bg-zinc-50 text-xs space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-900 block border-b border-zinc-200 pb-1.5">
                  Análise de Simetria Bilateral (Direito × Esquerdo)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {bilateralPairs.map(p => (
                    <div key={p.label} className="p-2.5 rounded bg-white border border-zinc-200 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-zinc-900 block">{p.label}</span>
                        <span className="text-[10px] text-zinc-600 font-mono">D: {p.right}cm | E: {p.left}cm</span>
                      </div>
                      <span className="font-mono font-bold text-xs bg-zinc-100 px-2 py-0.5 rounded">
                        Dif: {Math.abs(p.diff).toString().replace('.', ',')} cm
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CIRCUMFERENCES TABLE */}
            <div className="mt-6 border border-zinc-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-100 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Circunferência</th>
                    <th className="p-3 text-right">Anterior (cm)</th>
                    <th className="p-3 text-right">Atual (cm)</th>
                    <th className="p-3 text-right">Diferença (cm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {assessment.circumferences && Object.entries(assessment.circumferences).map(([k, val]) => {
                    const label = (CIRCUMFERENCE_LABELS_PT as any)[k] || k;
                    const prev = (previousAssessment?.circumferences as any)?.[k];
                    const diff = (typeof val === 'number' && typeof prev === 'number') 
                      ? Number((val - prev).toFixed(1)) 
                      : undefined;

                    return (
                      <tr key={k} className="hover:bg-zinc-50">
                        <td className="p-2.5 font-bold text-zinc-900">{label}</td>
                        <td className="p-2.5 text-right font-mono text-zinc-600">{prev !== undefined ? formatNumberBR(prev) : '—'}</td>
                        <td className="p-2.5 text-right font-mono font-black text-zinc-900">{formatNumberBR(val)}</td>
                        <td className="p-2.5 text-right font-mono font-bold">
                          {diff !== undefined ? formatDeltaValueBR(diff, 'cm') : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t border-zinc-200 pt-3 flex items-center justify-between text-[9px] text-zinc-600 uppercase">
            <span>TFIVE PRO • AVALIAÇÃO FÍSICA • {student.name}</span>
            <span>Página 3 de {includePhotos ? '5' : '4'}</span>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* PAGE 4: EVOLUÇÃO LONGITUDINAL & PARECER DO TREINADOR */}
        {/* ======================================================================= */}
        <div className="p-8 sm:p-10 flex flex-col justify-between" style={{ minHeight: '297mm', pageBreakAfter: includePhotos ? 'always' : 'auto', breakAfter: includePhotos ? 'page' : 'auto' }}>
          <div>
            <div className="border-b-2 border-[#18181B] pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-[#374151] tracking-wider block">TFIVE PRO • AVALIAÇÃO FÍSICA</span>
                <h2 className="text-lg font-black uppercase text-[#18181B]">4. Parecer Técnico & Conclusão</h2>
              </div>
              <span className="text-xs text-zinc-600">{student.name}</span>
            </div>

            {/* HISTORICAL TIMELINE SUMMARY */}
            <div className="mt-5 border border-zinc-200 rounded-lg p-4 bg-zinc-50 text-xs space-y-2">
              <span className="text-[10px] font-black uppercase text-zinc-900 block border-b border-zinc-200 pb-1.5">
                Histórico Longitudinal de Avaliações ({chronoSorted.length} Registros)
              </span>
              <div className="space-y-1.5 pt-1">
                {chronoSorted.map((item, idx) => (
                  <div key={item.id} className="p-2 rounded bg-white border border-zinc-200 flex justify-between items-center text-xs font-mono">
                    <span className="font-bold text-zinc-900">
                      {idx + 1}. {new Date(item.date).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="text-zinc-600">Peso: {formatNumberBR(item.weightKg)}kg</span>
                    <span className="text-[#374151] font-bold">%GC: {formatNumberBR(item.bodyFatPercentage)}%</span>
                    <span className="text-emerald-700 font-bold">Massa Magra: {formatNumberBR(item.leanMassKg)}kg</span>
                  </div>
                ))}
              </div>
            </div>

            {/* TRAINER OPINION & CONCLUSIONS */}
            <div className="mt-6 border border-zinc-200 rounded-lg p-5 bg-white text-xs space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-900 block border-b border-zinc-200 pb-2">
                Parecer Técnico & Diretrizes de Prescrição
              </span>
              <p className="text-zinc-700 leading-relaxed whitespace-pre-line text-xs">
                {assessment.conclusions || assessment.notes || 'Avaliação física concluída dentro dos padrões metodológicos oficiais. Recomenda-se continuidade do plano de periodização de treino com foco nos objetivos estabelecidos.'}
              </p>
            </div>

            {/* SIGNATURE BLOCK */}
            <div className="mt-12 pt-8 border-t border-zinc-300 grid grid-cols-2 gap-8 text-center text-xs">
              <div>
                <div className="border-b border-zinc-400 pb-1 mx-8" />
                <p className="font-bold text-zinc-900 mt-2 uppercase">{student.name}</p>
                <span className="text-[10px] text-zinc-600 uppercase">Assinatura do Aluno</span>
              </div>

              <div>
                <div className="border-b border-zinc-400 pb-1 mx-8" />
                <p className="font-bold text-zinc-900 mt-2 uppercase">
                  {trainerProfile?.name || 'Treinador Responsável'}
                </p>
                <span className="text-[10px] text-zinc-600 uppercase">
                  {trainerProfile?.cref ? `CREF: ${trainerProfile.cref}` : 'CREF / Profissional de Ed. Física'}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-200 pt-3 flex items-center justify-between text-[9px] text-zinc-600 uppercase">
            <span>TFIVE PRO • AVALIAÇÃO FÍSICA • {student.name}</span>
            <span>Página 4 de {includePhotos ? '5' : '4'}</span>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* PAGE 5: EVOLUÇÃO FOTOGRÁFICA (OPT-IN) */}
        {/* ======================================================================= */}
        {includePhotos && hasPhotos && (
          <div className="p-8 sm:p-10 flex flex-col justify-between" style={{ minHeight: '297mm' }}>
            <div>
              <div className="border-b-2 border-[#18181B] pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#374151] tracking-wider block">TFIVE PRO • AVALIAÇÃO FÍSICA</span>
                  <h2 className="text-lg font-black uppercase text-[#18181B]">5. Registro Fotográfico Padronizado</h2>
                </div>
                <span className="text-xs text-zinc-600">{student.name}</span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                {[
                  { label: 'Vista Frontal', photo: assessment.photos?.front },
                  { label: 'Lateral Direita', photo: assessment.photos?.rightSide },
                  { label: 'Lateral Esquerda', photo: assessment.photos?.leftSide },
                  { label: 'Vista Posterior', photo: assessment.photos?.back }
                ].filter(p => !!p.photo).map(p => (
                  <div key={p.label} className="border border-zinc-200 rounded-lg p-3 bg-zinc-50 text-center space-y-2">
                    <span className="text-xs font-bold text-zinc-900 block">{p.label}</span>
                    <div className="aspect-[3/4] max-h-72 rounded bg-black overflow-hidden mx-auto">
                      <img src={p.photo} alt={p.label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-zinc-200 pt-3 flex items-center justify-between text-[9px] text-zinc-600 uppercase">
              <span>TFIVE PRO • AVALIAÇÃO FÍSICA • {student.name}</span>
              <span>Página 5 de 5</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
