import React, { useMemo, useState } from "react";
import { Activity, Award, CalendarDays, FileDown, TrendingUp } from "lucide-react";
import { Student, WorkoutSession } from "../../types";
import { calculateEstimated1RM } from "../../utils/calculations";

type Period = "30" | "90" | "180" | "365" | "all";

interface Props {
  student: Student;
  sessions: WorkoutSession[];
}

const PERIODS: { value: Period; label: string; days: number | null }[] = [
  { value: "30", label: "30 dias", days: 30 },
  { value: "90", label: "90 dias", days: 90 },
  { value: "180", label: "6 meses", days: 180 },
  { value: "365", label: "1 ano", days: 365 },
  { value: "all", label: "Todo período", days: null },
];

const validDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value: Date) =>
  value.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

const formatNumber = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { maximumFractionDigits: digits });

export const StudentPerformanceInsightsTab: React.FC<Props> = ({ student, sessions }) => {
  const [period, setPeriod] = useState<Period>("90");
  const now = new Date();
  const periodConfig = PERIODS.find((item) => item.value === period)!;
  const startDate = periodConfig.days === null
    ? null
    : new Date(now.getFullYear(), now.getMonth(), now.getDate() - periodConfig.days + 1);

  const completedSessions = useMemo(() =>
    (sessions || [])
      .filter((session) => session.studentId === student.id && session.status === "completed")
      .map((session) => ({ session, date: validDate(session.startTime) }))
      .filter((item): item is { session: WorkoutSession; date: Date } => !!item.date)
      .sort((a, b) => a.date.getTime() - b.date.getTime()),
  [sessions, student.id]);

  const filteredSessions = useMemo(() =>
    completedSessions.filter(({ date }) => !startDate || date >= startDate),
  [completedSessions, startDate]);

  const exerciseRecords = useMemo(() => {
    const map = new Map<string, {
      key: string; name: string; maxLoad: number; maxReps: number;
      best1RM: number; sessions: number; lastDate: Date;
    }>();
    for (const { session, date } of completedSessions) {
      const seenInSession = new Set<string>();
      for (const set of session.sets || []) {
        if (!set || set.status === "skipped") continue;
        const load = Number(set.weightKg) || 0;
        const reps = Number(set.actualReps) || 0;
        if (load <= 0 || reps <= 0) continue;
        const key = set.exerciseId || (set.exerciseName || "Exercício").trim().toLocaleLowerCase("pt-BR");
        const current = map.get(key);
        const oneRM = calculateEstimated1RM(load, reps);
        if (!current) {
          map.set(key, {
            key, name: set.exerciseName || "Exercício", maxLoad: load, maxReps: reps,
            best1RM: oneRM, sessions: 1, lastDate: date,
          });
        } else {
          current.maxLoad = Math.max(current.maxLoad, load);
          current.maxReps = Math.max(current.maxReps, reps);
          current.best1RM = Math.max(current.best1RM, oneRM);
          if (!seenInSession.has(key)) current.sessions += 1;
          if (date.getTime() > current.lastDate.getTime()) current.lastDate = date;
        }
        seenInSession.add(key);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.best1RM - a.best1RM);
  }, [completedSessions]);

  const filteredExerciseProgress = useMemo(() => {
    const map = new Map<string, { name: string; first: number; latest: number; best: number; points: number }>();
    for (const { session } of filteredSessions) {
      const sessionBestLoads = new Map<string, { name: string; load: number }>();
      for (const set of session.sets || []) {
        if (!set || set.status === "skipped") continue;
        const load = Number(set.weightKg) || 0;
        const reps = Number(set.actualReps) || 0;
        if (load <= 0 || reps <= 0) continue;
        const key = set.exerciseId || (set.exerciseName || "Exercício").trim().toLocaleLowerCase("pt-BR");
        const previous = sessionBestLoads.get(key);
        if (!previous || load > previous.load) {
          sessionBestLoads.set(key, { name: set.exerciseName || "Exercício", load });
        }
      }
      for (const [key, current] of sessionBestLoads) {
        const item = map.get(key);
        if (!item) map.set(key, { name: current.name, first: current.load, latest: current.load, best: current.load, points: 1 });
        else {
          item.latest = current.load;
          item.best = Math.max(item.best, current.load);
          item.points += 1;
        }
      }
    }
    return Array.from(map.values())
      .filter((item) => item.points >= 2)
      .map((item) => ({ ...item, delta: item.first > 0 ? ((item.latest - item.first) / item.first) * 100 : 0 }))
      .sort((a, b) => b.delta - a.delta);
  }, [filteredSessions]);

  const totalVolume = filteredSessions.reduce((sum, { session }) => sum + (Number(session.totalVolume) || 0), 0);
  const trainingDays = new Set(filteredSessions.map(({ date }) =>
    `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  )).size;
  const activeWeeks = periodConfig.days ? Math.max(1, Math.ceil(periodConfig.days / 7)) : Math.max(1, Math.ceil(
    ((now.getTime() - (completedSessions[0]?.date.getTime() || now.getTime())) / 86400000 + 1) / 7
  ));
  const weeklyFrequency = filteredSessions.length / activeWeeks;
  const averageVolume = filteredSessions.length ? totalVolume / filteredSessions.length : 0;

  const weeklyBars = useMemo(() => {
    const weeks: { label: string; count: number; volume: number }[] = [];
    const currentWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    currentWeekStart.setHours(0, 0, 0, 0);
    currentWeekStart.setDate(currentWeekStart.getDate() - ((currentWeekStart.getDay() + 6) % 7));
    const first = new Date(currentWeekStart);
    first.setDate(first.getDate() - 7 * 7);
    for (let i = 0; i < 8; i++) {
      const from = new Date(first);
      from.setDate(first.getDate() + i * 7);
      const to = new Date(from);
      to.setDate(from.getDate() + 7);
      const matches = completedSessions.filter(({ date }) => date >= from && date < to);
      weeks.push({
        label: `${String(from.getDate()).padStart(2, "0")}/${String(from.getMonth() + 1).padStart(2, "0")}`,
        count: matches.length,
        volume: matches.reduce((sum, item) => sum + (Number(item.session.totalVolume) || 0), 0),
      });
    }
    return weeks;
  }, [completedSessions]);

  const maxWeeklyCount = Math.max(1, ...weeklyBars.map((week) => week.count));
  const maxExerciseLoad = Math.max(1, ...filteredExerciseProgress.map((item) => Math.max(item.first, item.latest)));
  const bestRecords = exerciseRecords.slice(0, 8);
  const chartPoints = weeklyBars.map((week, index) => ({
    x: 18 + (index * 564) / 7,
    y: 132 - (week.count / maxWeeklyCount) * 104,
  }));
  const frequencyLine = chartPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const frequencyArea = `${frequencyLine} L 582 148 L 18 148 Z`;

  return (
    <div className="space-y-5">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #tfive-performance-report, #tfive-performance-report * { visibility: visible !important; }
          #tfive-performance-report { position: absolute !important; inset: 0 !important; width: 100% !important; padding: 18px !important; background: #fff !important; color: #111827 !important; }
          #tfive-performance-report .no-print { display: none !important; }
          #tfive-performance-report .print-card { break-inside: avoid; border-color: #d1d5db !important; background: #fff !important; color: #111827 !important; box-shadow: none !important; }
          #tfive-performance-report .print-muted { color: #4b5563 !important; }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
        <div>
          <div className="flex items-center gap-3"><div className="h-10 w-1 rounded-full bg-gradient-to-b from-red-400 to-red-700 shadow-[0_0_18px_rgba(239,68,68,.65)]" /><div><h3 className="text-lg font-black uppercase tracking-[0.16em] text-white">Performance analytics</h3><p className="text-[11px] tracking-wide text-slate-400">CENTRO DE DESEMPENHO • TFIVE PRO</p></div></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={period} onChange={(event) => setPeriod(event.target.value as Period)}
            className="rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-xs text-slate-100 shadow-[0_0_20px_rgba(15,23,42,.35)]">
            {PERIODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <button type="button" onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 shadow-[0_0_22px_rgba(239,68,68,.12)] transition hover:bg-red-500/20">
            <FileDown className="h-4 w-4" /> Exportar PDF
          </button>
        </div>
      </div>

      <section id="tfive-performance-report" className="relative space-y-5 overflow-hidden rounded-[28px] border border-white/10 bg-[#080d18] p-3 sm:p-5 text-white shadow-[0_20px_70px_rgba(0,0,0,.28)] before:pointer-events-none before:absolute before:-right-24 before:-top-24 before:h-72 before:w-72 before:rounded-full before:bg-red-600/10 before:blur-3xl">
        <header className="hidden print:block border-b border-gray-300 pb-4">
          <p className="text-xs font-black tracking-widest text-gray-700">TFIVE PRO • RELATÓRIO DE DESEMPENHO</p>
          <h1 className="mt-1 text-2xl font-black text-gray-950">{student.name}</h1>
          <p className="text-sm text-gray-600">Período: {startDate ? formatDate(startDate) : "Histórico completo"} até {formatDate(now)}</p>
        </header>

        <div className="relative grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Treinos concluídos", value: String(filteredSessions.length), detail: `${trainingDays} dias com treino` },
            { label: "Frequência média", value: `${formatNumber(weeklyFrequency)} /sem`, detail: "No período selecionado" },
            { label: "Volume acumulado", value: `${formatNumber(totalVolume, 0)} kg`, detail: "Carga × repetições" },
            { label: "Volume por treino", value: `${formatNumber(averageVolume, 0)} kg`, detail: "Média por sessão" },
          ].map((metric) => (
            <div key={metric.label} className="print-card rounded-[22px] border border-white/10 bg-gradient-to-br from-[#172235] to-[#0d1422] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.05),0_12px_30px_rgba(0,0,0,.18)]">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 print-muted">{metric.label}</p>
              <p className="mt-1 text-xl font-black tracking-tight text-white">{metric.value}</p>
              <p className="mt-1 text-[10px] text-slate-400 print-muted">{metric.detail}</p>
            </div>
          ))}
        </div>

        <div className="relative grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="print-card rounded-[26px] border border-white/10 bg-gradient-to-br from-[#121e30] via-[#0e1726] to-[#0a111d] p-5 shadow-[0_16px_45px_rgba(0,0,0,.28)]">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-2.5 shadow-[0_0_24px_rgba(239,68,68,.12)]"><CalendarDays className="h-4 w-4 text-red-300" /></div>
                <div><h4 className="text-sm font-bold tracking-wide text-white">Frequência semanal</h4><p className="text-[10px] text-slate-400">Últimas 8 semanas</p></div>
              </div>
              <span className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-[9px] font-bold tracking-[0.18em] text-red-200">TREINOS</span>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex flex-col justify-between pb-7 pt-2">
                {[0, 1, 2, 3].map((line) => <div key={line} className="border-t border-dashed border-white/[0.08]" />)}
              </div>
              <svg viewBox="0 0 600 170" role="img" aria-label="Gráfico de frequência semanal" className="relative h-40 w-full overflow-visible">
                <defs>
                  <linearGradient id="tfive-frequency-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fb4545" stopOpacity=".34" /><stop offset="100%" stopColor="#fb4545" stopOpacity="0" /></linearGradient>
                  <linearGradient id="tfive-frequency-line"><stop offset="0%" stopColor="#fb4545" /><stop offset="100%" stopColor="#fca5a5" /></linearGradient>
                  <filter id="tfive-frequency-glow"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                </defs>
                <path d={frequencyArea} fill="url(#tfive-frequency-fill)" />
                <path d={frequencyLine} fill="none" stroke="url(#tfive-frequency-line)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#tfive-frequency-glow)" />
                {chartPoints.map((point, index) => <g key={weeklyBars[index].label}>
                  <circle cx={point.x} cy={point.y} r="7" fill="#fb4545" opacity=".16" />
                  <circle cx={point.x} cy={point.y} r="3.5" fill="#fff" stroke="#fb4545" strokeWidth="2" />
                  <text x={point.x} y="164" textAnchor="middle" fill="#8190a5" fontSize="10">{weeklyBars[index].label}</text>
                  <text x={point.x} y={Math.max(12, point.y - 13)} textAnchor="middle" fill="#fecaca" fontSize="11" fontWeight="700">{weeklyBars[index].count}</text>
                </g>)}
              </svg>
            </div>
            <p className="mt-2 flex items-center gap-2 text-[10px] text-slate-400 print-muted"><span className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_8px_#f87171]" /> Sessões concluídas por semana</p>
          </section>

          <section className="print-card rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-2.5 shadow-[0_0_24px_rgba(34,211,238,.10)]"><TrendingUp className="h-4 w-4 text-cyan-300" /></div>
                <div><h4 className="text-sm font-bold tracking-wide text-white">Evolução por exercício</h4><p className="text-[10px] text-slate-400">Primeira carga × carga recente</p></div>
              </div>
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[9px] font-bold tracking-[0.18em] text-cyan-200">CARGAS</span>
            </div>
            {filteredExerciseProgress.length ? (
              <div className="space-y-4">
                {filteredExerciseProgress.slice(0, 6).map((item) => (
                  <div key={item.name} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-slate-200">{item.name}</span>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${item.delta >= 0 ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border border-red-400/20 bg-red-400/10 text-red-300"}`}>{item.delta >= 0 ? "+" : ""}{formatNumber(item.delta)}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full border border-white/[0.06] bg-white/[0.06]">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-300 shadow-[0_0_14px_rgba(56,189,248,.45)] transition-all duration-700" style={{ width: `${Math.max(3, (item.latest / maxExerciseLoad) * 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 print-muted"><span>Início: <strong className="text-slate-200">{formatNumber(item.first)} kg</strong></span><span>Atual: <strong className="text-slate-200">{formatNumber(item.latest)} kg</strong></span></div>
                  </div>
                ))}
              </div>
            ) : <p className="py-8 text-center text-xs text-[#6B7280]">Ainda não há registros suficientes para comparar cargas neste período.</p>}
          </section>
        </div>

        <section className="print-card rounded-[26px] border border-white/10 bg-gradient-to-br from-[#121e30] to-[#0b1320] p-5 shadow-[0_16px_45px_rgba(0,0,0,.22)]">
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-2"><Award className="h-4 w-4 text-amber-300" /></div>
            <h4 className="text-sm font-bold tracking-wide text-white">Recordes pessoais — histórico completo</h4>
          </div>
          {bestRecords.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead><tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="py-2">Exercício</th><th className="py-2 text-right">Maior carga</th><th className="py-2 text-right">Mais repetições</th><th className="py-2 text-right">1RM estimado</th>
                </tr></thead>
                <tbody>{bestRecords.map((record) => (
                  <tr key={record.key} className="border-b border-white/[0.06]">
                    <td className="py-2 font-semibold text-slate-200">{record.name}</td>
                    <td className="py-2 text-right font-mono text-[#1F2937]">{formatNumber(record.maxLoad)} kg</td>
                    <td className="py-2 text-right font-mono text-[#1F2937]">{record.maxReps}</td>
                    <td className="py-2 text-right font-mono font-bold text-[#1F2937]">{formatNumber(record.best1RM)} kg</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p className="py-6 text-center text-xs text-[#6B7280]">Nenhum recorde calculável. Registre carga e repetições nos treinos concluídos.</p>}
        </section>

        <section className="print-card rounded-2xl border border-[#E5E7EB] bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#374151]" />
            <h4 className="text-sm font-bold text-[#1F2937]">Resumo do histórico</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
            <p>Primeiro treino registrado: <strong>{completedSessions[0] ? formatDate(completedSessions[0].date) : "—"}</strong></p>
            <p>Treino mais recente: <strong>{completedSessions.length ? formatDate(completedSessions[completedSessions.length - 1].date) : "—"}</strong></p>
            <p>Exercícios com recordes: <strong>{exerciseRecords.length}</strong></p>
            <p>Treinos no período: <strong>{filteredSessions.length}</strong></p>
          </div>
          <p className="mt-3 text-[10px] text-[#6B7280] print-muted">1RM é uma estimativa calculada a partir da carga e das repetições registradas. Os indicadores dependem da qualidade e da consistência dos dados lançados.</p>
        </section>
      </section>
    </div>
  );
};
