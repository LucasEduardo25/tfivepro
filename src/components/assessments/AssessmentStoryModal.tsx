import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Download, 
  Sparkles, 
  Check, 
  Layers, 
  Camera, 
  Flame, 
  TrendingDown, 
  TrendingUp 
} from 'lucide-react';
import { Student, PhysicalAssessment } from '../../types';
import { 
  compareAssessments, 
  formatNumberBR, 
  formatPercentagePointsBR, 
  formatDeltaValueBR 
} from '../../utils/assessmentCalculations';

interface AssessmentStoryModalProps {
  student: Student;
  assessment: PhysicalAssessment;
  previousAssessment?: PhysicalAssessment;
  onClose: () => void;
}

export const AssessmentStoryModal: React.FC<AssessmentStoryModalProps> = ({
  student,
  assessment,
  previousAssessment,
  onClose
}) => {
  const comparison = previousAssessment ? compareAssessments(assessment, previousAssessment) : null;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Customization options for the story
  const [theme, setTheme] = useState<'dark' | 'transparent'>('dark');
  const [includeWeight, setIncludeWeight] = useState<boolean>(true);
  const [includeBodyFat, setIncludeBodyFat] = useState<boolean>(true);
  const [includeLeanMass, setIncludeLeanMass] = useState<boolean>(true);
  const [includeSkinfolds, setIncludeSkinfolds] = useState<boolean>(true);
  const [includeWaist, setIncludeWaist] = useState<boolean>(true);
  const [customHeadline, setCustomHeadline] = useState<string>('EVOLUÇÃO CORPORAL COMPROVADA');

  const prevWaist = previousAssessment?.circumferences?.waist;
  const currWaist = assessment.circumferences?.waist;
  const waistDiff = (prevWaist && currWaist) ? Number((currWaist - prevWaist).toFixed(1)) : null;

  // Draw on canvas whenever options change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensions: 1080 x 1920 (9:16 Vertical Story)
    const W = 1080;
    const H = 1920;
    canvas.width = W;
    canvas.height = H;

    ctx.clearRect(0, 0, W, H);

    if (theme === 'dark') {
      // Dark background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#09090B');
      bgGrad.addColorStop(0.5, '#121212');
      bgGrad.addColorStop(1, '#09090B');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Subtle red accent mesh in corners
      ctx.save();
      const glowGrad = ctx.createRadialGradient(W / 2, 200, 50, W / 2, 200, 600);
      glowGrad.addColorStop(0, 'rgba(217, 4, 41, 0.18)');
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, W, 800);
      ctx.restore();
    }

    // TOP BADGE: TFIVE PRO
    ctx.save();
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.roundRect(W / 2 - 120, 140, 240, 48, 24);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TFIVE PRO', W / 2, 164);
    ctx.restore();

    // HEADLINE & STUDENT NAME
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 64px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(customHeadline.toUpperCase(), W / 2, 270);

    ctx.fillStyle = '#374151';
    ctx.font = '900 48px system-ui, -apple-system, sans-serif';
    ctx.fillText(student.name.toUpperCase(), W / 2, 340);

    // DATE SUBTITLE
    ctx.fillStyle = '#A1A1AA';
    ctx.font = '600 28px system-ui, -apple-system, sans-serif';
    const dateText = previousAssessment 
      ? `${new Date(previousAssessment.date).toLocaleDateString('pt-BR')}  →  ${new Date(assessment.date).toLocaleDateString('pt-BR')}`
      : new Date(assessment.date).toLocaleDateString('pt-BR', { dateStyle: 'long' });
    ctx.fillText(dateText, W / 2, 400);
    ctx.restore();

    // CARDS LIST (Metrics)
    interface StoryMetricRow {
      label: string;
      prevStr?: string;
      currStr: string;
      diffStr?: string;
      isPositiveGood?: boolean;
    }

    const rows: StoryMetricRow[] = [];

    if (includeBodyFat) {
      rows.push({
        label: '% GORDURA CORPORAL',
        prevStr: previousAssessment ? `${formatNumberBR(previousAssessment.bodyFatPercentage)}%` : undefined,
        currStr: `${formatNumberBR(assessment.bodyFatPercentage)}%`,
        diffStr: comparison ? formatPercentagePointsBR(comparison.deltas.bodyFatPercentage) : undefined,
        isPositiveGood: false
      });
    }

    if (includeLeanMass) {
      rows.push({
        label: 'MASSA MAGRA',
        prevStr: previousAssessment ? `${formatNumberBR(previousAssessment.leanMassKg)} kg` : undefined,
        currStr: `${formatNumberBR(assessment.leanMassKg)} kg`,
        diffStr: comparison ? formatDeltaValueBR(comparison.deltas.leanMassKg, 'kg') : undefined,
        isPositiveGood: true
      });
    }

    if (includeWeight) {
      rows.push({
        label: 'PESO TOTAL',
        prevStr: previousAssessment ? `${formatNumberBR(previousAssessment.weightKg)} kg` : undefined,
        currStr: `${formatNumberBR(assessment.weightKg)} kg`,
        diffStr: comparison ? formatDeltaValueBR(comparison.deltas.weightKg, 'kg') : undefined,
        isPositiveGood: false
      });
    }

    if (includeWaist && currWaist) {
      rows.push({
        label: 'CIRCUNFERÊNCIA DA CINTURA',
        prevStr: prevWaist ? `${formatNumberBR(prevWaist)} cm` : undefined,
        currStr: `${formatNumberBR(currWaist)} cm`,
        diffStr: waistDiff !== null ? formatDeltaValueBR(waistDiff, 'cm') : undefined,
        isPositiveGood: false
      });
    }

    if (includeSkinfolds && assessment.sumOfSkinfolds) {
      rows.push({
        label: 'SOMA DAS 7 DOBRAS',
        prevStr: previousAssessment?.sumOfSkinfolds ? `${formatNumberBR(previousAssessment.sumOfSkinfolds)} mm` : undefined,
        currStr: `${formatNumberBR(assessment.sumOfSkinfolds)} mm`,
        diffStr: comparison?.deltas.sumOfSkinfolds !== undefined ? formatDeltaValueBR(comparison.deltas.sumOfSkinfolds, 'mm') : undefined,
        isPositiveGood: false
      });
    }

    // DRAW EACH METRIC CARD
    let startY = 480;
    const cardH = 190;
    const cardGap = 30;
    const cardW = 900;
    const cardX = (W - cardW) / 2;

    rows.forEach(r => {
      ctx.save();
      // Card Background
      ctx.fillStyle = theme === 'dark' ? 'rgba(24, 24, 27, 0.95)' : 'rgba(18, 18, 18, 0.88)';
      ctx.strokeStyle = 'rgba(39, 39, 42, 0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(cardX, startY, cardW, cardH, 28);
      ctx.fill();
      ctx.stroke();

      // Card Label
      ctx.fillStyle = '#A1A1AA';
      ctx.font = '800 24px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(r.label, cardX + 40, startY + 50);

      // Values comparison row
      if (r.prevStr && r.diffStr) {
        ctx.fillStyle = '#71717A';
        ctx.font = '700 38px system-ui, -apple-system, sans-serif';
        ctx.fillText(r.prevStr, cardX + 40, startY + 125);

        ctx.fillStyle = '#A1A1AA';
        ctx.font = '900 36px system-ui, -apple-system, sans-serif';
        ctx.fillText('→', cardX + 260, startY + 125);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 56px system-ui, -apple-system, sans-serif';
        ctx.fillText(r.currStr, cardX + 320, startY + 130);

        // Difference Pill
        const isGood = r.isPositiveGood ? (parseFloat(r.diffStr.replace(',', '.')) > 0) : (parseFloat(r.diffStr.replace(',', '.')) <= 0);
        ctx.fillStyle = isGood ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
        ctx.strokeStyle = isGood ? '#10B981' : '#EF4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(cardX + cardW - 250, startY + 80, 210, 64, 18);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isGood ? '#34D399' : '#F87171';
        ctx.font = '900 32px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(r.diffStr, cardX + cardW - 145, startY + 122);
      } else {
        // Single current value
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 64px system-ui, -apple-system, sans-serif';
        ctx.fillText(r.currStr, cardX + 40, startY + 130);
      }

      ctx.restore();
      startY += cardH + cardGap;
    });

    // FOOTER SIGNATURE
    ctx.save();
    ctx.fillStyle = '#A1A1AA';
    ctx.font = '700 24px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('METODOLOGIA JACKSON & POLLOCK 7 DOBRAS', W / 2, H - 120);

    ctx.fillStyle = '#71717A';
    ctx.font = '600 20px system-ui, -apple-system, sans-serif';
    ctx.fillText('TFIVE PRO • GESTÃO DE ALTA PERFORMANCE', W / 2, H - 80);
    ctx.restore();

  }, [
    student, 
    assessment, 
    previousAssessment, 
    comparison, 
    theme, 
    includeWeight, 
    includeBodyFat, 
    includeLeanMass, 
    includeSkinfolds, 
    includeWaist, 
    customHeadline,
    currWaist,
    prevWaist,
    waistDiff
  ]);

  const handleDownloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `evolucao-corporal-${student.name.toLowerCase().replace(/\s+/g, '-')}-${assessment.date}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
      <div className="bg-white border border-[#E5E7EB] rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-[#E5E7EB] bg-[#F8F9FA]/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#374151] text-white flex items-center justify-center font-black">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black font-display uppercase tracking-wide text-white">
                Story de Evolução Corporal (PNG)
              </h3>
              <p className="text-xs text-[#4B5563]">
                Compartilhe o progresso real de composição corporal em formato 9:16
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] text-[#4B5563] hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CONTENT (SPLIT VIEW: CONTROLS & CANVAS PREVIEW) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* CONTROLS */}
          <div className="space-y-4 text-xs">
            <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-white">
                Título / Headline
              </label>
              <input
                type="text"
                value={customHeadline}
                onChange={e => setCustomHeadline(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-xl p-2.5 text-[#1F2937] font-bold focus:outline-none focus:border-[#374151]"
              />
            </div>

            <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-white">
                Estilo de Fundo
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                    theme === 'dark'
                      ? 'border-[#374151] bg-[#374151]/10 text-white'
                      : 'border-[#E5E7EB] bg-white text-[#4B5563]'
                  }`}
                >
                  Dark Athletic (Preto)
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('transparent')}
                  className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                    theme === 'transparent'
                      ? 'border-[#374151] bg-[#374151]/10 text-white'
                      : 'border-[#E5E7EB] bg-white text-[#4B5563]'
                  }`}
                >
                  Transparente (Overlay)
                </button>
              </div>
            </div>

            <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-white mb-2">
                Métricas a Exibir
              </label>

              {[
                { label: '% Gordura Corporal', state: includeBodyFat, setter: setIncludeBodyFat },
                { label: 'Massa Magra (kg)', state: includeLeanMass, setter: setIncludeLeanMass },
                { label: 'Peso Corporal (kg)', state: includeWeight, setter: setIncludeWeight },
                { label: 'Circunferência da Cintura (cm)', state: includeWaist, setter: setIncludeWaist },
                { label: 'Soma das 7 Dobras (mm)', state: includeSkinfolds, setter: setIncludeSkinfolds }
              ].map((m, idx) => (
                <label key={idx} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-white rounded-lg">
                  <input
                    type="checkbox"
                    checked={m.state}
                    onChange={e => m.setter(e.target.checked)}
                    className="rounded border-[#E5E7EB] bg-white text-[#374151] focus:ring-0"
                  />
                  <span className="text-[#1F2937] font-bold">{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* CANVAS PREVIEW (SCALED TO FIT) */}
          <div className="flex flex-col items-center justify-center bg-[#09090B] border border-[#E5E7EB] rounded-2xl p-4">
            <span className="text-[10px] uppercase font-bold text-[#4B5563] mb-2 block">
              Pré-visualização 9:16 (1080 × 1920)
            </span>
            <div className="w-full max-w-[240px] aspect-[9/16] border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-2xl bg-black">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
              />
            </div>
          </div>

        </div>

        {/* FOOTER ACTION */}
        <div className="p-4 sm:p-5 border-t border-[#E5E7EB] bg-[#F8F9FA]/80 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] border border-[#E5E7EB] text-[#4B5563] hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={handleDownloadPNG}
            className="px-6 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Baixar Imagem PNG</span>
          </button>
        </div>

      </div>
    </div>
  );
};
