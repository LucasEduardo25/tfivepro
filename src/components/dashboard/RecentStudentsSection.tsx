import React from 'react';
import { Users, ChevronRight, UserPlus, Dumbbell } from 'lucide-react';
import { Student } from '../../types';
import { RecentStudentItem } from '../../utils/dashboardMetrics';
import { StudentAvatar } from '../common/StudentAvatar';

interface RecentStudentsSectionProps {
  students: RecentStudentItem[];
  onSelectStudent: (student: Student) => void;
  onOpenAllStudents: () => void;
  onOpenNewStudent: () => void;
}

export const RecentStudentsSection: React.FC<RecentStudentsSectionProps> = ({
  students,
  onSelectStudent,
  onOpenAllStudents,
  onOpenNewStudent
}) => {
  return (
    <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#374151]">
            <Users className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-xs font-black uppercase tracking-wider text-white">
            Alunos Recentes ({students.length})
          </h2>
        </div>

        <button
          onClick={onOpenAllStudents}
          className="text-[11px] font-bold text-[#4B5563] hover:text-white flex items-center gap-1 transition-colors"
        >
          <span>Ver Todos</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {students.length === 0 ? (
        <div className="text-center py-6 px-4 rounded-xl bg-[#050505] border border-[#27272a] space-y-2">
          <p className="text-xs font-bold text-[#4B5563]">Nenhum aluno cadastrado</p>
          <button
            onClick={onOpenNewStudent}
            className="text-xs font-bold text-[#374151] hover:underline"
          >
            Cadastrar primeiro aluno
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {students.map(({ student, firstName, lastWorkoutDateLabel, totalWorkouts }) => (
            <div
              key={student.id}
              onClick={() => onSelectStudent(student)}
              className="p-3 rounded-xl bg-[#050505] border border-[#27272a] hover:border-[#374151] hover:bg-[#18181B] transition-all cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <StudentAvatar student={student} size="sm" />
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-white group-hover:text-[#1F2937] transition-colors truncate">
                    {student.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] text-[#71717A]">
                    <span>Último: <strong className="text-[#4B5563]">{lastWorkoutDateLabel}</strong></span>
                    <span>•</span>
                    <span>{totalWorkouts} {totalWorkouts === 1 ? 'treino' : 'treinos'}</span>
                  </div>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-[#71717A] group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
