import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Download, 
  Share2, 
  Calendar, 
  Eye, 
  Flame, 
  Trophy, 
  Smartphone,
  CheckCircle2,
  RefreshCw,
  Zap,
  Users
} from 'lucide-react';
import { WorkoutSession } from '../../types';
import { useApp } from '../../context/AppContext';
import { 
  generateDailyStoryCanvas, 
  downloadCanvasAsPng, 
  shareCanvasPng, 
  DailyStoryOptions 
} from '../../utils/storyCanvasRenderer';
import { formatWorkoutDuration } from '../../utils/calculations';

interface DailySummaryStoryModalProps {
  initialDate?: string;
  onClose: () => void;
}

export const DailySummaryStoryModal: React.FC<DailySummaryStoryModalProps> = ({
  initialDate,
  onClose
}) => {
  const { sessions, trainerProfile } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);
  const [customHeadline, setCustomHeadline] = useState<string>('');

  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Filter completed sessions for selected date
  const daySessions = useMemo(() => {
    return sessions.filter(s => {
      if (s.status !== 'completed' || !s.startTime) return false;
      const sDate = s.startTime.split('T')[0];
      return sDate === selectedDate;
    });
  }, [sessions, selectedDate]);

  // Aggregate metrics
  const appointmentsCount = daySessions.length;
  const totalVolumeKg = daySessions.reduce((acc, s) => acc + (s.totalVolume || 0), 0);
  const totalDurationSeconds = daySessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const totalPRs = daySessions.reduce((acc, s) => acc + ((Array.isArray(s.prsAchieved) ? s.prsAchieved : []).length), 0);
  const totalSets = daySessions.reduce((acc, s) => {
    const sets = Array.isArray(s.sets) ? s.sets : [];
    return acc + sets.filter(st => st && !st.isWarmup && st.status !== 'skipped').length;
  }, 0);

  const durationFormatted = formatWorkoutDuration(totalDurationSeconds);
  const volumeInTonnes = (totalVolumeKg / 1000).toFixed(1).replace('.', ',');

  // Suggested headlines
  const headlineSuggestions = useMemo(() => {
    return [
      `${appointmentsCount} ATENDIMENTOS • ${volumeInTonnes}T • TRABALHO FEITO`,
      `${volumeInTonnes} TONELADAS MOVIMENTADAS HOJE`,
      `${appointmentsCount} SESSÕES DE ALTA PERFORMANCE`,
      'PRODUTIVIDADE & RESULTADOS ENTREGUES'
    ];
  }, [appointmentsCount, volumeInTonnes]);

  const options: DailyStoryOptions = useMemo(() => ({
    date: selectedDate,
    sessions: daySessions,
    trainerName: trainerProfile.name || 'Personal Trainer',
    showTrainerName: true,
    showStudentCount: true,
    showExercises: true,
    showSlogan: true,
    customHeadline
  }), [selectedDate, daySessions, trainerProfile.name, customHeadline]);

  // Generate preview
  useEffect(() => {
    let active = true;
    setIsRendering(true);

    const timer = setTimeout(async () => {
      try {
        const canvas = await generateDailyStoryCanvas(options);
        if (active) {
          setPreviewDataUrl(canvas.toDataURL('image/png'));
          setIsRendering(false);
        }
      } catch {
        if (active) {
          setIsRendering(false);
        }
      }
    }, 80);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [options]);

  const getFilename = () => {
    return `TFIVE_Story_Resumo_Dia_${selectedDate}.png`;
  };

  const handleDownload = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setFeedbackMessage(null);

    try {
      const canvas = await generateDailyStoryCanvas(options);
      downloadCanvasAsPng(canvas, getFilename());
      setFeedbackMessage('PNG em 1080x1920 salvo com sucesso!');
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch {
      setFeedbackMessage('Não foi possível gerar a imagem. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setFeedbackMessage(null);

    try {
      const canvas = await generateDailyStoryCanvas(options);
      const res = await shareCanvasPng(
        canvas, 
        getFilename(), 
        `TFIVE PRO — Resumo do Dia (${selectedDate})`
      );
      if (res.shared) {
        setFeedbackMessage(res.method === 'web_share' ? 'Story compartilhado!' : 'PNG 1080x1920 exportado!');
        setTimeout(() => setFeedbackMessage(null), 4000);
      }
    } catch {
      setFeedbackMessage('Não foi possível compartilhar a imagem. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#E5E7EB] rounded-3xl max-w-5xl w-full my-4 flex flex-col max-h-[96vh] shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F8F9FA]/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#374151] flex items-center justify-center text-white shadow-md shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1F2937] uppercase tracking-wider">
                Story do Dia • Resumo de Atendimentos
              </h2>
              <p className="text-xs text-[#4B5563]">
                Agregação diária de volume e sessões para Instagram Stories • 1080 × 1920 px
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#27272A] text-[#4B5563] hover:text-white transition-all"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Layout */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Preview */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="text-xs font-bold text-[#4B5563] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#374151]" />
              <span>Prévia do Story do Dia (9:16)</span>
            </div>

            <div className="relative w-full max-w-[290px] sm:max-w-[320px] aspect-[9/16] rounded-3xl bg-[#F8F9FA] border-4 border-[#E5E7EB] shadow-2xl overflow-hidden flex items-center justify-center group">
              {previewDataUrl ? (
                <img
                  src={previewDataUrl}
                  alt="Prévia do Story do Dia"
                  className="w-full h-full object-contain select-none"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#4B5563] text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#374151]" />
                  <span>Renderizando arte...</span>
                </div>
              )}

              {isRendering && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center text-xs font-bold text-white">
                  <span className="px-3 py-1.5 rounded-full bg-[#F8F9FA] border border-white/10 flex items-center gap-1.5 shadow-lg">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#374151]" />
                    Atualizando...
                  </span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-[#4B5563] text-center mt-2.5">
              Por padrão, dados individuais são protegidos para publicação do treinador.
            </p>
          </div>

          {/* Right Column: Date Picker & Settings */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Date Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold font-display uppercase tracking-wider text-white flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#374151]" />
                <span>1. Data do Resumo</span>
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="flex-1 bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs text-[#1F2937] font-bold focus:outline-none focus:border-[#374151]"
                />
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className="px-3 py-2.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold uppercase tracking-wider"
                >
                  Hoje
                </button>
              </div>
            </div>

            {/* Quick Metrics Summary Box */}
            <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#4B5563] block">
                Dados Agregados para {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-white p-2.5 rounded-xl border border-[#E5E7EB]">
                  <span className="text-[10px] text-[#4B5563] uppercase font-bold block">Atendimentos</span>
                  <span className="text-lg font-black text-white font-mono-nums">{appointmentsCount}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-[#E5E7EB]">
                  <span className="text-[10px] text-[#4B5563] uppercase font-bold block">Tempo Total</span>
                  <span className="text-lg font-black text-white font-mono-nums">{durationFormatted}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-[#E5E7EB]">
                  <span className="text-[10px] text-[#4B5563] uppercase font-bold block">Tonelagem</span>
                  <span className="text-lg font-black text-[#374151] font-mono-nums">{volumeInTonnes} t</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-[#E5E7EB]">
                  <span className="text-[10px] text-[#4B5563] uppercase font-bold block">Séries / PRs</span>
                  <span className="text-lg font-black text-white font-mono-nums">{totalSets} / {totalPRs}</span>
                </div>
              </div>

              {appointmentsCount === 0 && (
                <p className="text-xs text-amber-400 bg-amber-950/40 p-2.5 rounded-xl border border-amber-800">
                  Nenhuma sessão concluída registrada para esta data.
                </p>
              )}
            </div>

            {/* Headline */}
            <div className="space-y-2">
              <label className="text-xs font-bold font-display uppercase tracking-wider text-white flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#374151]" />
                <span>2. Frase de Destaque</span>
              </label>

              <input
                type="text"
                maxLength={45}
                value={customHeadline}
                onChange={e => setCustomHeadline(e.target.value)}
                placeholder="Ex: 8 ATENDIMENTOS • 54,8T • TRABALHO FEITO"
                className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs text-white uppercase font-bold focus:outline-none focus:border-[#374151]"
              />

              <div className="flex flex-wrap gap-1.5 pt-1">
                {headlineSuggestions.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCustomHeadline(sug)}
                    className="px-2.5 py-1 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-[#4B5563] hover:text-white text-[10px] font-bold transition-all uppercase"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback Message */}
            {feedbackMessage && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{feedbackMessage}</span>
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 flex flex-col sm:flex-row gap-3">
              <button
                disabled={isExporting}
                onClick={handleDownload}
                className="flex-1 py-3.5 px-4 rounded-xl bg-[#374151] hover:bg-[#1F2937] disabled:opacity-80 text-[#1F2937] font-bold font-display text-sm tracking-wider uppercase transition-all shadow-xl shadow-xs flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>{isExporting ? 'GERANDO STORY...' : 'SALVAR PNG (1080×1920)'}</span>
              </button>

              <button
                disabled={isExporting}
                onClick={handleShare}
                className="flex-1 py-3.5 px-4 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] border border-[#E5E7EB] disabled:opacity-80 text-[#1F2937] font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4 text-[#374151]" />
                <span>COMPARTILHAR STORY</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
