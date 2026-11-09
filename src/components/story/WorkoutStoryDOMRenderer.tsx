import React, { useRef, useImperativeHandle, forwardRef, useMemo } from 'react';
import { toBlob } from 'html-to-image';
import { WorkoutSession, Exercise } from '../../types';
import { formatTonnesOrKg, formatWorkoutDuration } from '../../utils/calculations';
import { analyzeTrainedMuscles } from '../common/BodyMap/bodyMapTypes';
import { processWorkoutMuscles } from '../../utils/dynamicMuscleMapping';
import { StoryBodyMapVector } from './StoryBodyMapVector';

export type DOMStoryTemplateId = 
  | 'clean_card'
  | 'stats_card'
  | 'clean_overlay'
  | 'stats_overlay'
  | 'frame'
  | 'performance'
  | 'mais_forte'
  | 'resumo_treino'
  | 'evolucao'
  | 'minimal_data'
  | 'body_map'
  // Legacy aliases for backward compatibility
  | 'performance_dark'
  | 'performance_light'
  | 'disciplina'
  | 'superacao'
  | 'resumo_performance'
  | 'minimal'
  | 'data_performance'
  | 'minimal_overlay'
  | 'performance_overlay'
  | 'resumo_overlay'
  | 'compact_overlay'
  | 'identity_overlay'
  | 'sports_data_overlay';

export interface StoryDOMRendererProps {
  session: WorkoutSession;
  templateId: DOMStoryTemplateId;
  studentName?: string;
  exercises?: Exercise[];
  isExporting?: boolean;
  backgroundImageUrl?: string | null;
  bodyMapSex?: 'MALE' | 'FEMALE';
}

export interface StoryDOMRendererRef {
  exportToBlob: () => Promise<Blob>;
}

