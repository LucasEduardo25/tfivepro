import React, { useState, useRef } from 'react';
import { 
  X, 
  Download, 
  Share2, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Award, 
  Check, 
  Layers,
  Flame,
  Activity,
  Trophy
} from 'lucide-react';
import { 
  Student, 
  FunctionalAssessment, 
  TrainerProfile 
} from '../../types';
import { useApp } from '../../context/AppContext';
import { formatTestValue } from '../../utils/functionalCalculations';
import { soundEffects } from '../../utils/audio';

interface FunctionalStoryModalProps {
  student: Student;
  assessment?: FunctionalAssessment;
  onClose: () => void;
}

export const FunctionalStoryModal: React.FC<FunctionalStoryModalProps> = ({
  student,
  assessment,
  onClose
}) => {
  const { trainerProfile, functionalAssessments, functionalMilestones } = useApp();

  const [hideStudentName, setHideStudentName] = useState<boolean>(true);
  const [accentTheme, setAccentTheme] = useState<'red' | 'emerald' | 'gold'>('red');
  const [selectedHighlightTestIndex, setSelectedHighlightTestIndex] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  const activeAssessment = assessment || functionalAssessments[0];
  const highlightResult = activeAssessment?.results[selectedHighlightTestIndex] || activeAssessment?.results[0];

  const storyCardRef = useRef<HTMLDivElement>(null);

  const studentDisplayName = hideStudentName
    ? `${student.name.split(' ')[0]} ${student.name.split(' ')[1] ? student.name.split(' ')[1][0] + '.' : ''}`
    : student.name;

  const handleDownloadImage = async () => {
    if (!storyCardRef.current) return;
    setIsExporting(true);
    soundEffects.playClick();

    try {
      // Dynamic import of html2canvas or html-to-image fallback if available, or simple DOM canvas export
      // Let's create an offscreen canvas rendering for 1080x1920 9:16 story
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // Draw background
        const grad = ctx.createLinearGradient(0, 0, 0, 1920);
        grad.addColorStop(0, '#09090B');
        grad.addColorStop(0.5, '#121212');
        grad.addColorStop(1, '#050505');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1080, 1920);

        // Accent header line
        ctx.fillStyle = accentTheme === 'red' ? '#374151' : accentTheme === 'emerald' ? '#10B981' : '#F59E0B';
        ctx.fillRect(80, 120, 920, 8);

        // Header Title
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText('TFIVE PRO • LONGEVIDADE FUNCIONAL', 80, 200);

        ctx.fillStyle = '#A1A1AA';
        ctx.font = '30px sans-serif';
        ctx.fillText(`Aluno: ${studentDisplayName}`, 80, 260);

        // Big Metric Box
        ctx.fillStyle = '#18181B';
        ctx.strokeStyle = '#27272A';
        ctx.lineWidth = 4;
        ctx.roundRect ? ctx.roundRect(80, 360, 920, 700, 36) : ctx.fillRect(80, 360, 920, 700);
        ctx.fill();
        ctx.stroke();

        // Tag
        ctx.fillStyle = accentTheme === 'red' ? '#374151' : accentTheme === 'emerald' ? '#10B981' : '#F59E0B';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText(highlightResult ? highlightResult.domain.toUpperCase() : 'AUTONOMIA & FORÇA', 130, 440);

        // Test Name
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 52px sans-serif';
        const testName = highlightResult ? highlightResult.testName : 'Sentar e Levantar da Cadeira';
        ctx.fillText(testName.slice(0, 30), 130, 530);

        // Big Value
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 110px sans-serif';
        const valText = highlightResult ? formatTestValue(highlightResult) : '18 reps';
        ctx.fillText(valText, 130, 680);

        // Subtitle / Milestone description
        ctx.fillStyle = '#10B981';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText('✓ Independência e Capacidade Preservadas', 130, 780);

        ctx.fillStyle = '#D4D4D8';
        ctx.font = '30px sans-serif';
        ctx.fillText('Avaliação funcional padronizada com acompanhamento contínuo.', 130, 860);
        ctx.fillText(`Data da Avaliação: ${activeAssessment?.date || new Date().toISOString().split('T')[0]}`, 130, 920);

        // Trainer Footer Card
        ctx.fillStyle = '#18181B';
        ctx.roundRect ? ctx.roundRect(80, 1550, 920, 240, 32) : ctx.fillRect(80, 1550, 920, 240);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 38px sans-serif';
        ctx.fillText(trainerProfile.name || 'Personal Trainer', 130, 1640);

        ctx.fillStyle = '#A1A1AA';
        ctx.font = '28px sans-serif';
        ctx.fillText(`CREF: ${trainerProfile.cref || 'Profissional de Educação Física'}`, 130, 1700);

        // Download data URL
        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `TFIVE_Longevidade_${student.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.png`;
        a.click();
        soundEffects.playSuccess();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto select-none">
      <div className="bg-[#121212] border border-[#27272a] rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#27272a] bg-[#18181B]/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Award className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-black font-display text-white">
                Gerador de Story de Conquista Funcional
              </h2>
              <p className="text-xs text-[#4B5563]">
                Compartilhe o ganho de autonomia e capacidades do aluno nas redes sociais
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-[#4B5563] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto flex-1">
          
          {/* Controls Column (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 space-y-3">
              <label className="text-xs font-black font-display uppercase tracking-wider text-[#4B5563] block">
                Privacidade do Aluno
              </label>
              <button
                type="button"
                onClick={() => setHideStudentName(!hideStudentName)}
                className="w-full py-2.5 px-3.5 rounded-xl bg-[#121212] border border-[#27272A] text-xs font-bold text-white flex items-center justify-between hover:border-[#3F3F46] transition-all"
              >
                <span>{hideStudentName ? 'Nome Parcial (Privacidade Ativa)' : 'Nome Completo Visível'}</span>
                {hideStudentName ? <EyeOff className="w-4 h-4 text-emerald-400" /> : <Eye className="w-4 h-4 text-[#4B5563]" />}
              </button>
            </div>

            {/* Test Selection */}
            {activeAssessment && activeAssessment.results.length > 0 && (
              <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 space-y-2">
                <label className="text-xs font-black font-display uppercase tracking-wider text-[#4B5563] block">
                  Escolha o Teste em Destaque
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {activeAssessment.results.map((res, i) => (
                    <button
                      key={res.id || i}
                      type="button"
                      onClick={() => setSelectedHighlightTestIndex(i)}
                      className={`w-full p-2.5 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between ${
                        selectedHighlightTestIndex === i
                          ? 'bg-[#374151] text-white shadow-md shadow-xs'
                          : 'bg-[#121212] text-[#4B5563] hover:text-white border border-[#27272A]'
                      }`}
                    >
                      <span className="truncate pr-2">{res.testName}</span>
                      <span className="font-mono-nums shrink-0">{formatTestValue(res)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Accent Theme */}
            <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 space-y-2">
              <label className="text-xs font-black font-display uppercase tracking-wider text-[#4B5563] block">
                Tema Visual
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAccentTheme('red')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    accentTheme === 'red' ? 'bg-[#374151] text-white border-[#374151]' : 'bg-[#121212] text-[#4B5563] border-[#27272A]'
                  }`}
                >
                  Vermelho
                </button>
                <button
                  type="button"
                  onClick={() => setAccentTheme('emerald')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    accentTheme === 'emerald' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-[#121212] text-[#4B5563] border-[#27272A]'
                  }`}
                >
                  Esmeralda
                </button>
                <button
                  type="button"
                  onClick={() => setAccentTheme('gold')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    accentTheme === 'gold' ? 'bg-amber-600 text-white border-amber-500' : 'bg-[#121212] text-[#4B5563] border-[#27272A]'
                  }`}
                >
                  Dourado
                </button>
              </div>
            </div>

            {/* Export Actions */}
            <div className="pt-2">
              <button
                onClick={handleDownloadImage}
                disabled={isExporting}
                className="w-full py-3 px-4 rounded-2xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-xs disabled:opacity-80"
              >
                <Download className="w-4 h-4" />
                <span>{isExporting ? 'Renderizando...' : 'Baixar Imagem PNG (9:16)'}</span>
              </button>
            </div>
          </div>

          {/* Story Preview Column (7 cols) */}
          <div className="lg:col-span-7 flex items-center justify-center p-4 bg-[#09090B] border border-[#27272A] rounded-3xl">
            {/* Story 9:16 Preview Card */}
            <div
              ref={storyCardRef}
              className="w-full max-w-[320px] aspect-[9/16] bg-[#121212] border-2 border-[#27272A] rounded-3xl p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden"
            >
              {/* Top Accent Strip */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                accentTheme === 'red' ? 'bg-[#374151]' : accentTheme === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />

              {/* Story Header */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[#4B5563] mb-1">
                  <span>TFIVE PRO</span>
                  <span className={accentTheme === 'red' ? 'text-[#374151]' : accentTheme === 'emerald' ? 'text-emerald-400' : 'text-amber-400'}>
                    LONGEVIDADE
                  </span>
                </div>
                <h3 className="text-base font-black font-display text-white">
                  Autonomia & Capacidade
                </h3>
                <p className="text-xs text-[#4B5563]">
                  Aluno: <strong className="text-white">{studentDisplayName}</strong>
                </p>
              </div>

              {/* Central Spotlight Card */}
              <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 space-y-2 text-center my-auto">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  accentTheme === 'red' ? 'bg-[#F3F4F6] text-[#374151]' : accentTheme === 'emerald' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                }`}>
                  {highlightResult ? highlightResult.domain.toUpperCase() : 'FORÇA FUNCIONAL'}
                </span>

                <h4 className="text-sm font-black font-display text-white mt-1">
                  {highlightResult ? highlightResult.testName : 'Sentar e Levantar'}
                </h4>

                <div className="text-3xl font-black font-mono-nums text-white py-1">
                  {highlightResult ? formatTestValue(highlightResult) : '18 reps'}
                </div>

                <div className="text-[11px] text-emerald-400 font-bold flex items-center justify-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Capacidade & Força Preservadas</span>
                </div>
              </div>

              {/* Story Footer */}
              <div className="pt-3 border-t border-[#27272A] flex items-center justify-between text-[10px] text-[#4B5563]">
                <div>
                  <p className="font-bold text-white">{trainerProfile.name}</p>
                  <p>CREF {trainerProfile.cref || 'Profissional'}</p>
                </div>
                <span className="font-mono-nums font-bold">
                  {activeAssessment?.date || new Date().toISOString().split('T')[0]}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
