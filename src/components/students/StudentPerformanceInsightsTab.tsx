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

  return (
    <div className="space-y-5">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #tfive-performance-report, #tfive-performance-report * { visibility: visible !important; }
          #tfive-performance-report { position: absolute !important; inset: 0 !important; width: 100% !important; padding: 18px !important; background: #fff !important; color: #111827 !important; }
          #tfive-performance-report .no-print { display: none !important; }
          #tfive-performance-report .print-card { break-inside: avoid; border-color: #d1d5db !important; background: #fff !important; color: #111827 !important; }
          #tfive-performance-report .print-muted { color: #4b5563 !important; }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
        <div>
          <h3 className="text-lg font-bold uppercase text-white">Desempenho e evolução</h3>
          <p className="text-xs text-[#6B7280]">Indicadores calculados a partir dos treinos concluídos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={period} onChange={(event) => setPeriod(event.target.value as Period)}
            className="rounded-xl border border-[#D1D5DB] bg-white px-3 py-2 text-xs text-[#1F2937]">
            {PERIODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <button type="button" onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#374151] px-3 py-2 text-xs font-bold text-white hover:bg-[#1F2937]">
            <FileDown className="h-4 w-4" /> Exportar PDF
          </button>
        </div>
      </div>

      <section id="tfive-performance-report" className="space-y-5 rounded-2xl">
        <header className="hidden print:block border-b border-gray-300 pb-4">
          <p className="text-xs font-black tracking-widest text-gray-700">TFIVE PRO • RELATÓRIO DE DESEMPENHO</p>
          <h1 className="mt-1 text-2xl font-black text-gray-950">{student.name}</h1>
          <p className="text-sm text-gray-600">Período: {startDate ? formatDate(startDate) : "Histórico completo"} até {formatDate(now)}</p>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Treinos concluídos", value: String(filteredSessions.length), detail: `${trainingDays} dias com treino` },
            { label: "Frequência média", value: `${formatNumber(weeklyFrequency)} /sem`, detail: "No período selecionado" },
            { label: "Volume acumulado", value: `${formatNumber(totalVolume, 0)} kg`, detail: "Carga × repetições" },
            { label: "Volume por treino", value: `${formatNumber(averageVolume, 0)} kg`, detail: "Média por sessão" },
          ].map((metric) => (
            <div key={metric.label} className="print-card rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#6B7280] print-muted">{metric.label}</p>
              <p className="mt-1 text-xl font-black text-[#1F2937]">{metric.value}</p>
              <p className="mt-1 text-[10px] text-[#6B7280] print-muted">{metric.detail}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="print-card rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-red-50 p-2"><CalendarDays className="h-4 w-4 text-red-600" /></div>
                <div><h4 className="text-sm font-bold text-[#111827]">Frequência semanal</h4><p className="text-[10px] text-gray-500">Últimas 8 semanas</p></div>
              </div>
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-700">TREINOS</span>
            </div>
            <div className="relative h-36">
              <div className="pointer-events-none absolute inset-x-0 top-2 flex h-[calc(100%-24px)] flex-col justify-between">
                {[3, 2, 1, 0].map((line) => <div key={line} className="border-t border-dashed border-gray-200" />)}
              </div>
              <div className="relative flex h-full items-end gap-2 px-1">
                {weeklyBars.map((week, index) => (
                  <div key={week.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" title={`${week.count} treino(s) na semana iniciada em ${week.label}`}>
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${week.count ? "bg-red-50 text-red-700" : "text-gray-400"}`}>{week.count}</span>
                    <div className="flex h-[76%] w-full items-end overflow-hidden rounded-t-lg bg-gray-100">
                      <div className="w-full rounded-t-lg bg-gradient-to-t from-red-700 to-red-500 shadow-sm transition-all duration-500" style={{ height: `${week.count ? Math.max(8, (week.count / maxWeeklyCount) * 100) : 0}%`, opacity: week.count ? 1 : 0.25 }} />
                    </div>
                    <span className="text-[9px] font-medium text-gray-500">{week.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 flex items-center gap-2 text-[10px] text-gray-500 print-muted"><span className="h-2 w-2 rounded-full bg-red-600" /> Cada coluna representa uma semana; o número acima indica os treinos concluídos.</p>
          </section>

          <section className="print-card rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-blue-50 p-2"><TrendingUp className="h-4 w-4 text-blue-700" /></div>
                <div><h4 className="text-sm font-bold text-[#111827]">Evolução por exercício</h4><p className="text-[10px] text-gray-500">Primeira carga × carga recente</p></div>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">CARGAS</span>
            </div>
            {filteredExerciseProgress.length ? (
              <div className="space-y-4">
                {filteredExerciseProgress.slice(0, 6).map((item) => (
                  <div key={item.name} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-gray-800">{item.name}</span>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${item.delta >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{item.delta >= 0 ? "+" : ""}{formatNumber(item.delta)}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-700 to-sky-500 transition-all duration-500" style={{ width: `${Math.max(3, (item.latest / maxExerciseLoad) * 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 print-muted"><span>Início: <strong className="text-gray-700">{formatNumber(item.first)} kg</strong></span><span>Atual: <strong className="text-gray-700">{formatNumber(item.latest)} kg</strong></span></div>
                  </div>
                ))}
              </div>
            ) : <p className="py-8 text-center text-xs text-[#6B7280]">Ainda não há registros suficientes para comparar cargas neste período.</p>}
          </section>
        </div>

        <section className="print-card rounded-2xl border border-[#E5E7EB] bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Award className="h-4 w-4 text-[#374151]" />
            <h4 className="text-sm font-bold text-[#1F2937]">Recordes pessoais — histórico completo</h4>
          </div>
          {bestRecords.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead><tr className="border-b border-[#E5E7EB] text-[10px] uppercase text-[#6B7280]">
                  <th className="py-2">Exercício</th><th className="py-2 text-right">Maior carga</th><th className="py-2 text-right">Mais repetições</th><th className="py-2 text-right">1RM estimado</th>
                </tr></thead>
                <tbody>{bestRecords.map((record) => (
                  <tr key={record.key} className="border-b border-[#F3F4F6]">
                    <td className="py-2 font-semibold text-[#1F2937]">{record.name}</td>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#374151]">
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
