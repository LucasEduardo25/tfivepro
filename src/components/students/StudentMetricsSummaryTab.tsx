import React, { useState, useMemo } from 'react';
import { 
  Student, 
  WorkoutSession, 
  WorkoutRoutine, 
  RoutineWorkout 
} from '../../types';
import { 
  MetricsPeriod, 
  aggregateStudentMetrics,
  getExerciseProgressionDetails,
  ExerciseProgressionDetails
} from '../../utils/studentMetricsAggregator';
import { 
  formatWeight, 
  calculateEstimated1RM,
  formatPrescriptionSummary 
} from '../../utils/calculations';
import { 
  Dumbbell, 
  TrendingUp, 
  TrendingDown, 
  Flame, 
  Trophy, 
  Calendar, 
  Clock, 
  Layers, 
  Activity, 
  ChevronDown, 
  CheckCircle2, 
  BarChart3, 
  Sparkles,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

interface StudentMetricsSummaryTabProps {
  student: Student;
  sessions: WorkoutSession[];
  routines?: WorkoutRoutine[];
  onStartWorkout?: (student: Student, routine?: WorkoutRoutine, workout?: RoutineWorkout | string) => void;
}

export const StudentMetricsSummaryTab: React.FC<StudentMetricsSummaryTabProps> = ({
  student,
  sessions,
  routines = [],
  onStartWorkout
}) => {
  // Period filter state (default 90d as recommended)
  const [selectedPeriod, setSelectedPeriod] = useState<MetricsPeriod>('90d');

  // Main training chart metric toggle: 'volume' | 'sets' | 'sessions'
  const [mainChartMetric, setMainChartMetric] = useState<'volume' | 'sets' | 'sessions'>('volume');

  // Selected exercise for progression details
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');

  // Exercise progression metric toggle: 'weight' | 'volume' | 'reps'
  const [exerciseMetric, setExerciseMetric] = useState<'weight' | 'volume' | 'reps'>('weight');

  // Active tooltip state for main chart
  const [hoveredWeeklyIndex, setHoveredWeeklyIndex] = useState<number | null>(null);

  // Active tooltip state for exercise chart
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Memoized aggregation based on all sessions and selected period
  const metrics = useMemo(() => {
    return aggregateStudentMetrics(sessions, student.id, selectedPeriod);
  }, [sessions, student.id, selectedPeriod]);

  // Set default selected exercise when available
  React.useEffect(() => {
    if (metrics.availableExercises.length > 0) {
      const exists = metrics.availableExercises.some(e => e.id === selectedExerciseId);
      if (!exists || !selectedExerciseId) {
        setSelectedExerciseId(metrics.availableExercises[0].id);
      }
    } else {
      setSelectedExerciseId('');
    }
  }, [metrics.availableExercises, selectedExerciseId]);

  // Exercise progression data for currently selected exercise
  const exerciseProgression: ExerciseProgressionDetails | null = useMemo(() => {
    if (!selectedExerciseId) return null;
    return getExerciseProgressionDetails(selectedExerciseId, sessions);
  }, [selectedExerciseId, sessions]);

  // Period label text
  const periodLabels: Record<MetricsPeriod, string> = {
    '30d': '30D',
    '90d': '90D',
    '6m': '6M',
    '1y': '1A',
    'all': 'TODO'
  };

  // Helper for trend badge rendering
  const renderTrendBadge = (
    delta: number | null, 
    percentChange: number | null, 
    formattedDelta: string,
    unitSuffix: string = ''
  ) => {
    if (delta === null && percentChange === null) {
      return (
        <span className="text-[10px] text-[#71717A]">
          {selectedPeriod === 'all' ? 'Histórico total' : 'Sem período anterior para comparar'}
        </span>
      );
    }

    if (delta === 0 || percentChange === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono-nums font-bold text-[#4B5563]">
          <Minus className="w-3 h-3 text-[#71717A]" />
          <span>0% vs período anterior</span>
        </span>
      );
    }

    const isPositive = (delta !== null && delta > 0) || (percentChange !== null && percentChange > 0);
    const displayText = percentChange !== null 
      ? `${isPositive ? '+' : ''}${percentChange.toFixed(1).replace('.', ',')}%`
      : formattedDelta;

    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-mono-nums font-bold ${
        isPositive ? 'text-emerald-400' : 'text-zinc-600'
      }`}>
        {isPositive ? (
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <ArrowDownRight className="w-3.5 h-3.5 text-zinc-600" />
        )}
        <span>{displayText} vs período anterior</span>
      </span>
    );
  };

  return (
    <div className="space-y-5 select-none animate-in fade-in duration-200">
      
      {/* ======================================================================= */}
      {/* 1. TOP HEADER & COMPACT PERIOD SELECTOR                                 */}
      {/* ======================================================================= */}
      <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <BarChart3 className="w-4 h-4 text-[#374151]" />
            <span className="text-xs uppercase font-black tracking-wider text-[#4B5563]">
              RESUMO DE PERFORMANCE & ANÁLISE DE EVOLUÇÃO
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black font-display text-white">
            {metrics.dateRange.label}
          </h2>
        </div>

        {/* Compact Period Switcher */}
        <div className="flex items-center gap-1 bg-[#18181B] p-1 rounded-xl border border-[#27272A] shrink-0 self-start sm:self-center">
          {(['30d', '90d', '6m', '1y', 'all'] as MetricsPeriod[]).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setSelectedPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono-nums tracking-wider uppercase transition-all ${
                selectedPeriod === p
                  ? 'bg-[#374151] text-white shadow-sm font-black'
                  : 'text-[#4B5563] hover:text-white hover:bg-[#27272A]/60'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 2. TOP 4 KEY METRIC CARDS                                               */}
      {/* ======================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Card 1: Treinos Concluídos */}
        <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-xs text-[#4B5563] mb-1">
            <span className="font-bold tracking-wider uppercase text-[11px]">TREINOS CONCLUÍDOS</span>
            <Flame className="w-4 h-4 text-[#374151]" />
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black font-display text-white font-mono-nums">
              {metrics.totalCompletedSessions.current}
            </p>
            <div className="mt-1.5">
              {renderTrendBadge(
                metrics.totalCompletedSessions.delta,
                metrics.totalCompletedSessions.percentChange,
                metrics.totalCompletedSessions.formattedDelta
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Frequência Semanal */}
        <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-xs text-[#4B5563] mb-1">
            <span className="font-bold tracking-wider uppercase text-[11px]">TREINOS / SEMANA</span>
            <Calendar className="w-4 h-4 text-[#374151]" />
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black font-display text-white font-mono-nums">
              {metrics.weeklyFrequency.current > 0 ? metrics.weeklyFrequency.current.toFixed(1).replace('.', ',') : '0,0'}
            </p>
            <div className="mt-1.5">
              {renderTrendBadge(
                metrics.weeklyFrequency.delta,
                metrics.weeklyFrequency.percentChange,
                metrics.weeklyFrequency.formattedDelta
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Volume Médio por Sessão */}
        <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-xs text-[#4B5563] mb-1">
            <span className="font-bold tracking-wider uppercase text-[11px]">VOLUME MÉDIO / SESSÃO</span>
            <TrendingUp className="w-4 h-4 text-[#374151]" />
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black font-display text-white font-mono-nums">
              {metrics.averageSessionVolume.current > 0 ? formatWeight(metrics.averageSessionVolume.current) : '0 kg'}
            </p>
            <div className="mt-1.5">
              {renderTrendBadge(
                metrics.averageSessionVolume.delta,
                metrics.averageSessionVolume.percentChange,
                metrics.averageSessionVolume.formattedDelta
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Progressões de Carga Detectadas */}
        <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-xs text-[#4B5563] mb-1">
            <span className="font-bold tracking-wider uppercase text-[11px]">PROGRESSÕES DE CARGA</span>
            <Trophy className="w-4 h-4 text-[#374151]" />
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black font-display text-[#374151] font-mono-nums">
              {metrics.totalProgressionsCount}
            </p>
            <p className="text-[11px] text-[#4B5563] mt-1.5">
              Em {metrics.distinctExercisesCount} {metrics.distinctExercisesCount === 1 ? 'exercício treinado' : 'exercícios treinados'}
            </p>
          </div>
        </div>

      </div>

      {/* ======================================================================= */}
      {/* 3. MAIN CHART: EVOLUÇÃO DO TREINAMENTO                                  */}
      {/* ======================================================================= */}
      <div className="bg-[#121212] border border-[#27272A] rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
        
        {/* Main Chart Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#27272A] pb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#374151]" />
              <h3 className="text-base sm:text-lg font-black font-display uppercase tracking-wide text-white">
                Evolução do Treinamento
              </h3>
            </div>
            <p className="text-xs text-[#4B5563] mt-0.5">
              Consistência temporal semana a semana no período selecionado
            </p>
          </div>

          {/* Metric Selector Buttons */}
          <div className="flex items-center gap-1 bg-[#18181B] p-1 rounded-xl border border-[#27272A] shrink-0 self-start sm:self-center">
            {[
              { id: 'volume', label: 'Volume (kg)' },
              { id: 'sets', label: 'Séries' },
              { id: 'sessions', label: 'Treinos' }
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMainChartMetric(m.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all ${
                  mainChartMetric === m.id
                    ? 'bg-white text-black font-black shadow-sm'
                    : 'text-[#4B5563] hover:text-white hover:bg-[#27272A]/60'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Chart Visualization */}
        {metrics.weeklyBuckets.length > 0 && metrics.hasEnoughData ? (
          <div className="space-y-3">
            
            {/* Line chart: evolução semanal */}
            <div className="relative h-56 sm:h-64 px-1 pt-5">
              {(() => {
                const values = metrics.weeklyBuckets.map((bucket) =>
                  mainChartMetric === 'volume' ? bucket.totalVolume :
                  mainChartMetric === 'sets' ? bucket.totalSets : bucket.sessionsCount
                );
                const maxVal = Math.max(...values, 1);
                const points = metrics.weeklyBuckets.map((bucket, idx) => ({
                  bucket,
                  value: values[idx],
                  x: 28 + (idx * 544) / Math.max(1, values.length - 1),
                  y: 166 - (values[idx] / maxVal) * 126,
                }));
                const linePath = points.reduce((path, point, idx) => {
                  if (idx === 0) return `M ${point.x} ${point.y}`;
                  const previous = points[idx - 1];
                  const middleX = (previous.x + point.x) / 2;
                  return `${path} Q ${middleX} ${previous.y} ${point.x} ${point.y}`;
                }, '');
                const areaPath = points.length
                  ? `${linePath} L ${points[points.length - 1].x} 184 L ${points[0].x} 184 Z`
                  : '';
                return (
                  <>
                    <div className="absolute inset-x-2 top-5 bottom-8 flex flex-col justify-between pointer-events-none">
                      {[0, 1, 2, 3].map((line) => <div key={line} className="border-t border-dashed border-[#303036]" />)}
                    </div>
                    <svg viewBox="0 0 600 214" role="img" aria-label="Gráfico em linha da evolução semanal" className="relative h-full w-full overflow-visible">
                      <defs>
                        <linearGradient id="tfive-summary-line" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#6B7280" />
                          <stop offset="100%" stopColor="#E5E7EB" />
                        </linearGradient>
                        <linearGradient id="tfive-summary-area" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6B7280" stopOpacity=".30" />
                          <stop offset="100%" stopColor="#6B7280" stopOpacity="0" />
                        </linearGradient>
                        <filter id="tfive-summary-glow"><feGaussianBlur stdDeviation="3.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                      </defs>
                      <path d={areaPath} fill="url(#tfive-summary-area)" />
                      <path d={linePath} fill="none" stroke="url(#tfive-summary-line)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#tfive-summary-glow)" />
                      {points.map((point, idx) => {
                        const active = hoveredWeeklyIndex === idx;
                        const label = mainChartMetric === 'volume' ? formatWeight(point.value) : String(point.value);
                        return (
                          <g key={point.bucket.weekKey}
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredWeeklyIndex(idx)}
                            onMouseLeave={() => setHoveredWeeklyIndex(null)}
                            onClick={() => setHoveredWeeklyIndex(active ? null : idx)}>
                            <circle cx={point.x} cy={point.y} r={active ? 11 : 8} fill="#D1D5DB" opacity=".10" />
                            <circle cx={point.x} cy={point.y} r={active ? 5 : 4} fill="#F9FAFB" stroke="#9CA3AF" strokeWidth="2" />
                            <text x={point.x} y={Math.max(16, point.y - 13)} textAnchor="middle" fill="#E5E7EB" fontSize="11" fontWeight="700">{label}</text>
                            <text x={point.x} y="207" textAnchor="middle" fill="#71717A" fontSize="10">{point.bucket.weekLabel.split(' a ')[0]}</text>
                          </g>
                        );
                      })}
                    </svg>
                    {hoveredWeeklyIndex !== null && metrics.weeklyBuckets[hoveredWeeklyIndex] && (
                      <div className="absolute left-3 top-1 z-20 rounded-lg border border-[#3F3F46] bg-[#18181B] px-3 py-2 text-[11px] text-[#E5E7EB] shadow-xl pointer-events-none">
                        <strong className="block text-white">{metrics.weeklyBuckets[hoveredWeeklyIndex].weekLabel}</strong>
                        <span>{metrics.weeklyBuckets[hoveredWeeklyIndex].sessionsCount} treinos · {metrics.weeklyBuckets[hoveredWeeklyIndex].totalSets} séries · {formatWeight(metrics.weeklyBuckets[hoveredWeeklyIndex].totalVolume)}</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* X-Axis Labels (Weekly Dates) */}
            <div className="flex items-center justify-between px-2 text-[10px] text-[#71717A] font-mono-nums overflow-x-auto">
              <span>{metrics.weeklyBuckets[0]?.weekLabel.split(' a ')[0]}</span>
              <span className="text-center">Linha Temporal Semanal</span>
              <span>{metrics.weeklyBuckets[metrics.weeklyBuckets.length - 1]?.weekLabel.split(' a ')[1]}</span>
            </div>

          </div>
        ) : (
          <div className="py-12 px-4 text-center space-y-2 bg-[#0A0A0A] rounded-2xl border border-[#27272A]">
            <Info className="w-8 h-8 text-[#71717A] mx-auto" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wide">
              AINDA NÃO HÁ DADOS SUFICIENTES
            </h4>
            <p className="text-xs text-[#4B5563] max-w-md mx-auto">
              Os gráficos de evolução temporal serão exibidos conforme novas sessões de treino forem registradas.
            </p>
          </div>
        )}

      </div>

      {/* ======================================================================= */}
      {/* 4. TWO-COLUMN GRID: EXERCISE PROGRESSION & PERIOD HIGHLIGHTS            */}
      {/* ======================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Col (7 cols): Progressão por Exercício */}
        <div className="lg:col-span-7 bg-[#121212] border border-[#27272A] rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl flex flex-col justify-between">
          
          <div>
            {/* Header & Exercise Picker */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#27272A] pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-[#374151]" />
                  <h3 className="text-base sm:text-lg font-black font-display uppercase tracking-wide text-white">
                    Progressão por Exercício
                  </h3>
                </div>
                <p className="text-xs text-[#4B5563] mt-0.5">
                  Evolução direta das cargas e repetições executadas
                </p>
              </div>

              {/* Metric Selector for selected exercise */}
              <div className="flex items-center gap-1 bg-[#18181B] p-1 rounded-xl border border-[#27272A] shrink-0">
                {[
                  { id: 'weight', label: 'Carga' },
                  { id: 'volume', label: 'Volume' },
                  { id: 'reps', label: 'Reps' }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setExerciseMetric(m.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wider transition-all ${
                      exerciseMetric === m.id
                        ? 'bg-[#374151] text-white font-black shadow-sm'
                        : 'text-[#4B5563] hover:text-white hover:bg-[#27272A]/60'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Exercise Selector Dropdown */}
            {metrics.availableExercises.length > 0 && (
              <div className="pt-3">
                <label className="text-[11px] uppercase font-bold text-[#4B5563] block mb-1.5">
                  Selecione o exercício treinado:
                </label>
                <div className="relative">
                  <select
                    value={selectedExerciseId}
                    onChange={(e) => setSelectedExerciseId(e.target.value)}
                    className="w-full bg-[#18181B] border border-[#27272A] hover:border-zinc-600 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold appearance-none pr-10 focus:outline-none focus:border-[#374151] transition-all cursor-pointer"
                  >
                    {metrics.availableExercises.map(ex => (
                      <option key={ex.id} value={ex.id} className="bg-[#18181B] text-white">
                        {ex.name} ({ex.muscleGroup}) — {ex.sessionsCount} {ex.sessionsCount === 1 ? 'sessão' : 'sessões'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#4B5563] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Exercise Progression Graph & Indicators */}
            {exerciseProgression && exerciseProgression.points.length > 0 ? (
              <div className="space-y-4 pt-3">
                
                {/* Line chart: progressão por exercício */}
                <div className="relative h-44 sm:h-48 px-1 pt-4">
                  {(() => {
                    const points = exerciseProgression.points.map((pt, idx) => {
                      const value = exerciseMetric === 'volume' ? pt.volume :
                        exerciseMetric === 'reps' ? pt.reps : pt.weight;
                      const values = exerciseProgression.points.map((item) =>
                        exerciseMetric === 'volume' ? item.volume :
                        exerciseMetric === 'reps' ? item.reps : item.weight
                      );
                      const maxVal = Math.max(...values, 1);
                      return {
                        pt, value,
                        x: 24 + (idx * 552) / Math.max(1, exerciseProgression.points.length - 1),
                        y: 145 - (value / maxVal) * 105,
                      };
                    });
                    const linePath = points.reduce((path, point, idx) => {
                      if (idx === 0) return `M ${point.x} ${point.y}`;
                      const previous = points[idx - 1];
                      return `${path} Q ${(previous.x + point.x) / 2} ${previous.y} ${point.x} ${point.y}`;
                    }, '');
                    const areaPath = points.length
                      ? `${linePath} L ${points[points.length - 1].x} 164 L ${points[0].x} 164 Z`
                      : '';
                    return (
                      <>
                        <div className="absolute inset-x-2 top-4 bottom-7 flex flex-col justify-between pointer-events-none">
                          {[0, 1, 2].map((line) => <div key={line} className="border-t border-dashed border-[#303036]" />)}
                        </div>
                        <svg viewBox="0 0 600 190" role="img" aria-label="Gráfico em linha da progressão do exercício" className="relative h-full w-full overflow-visible">
                          <defs>
                            <linearGradient id="tfive-exercise-line" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#6B7280" />
                              <stop offset="100%" stopColor="#E5E7EB" />
                            </linearGradient>
                            <linearGradient id="tfive-exercise-area" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#6B7280" stopOpacity=".28" />
                              <stop offset="100%" stopColor="#6B7280" stopOpacity="0" />
                            </linearGradient>
                            <filter id="tfive-exercise-glow"><feGaussianBlur stdDeviation="3.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                          </defs>
                          <path d={areaPath} fill="url(#tfive-exercise-area)" />
                          <path d={linePath} fill="none" stroke="url(#tfive-exercise-line)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#tfive-exercise-glow)" />
                          {points.map((point, idx) => {
                            const active = hoveredPointIndex === idx;
                            return (
                              <g key={point.pt.sessionId + '_' + idx}
                                className="cursor-pointer"
                                onMouseEnter={() => setHoveredPointIndex(idx)}
                                onMouseLeave={() => setHoveredPointIndex(null)}
                                onClick={() => setHoveredPointIndex(active ? null : idx)}>
                                <circle cx={point.x} cy={point.y} r={active ? 10 : 7} fill="#D1D5DB" opacity=".10" />
                                <circle cx={point.x} cy={point.y} r={active ? 5 : 3.5} fill="#F9FAFB" stroke="#9CA3AF" strokeWidth="2" />
                                <text x={point.x} y={Math.max(13, point.y - 12)} textAnchor="middle" fill="#E5E7EB" fontSize="10" fontWeight="700">{point.value}</text>
                                <text x={point.x} y="184" textAnchor="middle" fill="#71717A" fontSize="9">{point.pt.date}</text>
                              </g>
                            );
                          })}
                        </svg>
                        {hoveredPointIndex !== null && exerciseProgression.points[hoveredPointIndex] && (
                          <div className="absolute left-2 top-0 z-20 rounded-lg border border-[#3F3F46] bg-[#18181B] px-3 py-2 text-[11px] text-[#E5E7EB] shadow-xl pointer-events-none">
                            <strong className="block text-white">Sessão em {exerciseProgression.points[hoveredPointIndex].date}</strong>
                            <span>{exerciseProgression.points[hoveredPointIndex].weight} kg × {exerciseProgression.points[hoveredPointIndex].reps} reps · Volume {formatWeight(exerciseProgression.points[hoveredPointIndex].volume)}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* 5 Key Objective Indicators */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-2.5 text-center">
                    <span className="text-[10px] text-[#4B5563] uppercase font-bold block">INICIAL</span>
                    <p className="text-sm sm:text-base font-black font-mono-nums text-white mt-0.5">
                      {exerciseProgression.initialWeight} kg
                    </p>
                  </div>

                  <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-2.5 text-center">
                    <span className="text-[10px] text-[#4B5563] uppercase font-bold block">ATUAL</span>
                    <p className="text-sm sm:text-base font-black font-mono-nums text-white mt-0.5">
                      {exerciseProgression.currentWeight} kg
                    </p>
                  </div>

                  <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-2.5 text-center">
                    <span className="text-[10px] text-[#4B5563] uppercase font-bold block">DIFERENÇA</span>
                    <p className={`text-sm sm:text-base font-black font-mono-nums mt-0.5 ${
                      exerciseProgression.differenceWeight > 0 ? 'text-emerald-400' : 'text-[#4B5563]'
                    }`}>
                      {exerciseProgression.differenceWeight > 0 ? `+${exerciseProgression.differenceWeight}` : exerciseProgression.differenceWeight} kg
                    </p>
                  </div>

                  <div className="bg-[#18181B] border border-[#D1D5DB] rounded-xl p-2.5 text-center">
                    <span className="text-[10px] text-[#374151] uppercase font-bold block">MELHOR MARCA</span>
                    <p className="text-sm sm:text-base font-black font-mono-nums text-[#374151] mt-0.5 truncate">
                      {exerciseProgression.bestWeight} kg
                    </p>
                  </div>

                  <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-2.5 text-center col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-[#4B5563] uppercase font-bold block">SESSÕES</span>
                    <p className="text-sm sm:text-base font-black font-mono-nums text-white mt-0.5">
                      {exerciseProgression.totalSessionsInPeriod}
                    </p>
                  </div>
                </div>

              </div>
            ) : (
              <div className="py-8 px-4 text-center text-xs text-[#4B5563] bg-[#18181B] rounded-xl border border-[#27272A] mt-3">
                SEM DADOS NO PERÍODO PARA ESTE EXERCÍCIO
              </div>
            )}
          </div>

        </div>

        {/* Right Col (5 cols): Destaques do Período */}
        <div className="lg:col-span-5 bg-[#121212] border border-[#27272A] rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
          
          <div className="border-b border-[#27272A] pb-3.5">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#374151]" />
              <h3 className="text-base sm:text-lg font-black font-display uppercase tracking-wide text-white">
                Destaques do Período
              </h3>
            </div>
            <p className="text-xs text-[#4B5563] mt-0.5">
              Eventos calculáveis e progressões registradas
            </p>
          </div>

          {/* Highlights Counters */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-3">
              <span className="text-[10px] text-[#4B5563] uppercase font-bold block">PROGRESSÕES DE CARGA</span>
              <p className="text-xl font-black font-mono-nums text-white mt-0.5">
                {metrics.topProgressions.length}
              </p>
            </div>
            <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-3">
              <span className="text-[10px] text-[#4B5563] uppercase font-bold block">NOVOS RECORDES (PR)</span>
              <p className="text-xl font-black font-mono-nums text-[#374151] mt-0.5">
                {metrics.newPRsCount}
              </p>
            </div>
          </div>

          {/* Top Progressions List */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] uppercase font-bold tracking-wider text-[#4B5563] block">
              Maiores Evoluções de Carga (1ª vs Última Sessão):
            </span>

            {metrics.topProgressions.length > 0 ? (
              <div className="space-y-2">
                {metrics.topProgressions.map((prog, idx) => (
                  <div 
                    key={prog.exerciseId}
                    className="bg-[#18181B] border border-[#27272A] rounded-xl p-3 flex items-center justify-between hover:border-zinc-700 transition-all"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="w-4 h-4 rounded-full bg-[#27272A] text-[#4B5563] text-[10px] font-mono-nums font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-white truncate block">
                          {prog.exerciseName}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#71717A] block">
                        {prog.muscleGroup} • {prog.initialWeight} kg → <strong className="text-white">{prog.currentWeight} kg</strong>
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-black font-mono-nums text-emerald-400 block">
                        +{prog.weightDelta} kg
                      </span>
                      {prog.percentDelta > 0 && (
                        <span className="text-[10px] font-mono-nums text-[#71717A]">
                          +{prog.percentDelta}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-[#71717A] bg-[#18181B] rounded-xl border border-[#27272A]">
                Nenhuma progressão de carga registrada no período selecionado.
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ======================================================================= */}
      {/* 5. TWO-COLUMN GRID: MUSCLE DISTRIBUTION & CONSISTENCY                   */}
      {/* ======================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Col (6 cols): Distribuição do Treino (Por Grupo Muscular) */}
        <div className="lg:col-span-6 bg-[#121212] border border-[#27272A] rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
          
          <div className="border-b border-[#27272A] pb-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#374151]" />
                <h3 className="text-base sm:text-lg font-black font-display uppercase tracking-wide text-white">
                  Distribuição do Treino
                </h3>
              </div>
              <p className="text-xs text-[#4B5563] mt-0.5">
                Volume acumulado proporcional por grupo muscular
              </p>
            </div>
            <span className="text-[11px] text-[#71717A] font-mono-nums">
              {metrics.muscleDistribution.length} grupos
            </span>
          </div>

          {metrics.muscleDistribution.length > 0 ? (
            <div className="space-y-2 pt-1">
              <svg viewBox={`0 0 ${Math.max(320, metrics.muscleDistribution.length * 76)} 190`} role="img" aria-label="Gráfico em linha da distribuição por grupo muscular" className="h-48 w-full overflow-visible">
                {(() => {
                  const items = metrics.muscleDistribution;
                  const width = Math.max(320, items.length * 76);
                  const max = Math.max(1, ...items.map((item) => item.percentage));
                  const pts = items.map((item, idx) => ({
                    item,
                    x: 28 + idx * ((width - 56) / Math.max(1, items.length - 1)),
                    y: 142 - (item.percentage / max) * 105,
                  }));
                  const path = pts.reduce((d, point, idx) => {
                    if (idx === 0) return `M ${point.x} ${point.y}`;
                    const prev = pts[idx - 1];
                    return `${d} Q ${(prev.x + point.x) / 2} ${prev.y} ${point.x} ${point.y}`;
                  }, '');
                  return (
                    <>
                      {[0, 1, 2].map((line) => <line key={line} x1="10" x2={width - 10} y1={38 + line * 48} y2={38 + line * 48} stroke="#303036" strokeDasharray="4 5" />)}
                      <path d={path} fill="none" stroke="#D1D5DB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      {pts.map((point) => (
                        <g key={point.item.muscleGroup}>
                          <circle cx={point.x} cy={point.y} r="4" fill="#F9FAFB" stroke="#9CA3AF" strokeWidth="2" />
                          <text x={point.x} y={point.y - 12} textAnchor="middle" fill="#E5E7EB" fontSize="10" fontWeight="700">{point.item.percentage}%</text>
                          <text x={point.x} y="166" textAnchor="middle" fill="#A1A1AA" fontSize="9">{point.item.muscleGroup.slice(0, 10)}</text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
              <p className="text-[10px] text-[#71717A] text-center">Participação percentual do volume por grupo muscular</p>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[#71717A] bg-[#18181B] rounded-xl border border-[#27272A]">
              SEM DADOS NO PERÍODO
            </div>
          )}

        </div>

        {/* Right Col (6 cols): Consistência & Frequência */}
        <div className="lg:col-span-6 bg-[#121212] border border-[#27272A] rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
          
          <div className="border-b border-[#27272A] pb-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#374151]" />
                <h3 className="text-base sm:text-lg font-black font-display uppercase tracking-wide text-white">
                  Consistência Semanal
                </h3>
              </div>
              <p className="text-xs text-[#4B5563] mt-0.5">
                Regularidade e frequência de treino ao longo do período
              </p>
            </div>
            <span className="text-[11px] text-[#4B5563] font-mono-nums font-bold">
              {metrics.weeklyFrequency.current}x / sem
            </span>
          </div>

          {/* Consistency Metrics Bar */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-3">
              <span className="text-[10px] text-[#4B5563] uppercase font-bold block">SEMANAS ATIVAS</span>
              <p className="text-lg sm:text-xl font-black font-mono-nums text-white mt-0.5">
                {metrics.weeksWithWorkoutCount} de {metrics.totalWeeksInPeriod} semanas
              </p>
            </div>
            <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-3">
              <span className="text-[10px] text-[#4B5563] uppercase font-bold block">SEQUÊNCIA CONSECUTIVA</span>
              <p className="text-lg sm:text-xl font-black font-mono-nums text-emerald-400 mt-0.5">
                {metrics.consecutiveWeeksActive} {metrics.consecutiveWeeksActive === 1 ? 'semana' : 'semanas'}
              </p>
            </div>
          </div>

          {/* Visual Weekly Grid */}
          {metrics.weeklyBuckets.length > 0 ? (
            <div className="space-y-2 pt-1">
              <span className="text-[11px] uppercase font-bold tracking-wider text-[#4B5563] block">
                Histórico Semana a Semana:
              </span>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
                {metrics.weeklyBuckets.map((bucket, i) => (
                  <div
                    key={bucket.weekKey}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      bucket.hasWorkout
                        ? 'bg-[#27272A] border-[#3F3F46] text-[#E5E7EB]'
                        : 'bg-[#18181B] border-[#27272A] text-[#71717A]'
                    }`}
                  >
                    <div className="min-w-0 pr-1">
                      <span className="text-[10px] text-[#4B5563] block truncate">
                        {bucket.weekLabel}
                      </span>
                      <span className={`text-xs font-bold font-mono-nums ${
                        bucket.hasWorkout ? 'text-[#E5E7EB]' : 'text-[#71717A]'
                      }`}>
                        {bucket.sessionsCount} {bucket.sessionsCount === 1 ? 'treino' : 'treinos'}
                      </span>
                    </div>

                    <div className="shrink-0">
                      {bucket.hasWorkout ? (
                        <div className="flex gap-0.5">
                          {Array.from({ length: Math.min(bucket.sessionsCount, 5) }).map((_, dotIdx) => (
                            <span key={dotIdx} className="w-2 h-2 rounded-full bg-[#D1D5DB]" />
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#52525B]">Sem treino</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-[#71717A] bg-[#18181B] rounded-xl border border-[#27272A]">
              SEM DADOS NO PERÍODO
            </div>
          )}

        </div>

      </div>

      {/* ======================================================================= */}
      {/* 6. TWO-COLUMN GRID: PRs DO PERÍODO & EXERCÍCIOS MAIS REALIZADOS         */}
      {/* ======================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Col (6 cols): PRs do Período */}
        <div className="lg:col-span-6 bg-[#121212] border border-[#27272A] rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
          
          <div className="border-b border-[#27272A] pb-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#374151]" />
                <h3 className="text-base sm:text-lg font-black font-display uppercase tracking-wide text-white">
                  PRs do Período
                </h3>
              </div>
              <p className="text-xs text-[#4B5563] mt-0.5">
                Recordes pessoais alcançados nas sessões deste intervalo
              </p>
            </div>
            <span className="text-xs font-black font-mono-nums text-[#374151]">
              {metrics.periodPRs.length} PRs
            </span>
          </div>

          {metrics.periodPRs.length > 0 ? (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {metrics.periodPRs.map((pr) => (
                <div 
                  key={pr.id}
                  className="bg-[#18181B] border border-[#27272A] rounded-xl p-3 flex items-center justify-between hover:border-[#374151]/50 transition-all"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-xs font-bold text-white block truncate">
                      {pr.exerciseName}
                    </span>
                    <span className="text-[10px] text-[#4B5563] block">
                      {pr.date} • {pr.muscleGroup}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black font-mono-nums text-[#374151] block">
                      {pr.weightKg > 0 ? `${pr.weightKg} kg × ${pr.reps}` : pr.metricLabel}
                    </span>
                    {pr.estimated1RM !== undefined && pr.estimated1RM > 0 && (
                      <span className="text-[10px] text-[#71717A] font-mono-nums block">
                        1RM: {pr.estimated1RM} kg
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center space-y-1 bg-[#18181B] rounded-xl border border-[#27272A]">
              <p className="text-xs font-bold text-white uppercase">
                NENHUM PR REGISTRADO NESTE PERÍODO
              </p>
              <p className="text-[11px] text-[#71717A]">
                Novos recordes serão destacados automaticamente ao superar marcas anteriores.
              </p>
            </div>
          )}

        </div>

        {/* Right Col (6 cols): Exercícios Mais Realizados */}
        <div className="lg:col-span-6 bg-[#121212] border border-[#27272A] rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
          
          <div className="border-b border-[#27272A] pb-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#374151]" />
                <h3 className="text-base sm:text-lg font-black font-display uppercase tracking-wide text-white">
                  Exercícios Mais Realizados
                </h3>
              </div>
              <p className="text-xs text-[#4B5563] mt-0.5">
                Exercícios com maior número de sessões no período
              </p>
            </div>
          </div>

          {metrics.mostPerformedExercises.length > 0 ? (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {metrics.mostPerformedExercises.map((ex, idx) => (
                <div 
                  key={ex.exerciseId}
                  className="bg-[#18181B] border border-[#27272A] rounded-xl p-3 flex items-center justify-between hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className="w-5 h-5 rounded-lg bg-[#27272A] text-white text-[11px] font-mono-nums font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate">
                        {ex.exerciseName}
                      </span>
                      <span className="text-[10px] text-[#71717A] block">
                        {ex.muscleGroup} • {ex.totalSets} séries totais
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold font-mono-nums text-white block">
                      {ex.sessionsCount} {ex.sessionsCount === 1 ? 'sessão' : 'sessões'}
                    </span>
                    {ex.totalVolume > 0 && (
                      <span className="text-[10px] text-[#4B5563] font-mono-nums block">
                        {formatWeight(ex.totalVolume)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-[#71717A] bg-[#18181B] rounded-xl border border-[#27272A]">
              SEM DADOS NO PERÍODO
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
