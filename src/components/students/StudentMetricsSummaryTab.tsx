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
        <span className="text-[10px] text-slate-400">
          {selectedPeriod === 'all' ? 'Histórico total' : 'Sem período anterior para comparar'}
        </span>
      );
    }

    if (delta === 0 || percentChange === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono-nums font-bold text-slate-500">
          <Minus className="w-3 h-3 text-slate-400" />
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
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span className="text-xs uppercase font-black tracking-wider text-slate-500">
              RESUMO DE PERFORMANCE & ANÁLISE DE EVOLUÇÃO
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black font-display text-[#172B4D]">
            {metrics.dateRange.label}
          </h2>
        </div>

        {/* Compact Period Switcher */}
        <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0] shrink-0 self-start sm:self-center">
          {(['30d', '90d', '6m', '1y', 'all'] as MetricsPeriod[]).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setSelectedPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono-nums tracking-wider uppercase transition-all ${
                selectedPeriod === p
                  ? 'bg-blue-600 text-white shadow-sm font-black'
                  : 'text-slate-500 hover:text-blue-700 hover:bg-[#27272A]/60'
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
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold tracking-wider uppercase text-[11px]">TREINOS CONCLUÍDOS</span>
            <Flame className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black font-display text-[#172B4D] font-mono-nums">
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
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold tracking-wider uppercase text-[11px]">TREINOS / SEMANA</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black font-display text-[#172B4D] font-mono-nums">
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
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold tracking-wider uppercase text-[11px]">VOLUME MÉDIO / SESSÃO</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black font-display text-[#172B4D] font-mono-nums">
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
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold tracking-wider uppercase text-[11px]">PROGRESSÕES DE CARGA</span>
            <Trophy className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black font-display text-blue-600 font-mono-nums">
              {metrics.totalProgressionsCount}
            </p>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Em {metrics.distinctExercisesCount} {metrics.distinctExercisesCount === 1 ? 'exercício treinado' : 'exercícios treinados'}
            </p>
          </div>
        </div>

      </div>

      {/* ======================================================================= */}
      {/* 3. MAIN CHART: EVOLUÇÃO DO TREINAMENTO                                  */}
      {/* ======================================================================= */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-sm">
        
        {/* Main Chart Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <h3 className="text-base sm:text-lg font-black font-display uppercase tracking-wide text-[#172B4D]">
                Evolução do Treinamento
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Consistência temporal semana a semana no período selecionado
            </p>
          </div>

          {/* Metric Selector Buttons */}
          <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0] shrink-0 self-start sm:self-center">
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
                    : 'text-slate-500 hover:text-blue-700 hover:bg-[#27272A]/60'
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
            
            {/* Chart Canvas Area */}
            <div className="h-56 sm:h-64 pt-6 pb-2 px-2 flex items-end gap-2 sm:gap-4 border-b border-[#E2E8F0] relative">
              
              {/* Max value calculation */}
              {(() => {
                const values = metrics.weeklyBuckets.map(b => {
                  if (mainChartMetric === 'volume') return b.totalVolume;
                  if (mainChartMetric === 'sets') return b.totalSets;
                  return b.sessionsCount;
                });
                const maxVal = Math.max(...values, 1);

                return metrics.weeklyBuckets.map((bucket, idx) => {
                  let val = bucket.sessionsCount;
                  let suffix = ' treinos';
                  if (mainChartMetric === 'volume') {
                    val = bucket.totalVolume;
                    suffix = ' kg';
                  } else if (mainChartMetric === 'sets') {
                    val = bucket.totalSets;
                    suffix = ' séries';
                  }

                  const heightPercent = val > 0 ? Math.max(15, Math.round((val / maxVal) * 100)) : 4;
                  const isHovered = hoveredWeeklyIndex === idx;

                  return (
                    <div
                      key={bucket.weekKey}
                      className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                      onMouseEnter={() => setHoveredWeeklyIndex(idx)}
                      onMouseLeave={() => setHoveredWeeklyIndex(null)}
                      onClick={() => setHoveredWeeklyIndex(isHovered ? null : idx)}
                    >
                      {/* Value label on top */}
                      <span className={`text-[10px] sm:text-xs font-mono-nums font-bold mb-1 transition-all ${
                        isHovered ? 'text-[#172B4D] font-black scale-110' : 'text-slate-400 group-hover:text-blue-700'
                      }`}>
                        {val > 0 ? (mainChartMetric === 'volume' ? formatWeight(val) : val) : '—'}
                      </span>

                      {/* Bar */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full max-w-[48px] rounded-t-lg transition-all ${
                          val > 0
                            ? isHovered
                              ? 'bg-blue-600 brightness-125 shadow-lg shadow-xs'
                              : 'bg-blue-600/80 group-hover:bg-slate-200'
                            : 'bg-[#27272A]/40 border-dashed border-t border-zinc-700'
                        }`}
                      />

                      {/* Tooltip Card (touch / hover) */}
                      {isHovered && (
                        <div className="absolute bottom-full mb-8 z-30 bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl p-3 shadow-lg min-w-[170px] pointer-events-none text-left animate-in fade-in zoom-in-95">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block border-b border-[#E2E8F0] pb-1 mb-1.5">
                            Semana: {bucket.weekLabel}
                          </span>
                          <div className="space-y-1 text-xs font-mono-nums">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-500">Treinos:</span>
                              <strong className="text-[#172B4D]">{bucket.sessionsCount}</strong>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-500">Séries Válidas:</span>
                              <strong className="text-[#172B4D]">{bucket.totalSets}</strong>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-500">Volume Total:</span>
                              <strong className="text-blue-600">{formatWeight(bucket.totalVolume)}</strong>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* X-Axis Labels (Weekly Dates) */}
            <div className="flex items-center justify-between px-2 text-[10px] text-slate-400 font-mono-nums overflow-x-auto">
              <span>{metrics.weeklyBuckets[0]?.weekLabel.split(' a ')[0]}</span>
              <span className="text-center">Linha Temporal Semanal</span>
              <span>{metrics.weeklyBuckets[metrics.weeklyBuckets.length - 1]?.weekLabel.split(' a ')[1]}</span>
            </div>

          </div>
        ) : (
          <div className="py-12 px-4 text-center space-y-2 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
            <Info className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-[#172B4D] uppercase tracking-wide">
              AINDA NÃO HÁ DADOS SUFICIENTES
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
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
        <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-sm flex flex-col justify-between">
          
          <div>
            {/* Header & Exercise Picker */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-blue-600" />
                  <h3 className="text-base sm:text-lg font-black font-display uppercase tracking-wide text-[#172B4D]">
                    Progressão por Exercício
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Evolução direta das cargas e repetições executadas
                </p>
              </div>

              {/* Metric Selector for selected exercise */}
              <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0] shrink-0">
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
                        ? 'bg-blue-600 text-white font-black shadow-sm'
                        : 'text-slate-500 hover:text-blue-700 hover:bg-[#27272A]/60'
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
                <label className="text-[11px] uppercase font-bold text-slate-500 block mb-1.5">
                  Selecione o exercício treinado:
                </label>
                <div className="relative">
                  <select
                    value={selectedExerciseId}
                    onChange={(e) => setSelectedExerciseId(e.target.value)}
                    className="w-full bg-[#F1F5F9] border border-[#E2E8F0] hover:border-zinc-600 rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] font-bold appearance-none pr-10 focus:outline-none focus:border-[#BFDBFE] transition-all cursor-pointer"
                  >
                    {metrics.availableExercises.map(ex => (
                      <option key={ex.id} value={ex.id} className="bg-[#F1F5F9] text-[#172B4D]">
                        {ex.name} ({ex.muscleGroup}) — {ex.sessionsCount} {ex.sessionsCount === 1 ? 'sessão' : 'sessões'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Exercise Progression Graph & Indicators */}
            {exerciseProgression && exerciseProgression.points.length > 0 ? (
              <div className="space-y-4 pt-3">
                
                {/* Exercise Chart Canvas */}
                <div className="h-44 sm:h-48 pt-6 pb-2 px-2 flex items-end gap-2 sm:gap-3 border-b border-[#E2E8F0] relative">
                  {(() => {
                    const values = exerciseProgression.points.map(pt => {
                      if (exerciseMetric === 'volume') return pt.volume;
                      if (exerciseMetric === 'reps') return pt.reps;
                      return pt.weight;
                    });
                    const maxVal = Math.max(...values, 1);

                    return exerciseProgression.points.map((pt, idx) => {
                      let displayVal = pt.weight;
                      let suffix = ' kg';
                      if (exerciseMetric === 'volume') {
                        displayVal = pt.volume;
                        suffix = ' kg';
                      } else if (exerciseMetric === 'reps') {
                        displayVal = pt.reps;
                        suffix = ' reps';
                      }

                      const heightPercent = displayVal > 0 ? Math.max(18, Math.round((displayVal / maxVal) * 100)) : 10;
                      const isHovered = hoveredPointIndex === idx;

                      return (
                        <div
                          key={pt.sessionId + '_' + idx}
                          className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                          onMouseEnter={() => setHoveredPointIndex(idx)}
                          onMouseLeave={() => setHoveredPointIndex(null)}
                          onClick={() => setHoveredPointIndex(isHovered ? null : idx)}
                        >
                          <span className={`text-[10px] sm:text-xs font-mono-nums font-bold mb-1 transition-all ${
                            isHovered ? 'text-[#172B4D] font-black scale-110' : 'text-slate-400 group-hover:text-blue-700'
                          }`}>
                            {displayVal > 0 ? `${displayVal}` : '—'}
                          </span>

                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full max-w-[36px] rounded-t-lg transition-all ${
                              isHovered
                                ? 'bg-white shadow-lg shadow-white/30'
                                : 'bg-blue-600 group-hover:brightness-125'
                            }`}
                          />

                          <span className="text-[9px] text-slate-400 font-mono-nums mt-1.5 truncate max-w-[36px]">
                            {pt.date}
                          </span>

                          {/* Exercise Point Tooltip */}
                          {isHovered && (
                            <div className="absolute bottom-full mb-8 z-30 bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl p-2.5 shadow-lg min-w-[150px] pointer-events-none text-left animate-in fade-in">
                              <span className="text-[10px] font-bold text-slate-500 block border-b border-[#E2E8F0] pb-1 mb-1 font-mono-nums">
                                Sessão em {pt.date}
                              </span>
                              <div className="space-y-0.5 text-xs font-mono-nums">
                                <div className="text-[#172B4D] font-bold">
                                  Carga: {pt.weight} kg × {pt.reps} reps
                                </div>
                                <div className="text-slate-500 text-[11px]">
                                  Volume: {formatWeight(pt.volume)}
                                </div>
                                {pt.estimated1RM > 0 && (
                                  <div className="text-blue-600 text-[11px] font-bold">
                                    1RM Est: {pt.estimated1RM} kg
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* 5 Key Objective Indicators */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl p-2.5 text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">INICIAL</span>
                    <p className="text-sm sm:text-base font-black font-mono-nums text-[#172B4D] mt-0.5">
                      {exerciseProgression.initialWeight} kg
                    </p>
                  </div>

                  <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl p-2.5 text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">ATUAL</span>
                    <p className="text-sm sm:text-base font-black font-mono-nums text-[#172B4D] mt-0.5">
                      {exerciseProgression.currentWeight} kg
                    </p>
                  </div>

                  <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl p-2.5 text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">DIFERENÇA</span>
                    <p className={`text-sm sm:text-base font-black font-mono-nums mt-0.5 ${
                      exerciseProgression.differenceWeight > 0 ? 'text-emerald-400' : 'text-slate-500'
                    }`}>
                      {exerciseProgression.differenceWeight > 0 ? `+${exerciseProgression.differenceWeight}` : exerciseProgression.differenceWeight} kg
                    </p>
                  </div>

                  <div className="bg-[#F1F5F9] border border-[#D1D5DB] rounded-xl p-2.5 text-center">
                    <span className="text-[10px] text-blue-600 uppercase font-bold block">MELHOR MARCA</span>
                    <p className="text-sm sm:text-base font-black font-mono-nums text-blue-600 mt-0.5 truncate">
                      {exerciseProgression.bestWeight} kg
                    </p>
                  </div>

                  <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl p-2.5 text-center col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">SESSÕES</span>
                    <p className="text-sm sm:text-base font-black font-mono-nums text-[#172B4D] mt-0.5">
                      {exerciseProgression.totalSessionsInPeriod}
                    </p>
                  </div>
                </div>

              </div>
            ) : (
              <div className="py-8 px-4 text-center text-xs text-slate-500 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0] mt-3">
                SEM DADOS NO PERÍODO PARA ESTE EXERCÍCIO
              </div>
            )}
          </div>

        </div>

        {/* Right Col (5 cols): Destaques do Período */}
        <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-sm">
          
          <div className="border-b border-[#E2E8F0] pb-3.5">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-blue-600" />
              <h3 className="text-base sm:text-lg font-black font-display uppercase tracking-wide text-[#172B4D]">
                Destaques do Período
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Eventos calculáveis e progressões registradas
            </p>
          </div>

          {/* Highlights Counters */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl p-3">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">PROGRESSÕES DE CARGA</span>
              <p className="text-xl font-black font-mono-nums text-[#172B4D] mt-0.5">
                {metrics.topProgressions.length}
              </p>
            </div>
            <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl p-3">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">NOVOS RECORDES (PR)</span>
              <p className="text-xl font-black font-mono-nums text-blue-600 mt-0.5">
                {metrics.newPRsCount}
              </p>
            </div>
          </div>

          {/* Top Progressions List */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500 block">
              Maiores Evoluções de Carga (1ª vs Última Sessão):
            </span>

            {metrics.topProgressions.length > 0 ? (
              <div className="space-y-2">
                {metrics.topProgressions.map((prog, idx) => (
                  <div 
                    key={prog.exerciseId}
                    className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl p-3 flex items-center justify-between hover:border-zinc-700 transition-all"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="w-4 h-4 rounded-full bg-[#27272A] text-slate-500 text-[10px] font-mono-nums font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-[#172B4D] truncate block">
                          {prog.exerciseName}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        {prog.muscleGroup} • {prog.initialWeight} kg → <strong className="text-[#172B4D]">{prog.currentWeight} kg</strong>
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-black font-mono-nums text-emerald-400 block">
                        +{prog.weightDelta} kg
                      </span>
                      {prog.percentDelta > 0 && (
                        <span className="text-[10px] font-mono-nums text-slate-400">
                          +{prog.percentDelta}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0]">
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
        <div className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-sm">
          
          <div className="border-b border-[#E2E8F0] pb-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <h3 className="text-base sm:text-lg font-black font-display uppercase tracking-wide text-[#172B4D]">
                  Distribuição do Treino
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Volume acumulado proporcional por grupo muscular
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-mono-nums">
              {metrics.muscleDistribution.length} grupos
            </span>
          </div>

          {metrics.muscleDistribution.length > 0 ? (
            <div className="space-y-3 pt-1">
              {metrics.muscleDistribution.map((m) => (
                <div key={m.muscleGroup} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-[#172B4D]">{m.muscleGroup}</span>
                    <div className="flex items-center gap-2 font-mono-nums text-[11px]">
                      <span className="text-slate-500">{formatWeight(m.totalVolume)}</span>
                      <span className="text-blue-600 w-10 text-right">{m.percentage}%</span>
                    </div>
                  </div>
                  {/* Horizontal Bar */}
                  <div className="w-full h-2 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] overflow-hidden">
                    <div
                      style={{ width: `${Math.max(4, m.percentage)}%` }}
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0]">
              SEM DADOS NO PERÍODO
            </div>
          )}

        </div>

        {/* Right Col (6 cols): Consistência & Frequência */}
        <div className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-sm">
          
          <div className="border-b border-[#E2E8F0] pb-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h3 className="text-base sm:text-lg font-black font-display uppercase tracking-wide text-[#172B4D]">
                  Consistência Semanal
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Regularidade e frequência de treino ao longo do período
              </p>
            </div>
            <span className="text-[11px] text-slate-500 font-mono-nums font-bold">
              {metrics.weeklyFrequency.current}x / sem
            </span>
          </div>

          {/* Consistency Metrics Bar */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl p-3">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">SEMANAS ATIVAS</span>
              <p className="text-lg sm:text-xl font-black font-mono-nums text-[#172B4D] mt-0.5">
                {metrics.weeksWithWorkoutCount} de {metrics.totalWeeksInPeriod} semanas
              </p>
            </div>
            <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl p-3">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">SEQUÊNCIA CONSECUTIVA</span>
              <p className="text-lg sm:text-xl font-black font-mono-nums text-emerald-400 mt-0.5">
                {metrics.consecutiveWeeksActive} {metrics.consecutiveWeeksActive === 1 ? 'semana' : 'semanas'}
              </p>
            </div>
          </div>

          {/* Visual Weekly Grid */}
          {metrics.weeklyBuckets.length > 0 ? (
            <div className="space-y-2 pt-1">
              <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500 block">
                Histórico Semana a Semana:
              </span>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
                {metrics.weeklyBuckets.map((bucket, i) => (
                  <div
                    key={bucket.weekKey}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      bucket.hasWorkout
                        ? 'bg-[#F1F5F9] border-[#E2E8F0] text-[#172B4D]'
                        : 'bg-white border-zinc-800/60 text-slate-400'
                    }`}
                  >
                    <div className="min-w-0 pr-1">
                      <span className="text-[10px] text-slate-500 block truncate">
                        {bucket.weekLabel}
                      </span>
                      <span className={`text-xs font-bold font-mono-nums ${
                        bucket.hasWorkout ? 'text-[#172B4D]' : 'text-slate-500'
                      }`}>
                        {bucket.sessionsCount} {bucket.sessionsCount === 1 ? 'treino' : 'treinos'}
                      </span>
                    </div>

                    <div className="shrink-0">
                      {bucket.hasWorkout ? (
                        <div className="flex gap-0.5">
                          {Array.from({ length: Math.min(bucket.sessionsCount, 5) }).map((_, dotIdx) => (
                            <span key={dotIdx} className="w-2 h-2 rounded-full bg-blue-600" />
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500">Sem treino</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-400 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0]">
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
        <div className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-sm">
          
          <div className="border-b border-[#E2E8F0] pb-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-blue-600" />
                <h3 className="text-base sm:text-lg font-black font-display uppercase tracking-wide text-[#172B4D]">
                  PRs do Período
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Recordes pessoais alcançados nas sessões deste intervalo
              </p>
            </div>
            <span className="text-xs font-black font-mono-nums text-blue-600">
              {metrics.periodPRs.length} PRs
            </span>
          </div>

          {metrics.periodPRs.length > 0 ? (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {metrics.periodPRs.map((pr) => (
                <div 
                  key={pr.id}
                  className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl p-3 flex items-center justify-between hover:border-[#BFDBFE]/50 transition-all"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-xs font-bold text-[#172B4D] block truncate">
                      {pr.exerciseName}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {pr.date} • {pr.muscleGroup}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black font-mono-nums text-blue-600 block">
                      {pr.weightKg > 0 ? `${pr.weightKg} kg × ${pr.reps}` : pr.metricLabel}
                    </span>
                    {pr.estimated1RM !== undefined && pr.estimated1RM > 0 && (
                      <span className="text-[10px] text-slate-400 font-mono-nums block">
                        1RM: {pr.estimated1RM} kg
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center space-y-1 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0]">
              <p className="text-xs font-bold text-[#172B4D] uppercase">
                NENHUM PR REGISTRADO NESTE PERÍODO
              </p>
              <p className="text-[11px] text-slate-400">
                Novos recordes serão destacados automaticamente ao superar marcas anteriores.
              </p>
            </div>
          )}

        </div>

        {/* Right Col (6 cols): Exercícios Mais Realizados */}
        <div className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-sm">
          
          <div className="border-b border-[#E2E8F0] pb-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <h3 className="text-base sm:text-lg font-black font-display uppercase tracking-wide text-[#172B4D]">
                  Exercícios Mais Realizados
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Exercícios com maior número de sessões no período
              </p>
            </div>
          </div>

          {metrics.mostPerformedExercises.length > 0 ? (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {metrics.mostPerformedExercises.map((ex, idx) => (
                <div 
                  key={ex.exerciseId}
                  className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl p-3 flex items-center justify-between hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className="w-5 h-5 rounded-lg bg-[#27272A] text-[#172B4D] text-[11px] font-mono-nums font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#172B4D] block truncate">
                        {ex.exerciseName}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {ex.muscleGroup} • {ex.totalSets} séries totais
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold font-mono-nums text-[#172B4D] block">
                      {ex.sessionsCount} {ex.sessionsCount === 1 ? 'sessão' : 'sessões'}
                    </span>
                    {ex.totalVolume > 0 && (
                      <span className="text-[10px] text-slate-500 font-mono-nums block">
                        {formatWeight(ex.totalVolume)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-slate-400 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0]">
              SEM DADOS NO PERÍODO
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
