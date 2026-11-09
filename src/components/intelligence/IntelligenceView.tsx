import React, { useMemo, useState } from 'react';
import { Activity, BrainCircuit, Check, ChevronRight, CircleAlert, Dumbbell, Gauge, Lightbulb, MessageSquareText, Plus, Save, Sparkles, TrendingUp, UserRound, WandSparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../services/supabaseClient';
import { Exercise, RoutineExercise, RoutineWorkout, WorkoutRoutine } from '../../types';

type Frequency = '3' | '4' | '5';
type Focus = 'hipertrofia' | 'forca' | 'condicionamento' | 'funcional' | 'geral';
type Level = 'iniciante' | 'intermediario' | 'avancado';

const uid = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `tf-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

const SPLITS: Record<Frequency, { name: string; groups: string[] }[]> = {
  '3': [
    { name: 'A · Corpo inteiro 1', groups: ['Peitoral','Costas','Quadríceps','Isquiotibiais','Abdômen / Core'] },
    { name: 'B · Corpo inteiro 2', groups: ['Costas','Ombros','Glúteos','Isquiotibiais','Panturrilha'] },
    { name: 'C · Corpo inteiro 3', groups: ['Peitoral','Quadríceps','Glúteos','Bíceps','Tríceps','Abdômen / Core'] }
  ],
  '4': [
    { name: 'A · Superiores 1', groups: ['Peitoral','Costas','Ombros','Tríceps'] },
    { name: 'B · Inferiores 1', groups: ['Quadríceps','Isquiotibiais','Glúteos','Panturrilha','Abdômen / Core'] },
    { name: 'C · Superiores 2', groups: ['Costas','Peitoral','Bíceps','Ombros'] },
    { name: 'D · Inferiores 2', groups: ['Glúteos','Isquiotibiais','Quadríceps','Panturrilha','Abdômen / Core'] }
  ],
  '5': [
    { name: 'A · Empurrar', groups: ['Peitoral','Ombros','Tríceps'] },
    { name: 'B · Puxar', groups: ['Costas','Bíceps','Antebraço'] },
    { name: 'C · Pernas', groups: ['Quadríceps','Isquiotibiais','Glúteos','Panturrilha'] },
    { name: 'D · Superiores', groups: ['Peitoral','Costas','Ombros','Bíceps','Tríceps'] },
    { name: 'E · Inferiores + Core', groups: ['Glúteos','Isquiotibiais','Quadríceps','Abdômen / Core'] }
  ]
};

const focusLabel: Record<Focus,string> = {
  hipertrofia: 'Hipertrofia', forca: 'Força', condicionamento: 'Condicionamento', funcional: 'Capacidade funcional', geral: 'Condicionamento geral'
};

function buildExercise(ex: Exercise, index: number, level: Level, focus: Focus): RoutineExercise {
  const sets = level === 'iniciante' ? 2 : level === 'avancado' ? 4 : 3;
  const repMin = focus === 'forca' ? 4 : focus === 'condicionamento' || focus === 'funcional' ? 10 : 8;
  const repMax = focus === 'forca' ? 6 : focus === 'condicionamento' || focus === 'funcional' ? 15 : 12;
  return {
    id: uid(), exerciseId: ex.id, exerciseName: ex.name, muscleGroup: ex.muscleGroup,
    primaryMuscles: ex.primaryMuscles, secondaryMuscles: ex.secondaryMuscles,
    order: index + 1, prescriptionType: ex.recordType === 'duration_time' || ex.recordType === 'isometry_time' ? 'duration' : 'weight_reps',
    targetSets: sets, targetRepsMin: repMin, targetRepsMax: repMax,
    targetDurationSeconds: ex.recordType === 'isometry_time' ? 30 : ex.recordType === 'duration_time' ? 600 : undefined,
    targetRPE: level === 'iniciante' ? 6 : 7, restSeconds: ex.defaultRestSeconds || 60,
    notes: 'Ajustar amplitude, carga e execução conforme avaliação e resposta individual.',
    recordType: ex.recordType
  };
}

export const IntelligenceView: React.FC = () => {
  const { students, exerciseCatalog, sessions, routines, saveRoutine } = useApp();
  const activeStudents = useMemo(() => students.filter(s => s.status === 'active').sort((a,b)=>a.name.localeCompare(b.name)), [students]);
  const [studentId, setStudentId] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('3');
  const [focus, setFocus] = useState<Focus>('hipertrofia');
  const [level, setLevel] = useState<Level>('iniciante');
  const [limitations, setLimitations] = useState('');
  const [equipment, setEquipment] = useState('Todos');
  const [generated, setGenerated] = useState<RoutineWorkout[]>([]);
  const [routineTitle, setRoutineTitle] = useState('Plano sugerido pelo TFIVE');
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'planner'|'evolution'|'assistant'>('planner');

  const selectedStudent = activeStudents.find(s => s.id === studentId);
  const completedSessions = useMemo(() => sessions.filter(s => s.status === 'completed'), [sessions]);
  const studentSessions = useMemo(() => completedSessions.filter(s => s.studentId === studentId).sort((a,b)=>new Date(b.endTime || b.startTime).getTime()-new Date(a.endTime || a.startTime).getTime()), [completedSessions, studentId]);

  const generate = () => {
    const available = exerciseCatalog.filter(ex => !ex.isArchived && (equipment === 'Todos' || ex.equipment.toLowerCase().includes(equipment.toLowerCase())));
    const split = SPLITS[frequency];
    const result = split.map((day, dayIndex) => {
      const picked: Exercise[] = [];
      day.groups.forEach(group => {
        const matches = available.filter(ex => ex.muscleGroup === group && !picked.some(p=>p.id===ex.id));
        if (!matches.length) return;
        const preferred = matches.find(ex => /máquina|polia|halteres|peso corporal/i.test(ex.equipment)) || matches[0];
        picked.push(preferred);
        if (matches.length > 1 && picked.length < 7 && ['Peitoral','Costas','Quadríceps','Glúteos'].includes(group)) {
          const second = matches.find(ex=>ex.id!==preferred.id);
          if(second) picked.push(second);
        }
      });
      const capped = picked.slice(0, focus === 'funcional' ? 6 : 7);
      return {
        id: uid(), routineId: 'draft', letter: String.fromCharCode(65+dayIndex),
        name: day.name, description: `Sessão ${dayIndex+1} · ${focusLabel[focus]}`, order: dayIndex,
        exercises: capped.map((ex,index)=>buildExercise(ex,index,level,focus))
      } as RoutineWorkout;
    });
    setGenerated(result);
    setRoutineTitle(`${focusLabel[focus]} · ${selectedStudent?.name || 'Novo plano'}`);
    setSavedMessage('');
  };

  const handleSave = async () => {
    if (!selectedStudent || generated.length === 0) return;
    setSaving(true); setSavedMessage('');
    try {
      const now = new Date().toISOString();
      const routine: WorkoutRoutine = {
        id: uid(), studentId: selectedStudent.id, title: routineTitle.trim() || 'Plano de treino',
        objective: focusLabel[focus], description: `Estrutura sugerida pelo TFIVE Intelligence · ${frequency} dias por semana.`,
        notes: limitations ? `Pontos de atenção informados pelo treinador: ${limitations}` : 'Revisar individualmente antes de aplicar.',
        status: 'active', version: 1,
        workouts: generated.map((w,index)=>({...w,routineId:'',order:index})),
        createdAt: now, updatedAt: now
      };
      routine.workouts = routine.workouts.map(w=>({...w,routineId:routine.id}));
      await saveRoutine(routine);
      setSavedMessage('Rotina salva no perfil do aluno. Revise os exercícios e as prescrições antes da primeira sessão.');
    } catch (error) {
      console.error('Falha ao salvar rotina sugerida:', error);
      setSavedMessage('Não foi possível salvar. Verifique a conexão e tente novamente.');
    } finally { setSaving(false); }
  };

  const progression = useMemo(() => {
    const byExercise = new Map<string, {name:string; rows:{weight:number; reps:number; rpe:number|null; date:string}[]}>();
    studentSessions.forEach(session => session.sets.filter(set=>set.status==='completed' && !set.isWarmup).forEach(set=>{
      const key=set.exerciseId || set.exerciseName;
      const entry=byExercise.get(key) || {name:set.exerciseName,rows:[]};
      entry.rows.push({weight:set.weightKg || 0,reps:set.actualReps || 0,rpe:set.rpe ?? null,date:session.endTime || session.startTime});
      byExercise.set(key,entry);
    }));
    return Array.from(byExercise.values()).map(entry=>{
      const rows=entry.rows.slice(0,6);
      const recent=rows[0]; const prior=rows.find(row=>row.date!==recent?.date);
      let recommendation='Mantenha a carga e consolide a técnica.';
      let status='Manter';
      if(recent && prior && recent.weight>0 && recent.reps>=prior.reps && (recent.rpe===null || recent.rpe<=8)){
        recommendation='Se a execução permaneceu estável e a meta de repetições foi atingida, considere aumento pequeno de carga (2–5%).';
        status='Avaliar aumento';
      } else if(recent?.rpe!==null && recent?.rpe!==undefined && recent.rpe>=9){
        recommendation='Evite aumentar a carga nesta sessão. Reavalie recuperação, técnica e esforço percebido.';
        status='Manter / revisar';
      }
      return {name:entry.name,status,recommendation,recent,prior};
    }).slice(0,12);
  }, [studentSessions]);

  const answerQuestion = async () => {
    const q = question.trim();
    if (!q || aiLoading) return;
    setAiLoading(true);
    setAnswer('');
    try {
      const { data, error } = await supabase.functions.invoke('tfive-ai-assistant', { body: { question: q } });
      if (error) {
        const details = typeof data?.error === 'string' ? data.error : error.message;
        throw new Error(details || 'Não foi possível consultar a IA.');
      }
      if (data?.error) throw new Error(data.error);
      if (typeof data?.answer !== 'string' || !data.answer.trim()) throw new Error('A IA retornou uma resposta vazia. Tente novamente.');
      setAnswer(data.answer.trim());
    } catch (error) {
      console.error('TFIVE Intelligence AI error:', error);
      setAnswer(error instanceof Error ? error.message : 'Falha ao consultar a IA. Verifique a conexão e tente novamente.');
    } finally {
      setAiLoading(false);
    }
  };

  const tabs=[{id:'planner',label:'Gerar rotina',icon:WandSparkles},{id:'evolution',label:'Evolução',icon:TrendingUp},{id:'assistant',label:'Assistente',icon:MessageSquareText}] as const;

  return <div className="space-y-6 pb-16">
    <section className="rounded-3xl bg-[#202124] text-white p-6 sm:p-8 overflow-hidden relative">
      <div className="absolute -right-12 -top-16 w-64 h-64 rounded-full border border-white/10" />
      <div className="absolute -right-2 -top-6 w-44 h-44 rounded-full border border-white/10" />
      <div className="relative z-10 max-w-3xl">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-zinc-300 font-semibold"><BrainCircuit className="w-4 h-4"/> TFIVE Intelligence</div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-3">Decisões melhores. Treinos mais consistentes.</h2>
        <p className="text-sm text-zinc-300 mt-2 max-w-2xl leading-relaxed">Ferramentas de apoio à prescrição, leitura do histórico e organização do acompanhamento. As recomendações são sugestões para revisão do treinador.</p>
        <div className="flex flex-wrap gap-2 mt-5">
          <span className="px-3 py-1.5 rounded-full border border-white/15 text-xs text-zinc-200">Baseado nos dados do TFIVE</span>
          <span className="px-3 py-1.5 rounded-full border border-white/15 text-xs text-zinc-200">Revisão profissional</span>
        </div>
      </div>
    </section>

    <div className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map(tab=>{const Icon=tab.icon;return <button key={tab.id} onClick={()=>setSelectedTab(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap border transition-colors ${selectedTab===tab.id?'bg-[#27272A] text-white border-[#27272A]':'bg-white text-[#52525B] border-[#E4E4E7] hover:bg-[#F4F4F5]'}`}><Icon className="w-4 h-4"/>{tab.label}</button>})}
    </div>

    {selectedTab==='planner' && <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5">
      <section className="bg-white border border-[#E4E4E7] rounded-2xl p-5 sm:p-6 space-y-5">
        <div><div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-[#52525B]"/><h3 className="font-semibold text-lg text-[#202124]">Planejador de rotina</h3></div><p className="text-sm text-[#71717A] mt-1">Monte uma estrutura inicial usando o cadastro de exercícios do TFIVE.</p></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="text-xs font-semibold text-[#52525B] space-y-1.5 sm:col-span-2">Aluno
            <select value={studentId} onChange={e=>setStudentId(e.target.value)} className="w-full rounded-xl border border-[#D4D4D8] bg-white px-3 py-3 text-sm text-[#202124] outline-none focus:ring-2 focus:ring-zinc-300"><option value="">Selecione um aluno</option>{activeStudents.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
          </label>
          <label className="text-xs font-semibold text-[#52525B] space-y-1.5">Objetivo
            <select value={focus} onChange={e=>setFocus(e.target.value as Focus)} className="w-full rounded-xl border border-[#D4D4D8] bg-white px-3 py-3 text-sm text-[#202124]">{Object.entries(focusLabel).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
          </label>
          <label className="text-xs font-semibold text-[#52525B] space-y-1.5">Frequência semanal
            <select value={frequency} onChange={e=>setFrequency(e.target.value as Frequency)} className="w-full rounded-xl border border-[#D4D4D8] bg-white px-3 py-3 text-sm text-[#202124]"><option value="3">3 dias</option><option value="4">4 dias</option><option value="5">5 dias</option></select>
          </label>
          <label className="text-xs font-semibold text-[#52525B] space-y-1.5">Nível de experiência
            <select value={level} onChange={e=>setLevel(e.target.value as Level)} className="w-full rounded-xl border border-[#D4D4D8] bg-white px-3 py-3 text-sm text-[#202124]"><option value="iniciante">Iniciante</option><option value="intermediario">Intermediário</option><option value="avancado">Avançado</option></select>
          </label>
          <label className="text-xs font-semibold text-[#52525B] space-y-1.5">Equipamento
            <select value={equipment} onChange={e=>setEquipment(e.target.value)} className="w-full rounded-xl border border-[#D4D4D8] bg-white px-3 py-3 text-sm text-[#202124]"><option>Todos</option><option>Máquina</option><option>Halteres</option><option>Polia</option><option>Peso Corporal</option><option>Barra</option></select>
          </label>
          <label className="text-xs font-semibold text-[#52525B] space-y-1.5 sm:col-span-2">Restrições e observações do treinador
            <textarea value={limitations} onChange={e=>setLimitations(e.target.value)} rows={3} placeholder="Ex.: equipamento indisponível, movimento que precisa ser avaliado, preferência do aluno..." className="w-full rounded-xl border border-[#D4D4D8] bg-white px-3 py-3 text-sm font-normal text-[#202124] outline-none focus:ring-2 focus:ring-zinc-300 resize-y"/>
          </label>
        </div>
        <button onClick={generate} disabled={!exerciseCatalog.length} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#27272A] hover:bg-black disabled:opacity-40 text-white px-5 py-3 text-sm font-semibold transition-colors"><WandSparkles className="w-4 h-4"/>Gerar sugestão de treino</button>
        {!exerciseCatalog.length && <p className="text-xs text-amber-700">O banco de exercícios está vazio ou indisponível.</p>}
      </section>
      <aside className="bg-[#F4F4F5] border border-[#E4E4E7] rounded-2xl p-5 space-y-4">
        <h3 className="font-semibold text-[#202124]">Critérios de segurança</h3>
        {['A rotina gerada é um rascunho, não uma prescrição clínica.','Revise histórico, limitações, técnica e tolerância individual.','Ajuste volume, intensidade, amplitude e descanso antes de aplicar.','Não use recomendações automáticas para diagnosticar ou reabilitar lesões.'].map(item=><div key={item} className="flex gap-2.5 text-sm text-[#52525B]"><CircleAlert className="w-4 h-4 shrink-0 mt-0.5"/><span>{item}</span></div>)}
        <div className="border-t border-[#D4D4D8] pt-3 text-xs text-[#71717A]">Base disponível: {exerciseCatalog.length} exercícios ativos · {studentSessions.length} sessões concluídas do aluno selecionado.</div>
      </aside>
    </div>}

    {selectedTab==='planner' && generated.length>0 && <section className="bg-white border border-[#E4E4E7] rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><p className="text-[11px] uppercase tracking-wider font-bold text-[#71717A]">Prévia gerada</p><input value={routineTitle} onChange={e=>setRoutineTitle(e.target.value)} className="mt-1 text-lg font-semibold text-[#202124] border-b border-transparent focus:border-zinc-400 outline-none w-full"/></div><button onClick={handleSave} disabled={!studentId||saving} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#27272A] text-white text-sm font-semibold disabled:opacity-40"><Save className="w-4 h-4"/>{saving?'Salvando...':'Salvar no aluno'}</button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{generated.map(workout=><div key={workout.id} className="border border-[#E4E4E7] rounded-xl p-4"><div className="font-semibold text-[#202124]">{workout.name}</div><p className="text-xs text-[#71717A] mt-1">{workout.exercises.length} exercícios</p><div className="mt-3 space-y-2">{workout.exercises.map((ex,index)=><div key={ex.id} className="flex items-start justify-between gap-3 text-sm"><div className="flex gap-2 min-w-0"><span className="text-xs text-[#A1A1AA]">{index+1}.</span><span className="text-[#3F3F46]">{ex.exerciseName}</span></div><span className="text-xs text-[#71717A] whitespace-nowrap">{ex.targetSets} × {ex.targetRepsMin}–{ex.targetRepsMax}</span></div>)}</div></div>)}</div>
      {savedMessage && <p className="text-sm text-[#52525B] flex items-center gap-2"><Check className="w-4 h-4"/>{savedMessage}</p>}
    </section>}

    {selectedTab==='evolution' && <section className="bg-white border border-[#E4E4E7] rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"><div><h3 className="text-lg font-semibold text-[#202124]">Leitura de desempenho</h3><p className="text-sm text-[#71717A]">Sugestões baseadas nos registros recentes de treino.</p></div><select value={studentId} onChange={e=>setStudentId(e.target.value)} className="rounded-xl border border-[#D4D4D8] bg-white px-3 py-2.5 text-sm text-[#202124]"><option value="">Selecione um aluno</option>{activeStudents.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
      {!studentId ? <div className="text-sm text-[#71717A] py-8 text-center">Selecione um aluno para analisar o histórico.</div> : progression.length===0 ? <div className="text-sm text-[#71717A] py-8 text-center">Ainda não há registros concluídos suficientes para sugerir progressões.</div> : <div className="space-y-3">{progression.map((item,index)=><div key={item.name+index} className="rounded-xl border border-[#E4E4E7] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-[#202124]">{item.name}</p><span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#F4F4F5] text-[#52525B]">{item.status}</span></div><p className="text-sm text-[#52525B] mt-2">{item.recommendation}</p>{item.recent&&<p className="text-xs text-[#71717A] mt-2">Registro recente: {item.recent.weight} kg × {item.recent.reps} reps{item.recent.rpe!==null? ` · RPE ${item.recent.rpe}`:''}</p>}</div>)}</div>}
      <p className="text-xs text-[#71717A] border-t border-[#E4E4E7] pt-3">A comparação é heurística e depende da qualidade dos registros. Confirme se as séries, amplitude, equipamento e condições são comparáveis antes de alterar cargas.</p>
    </section>}

    {selectedTab==='assistant' && <section className="bg-white border border-[#E4E4E7] rounded-2xl p-5 sm:p-6 max-w-3xl space-y-5">
      <div className="flex items-center gap-2"><MessageSquareText className="w-5 h-5 text-[#52525B]"/><h3 className="text-lg font-semibold text-[#202124]">Assistente do treinador</h3></div>
      <p className="text-sm text-[#71717A]">Faça perguntas sobre treinamento, progressão, volume, recuperação e acompanhamento. A pergunta é processada pelo Google Gemini por uma conexão segura no Supabase; dados pessoais dos alunos não são enviados automaticamente.</p>
      <div className="flex flex-wrap gap-2">{['Como decidir quando aumentar a carga?','Como controlar o volume semanal?','Como agir diante de dor ou risco de queda?'].map(q=><button key={q} onClick={()=>setQuestion(q)} className="text-xs px-3 py-2 rounded-full border border-[#E4E4E7] text-[#52525B] hover:bg-[#F4F4F5]">{q}</button>)}</div>
      <textarea value={question} onChange={e=>setQuestion(e.target.value)} rows={3} placeholder="Digite sua pergunta..." className="w-full rounded-xl border border-[#D4D4D8] px-3 py-3 text-sm text-[#202124] outline-none focus:ring-2 focus:ring-zinc-300"/>
      <button onClick={answerQuestion} disabled={aiLoading || !question.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[#27272A] text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50"><MessageSquareText className="w-4 h-4"/>{aiLoading ? 'Consultando IA...' : 'Consultar assistente'}</button>
      {answer&&<div className="bg-[#F4F4F5] rounded-xl p-4"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#52525B]"><Lightbulb className="w-4 h-4"/>Orientação</div><p className="text-sm text-[#3F3F46] leading-relaxed mt-2">{answer}</p></div>}
    </section>}
  </div>;
};
