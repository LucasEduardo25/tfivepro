import React from 'react';
import { WorkoutRoutine, Student, TrainingCycle, RoutineWorkout, RoutineExercise, WorkoutTemplate } from '../../types';


import { Clock, Dumbbell, Activity, Calendar, User } from 'lucide-react';

interface RoutinePDFDocumentProps {
  student?: Student;
  program: WorkoutRoutine | WorkoutTemplate;
  studentCycles?: TrainingCycle[];
  format: 'SINGLE' | 'MICRO' | 'MONTHLY' | 'QUARTERLY' | 'CUSTOM';
  selectedWorkoutId?: string;
  customWeeks?: number;
  options: {
    showStudentInfo: boolean;
    showTrainerInfo: boolean;
    showObservations: boolean;
    showLoads: boolean;
  };
}

export const RoutinePDFDocument: React.FC<RoutinePDFDocumentProps> = ({
  student,
  program,
  studentCycles = [],
  format: docFormat,
  selectedWorkoutId,
  customWeeks,
  options
}) => {
  const isMultiWeek = docFormat === 'MONTHLY' || docFormat === 'QUARTERLY' || docFormat === 'CUSTOM';
  
  let weeksCount = 0;
  if (docFormat === 'MONTHLY') weeksCount = 4;
  else if (docFormat === 'QUARTERLY') weeksCount = 12;
  else if (docFormat === 'CUSTOM') weeksCount = customWeeks || 4;

  const getWorkoutsToRender = (): RoutineWorkout[] => {
    if (docFormat === 'SINGLE') {
      const w = program.workouts.find(w => w.id === selectedWorkoutId);
      return w ? [w] : [];
    }
    return program.workouts || [];
  };

  const workouts = getWorkoutsToRender();

  const renderCover = () => {
    if (!isMultiWeek) return null;
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[297mm] p-12 bg-white relative overflow-hidden" style={{ pageBreakAfter: 'always' }}>
        {/* Decorator */}
        <div className="absolute top-0 left-0 w-full h-4 bg-[#D90429]"></div>
        <div className="absolute -right-32 -top-32 w-96 h-96 bg-zinc-50 rounded-full blur-3xl opacity-50"></div>
        
        <div className="flex-1 flex flex-col items-center justify-center text-center w-full z-10">
          <h1 className="text-4xl font-black tracking-widest text-[#050505] uppercase mb-4">
            TFIVE PRO
          </h1>
          <div className="w-16 h-1 bg-[#D90429] mb-12"></div>
          
          <h2 className="text-3xl font-light text-zinc-800 uppercase tracking-widest mb-2">
            Programa de Treinamento
          </h2>
          {program.objective && (
            <h3 className="text-5xl font-black text-[#D90429] uppercase mb-12">
              {program.objective}
            </h3>
          )}
          
          <div className="text-xl font-bold text-zinc-900 uppercase tracking-widest bg-zinc-100 px-8 py-3 rounded-full mb-16">
            Duração: {weeksCount} Semanas
          </div>
          
          <div className="w-full max-w-lg border border-zinc-200 rounded-2xl p-8 bg-white shadow-xl shadow-zinc-100/50 text-left">
            <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-6">Informações</h4>
            
            {options.showStudentInfo && student && (
              <div className="mb-4">
                <span className="block text-xs font-bold text-zinc-500 uppercase">Aluno</span>
                <span className="block text-lg font-black text-zinc-900">{student.name}</span>
              </div>
            )}
            
            <div className="mb-4">
              <span className="block text-xs font-bold text-zinc-500 uppercase">Período Previsto</span>
                            <span className="block text-lg font-bold text-zinc-800">
                {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(new Date())} — {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(new Date(Date.now() + weeksCount * 7 * 24 * 60 * 60 * 1000))}
              </span>
            </div>
            
            {options.showTrainerInfo && (
              <div>
                <span className="block text-xs font-bold text-zinc-500 uppercase">Treinador</span>
                              <span className="block text-lg font-bold text-zinc-800">
                {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(new Date())} — {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(new Date(Date.now() + weeksCount * 7 * 24 * 60 * 60 * 1000))}
              </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="w-full text-center pb-8 z-10">
          <p className="text-sm font-bold text-zinc-300 uppercase tracking-widest">
            Performance sem desculpas. Resultados sem limites.
          </p>
        </div>
      </div>
    );
  };

  const renderStructure = () => {
    if (!isMultiWeek) return null;
    
    // Find if there's a cycle active for this routine
    const activeCycle = studentCycles.find(c => c.status === 'current' || c.status === 'planned');
    
    return (
      <div className="p-12 min-h-[297mm] bg-white" style={{ pageBreakAfter: 'always' }}>
        <div className="border-b-2 border-zinc-900 pb-4 mb-8">
          <h2 className="text-3xl font-black text-zinc-900 uppercase">Estrutura do Programa</h2>
          <p className="text-zinc-500 mt-2 font-medium">Visão geral do planejamento para as próximas {weeksCount} semanas.</p>
        </div>
        
        {activeCycle && activeCycle.blocks.length > 0 ? (
          <div className="space-y-6">
            {activeCycle.blocks.map((block, idx) => {
              const startWeek = activeCycle.blocks.slice(0, idx).reduce((acc, b) => acc + b.durationWeeks, 0) + 1;
              const endWeek = startWeek + block.durationWeeks - 1;
              if (startWeek > weeksCount) return null; // Skip blocks outside the requested range
              
              return (
                <div key={block.id} className="border border-zinc-200 rounded-2xl p-6 bg-zinc-50 flex flex-col md:flex-row gap-6 items-start break-inside-avoid">
                  <div className="bg-zinc-900 text-white rounded-xl p-4 min-w-[140px] text-center">
                    <span className="block text-xs font-bold uppercase text-zinc-400 mb-1">Semanas</span>
                    <span className="block text-2xl font-black">{startWeek} a {Math.min(endWeek, weeksCount)}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-black text-zinc-900 uppercase mb-2">Bloco {idx + 1}: {block.name}</h3>
                    {block.objective && (
                      <p className="text-sm font-medium text-zinc-600 mb-3">{block.objective}</p>
                    )}
                    <div className="bg-white border border-zinc-200 rounded-lg p-3 inline-flex items-center gap-2">
                      <Dumbbell className="w-4 h-4 text-[#D90429]" />
                      <span className="text-sm font-bold text-zinc-800">
                        {block.routineTitleSnapshot || block.routineId === program.id ? program.title : 'Outra Rotina'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-zinc-200 rounded-2xl p-6 bg-zinc-50 flex flex-col md:flex-row gap-6 items-start break-inside-avoid">
            <div className="bg-zinc-900 text-white rounded-xl p-4 min-w-[140px] text-center">
              <span className="block text-xs font-bold uppercase text-zinc-400 mb-1">Período Único</span>
              <span className="block text-2xl font-black">1 a {weeksCount}</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-zinc-900 uppercase mb-2">Fase Principal</h3>
              <p className="text-sm font-medium text-zinc-600 mb-3">Execução contínua da rotina prescrita.</p>
              <div className="bg-white border border-zinc-200 rounded-lg p-3 inline-flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-[#D90429]" />
                <span className="text-sm font-bold text-zinc-800">{(program as any).title || program.name}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderWorkout = (workout: RoutineWorkout, index: number) => {
    return (
      <div key={workout.id} className="p-12 min-h-[297mm] bg-white relative" style={{ pageBreakBefore: index > 0 ? 'always' : 'auto' }}>
        
        {/* Header */}
        <div className="flex items-end justify-between border-b-4 border-zinc-900 pb-4 mb-8">
          <div>
            <h3 className="text-4xl font-black text-zinc-900 uppercase tracking-tight">Treino {workout.letter}</h3>
            <h4 className="text-xl font-bold text-[#D90429] uppercase tracking-wide mt-1">{workout.name}</h4>
          </div>
          {options.showStudentInfo && student && (
            <div className="text-right">
              <span className="block text-xs font-bold text-zinc-400 uppercase">Aluno</span>
              <span className="block text-sm font-bold text-zinc-800">{student.name}</span>
            </div>
          )}
        </div>

        {/* Exercises Table */}
        <div className="w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="pb-3 border-b-2 border-zinc-200 text-xs font-black text-zinc-400 uppercase tracking-wider w-8">#</th>
                <th className="pb-3 border-b-2 border-zinc-200 text-xs font-black text-zinc-400 uppercase tracking-wider">Exercício</th>
                <th className="pb-3 border-b-2 border-zinc-200 text-xs font-black text-zinc-400 uppercase tracking-wider text-center w-20">Séries</th>
                <th className="pb-3 border-b-2 border-zinc-200 text-xs font-black text-zinc-400 uppercase tracking-wider text-center w-24">Reps / Tempo</th>
                {options.showLoads && (
                  <th className="pb-3 border-b-2 border-zinc-200 text-xs font-black text-zinc-400 uppercase tracking-wider text-center w-20">Carga</th>
                )}
                <th className="pb-3 border-b-2 border-zinc-200 text-xs font-black text-zinc-400 uppercase tracking-wider text-center w-20">Pausa</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {workout.exercises.map((ex, exIdx) => {
                
                let repsStr = `${ex.targetRepsMin}`;
                if (ex.targetRepsMax > ex.targetRepsMin) {
                  repsStr += `-${ex.targetRepsMax}`;
                }
                
                if (ex.targetDurationSeconds) {
                  const m = Math.floor(ex.targetDurationSeconds / 60);
                  const s = ex.targetDurationSeconds % 60;
                  if (m > 0 && s > 0) repsStr = `${m}m ${s}s`;
                  else if (m > 0) repsStr = `${m} min`;
                  else repsStr = `${s} seg`;
                }

                const loadStr = ex.targetRPE ? `RPE ${ex.targetRPE}` : '-';

                return (
                  <React.Fragment key={ex.id}>
                    <tr className="border-b border-zinc-100 group break-inside-avoid">
                      <td className="py-4 align-top">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-zinc-100 text-zinc-500 font-bold text-xs">
                          {exIdx + 1}
                        </span>
                      </td>
                      <td className="py-4 align-top pr-4">
                        <span className="font-bold text-zinc-900 block">{ex.exerciseName}</span>
                        {ex.prescriptionType && ex.prescriptionType !== 'weight_reps' && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-[#D90429]/10 text-[#D90429] text-[10px] font-bold uppercase rounded">
                            {ex.prescriptionType}
                          </span>
                        )}
                        {options.showObservations && ex.notes && (
                          <div className="mt-2 text-xs text-zinc-500 bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                            <strong>Obs:</strong> {ex.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-4 align-top text-center font-black text-zinc-800 text-base">{ex.targetSets}</td>
                      <td className="py-4 align-top text-center font-bold text-zinc-700">{repsStr}</td>
                      {options.showLoads && (
                        <td className="py-4 align-top text-center font-medium text-zinc-500">{loadStr}</td>
                      )}
                      <td className="py-4 align-top text-center font-medium text-zinc-500">{ex.restSeconds}s</td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          
          {workout.exercises.length === 0 && (
            <div className="text-center py-12 text-zinc-400 font-medium italic">
              Nenhum exercício prescrito para este treino.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 left-12 right-12 pt-4 border-t border-zinc-200 flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          <span>TFIVE PRO</span>
          <span>Treino {workout.letter} • {(program as any).title || program.name}</span>
          <span>Página {index + (isMultiWeek ? 3 : 1)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white w-full h-full text-zinc-900 font-sans" style={{ width: '210mm' }}>
      {renderCover()}
      {renderStructure()}
      {workouts.map((w, idx) => renderWorkout(w, idx))}
    </div>
  );
};
