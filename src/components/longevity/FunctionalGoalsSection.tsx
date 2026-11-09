import React, { useState } from 'react';
import { 
  Target, 
  Plus, 
  CheckCircle2, 
  Trash2, 
  Award,
  Calendar
} from 'lucide-react';
import { 
  Student, 
  FunctionalGoal, 
  FunctionalMilestone, 
  FunctionalDomain, 
  AutonomyTaskKey,
  FunctionalAssessment 
} from '../../types';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../db/indexedDB';
import { soundEffects } from '../../utils/audio';

interface FunctionalGoalsSectionProps {
  student: Student;
  goals: FunctionalGoal[];
  milestones: FunctionalMilestone[];
  assessments: FunctionalAssessment[];
  isNewGoalModalOpen: boolean;
  prefillTask?: AutonomyTaskKey;
  onCloseNewGoalModal: () => void;
  onOpenNewGoalModal: () => void;
}

export const FunctionalGoalsSection: React.FC<FunctionalGoalsSectionProps> = ({
  student,
  goals,
  milestones,
  assessments,
  isNewGoalModalOpen,
  prefillTask,
  onCloseNewGoalModal,
  onOpenNewGoalModal
}) => {
  const { saveFunctionalGoal, deleteFunctionalGoal, saveFunctionalMilestone } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'achieved'>('active');

  // New Goal Form State
  const [goalTitle, setGoalTitle] = useState<string>('');
  const [goalDomain, setGoalDomain] = useState<FunctionalDomain>('autonomy');
  const [goalAutonomyTask, setGoalAutonomyTask] = useState<AutonomyTaskKey | undefined>(prefillTask);
  const [goalTestId, setGoalTestId] = useState<string>('');
  const [goalTargetDate, setGoalTargetDate] = useState<string>('');
  const [goalInitialValue, setGoalInitialValue] = useState<number>(0);
  const [goalCurrentValue, setGoalCurrentValue] = useState<number>(0);
  const [goalTargetValue, setGoalTargetValue] = useState<number>(0);
  const [goalUnit, setGoalUnit] = useState<string>('reps');
  const [goalNotes, setGoalNotes] = useState<string>('');

  React.useEffect(() => {
    if (prefillTask) {
      setGoalAutonomyTask(prefillTask);
      if (prefillTask === 'stand_up') {
        setGoalTitle('Sentar e levantar da cadeira sem apoiar as mãos');
        setGoalTestId('test-30s-chair-stand');
        setGoalUnit('reps');
        setGoalDomain('strength');
      } else if (prefillTask === 'walk') {
        setGoalTitle('Caminhar com agilidade e tempo seguro no TUG');
        setGoalTestId('test-tug');
        setGoalUnit('s');
        setGoalDomain('locomotion');
      } else if (prefillTask === 'floor_rise') {
        setGoalTitle('Levantar do chão sem apoio de terceiros');
        setGoalTestId('test-floor-rise');
        setGoalUnit('nível');
        setGoalDomain('autonomy');
      } else if (prefillTask === 'climb') {
        setGoalTitle('Subir lances de escada com independência');
        setGoalTestId('test-stair-climb');
        setGoalUnit('degraus');
        setGoalDomain('endurance');
      }
    }
  }, [prefillTask]);

  const filteredGoals = goals.filter(g => {
    if (activeFilter === 'active') return g.status === 'active';
    if (activeFilter === 'achieved') return g.status === 'achieved';
    return true;
  });

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;

    soundEffects.playSuccess();
    const newGoal: FunctionalGoal = {
      id: generateId('fgoal'),
      studentId: student.id,
      title: goalTitle.trim(),
      domain: goalDomain,
      autonomyTask: goalAutonomyTask,
      testId: goalTestId || undefined,
      initialValueNumeric: goalInitialValue || undefined,
      currentValueNumeric: goalCurrentValue || goalInitialValue || undefined,
      targetValueNumeric: goalTargetValue || undefined,
      unitLabel: goalUnit,
      deadlineDate: goalTargetDate || undefined,
      status: 'active',
      notes: goalNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveFunctionalGoal(newGoal);
    onCloseNewGoalModal();
    // Reset
    setGoalTitle('');
    setGoalNotes('');
    setGoalInitialValue(0);
    setGoalCurrentValue(0);
    setGoalTargetValue(0);
  };

  const handleToggleGoalAchieved = async (goal: FunctionalGoal) => {
    soundEffects.playSuccess();
    const isNowAchieved = goal.status !== 'achieved';
    const updated: FunctionalGoal = {
      ...goal,
      status: isNowAchieved ? 'achieved' : 'active',
      achievedAt: isNowAchieved ? new Date().toISOString().split('T')[0] : undefined,
      updatedAt: new Date().toISOString()
    };

    await saveFunctionalGoal(updated);

    if (isNowAchieved) {
      await saveFunctionalMilestone({
        id: generateId('milestone'),
        studentId: student.id,
        date: new Date().toISOString().split('T')[0],
        title: `Meta Conquistada: ${goal.title}`,
        description: `Objetivo funcional atingido com sucesso!`,
        domain: goal.domain,
        testId: goal.testId,
        goalId: goal.id,
        createdAt: new Date().toISOString()
      });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Goals Section Top Card */}
      <div className="bg-[#18181B] border border-[#27272a] rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#374151] bg-[#F3F4F6] px-2 py-0.5 rounded-full border border-[#E5E7EB]">
              Metas & Conquistas
            </span>
            <span className="text-xs text-[#4B5563]">
              Objetivos de Capacidade Real
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-display text-white">
            Metas de Longevidade Funcional
          </h2>
          <p className="text-xs text-[#4B5563] mt-1 max-w-2xl leading-relaxed">
            Metas focadas em autonomia, força prática e preservação de independência motora definidas pelo Personal Trainer com o aluno.
          </p>
        </div>

        <button
          onClick={onOpenNewGoalModal}
          className="px-5 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 shadow-lg shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Meta</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveFilter('active')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-display uppercase tracking-wider transition-all ${
            activeFilter === 'active'
              ? 'bg-[#374151] text-white'
              : 'bg-[#18181B] text-[#4B5563] hover:text-white border border-[#27272A]'
          }`}
        >
          Em Andamento ({goals.filter(g => g.status === 'active').length})
        </button>

        <button
          onClick={() => setActiveFilter('achieved')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-display uppercase tracking-wider transition-all ${
            activeFilter === 'achieved'
              ? 'bg-emerald-600 text-white'
              : 'bg-[#18181B] text-[#4B5563] hover:text-white border border-[#27272A]'
          }`}
        >
          Conquistadas ({goals.filter(g => g.status === 'achieved').length})
        </button>

        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-display uppercase tracking-wider transition-all ${
            activeFilter === 'all'
              ? 'bg-[#27272A] text-white'
              : 'bg-[#18181B] text-[#4B5563] hover:text-white border border-[#27272A]'
          }`}
        >
          Todas ({goals.length})
        </button>
      </div>

      {/* Goals Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredGoals.map((goal) => {
          const isAchieved = goal.status === 'achieved';
          let progressPercent = 0;
          if (goal.initialValueNumeric !== undefined && goal.targetValueNumeric !== undefined && goal.currentValueNumeric !== undefined) {
            const range = Math.abs(goal.targetValueNumeric - goal.initialValueNumeric);
            if (range > 0) {
              const currentDelta = Math.abs(goal.currentValueNumeric - goal.initialValueNumeric);
              progressPercent = Math.min(100, Math.max(0, Math.round((currentDelta / range) * 100)));
            }
          }

          return (
            <div
              key={goal.id}
              className={`bg-[#18181B] border rounded-3xl p-5 flex flex-col justify-between transition-all ${
                isAchieved ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-[#27272a] hover:border-[#3F3F46]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isAchieved ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300' : 'bg-[#27272A] text-[#4B5563]'
                  }`}>
                    {isAchieved ? 'Conquistada' : 'Em Andamento'}
                  </span>

                  {goal.deadlineDate && (
                    <span className="text-[11px] font-mono-nums text-[#4B5563] flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Prazo: {goal.deadlineDate}
                    </span>
                  )}
                </div>

                <h4 className="text-base font-black font-display text-white">
                  {goal.title}
                </h4>

                {goal.notes && (
                  <p className="text-xs text-[#4B5563] mt-1 leading-relaxed">
                    {goal.notes}
                  </p>
                )}

                {/* Progress Bar (if quantitative) */}
                {goal.initialValueNumeric !== undefined && goal.targetValueNumeric !== undefined && (
                  <div className="mt-4 bg-[#121212] p-3 rounded-2xl border border-[#27272A] space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-[#4B5563]">
                      <span>Inicial: <strong className="text-white font-mono-nums">{goal.initialValueNumeric} {goal.unitLabel}</strong></span>
                      <span>Atual: <strong className="text-[#374151] font-mono-nums">{goal.currentValueNumeric} {goal.unitLabel}</strong></span>
                      <span>Alvo: <strong className="text-emerald-400 font-mono-nums">{goal.targetValueNumeric} {goal.unitLabel}</strong></span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-[#27272A] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isAchieved ? 'bg-emerald-500' : 'bg-[#374151]'
                        }`}
                        style={{ width: `${isAchieved ? 100 : progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-4 border-t border-[#27272A] flex items-center justify-between gap-2">
                <button
                  onClick={() => handleToggleGoalAchieved(goal)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black font-display uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    isAchieved
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isAchieved ? 'Reabrir Meta' : 'Marcar como Conquistada'}</span>
                </button>

                <button
                  onClick={() => deleteFunctionalGoal(goal.id)}
                  className="p-1.5 rounded-lg text-[#71717A] hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                  title="Excluir Meta"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredGoals.length === 0 && (
        <div className="bg-[#18181B] border border-[#27272a] rounded-3xl p-8 text-center space-y-3">
          <Target className="w-10 h-10 text-[#71717A] mx-auto" />
          <h4 className="text-base font-black font-display text-white">
            Nenhuma meta encontrada nesta categoria
          </h4>
          <p className="text-xs text-[#4B5563] max-w-md mx-auto">
            Cadastre metas de longevidade funcional focadas nas capacidades e tarefas mais importantes para a rotina deste aluno.
          </p>
          <button
            onClick={onOpenNewGoalModal}
            className="px-5 py-2.5 rounded-xl bg-[#374151] text-white text-xs font-black font-display uppercase tracking-wider"
          >
            Criar Primeira Meta
          </button>
        </div>
      )}

      {/* Milestone History Cards */}
      {milestones.length > 0 && (
        <div className="bg-[#18181B] border border-[#27272a] rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-black font-display text-white">
              Marcos & Conquistas de Autonomia Registrados
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {milestones.map((m) => (
              <div
                key={m.id}
                className="bg-[#121212] border border-[#27272A] rounded-2xl p-4 flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono-nums text-[#4B5563]">{m.date}</span>
                    <span className="text-[10px] font-bold uppercase text-amber-400">Marco Histórico</span>
                  </div>
                  <h4 className="text-sm font-black font-display text-white mt-0.5">
                    {m.title}
                  </h4>
                  {m.description && (
                    <p className="text-xs text-[#4B5563] mt-1 leading-relaxed">
                      {m.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Goal Modal */}
      {isNewGoalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181B] border border-[#27272a] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-[#27272a] flex items-center justify-between">
              <h3 className="text-base font-black font-display text-white">
                Definir Nova Meta de Longevidade
              </h3>
              <button onClick={onCloseNewGoalModal} className="text-[#4B5563] hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateGoal} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-[#4B5563] block mb-1">Título da Meta *</label>
                <input
                  type="text"
                  required
                  value={goalTitle}
                  onChange={e => setGoalTitle(e.target.value)}
                  placeholder="Ex: Conseguir levantar do chão sem auxílio de terceiros"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#121212] border border-[#27272A] text-white text-xs focus:outline-none focus:border-[#374151]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#4B5563] block mb-1">Domínio</label>
                  <select
                    value={goalDomain}
                    onChange={e => setGoalDomain(e.target.value as FunctionalDomain)}
                    className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#27272A] text-white text-xs focus:outline-none"
                  >
                    <option value="autonomy">Autonomia Diária</option>
                    <option value="strength">Força Funcional</option>
                    <option value="mobility">Mobilidade</option>
                    <option value="balance">Equilíbrio</option>
                    <option value="locomotion">Locomoção</option>
                    <option value="endurance">Resistência</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#4B5563] block mb-1">Tarefa de Autonomia</label>
                  <select
                    value={goalAutonomyTask || ''}
                    onChange={e => setGoalAutonomyTask(e.target.value as AutonomyTaskKey || undefined)}
                    className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#27272A] text-white text-xs focus:outline-none"
                  >
                    <option value="">(Opcional / Geral)</option>
                    <option value="stand_up">1. Levantar</option>
                    <option value="walk">2. Caminhar</option>
                    <option value="balance">3. Equilibrar</option>
                    <option value="carry">4. Carregar</option>
                    <option value="climb">5. Subir</option>
                    <option value="squat">6. Agachar</option>
                    <option value="floor_rise">7. Levantar do Chão</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#4B5563] block mb-1">Valor Inicial</label>
                  <input
                    type="number"
                    step="0.1"
                    value={goalInitialValue}
                    onChange={e => setGoalInitialValue(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#27272A] text-white text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#4B5563] block mb-1">Valor Alvo</label>
                  <input
                    type="number"
                    step="0.1"
                    value={goalTargetValue}
                    onChange={e => setGoalTargetValue(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#27272A] text-white text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#4B5563] block mb-1">Unidade</label>
                  <input
                    type="text"
                    value={goalUnit}
                    onChange={e => setGoalUnit(e.target.value)}
                    placeholder="reps, s, kg..."
                    className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#27272A] text-white text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#4B5563] block mb-1">Prazo / Previsão de Reavaliação</label>
                <input
                  type="date"
                  value={goalTargetDate}
                  onChange={e => setGoalTargetDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#121212] border border-[#27272A] text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#4B5563] block mb-1">Notas e Estratégia de Treino</label>
                <textarea
                  rows={2}
                  value={goalNotes}
                  onChange={e => setGoalNotes(e.target.value)}
                  placeholder="Enfatizar agachamento em banco, trabalho de quadríceps e estabilização de core..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#121212] border border-[#27272A] text-white text-xs focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[#27272a] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onCloseNewGoalModal}
                  className="px-4 py-2 rounded-xl bg-[#27272A] text-[#4B5563] text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black uppercase tracking-wider"
                >
                  Salvar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
