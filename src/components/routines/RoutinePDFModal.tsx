import React, { useRef, useState, useMemo } from 'react';
import { 
  X, Printer, Download, Share2, FileText, Check, Layers, ChevronRight, Calendar, Info
} from 'lucide-react';
import { WorkoutRoutine, Student, TrainingCycle, RoutineWorkout, WorkoutTemplate } from '../../types';
import { useApp } from '../../context/AppContext';
import { exportElementToPDF } from '../../services/pdfExportService';
import { buildTFIVEFilename } from '../../utils/fileDownloadService';
import { RoutinePDFDocument } from './RoutinePDFDocument';

interface RoutinePDFModalProps {
  sourceType?: 'routine' | 'template';
  student?: Student;
  routine?: WorkoutRoutine;
  template?: WorkoutTemplate;
  studentCycles?: TrainingCycle[];
  onClose: () => void;
}

export const RoutinePDFModal: React.FC<RoutinePDFModalProps> = ({
  sourceType = 'routine',
  student: initialStudent,
  routine,
  template,
  studentCycles = [],
  onClose
}) => {
  const { students } = useApp();
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudent?.id || '');
  
  const student = sourceType === 'routine' ? initialStudent : students.find(s => s.id === selectedStudentId);
  const program = sourceType === 'routine' ? routine! : template!;

  const documentRef = useRef<HTMLDivElement>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Format selection
  const [format, setFormat] = useState<'SINGLE' | 'MICRO' | 'MONTHLY' | 'QUARTERLY' | 'CUSTOM'>('MICRO');
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>(program.workouts[0]?.id || '');
  const [customWeeks, setCustomWeeks] = useState<number>(8);
  
  // Personalization
  const [showStudentInfo, setShowStudentInfo] = useState(true);
  const [showTrainerInfo, setShowTrainerInfo] = useState(true);
  const [showObservations, setShowObservations] = useState(true);
  const [showLoads, setShowLoads] = useState(true);
  
  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async (action: 'download' | 'share') => {
    if (!documentRef.current || isExportingPDF) return;

    try {
      setIsExportingPDF(true);
      
      let formatName = '';
      if (format === 'SINGLE') {
        const w = program.workouts.find(w => w.id === selectedWorkoutId);
        formatName = w ? `Treino_${w.letter}` : 'Treino';
      } else if (format === 'MICRO') {
        formatName = 'Microciclo';
      } else if (format === 'MONTHLY') {
        formatName = 'Programa_4_Semanas';
      } else if (format === 'QUARTERLY') {
        formatName = 'Programa_12_Semanas';
      } else {
        formatName = `Programa_${customWeeks}_Semanas`;
      }
      
      let filename = '';
      if (student) {
        filename = buildTFIVEFilename('Treino', student.name).replace('.pdf', `_${formatName}.pdf`);
      } else {
        const cleanProgramName = ((program as any).title || program.name || 'Programa').replace(/[^a-zA-Z0-9_-]/g, '_');
        filename = buildTFIVEFilename('Treino', cleanProgramName).replace('.pdf', `_${formatName}.pdf`);
      }

      const blob = await exportElementToPDF({
        element: documentRef.current,
        filename,
        scale: 2
      });

      if (action === 'download') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const file = new File([blob], filename, { type: 'application/pdf' });
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Programa de Treinamento${student ? ` - ${student.name}` : ''}`,
            files: [file]
          });
        } else {
          alert('Compartilhamento direto de arquivos não suportado neste dispositivo. O arquivo será baixado.');
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
        }
      }
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Não foi possível gerar o PDF. Verifique o console.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex bg-black/90 backdrop-blur-sm sm:p-6 overflow-hidden">
      <div className="w-full max-w-7xl mx-auto bg-[#050505] sm:rounded-3xl sm:border border-[#27272A] shadow-2xl flex flex-col md:flex-row overflow-hidden">
        
        {/* ESQUERDA: Configurações */}
        <div className="w-full md:w-80 lg:w-96 flex-shrink-0 bg-[#121212] border-r border-[#27272A] flex flex-col max-h-[40vh] md:max-h-full overflow-y-auto">
          <div className="p-4 sm:p-6 border-b border-[#27272A] sticky top-0 bg-[#121212]/95 backdrop-blur z-10 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-display uppercase tracking-wider text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#D90429]" />
                Gerar PDF
              </h2>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Programa de Treinamento
              </p>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-6 flex-1">
            {/* Formato */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider block">
                1. Formato do Programa
              </label>
              
              <div className="space-y-2">
                {[
                  { id: 'SINGLE', label: 'Treino Avulso', desc: '1 sessão de treino' },
                  { id: 'MICRO', label: 'Microciclo', desc: 'A/B/C completo' },
                  { id: 'MONTHLY', label: 'Programa 4 Semanas', desc: '1 mês de treino' },
                  { id: 'QUARTERLY', label: 'Programa 12 Semanas', desc: '3 meses (Trimestre)' },
                  { id: 'CUSTOM', label: 'Período Personalizado', desc: 'Escolha as semanas' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setFormat(opt.id as any)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      format === opt.id 
                        ? 'bg-[#D90429]/10 border-[#D90429] shadow-md shadow-[#D90429]/5' 
                        : 'bg-[#18181B] border-[#27272A] hover:border-[#374151]'
                    }`}
                  >
                    <div className={`text-sm font-bold ${format === opt.id ? 'text-white' : 'text-[#D1D5DB]'}`}>
                      {opt.label}
                    </div>
                    <div className="text-[11px] text-[#A1A1AA] mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Conteúdo Secundário */}
            {format === 'SINGLE' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider block">
                  Selecione o Treino
                </label>
                <select 
                  value={selectedWorkoutId}
                  onChange={e => setSelectedWorkoutId(e.target.value)}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-[#374151] appearance-none"
                >
                  {program.workouts.map(w => (
                    <option key={w.id} value={w.id}>Treino {w.letter} - {w.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            {format === 'CUSTOM' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider block">
                  Quantidade de Semanas
                </label>
                <input 
                  type="number"
                  min="1"
                  max="52"
                  value={customWeeks}
                  onChange={e => setCustomWeeks(Number(e.target.value))}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-[#374151]"
                />
              </div>
            )}

            {/* Opções Visuais */}
            <div className="space-y-3 pt-2 border-t border-[#27272A]">
              <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider block">
                2. Personalização
              </label>
              
              {sourceType === 'template' && (
                <div className="mb-4">
                  <label className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider block mb-2">
                    Vincular Aluno (Opcional)
                  </label>
                  <select 
                    value={selectedStudentId}
                    onChange={e => setSelectedStudentId(e.target.value)}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-[#374151] appearance-none"
                  >
                    <option value="">Sem aluno / Produto genérico</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-2 hover:bg-[#18181B] rounded-lg cursor-pointer transition-colors">
                  <input type="checkbox" checked={showStudentInfo && !!student} disabled={!student} onChange={e => setShowStudentInfo(e.target.checked)} className="w-4 h-4 rounded accent-[#D90429] bg-[#121212] border-[#374151] disabled:opacity-50" />
                  <span className="text-sm font-medium text-white">Mostrar dados do Aluno</span>
                </label>
                <label className="flex items-center gap-3 p-2 hover:bg-[#18181B] rounded-lg cursor-pointer transition-colors">
                  <input type="checkbox" checked={showTrainerInfo} onChange={e => setShowTrainerInfo(e.target.checked)} className="w-4 h-4 rounded accent-[#D90429] bg-[#121212] border-[#374151]" />
                  <span className="text-sm font-medium text-white">Mostrar dados do Treinador</span>
                </label>
                <label className="flex items-center gap-3 p-2 hover:bg-[#18181B] rounded-lg cursor-pointer transition-colors">
                  <input type="checkbox" checked={showObservations} onChange={e => setShowObservations(e.target.checked)} className="w-4 h-4 rounded accent-[#D90429] bg-[#121212] border-[#374151]" />
                  <span className="text-sm font-medium text-white">Mostrar observações dos exercícios</span>
                </label>
                <label className="flex items-center gap-3 p-2 hover:bg-[#18181B] rounded-lg cursor-pointer transition-colors">
                  <input type="checkbox" checked={showLoads} onChange={e => setShowLoads(e.target.checked)} className="w-4 h-4 rounded accent-[#D90429] bg-[#121212] border-[#374151]" />
                  <span className="text-sm font-medium text-white">Mostrar cargas de referência</span>
                </label>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 border-t border-[#27272A] bg-[#121212] sticky bottom-0 z-10 grid grid-cols-2 gap-3">
            <button
              onClick={() => handleExportPDF('share')}
              disabled={isExportingPDF}
              className="py-3 px-4 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-black/20 disabled:opacity-50"
            >
              {isExportingPDF ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Compartilhar</span>
                </>
              )}
            </button>
            <button
              onClick={() => handleExportPDF('download')}
              disabled={isExportingPDF}
              className="py-3 px-4 rounded-xl bg-[#D90429] hover:bg-[#A60321] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-[#D90429]/20 disabled:opacity-50"
            >
              {isExportingPDF ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Baixar PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* DIREITA: Pré-visualização */}
        <div className="flex-1 bg-zinc-900/50 flex flex-col min-h-[50vh] relative">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#121212]/80 backdrop-blur border border-[#27272A] rounded-full px-4 py-2 text-xs font-bold text-[#A1A1AA] flex items-center gap-2 z-10 shadow-lg">
            <Info className="w-4 h-4 text-blue-400" />
            Pré-visualização do Documento
          </div>

          <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center print-container scrollbar-thin">
            {/* Elemento oculto visível apenas no DOM para o HTML2Canvas processar no tamanho real A4 */}
            <div className="bg-white shadow-2xl origin-top sm:scale-100 scale-[0.6] min-h-[297mm] min-w-[210mm] max-w-[210mm] transition-all relative">
              <div ref={documentRef}>
                <RoutinePDFDocument 
                  student={student}
                  program={program}
                  studentCycles={studentCycles}
                  format={format}
                  selectedWorkoutId={selectedWorkoutId}
                  customWeeks={customWeeks}
                  options={{
                    showStudentInfo,
                    showTrainerInfo,
                    showObservations,
                    showLoads
                  }}
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
