import React from 'react';
import { 
  X, 
  Printer, 
  Activity
} from 'lucide-react';
import { 
  Student, 
  FunctionalAssessment, 
  FunctionalGoal,
  FunctionalMilestone
} from '../../types';
import { useApp } from '../../context/AppContext';
import { 
  computeAutonomyMap, 
  formatTestValue 
} from '../../utils/functionalCalculations';

interface FunctionalReportModalProps {
  student: Student;
  assessment?: FunctionalAssessment;
  goals: FunctionalGoal[];
  milestones: FunctionalMilestone[];
  onClose: () => void;
}

export const FunctionalReportModal: React.FC<FunctionalReportModalProps> = ({
  student,
  assessment,
  goals,
  milestones,
  onClose
}) => {
  const { trainerProfile, functionalAssessments } = useApp();

  const sortedAssessments = React.useMemo(() => {
    return [...functionalAssessments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [functionalAssessments]);

  const activeAssessment = assessment || sortedAssessments[0];

  const autonomySummary = React.useMemo(() => {
    return computeAutonomyMap(functionalAssessments, goals);
  }, [functionalAssessments, goals]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-[#D4D4D4] rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh]">
        
        {/* Modal Top Bar (Hidden on print) */}
        <div className="px-5 py-4 border-b border-[#D4D4D4] bg-[#F8F9FA] flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E5E7EB] border border-[#D4D4D4] flex items-center justify-center">
              <Activity className="w-5 h-5 text-[#262626]" />
            </div>
            <div>
              <h2 className="text-base font-black font-display text-[#262626]">
                Relatório de Longevidade & Autonomia Funcional
              </h2>
              <p className="text-xs text-[#525252]">
                Documento técnico formatado para impressão e compartilhamento com o aluno
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-[#27272A] hover:bg-[#18181B] text-white text-xs font-black font-display uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>

            <button onClick={onClose} className="p-2 rounded-xl bg-[#F1F1F1] text-[#525252] hover:text-[#262626] hover:bg-[#E5E7EB]">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Document */}
        <div className="p-6 sm:p-10 overflow-y-auto bg-[#F1F1F1] text-[#262626] space-y-8 print:p-0 print:bg-white print:text-black">
          
          <div className="bg-white rounded-2xl p-6 sm:p-10 shadow-sm border border-[#D4D4D4] space-y-8">
          
          {/* Document Header */}
          <div className="border-b-2 border-[#D4D4D4] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#525252]">
                TFIVE PRO • AVALIAÇÃO DE CAPACIDADE FÍSICA
              </span>
              <h1 className="text-2xl sm:text-3xl font-black font-display text-[#262626] mt-1">
                Relatório de Longevidade Funcional
              </h1>
              <p className="text-xs text-[#525252] mt-0.5">
                Preservação de autonomia, força, mobilidade e independência motora
              </p>
            </div>

            <div className="text-left sm:text-right text-xs space-y-1">
              <p className="font-bold text-[#262626]">{trainerProfile.name}</p>
              <p className="text-[#525252]">CREF: {trainerProfile.cref || 'Profissional de Educação Física'}</p>
              {trainerProfile.phone && <p className="text-[#525252]">{trainerProfile.phone}</p>}
            </div>
          </div>

          {/* Student Information Banner */}
          <div className="bg-[#F8F9FA] p-4 sm:p-5 rounded-2xl border border-[#D4D4D4] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="text-[#525252] font-bold uppercase text-[10px]">Aluno(a)</p>
              <p className="font-black text-sm text-[#262626] mt-0.5">{student.name}</p>
            </div>

            <div>
              <p className="text-[#525252] font-bold uppercase text-[10px]">Data do Teste</p>
              <p className="font-bold text-[#262626] font-mono-nums mt-0.5">
                {activeAssessment?.date || new Date().toISOString().split('T')[0]}
              </p>
            </div>

            <div>
              <p className="text-[#525252] font-bold uppercase text-[10px]">Protocolo / Bateria</p>
              <p className="font-bold text-[#262626] mt-0.5">
                {activeAssessment?.batteryName || activeAssessment?.title || 'Avaliação Individual'}
              </p>
            </div>

            <div>
              <p className="text-[#525252] font-bold uppercase text-[10px]">Foco do Acompanhamento</p>
              <p className="font-bold text-emerald-700 mt-0.5">
                Autonomia & Vida Diária
              </p>
            </div>
          </div>

          {/* Autonomy Map Status Matrix */}
          <div className="space-y-3">
            <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#404040]">
              1. Mapa de Autonomia Funcional nas 7 Tarefas Cotidianas
            </h3>

            <div className="border border-[#D4D4D4] rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FA] text-[#404040] border-b border-[#D4D4D4]">
                    <th className="p-3 font-bold uppercase">Tarefa Cotidiana</th>
                    <th className="p-3 font-bold uppercase">Linha Anterior</th>
                    <th className="p-3 font-bold uppercase">Última Marca</th>
                    <th className="p-3 font-bold uppercase text-right">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4D4D4]">
                  {autonomySummary.map((item) => (
                    <tr key={item.taskKey} className="hover:bg-[#F9FAFB]">
                      <td className="p-3 font-bold">
                        <div>
                          <p className="text-[#262626]">{item.title}</p>
                          <p className="text-[10px] text-[#525252] font-normal">{item.description}</p>
                        </div>
                      </td>
                      <td className="p-3 font-mono-nums text-[#525252]">
                        {item.comparison && item.comparison.hasPrevious ? item.comparison.previousValueFormatted : '—'}
                      </td>
                      <td className="p-3 font-mono-nums font-black text-[#262626]">
                        {item.latestResult ? formatTestValue(item.latestResult) : 'Não avaliado'}
                      </td>
                      <td className="p-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          item.status === 'improving'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'declining'
                            ? 'bg-rose-100 text-rose-800'
                            : item.isAssessed
                            ? 'bg-blue-100 text-blue-800'
                            : 'text-[#737373]'
                        }`}>
                          {item.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Test Results */}
          {activeAssessment && activeAssessment.results.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#404040]">
                2. Detalhamento dos Testes Realizados nesta Sessão
              </h3>

              <div className="space-y-2.5">
                {activeAssessment.results.map((res) => (
                  <div
                    key={res.id || res.testId}
                    className="p-4 rounded-xl bg-[#F8F9FA] border border-[#D4D4D4] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-[#404040] bg-[#E5E7EB] px-2 py-0.5 rounded-full">
                          {res.domain}
                        </span>
                        <h4 className="font-black text-sm text-[#262626]">
                          {res.testName}
                        </h4>
                      </div>
                      {res.notes && (
                        <p className="text-xs text-[#525252] mt-1 italic">
                          Observações: {res.notes}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold uppercase text-[#525252] block">Marca Atingida</span>
                      <span className="text-lg font-black font-mono-nums text-[#262626]">
                        {formatTestValue(res)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trainer Notes & Recommendations */}
          {activeAssessment?.trainerNotes && (
            <div className="space-y-2">
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#404040]">
                3. Parecer Técnico e Prescrição do Personal Trainer
              </h3>
              <div className="bg-[#F8F9FA] p-4 rounded-xl border border-[#D4D4D4] text-xs text-[#262626] leading-relaxed">
                {activeAssessment.trainerNotes}
              </div>
            </div>
          )}

          {/* Document Signatures */}
          <div className="pt-10 border-t border-[#D4D4D4] grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="w-48 mx-auto border-b border-[#262626] mb-2" />
              <p className="font-bold text-[#262626]">{trainerProfile.name}</p>
              <p className="text-[#525252]">Personal Trainer • CREF: {trainerProfile.cref || '—'}</p>
            </div>

            <div>
              <div className="w-48 mx-auto border-b border-[#262626] mb-2" />
              <p className="font-bold text-[#262626]">{student.name}</p>
              <p className="text-[#525252]">Aluno(a)</p>
            </div>
          </div>

          </div>

        </div>

      </div>
    </div>
  );
};