export const WorkoutStoryDOMRenderer = forwardRef<StoryDOMRendererRef, StoryDOMRendererProps>(
  ({ session, templateId, studentName, exercises = [], backgroundImageUrl, bodyMapSex = 'MALE' }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Map any legacy ID to one of the 7 canonical models
    const activeModelId = useMemo<
      'clean_card' | 'stats_card' | 'clean_overlay' | 'stats_overlay' | 'frame' | 'performance' | 'mais_forte' | 'resumo_treino' | 'evolucao' | 'minimal_data' | 'body_map'
    >(() => {
      if (templateId === 'clean_card') return 'clean_card';
      if (templateId === 'stats_card') return 'stats_card';
      if (templateId === 'clean_overlay') return 'clean_overlay';
      if (templateId === 'stats_overlay') return 'stats_overlay';
      if (templateId === 'frame') return 'frame';
      if (
        templateId === 'performance' ||
        templateId === 'performance_overlay' ||
        templateId === 'sports_data_overlay' ||
        templateId === 'performance_dark' ||
        templateId === 'performance_light'
      ) return 'performance';
      if (
        templateId === 'mais_forte' ||
        templateId === 'disciplina' ||
        templateId === 'superacao'
      ) return 'mais_forte';
      if (
        templateId === 'resumo_treino' ||
        templateId === 'resumo_overlay' ||
        templateId === 'resumo_performance' ||
        templateId === 'compact_overlay'
      ) return 'resumo_treino';
      if (templateId === 'evolucao') return 'evolucao';
      if (
        templateId === 'minimal_data' ||
        templateId === 'minimal' ||
        templateId === 'minimal_overlay' ||
        templateId === 'identity_overlay' ||
        templateId === 'data_performance'
      ) return 'minimal_data';
      if (templateId === 'body_map') return 'body_map';
      return 'frame';
    }, [templateId]);

    // EXPORT TO BLOB: 1080x1920 True PNG with Alpha=0 preservation
    useImperativeHandle(ref, () => ({
      exportToBlob: async () => {
        if (!containerRef.current) throw new Error('Container do Story não encontrado');

        try {
          // O renderer usa skipFonts: não é necessário bloquear a exportação
          // esperando fontes externas. Em dispositivos móveis essa espera pode ficar pendente.
          const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, message: string) =>
            new Promise<T>((resolve, reject) => {
              const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
              promise.then(
                (value) => {
                  window.clearTimeout(timer);
                  resolve(value);
                },
                (error) => {
                  window.clearTimeout(timer);
                  reject(error);
                }
              );
            });

          // Gera o Blob diretamente, com limite para nunca deixar a interface carregando indefinidamente.
          const blob = await withTimeout(
            toBlob(containerRef.current, {
            width: 1080,
            height: 1920,
            canvasWidth: 1080,
            canvasHeight: 1920,
            pixelRatio: 1,
            // Reutiliza imagens já carregadas (incluindo as silhuetas anatômicas locais).
            // cacheBust=true força novas requisições e pode atrasar a captura em redes móveis.
            cacheBust: false,
            skipAutoScale: true,
            skipFonts: true,
            fontEmbedCSS: '',
            backgroundColor: 'transparent',
            style: {
              transform: 'scale(1)',
              transformOrigin: 'top left',
              margin: '0',
              background: 'transparent'
            }
            }),
            45000,
            'A geração do PNG demorou mais que 45 segundos. Verifique a conexão e tente novamente.'
          );

          if (!blob) {
            throw new Error('O navegador não conseguiu gerar o arquivo PNG. Tente novamente.');
          }

          if (blob.size === 0) {
            throw new Error('O PNG gerado está vazio (tamanho 0).');
          }

          return blob;
        } catch (err) {
          console.error('[WorkoutStoryDOMRenderer] Erro na exportação:', err);
          throw err;
        }
      }
    }));

    // Data calculations from real session
    const sessionDate = session.startTime ? new Date(session.startTime) : new Date();
    const dateStr = sessionDate.toLocaleDateString('pt-BR');

    const duration = formatWorkoutDuration(session.durationSeconds || 0);
    const volume = formatTonnesOrKg(session.totalVolume || 0);

    const validSets = useMemo(() => {
      if (!Array.isArray(session.sets)) return [];
      return session.sets.filter(s => s && s.status !== 'skipped');
    }, [session.sets]);

    const exercisesCount = useMemo(() => {
      return new Set(validSets.map(s => s.exerciseId || s.exerciseName)).size;
    }, [validSets]);

    const setsCount = validSets.length || session.totalSets || 0;

    const firstName = (studentName || session.studentName || 'Aluno').split(' ')[0].toUpperCase();
    const workoutName = (session.routineTitle || session.routineName || session.workoutName || 'Treino Concluído').toUpperCase();

    // Optional telemetry data (only shown if present)
    const caloriesVal = (session as any).caloriesBurned || (session as any).calories || (session as any).estimatedCalories;
    const caloriesStr = caloriesVal ? `${String(caloriesVal).replace(/\D/g, '')} KCAL` : null;

    const heartRateVal = (session as any).averageHeartRate || (session as any).avgHeartRate || (session as any).heartRate;
    const heartRateStr = heartRateVal ? `${String(heartRateVal).replace(/\D/g, '')} BPM` : null;

    // Muscle engagement analysis for Body Map with dynamic muscle mapping utility
    const muscleAnalysis = useMemo(() => {
      return processWorkoutMuscles({
        session,
        sets: validSets,
        exercises
      });
    }, [session, validSets, exercises]);

    // Unique muscle groups worked in session (for pills)
    const sessionMuscleGroups = useMemo(() => {
      const groups = new Set<string>();
      if (muscleAnalysis.primaryLabels && muscleAnalysis.primaryLabels.length > 0) {
        muscleAnalysis.primaryLabels.forEach(l => groups.add(l.toUpperCase()));
      }
      for (const s of validSets) {
        if (s.muscleGroup) {
          groups.add(s.muscleGroup.toUpperCase());
        }
      }
      if (groups.size === 0 && muscleAnalysis.allActiveLabels && muscleAnalysis.allActiveLabels.length > 0) {
        muscleAnalysis.allActiveLabels.forEach(l => groups.add(l.toUpperCase()));
      }
      return Array.from(groups).slice(0, 6);
    }, [validSets, muscleAnalysis]);

    // Músculos Primários e Secundários para a Legenda Compacta do Modelo 07
    const primaryMusclesFormatted = useMemo(() => {
      if (muscleAnalysis.primaryLabels && muscleAnalysis.primaryLabels.length > 0) {
        return muscleAnalysis.primaryLabels.map(l => l.toUpperCase());
      }
      return sessionMuscleGroups.slice(0, 3);
    }, [muscleAnalysis.primaryLabels, sessionMuscleGroups]);

    const secondaryMusclesFormatted = useMemo(() => {
      if (muscleAnalysis.secondaryLabels && muscleAnalysis.secondaryLabels.length > 0) {
        return muscleAnalysis.secondaryLabels.map(l => l.toUpperCase());
      }
      return [];
    }, [muscleAnalysis.secondaryLabels]);

    // Group exercises for Model 04 (Resumo)
    const exercisesSummaryList = useMemo(() => {
      const map = new Map<string, { name: string; sets: typeof validSets }>();
      for (const set of validSets) {
        const key = set.exerciseId || set.exerciseName || 'ex';
        const existing = map.get(key) || {
          name: set.exerciseName || 'Exercício',
          sets: []
        };
        existing.sets.push(set);
        map.set(key, existing);
      }

      const list: Array<{
        order: string;
        name: string;
        setsCount: number;
        repsStr: string;
        maxWeightStr: string;
      }> = [];

      let idx = 1;
      for (const [, item] of map) {
        const repsList = item.sets.map(s => s.actualReps || s.targetReps || 0).filter(r => r > 0);
        const minReps = repsList.length > 0 ? Math.min(...repsList) : 10;
        const maxReps = repsList.length > 0 ? Math.max(...repsList) : 10;
        const repsDisplay = minReps === maxReps ? `${minReps}` : `${minReps}-${maxReps}`;

        const weightsList = item.sets.map(s => s.weightKg || 0).filter(w => w > 0);
        const maxWeight = weightsList.length > 0 ? Math.max(...weightsList) : 0;
        const maxWeightDisplay = maxWeight > 0 ? `${maxWeight} KG` : '';

        list.push({
          order: String(idx).padStart(2, '0'),
          name: item.name.toUpperCase(),
          setsCount: item.sets.length,
          repsStr: repsDisplay,
          maxWeightStr: maxWeightDisplay
        });
        idx++;
      }

      return list;
    }, [validSets]);

    // Render the selected template
    const renderContent = () => {
      switch (activeModelId) {
        case 'clean_card':
        case 'stats_card': {
          return (
            <div  className="w-[1080px] h-[1920px] relative overflow-hidden bg-[#F5F4F0] text-[#171717] flex flex-col justify-end p-[88px] select-none" style={backgroundImageUrl ? { backgroundImage: 'url(' + backgroundImageUrl + ')', backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
              {backgroundImageUrl ? <div className="absolute inset-0 bg-black/10" /> : <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,#FFFFFF_0%,#F5F4F0_70%)]" />}
              <div className="relative z-10 flex items-center justify-between mb-auto">
                <span className="text-[30px] font-semibold tracking-[.16em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,.45)]">TFIVE</span>
                <span className="text-[22px] tracking-[.08em] text-white/90 drop-shadow-[0_2px_10px_rgba(0,0,0,.45)]">{dateStr}</span>
              </div>
              <div className="relative z-10 -mx-[88px] px-[88px] pt-[210px] pb-[92px] bg-gradient-to-t from-black/80 via-black/45 to-transparent text-white">
                <div className="text-[22px] font-medium tracking-[.24em] text-white/75 mb-5">TREINO</div>
                <h1 className="text-[82px] leading-[1.02] font-semibold tracking-[-.045em] break-words">{workoutName}</h1>
                <div className="text-[27px] font-medium text-white/75 mt-5">{firstName}</div>
                <div className="mt-12 pt-8 border-t border-white/30 flex items-end gap-16">
                  <div><div className="text-[18px] tracking-[.18em] text-white/65 mb-2">DURAÇÃO</div><div className="text-[49px] font-medium tracking-[-.03em] tabular-nums">{duration}</div></div>
                  <div><div className="text-[18px] tracking-[.18em] text-white/65 mb-2">VOLUME</div><div className="text-[49px] font-medium tracking-[-.03em] tabular-nums">{volume}</div></div>
                </div>
              </div>
            </div>
          );
        }
        case 'clean_overlay':
        case 'stats_overlay': {
          const isStats = activeModelId === 'stats_overlay';
          return (
            <div className="w-[1080px] h-[1920px] relative overflow-hidden bg-transparent text-white flex flex-col justify-between p-[76px] select-none">
              <div className="flex items-start justify-between">
                <div className="drop-shadow-[0_3px_12px_rgba(0,0,0,.9)]">
                  <div className="text-[42px] font-black tracking-[.12em]">TFIVE<span className="text-[#E11D2E]">.</span></div>
                  <div className="text-[18px] font-bold tracking-[.2em] text-white/75">TREINO CONCLUÍDO</div>
                </div>
                <div className="bg-black/55 rounded-full px-6 py-3 text-[20px] font-bold backdrop-blur-sm">{dateStr}</div>
              </div>
              <div className="mt-auto bg-gradient-to-t from-black/90 via-black/75 to-black/0 -mx-[76px] px-[76px] pt-[150px] pb-[64px]">
                <div className="text-[23px] font-bold tracking-[.2em] text-[#FF5965] mb-4">SESSÃO FINALIZADA</div>
                <div className="text-[66px] leading-[1.05] font-black tracking-[-.03em] drop-shadow-lg">{workoutName}</div>
                <div className="text-[30px] text-white/80 mt-5 font-semibold">{firstName}</div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-7 mt-12">
                  <div><div className="text-[18px] tracking-[.16em] text-white/65 font-bold">DURAÇÃO</div><div className="text-[54px] font-black">{duration}</div></div>
                  <div><div className="text-[18px] tracking-[.16em] text-white/65 font-bold">VOLUME</div><div className="text-[54px] font-black">{volume}</div></div>
                  <div><div className="text-[18px] tracking-[.16em] text-white/65 font-bold">EXERCÍCIOS</div><div className="text-[54px] font-black">{exercisesCount}</div></div>
                  <div><div className="text-[18px] tracking-[.16em] text-white/65 font-bold">SÉRIES</div><div className="text-[54px] font-black">{setsCount}</div></div>
                </div>
                {isStats && exercisesSummaryList.length > 0 && (
                  <div className="mt-9 pt-6 border-t border-white/25">
                    {exercisesSummaryList.slice(0, 3).map(item => <div key={item.order} className="flex justify-between gap-4 py-2 text-[20px]"><span className="font-bold truncate">{item.name}</span><span className="text-white/70 whitespace-nowrap">{item.setsCount} séries</span></div>)}
                  </div>
                )}
                <div className="flex justify-end mt-10 text-[24px] font-black tracking-[.14em]">TFIVE PRO</div>
              </div>
            </div>
          );
        }
        // ====================================================================
        // MODELO 01 — TFIVE FRAME
        // Asymmetric futuristic frame inspired by Card 1 of reference
        // CENTER 100% TRANSPARENT FOR ATHLETE PHOTO
        // ====================================================================
        case 'frame':
          return (
            <div className="w-[1080px] h-[1920px] bg-transparent text-white relative overflow-hidden flex flex-col justify-between p-14 pb-16 select-none">
              {/* Moldura Superior (inspirada no Card 1 da referência) */}
              <div className="w-full bg-zinc-100/95 backdrop-blur-xl text-zinc-950 rounded-2xl p-6 px-8 flex justify-between items-center shadow-2xl border border-white/60">
                <div>
                  <span className="font-display font-black tracking-[0.2em] text-3xl text-zinc-950 block">
                    TFIVE PRO
                  </span>
                  <span className="text-xs font-mono-nums font-bold tracking-[0.3em] text-zinc-500 uppercase mt-0.5 block">
                    PERFORMANCE SEM LIMITES
                  </span>
                </div>
                <div className="bg-zinc-900 text-zinc-200 px-5 py-2.5 rounded-full border border-zinc-700 shadow-sm">
                  <span className="text-xs font-mono-nums font-bold tracking-[0.25em] uppercase">
                    DISCIPLINA • CONSTÂNCIA • RESULTADOS
                  </span>
                </div>
              </div>

              {/* Centro: Moldura Assimétrica Técnica (CENTRO 100% TRANSPARENTE) */}
              <div className="flex-1 w-full my-6 relative flex items-center justify-between pointer-events-none">
                {/* Cantoneiras Técnicas */}
                <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-white/80" />
                <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-white/80" />
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-white/80" />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-white/80" />

                {/* Marcadores de Mira Técnica */}
                <div className="absolute top-1/2 left-0 -translate-y-1/2 text-white/50 text-xl font-mono-nums">
                  +
                </div>
                <div className="absolute top-1/2 right-0 -translate-y-1/2 text-white/50 text-xl font-mono-nums">
                  +
                </div>

                {/* Guia Vertical Esquerda */}
                <div className="flex items-center gap-4 origin-left -rotate-90 ml-6">
                  <span className="font-mono-nums text-xs tracking-[0.35em] text-zinc-300 uppercase font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                    RESULTADOS REAIS
                  </span>
                  <div className="w-20 h-[1px] bg-white/40" />
                </div>

                {/* Guia Vertical Direita */}
                <div className="flex items-center gap-4 origin-right rotate-90 mr-6">
                  <div className="w-20 h-[1px] bg-white/40" />
                  <span className="font-mono-nums text-xs tracking-[0.35em] text-zinc-300 uppercase font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                    PROCESSO QUE TRANSFORMA
                  </span>
                </div>
              </div>

              {/* Moldura Inferior com Elementos Geométricos Assimétricos */}
              <div className="w-full flex items-end justify-between gap-6">
                {/* Badge Geométrico Escuro à Esquerda */}
                <div className="bg-zinc-950/85 backdrop-blur-xl border border-zinc-700/80 p-8 rounded-2xl shadow-2xl max-w-md">
                  <div className="text-2xl font-black uppercase text-white tracking-tight leading-tight">
                    MAIS<br />
                    RESULTADOS<br />
                    TODOS OS DIAS
                  </div>
                  <div className="w-12 h-1 bg-white/80 my-4 rounded-full" />
                  <p className="text-xs font-mono-nums font-bold tracking-[0.2em] text-zinc-400 uppercase">
                    {workoutName} • {firstName}
                  </p>
                </div>

                {/* Badge Claro à Direita com Telemetria e Assinatura */}
                <div className="bg-zinc-100/95 backdrop-blur-xl text-zinc-950 p-8 rounded-2xl shadow-2xl flex flex-col justify-between border border-white/60 min-w-[340px]">
                  <div>
                    <span className="font-display font-black tracking-[0.2em] text-2xl text-zinc-950 block">
                      TFIVE PRO
                    </span>
                    <span className="text-[11px] font-mono-nums font-bold tracking-[0.25em] text-zinc-500 uppercase block mt-0.5">
                      PERSONAL TRAINER
                    </span>
                  </div>

                  <div className="flex items-center gap-6 mt-6 pt-4 border-t border-zinc-300">
                    <div>
                      <span className="text-[10px] font-mono-nums uppercase tracking-widest text-zinc-500 block">Duração</span>
                      <span className="text-2xl font-black font-mono-nums text-zinc-950">{duration}</span>
                    </div>
                    <div className="w-[1px] h-8 bg-zinc-300" />
                    <div>
                      <span className="text-[10px] font-mono-nums uppercase tracking-widest text-zinc-500 block">Volume</span>
                      <span className="text-2xl font-black font-mono-nums text-zinc-950">{volume}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );

        // ====================================================================
        // MODELO 02 — PERFORMANCE
        // Modern sports authority & clarity, anchored to bottom, top open
        // ====================================================================
        case 'performance':
          return (
            <div className="w-[1080px] h-[1920px] bg-transparent text-white relative overflow-hidden flex flex-col justify-between p-16 pb-20 select-none">
              {/* Header Superior Minimalista */}
              <div className="w-full flex justify-between items-center">
                <div className="bg-black/55 backdrop-blur-md px-6 py-3 rounded-full border border-white/15 flex items-center gap-3 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-white" />
                  <span className="font-display font-black tracking-[0.2em] text-lg text-white">
                    TFIVE PRO.
                  </span>
                </div>
                <div className="bg-black/55 backdrop-blur-md px-6 py-3 rounded-full border border-white/15 font-mono-nums font-bold text-sm tracking-widest text-zinc-300 shadow-lg">
                  {dateStr}
                </div>
              </div>

              {/* Área Central: Totalmente Transparente para a Foto */}

              {/* Painel Inferior de Performance */}
              <div className="w-full bg-zinc-950/85 backdrop-blur-2xl border border-white/15 rounded-[44px] p-14 shadow-[0_30px_90px_rgba(0,0,0,0.85)]">
                <div className="mb-10">
                  <p className="text-xl font-mono-nums font-bold text-zinc-400 uppercase tracking-[0.3em] mb-3">
                    {workoutName}
                  </p>
                  <h1 className="text-[96px] font-black uppercase tracking-tight text-white leading-[0.92]">
                    TREINO<br />CONCLUÍDO
                  </h1>
                  <p className="text-2xl font-bold tracking-wider text-zinc-300 uppercase mt-4">
                    {firstName}
                  </p>
                </div>

                {/* Grade Adaptativa de Métricas Reais */}
                <div className="grid grid-cols-4 gap-6 pt-8 border-t border-white/15">
                  <div className="flex flex-col">
                    <span className="text-sm font-mono-nums font-bold text-zinc-400 uppercase tracking-widest mb-2">
                      Duração
                    </span>
                    <span className="text-5xl font-black font-mono-nums text-white">
                      {duration}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-sm font-mono-nums font-bold text-zinc-400 uppercase tracking-widest mb-2">
                      Volume
                    </span>
                    <span className="text-5xl font-black font-mono-nums text-white">
                      {volume}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-sm font-mono-nums font-bold text-zinc-400 uppercase tracking-widest mb-2">
                      Exercícios
                    </span>
                    <span className="text-5xl font-black font-mono-nums text-white">
                      {exercisesCount}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-sm font-mono-nums font-bold text-zinc-400 uppercase tracking-widest mb-2">
                      Séries
                    </span>
                    <span className="text-5xl font-black font-mono-nums text-white">
                      {setsCount}
                    </span>
                  </div>

                  {/* Dados opcionais se existirem */}
                  {caloriesStr && (
                    <div className="flex flex-col pt-4 col-span-2">
                      <span className="text-sm font-mono-nums font-bold text-zinc-400 uppercase tracking-widest mb-1">
                        Calorias
                      </span>
                      <span className="text-4xl font-black font-mono-nums text-zinc-200">
                        {caloriesStr}
                      </span>
                    </div>
                  )}

                  {heartRateStr && (
                    <div className="flex flex-col pt-4 col-span-2">
                      <span className="text-sm font-mono-nums font-bold text-zinc-400 uppercase tracking-widest mb-1">
                        FC Média
                      </span>
                      <span className="text-4xl font-black font-mono-nums text-zinc-200">
                        {heartRateStr}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );

        // ====================================================================
        // MODELO 03 — MAIS FORTE
        // Minimalist editorial, huge negative space, striking display type
        // ====================================================================
        case 'mais_forte':
          return (
            <div className="w-[1080px] h-[1920px] bg-transparent text-white relative overflow-hidden flex flex-col justify-between p-20 pb-24 select-none">
              {/* Topo Discreto */}
              <div className="flex justify-between items-center drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
                <div>
                  <span className="font-display font-black tracking-[0.25em] text-3xl text-white block">
                    TFIVE PRO
                  </span>
                  <span className="text-xs font-mono-nums font-bold tracking-[0.3em] text-zinc-300 uppercase block mt-1">
                    PERFORMANCE SEM LIMITES
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono-nums font-bold tracking-[0.25em] text-zinc-300 uppercase block">
                    TREINO
                  </span>
                  <span className="text-xl font-black font-mono-nums text-white block">
                    CONCLUÍDO
                  </span>
                </div>
              </div>

              {/* Área Central-Inferior: Editorial Typography */}
              <div className="flex flex-col drop-shadow-[0_8px_32px_rgba(0,0,0,0.95)]">
                <h1 className="text-[145px] font-black uppercase tracking-tighter leading-[0.88] text-white">
                  MAIS<br />
                  FORTE<br />
                  HOJE
                </h1>

                <p className="text-2xl font-bold tracking-[0.3em] text-zinc-300 uppercase mt-8">
                  DISCIPLINA  •  CONSTÂNCIA  •  RESULTADOS
                </p>

                <div className="w-28 h-1 bg-white/80 my-8 rounded-full" />

                {/* Linha Discreta de Métricas */}
                <div className="bg-black/60 backdrop-blur-lg px-8 py-5 rounded-full border border-white/20 w-fit flex items-center gap-8 shadow-xl">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl font-black font-mono-nums text-white">{duration}</span>
                    <span className="text-xs font-mono-nums font-bold text-zinc-400 uppercase">Duração</span>
                  </div>
                  <span className="w-1 h-1 rounded-full bg-zinc-500" />
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl font-black font-mono-nums text-white">{volume}</span>
                    <span className="text-xs font-mono-nums font-bold text-zinc-400 uppercase">Volume</span>
                  </div>
                  <span className="w-1 h-1 rounded-full bg-zinc-500" />
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl font-black font-mono-nums text-white">{exercisesCount}</span>
                    <span className="text-xs font-mono-nums font-bold text-zinc-400 uppercase">Exercícios</span>
                  </div>
                </div>

                <div className="mt-8 text-sm font-mono-nums tracking-[0.25em] text-zinc-400 uppercase">
                  {firstName} // {workoutName}
                </div>
              </div>
            </div>
          );

        // ====================================================================
        // MODELO 04 — RESUMO DO TREINO
        // Inspired by Card 4: exercise list with technical rigor & grays
        // ====================================================================
        case 'resumo_treino': {
          const maxVisible = 5;
          const displayExercises = exercisesSummaryList.slice(0, maxVisible);
          const remainingCount = Math.max(0, exercisesSummaryList.length - maxVisible);

          return (
            <div className="w-[1080px] h-[1920px] bg-transparent text-white relative overflow-hidden flex flex-col justify-end p-14 pb-16 select-none">
              {/* Painel Translúcido Inferior com Lista de Exercícios */}
              <div className="w-full bg-zinc-950/88 backdrop-blur-2xl border border-zinc-700/60 rounded-[44px] p-12 shadow-[0_30px_90px_rgba(0,0,0,0.9)]">
                {/* Header do Card */}
                <div className="flex justify-between items-start mb-8 pb-6 border-b border-white/15">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-mono-nums font-bold tracking-[0.3em] text-zinc-400 uppercase">
                        HOJE MAIS UM PASSO NA EVOLUÇÃO
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      <span className="text-xs font-mono-nums text-zinc-400 font-bold">{dateStr}</span>
                    </div>
                    <h2 className="text-5xl font-black uppercase text-white tracking-tight">
                      TREINO CONCLUÍDO
                    </h2>
                    <p className="text-xl font-bold text-zinc-300 uppercase mt-1">
                      {workoutName} • {firstName}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-display font-black tracking-[0.2em] text-2xl text-white">
                      TFIVE PRO
                    </span>
                    <span className="text-[11px] font-mono-nums font-bold tracking-[0.2em] text-zinc-400 block mt-1 uppercase">
                      PERSONAL TRAINER
                    </span>
                  </div>
                </div>

                {/* Lista de Exercícios */}
                <div className="flex flex-col gap-3.5 mb-8">
                  {displayExercises.length > 0 ? (
                    displayExercises.map(ex => (
                      <div
                        key={ex.order}
                        className="flex items-center justify-between p-4 px-6 rounded-2xl bg-zinc-900/70 border border-zinc-700/60"
                      >
                        <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
                          <span className="font-mono-nums font-black text-xl text-zinc-400 w-8 shrink-0">
                            {ex.order}
                          </span>
                          <span className="font-bold text-lg text-white uppercase truncate" title={ex.name}>
                            {ex.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-6 shrink-0">
                          <span className="font-mono-nums font-bold text-base text-zinc-300">
                            {ex.setsCount} × {ex.repsStr}
                          </span>
                          {ex.maxWeightStr ? (
                            <span className="font-mono-nums font-black text-lg text-white min-w-[85px] text-right">
                              {ex.maxWeightStr}
                            </span>
                          ) : (
                            <span className="font-mono-nums text-zinc-500 min-w-[85px] text-right">—</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-zinc-400 font-mono-nums text-lg">
                      {workoutName} ({exercisesCount} exercícios executados)
                    </div>
                  )}

                  {/* Contador Adaptativo se houver overflow */}
                  {remainingCount > 0 && (
                    <div className="py-3 px-6 rounded-2xl bg-zinc-900/50 border border-dashed border-zinc-700 text-center">
                      <span className="font-mono-nums text-sm font-bold tracking-[0.25em] text-zinc-300 uppercase">
                        + {remainingCount} {remainingCount === 1 ? 'EXERCÍCIO CONCLUÍDO' : 'EXERCÍCIOS CONCLUÍDOS'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Rodapé do Card com Resumo Geral */}
                <div className="flex items-center justify-between pt-6 border-t border-white/15 text-sm font-mono-nums">
                  <div className="flex items-center gap-8">
                    <div>
                      <span className="text-xs text-zinc-400 uppercase tracking-widest block mb-1">Duração</span>
                      <span className="text-3xl font-black text-white">{duration}</span>
                    </div>
                    <div className="w-[1px] h-10 bg-white/15" />
                    <div>
                      <span className="text-xs text-zinc-400 uppercase tracking-widest block mb-1">Volume Total</span>
                      <span className="text-3xl font-black text-white">{volume}</span>
                    </div>
                    <div className="w-[1px] h-10 bg-white/15" />
                    <div>
                      <span className="text-xs text-zinc-400 uppercase tracking-widest block mb-1">Total Séries</span>
                      <span className="text-3xl font-black text-white">{setsCount}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs tracking-[0.2em] text-zinc-400 font-bold uppercase block">
                      PROCESSO • DISCIPLINA
                    </span>
                    <span className="text-xs tracking-[0.2em] text-white font-black uppercase block mt-0.5">
                      RESULTADOS
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // ====================================================================
        // MODELO 05 — EVOLUÇÃO
        // Inspired by Card 5: Metrics + abstract athletic telemetry visualization
        // ====================================================================
        case 'evolucao':
          return (
            <div className="w-[1080px] h-[1920px] bg-transparent text-white relative overflow-hidden flex flex-col justify-between p-16 select-none">
              {/* Topo Editorial */}
              <div>
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <span className="font-display font-black tracking-[0.25em] text-3xl text-white block">
                      TFIVE PRO
                    </span>
                    <span className="text-xs font-mono-nums font-bold tracking-[0.3em] text-zinc-300 uppercase block mt-1">
                      PERFORMANCE SEM LIMITES
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono-nums font-bold tracking-[0.25em] text-zinc-300 uppercase block">
                      TREINO
                    </span>
                    <span className="text-xl font-black font-mono-nums text-white block">
                      CONCLUÍDO
                    </span>
                  </div>
                </div>

                <h1 className="text-[100px] font-black uppercase tracking-tight text-white leading-[0.92]">
                  EVOLUÇÃO<br />EM MOVIMENTO
                </h1>
                <p className="text-xl font-bold tracking-[0.25em] text-zinc-300 uppercase mt-4">
                  {workoutName} • {firstName}
                </p>
              </div>

              {/* Centro: Visualização Abstrata de Telemetria Atlética */}
              <div className="w-full bg-zinc-950/75 backdrop-blur-xl border border-zinc-700/60 rounded-3xl p-10 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <span className="font-mono-nums text-xs font-bold tracking-[0.3em] text-zinc-400 uppercase">
                    CARGA & INTENSIDADE ACUMULADA
                  </span>
                  <span className="font-mono-nums text-xs font-bold text-zinc-300">
                    {volume}
                  </span>
                </div>

                {/* SVG Visualizer Minimalista de Esforço */}
                <div className="w-full h-36 flex items-end justify-between gap-2 px-2">
                  {Array.from({ length: 28 }).map((_, i) => {
                    const progress = i / 27;
                    const wave = Math.sin(progress * Math.PI) * 0.75 + Math.sin(progress * Math.PI * 3) * 0.25;
                    const heightPercent = Math.max(15, Math.min(100, Math.round(wave * 100)));
                    const isHighlight = i >= 10 && i <= 18;

                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col justify-end items-center h-full"
                      >
                        <div
                          className={`w-full rounded-t-sm transition-all ${
                            isHighlight ? 'bg-white' : 'bg-zinc-600/50'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/10 text-xs font-mono-nums text-zinc-400 tracking-wider uppercase">
                  <span>INÍCIO DO TREINO</span>
                  <span className="text-white font-bold">PICO DE PERFORMANCE</span>
                  <span>FINALIZAÇÃO</span>
                </div>
              </div>

              {/* Base: Métricas em Cartões Translúcidos */}
              <div className="grid grid-cols-4 gap-6">
                <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-700/60 p-8 rounded-3xl flex flex-col shadow-xl">
                  <span className="text-xs font-mono-nums font-bold text-zinc-400 uppercase tracking-widest mb-2">
                    Duração
                  </span>
                  <span className="text-4xl font-black font-mono-nums text-white">
                    {duration}
                  </span>
                </div>

                <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-700/60 p-8 rounded-3xl flex flex-col shadow-xl">
                  <span className="text-xs font-mono-nums font-bold text-zinc-400 uppercase tracking-widest mb-2">
                    Volume Total
                  </span>
                  <span className="text-4xl font-black font-mono-nums text-white">
                    {volume}
                  </span>
                </div>

                <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-700/60 p-8 rounded-3xl flex flex-col shadow-xl">
                  <span className="text-xs font-mono-nums font-bold text-zinc-400 uppercase tracking-widest mb-2">
                    Exercícios
                  </span>
                  <span className="text-4xl font-black font-mono-nums text-white">
                    {exercisesCount}
                  </span>
                </div>

                <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-700/60 p-8 rounded-3xl flex flex-col shadow-xl">
                  <span className="text-xs font-mono-nums font-bold text-zinc-400 uppercase tracking-widest mb-2">
                    Séries
                  </span>
                  <span className="text-4xl font-black font-mono-nums text-white">
                    {setsCount}
                  </span>
                </div>
              </div>
            </div>
          );

        // ====================================================================
        // MODELO 06 — MINIMAL DATA
        // Cleanest of all: pure typography, micro-lines, zero heavy boxes
        // ====================================================================
        case 'minimal_data':
          return (
            <div className="w-[1080px] h-[1920px] bg-transparent text-white relative overflow-hidden flex flex-col justify-between p-20 pb-24 select-none">
              {/* Topo com Identidade e Data */}
              <div className="drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
                <span className="font-display font-black tracking-[0.25em] text-3xl text-white block">
                  TFIVE PRO
                </span>
                <span className="text-base font-mono-nums font-bold tracking-[0.3em] text-zinc-300 uppercase mt-2 block">
                  TREINO CONCLUÍDO // {dateStr}
                </span>
              </div>

              {/* Bloco Central Tipográfico com Dados Grandes */}
              <div className="flex flex-col gap-10 drop-shadow-[0_8px_30px_rgba(0,0,0,0.9)]">
                <div className="flex items-baseline gap-6 border-b border-white/20 pb-8">
                  <span className="text-8xl font-black font-mono-nums text-white">
                    {duration}
                  </span>
                  <span className="text-2xl font-mono-nums font-bold text-zinc-300 uppercase tracking-widest">
                    Duração
                  </span>
                </div>

                <div className="flex items-baseline gap-6 border-b border-white/20 pb-8">
                  <span className="text-8xl font-black font-mono-nums text-white">
                    {volume}
                  </span>
                  <span className="text-2xl font-mono-nums font-bold text-zinc-300 uppercase tracking-widest">
                    Volume Total
                  </span>
                </div>

                <div className="flex items-baseline gap-6 border-b border-white/20 pb-8">
                  <span className="text-8xl font-black font-mono-nums text-white">
                    {String(exercisesCount).padStart(2, '0')}
                  </span>
                  <span className="text-2xl font-mono-nums font-bold text-zinc-300 uppercase tracking-widest">
                    Exercícios
                  </span>
                </div>

                <div className="flex items-baseline gap-6">
                  <span className="text-8xl font-black font-mono-nums text-white">
                    {String(setsCount).padStart(2, '0')}
                  </span>
                  <span className="text-2xl font-mono-nums font-bold text-zinc-300 uppercase tracking-widest">
                    Séries Concluídas
                  </span>
                </div>
              </div>

              {/* Rodapé com Manifesto e Nome do Aluno */}
              <div className="drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
                <div className="w-24 h-1 bg-white/80 mb-6 rounded-full" />
                <p className="text-2xl font-bold tracking-[0.25em] text-white uppercase">
                  PROCESSO. CONSTÂNCIA. RESULTADOS.
                </p>
                <p className="text-base font-mono-nums tracking-[0.2em] text-zinc-300 uppercase mt-2">
                  {firstName} • {workoutName}
                </p>
              </div>
            </div>
          );

        // ====================================================================
        // MODELO 07 — BODY MAP
        // Redesenhado completamente: silhuetas anatômicas ampliadas frente/costas,
        // escala monocromática estrita (#3F3F46, #A1A1AA, #E5E5E5), legenda compacta e elegante
        // ====================================================================
        case 'body_map':
          return (
            <div
              className="w-[1080px] h-[1920px] relative overflow-hidden flex flex-col px-16 py-16 text-white select-none"
              style={{
                background: 'linear-gradient(180deg, #15191F 0%, #0B0E12 100%)'
              }}
            >
              {/* Identidade discreta no topo */}
              <div className="w-full flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <span className="w-3 h-3 rounded-full bg-[#3185E8]" />
                  <span className="font-display font-black tracking-[0.24em] text-2xl text-white">
                    TFIVE PRO
                  </span>
                </div>
                <span className="font-mono-nums text-sm font-bold tracking-[0.3em] text-zinc-400 uppercase">
                  MAPA ANATÔMICO
                </span>
              </div>

              {/* Título e identificação da sessão */}
              <div className="mt-16 text-center shrink-0">
                <span className="font-mono-nums text-sm font-bold tracking-[0.35em] text-[#78AEEB] uppercase">
                  GRUPAMENTOS MUSCULARES
                </span>
                <h2 className="mt-4 text-5xl font-black tracking-tight text-white uppercase">
                  {workoutName}
                </h2>
                <p className="mt-3 text-xl font-semibold tracking-[0.18em] text-zinc-400 uppercase">
                  {firstName} • {dateStr}
                </p>
              </div>

              {/* Anatomia em destaque, sem cartão ou moldura branca */}
              <div className="flex-1 min-h-0 w-full flex items-center justify-center py-10">
                <div className="w-full max-w-[920px] mx-auto flex items-center justify-center">
                  <StoryBodyMapVector
                    intensities={muscleAnalysis.intensities}
                    sex={bodyMapSex}
                    theme="transparent-dark"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Legenda simples, sem bloco branco */}
              <div className="w-full shrink-0 border-t border-white/15 pt-8">
                <div className="flex items-center justify-center gap-12 text-sm font-mono-nums font-bold tracking-[0.12em] uppercase">
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full bg-[#3185E8]" />
                    <span className="text-zinc-200">Primário</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full bg-[#89B1E1]" />
                    <span className="text-zinc-300">Secundário</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full bg-[#D1D5DB]" />
                    <span className="text-zinc-400">Em repouso</span>
                  </div>
                </div>

                <div className="mt-8 flex items-end justify-between border-t border-white/10 pt-6">
                  <div>
                    <span className="block text-xs font-mono-nums font-bold tracking-[0.25em] text-zinc-500 uppercase">
                      RESUMO DA SESSÃO
                    </span>
                    <span className="mt-2 block text-xl font-black text-white">
                      {duration} • {volume}
                    </span>
                    <span className="mt-1 block text-sm font-mono-nums font-semibold tracking-wider text-zinc-400 uppercase">
                      {setsCount} SÉRIES • {exercisesCount} EXERCÍCIOS
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block font-display text-xl font-black tracking-[0.2em] text-white">
                      TFIVE PRO
                    </span>
                    <span className="mt-1 block text-[11px] font-bold tracking-[0.2em] text-zinc-500 uppercase">
                      PERSONAL TRAINER
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );

        default:
          return <div className="w-[1080px] h-[1920px] bg-transparent" />;
      }
    };

    return (
      <div
        ref={containerRef}
        className="w-[1080px] h-[1920px] shrink-0 bg-transparent"
        style={{
          width: 1080,
          height: 1920,
          backgroundColor: 'transparent'
        }}
      >
        {renderContent()}
      </div>
    );
  }
);

WorkoutStoryDOMRenderer.displayName = 'WorkoutStoryDOMRenderer';
