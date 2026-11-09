import React, { useState, useMemo, useRef } from 'react';
import { 
  X, 
  Printer, 
  Download,
  Loader2,
  Dumbbell, 
  Trophy, 
  Calendar, 
  Activity,
  Flame, 
  CheckCircle2, 
  TrendingUp, 
  User, 
  Scale, 
  Camera, 
  CheckSquare, 
  FileText, 
  Target, 
  Layers, 
  Sparkles,
  Plus,
  Trash2,
  Check,
  Share2
} from 'lucide-react';
import { 
  Student, 
  WorkoutSession, 
  PhysicalAssessment, 
  TrainerProfile, 
  WorkoutRoutine,
  StudentPhoto,
  PhotoCategory
} from '../../types';
import { useApp } from '../../context/AppContext';
import { formatWeight, formatTimer, calculateAllTimePRs } from '../../utils/calculations';
import { StudentAvatar } from '../common/StudentAvatar';
import { exportElementToPDF } from '../../services/pdfExportService';
import { buildTFIVEFilename } from '../../utils/fileDownloadService';

interface ReportPDFModalProps {
  student: Student;
  trainerProfile?: TrainerProfile;
  trainer?: TrainerProfile;
  sessions: WorkoutSession[];
  assessments: PhysicalAssessment[];
  routines?: WorkoutRoutine[];
  onClose: () => void;
}

export const ReportPDFModal: React.FC<ReportPDFModalProps> = ({
  student,
  trainerProfile,
  trainer: trainerProp,
  sessions,
  assessments,
  routines = [],
  onClose
}) => {
  const { photos } = useApp();

  const activeTrainer = trainerProfile || trainerProp || {
    name: 'Treinador TFIVE',
    cref: 'CREF 000000-G/SP',
    phone: '',
    email: '',
    title: 'Personal Trainer',
    slogan: 'Performance sem desculpas. Resultados sem limites.'
  };

  // Report configuration
  const [reportFormat, setReportFormat] = useState<'quick' | 'complete'>('complete');
  const [periodType, setPeriodType] = useState<'Mensal' | 'Trimestral' | 'Semestral' | 'Anual' | 'Personalizado'>('Mensal');
  
  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState<string>(thirtyDaysAgoStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Section visibility toggles
  const [includeSummary, setIncludeSummary] = useState<boolean>(true);
  const [includeFrequency, setIncludeFrequency] = useState<boolean>(true);
  const [includeProgression, setIncludeProgression] = useState<boolean>(true);
  const [includePRs, setIncludePRs] = useState<boolean>(true);
  const [includeAssessment, setIncludeAssessment] = useState<boolean>(true);
  const [includeCircumferences, setIncludeCircumferences] = useState<boolean>(true);
  const [includePhotos, setIncludePhotos] = useState<boolean>(true);
  const [includeTrainerNotes, setIncludeTrainerNotes] = useState<boolean>(true);
  const [includeNextGoals, setIncludeNextGoals] = useState<boolean>(true);

  // Trainer notes and objectives
  const [customReportNotes, setCustomReportNotes] = useState<string>(
    `O aluno apresentou excelente assiduidade e comprometimento com os protocolos de treino TFIVE PRO. Notou-se evolução contínua na sobrecarga progressiva, manutenção da técnica estrita e ganhos expressivos de força e composição corporal.`
  );

  const [nextGoals, setNextGoals] = useState<string[]>([
    'Aumentar em 5% a carga nos exercícios compostos principais',
    'Manter frequência mínima de 4 sessões semanais',
    'Atingir meta de composição corporal e redução de 1.5% de gordura'
  ]);
  const [newGoalInput, setNewGoalInput] = useState<string>('');

  // Evolution Photos specific to this student
  const studentPhotos = useMemo(() => {
    return photos
      .filter(p => p.studentId === student.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [photos, student.id]);

  // Selected comparison photos for report
  const [selectedPhotoCategory, setSelectedPhotoCategory] = useState<PhotoCategory>('Frente');
  const [beforePhotoId, setBeforePhotoId] = useState<string>(() => {
    const catPhotos = studentPhotos.filter(p => p.category === 'Frente');
    return catPhotos.length > 0 ? catPhotos[0].id : (studentPhotos[0]?.id || '');
  });
  const [afterPhotoId, setAfterPhotoId] = useState<string>(() => {
    const catPhotos = studentPhotos.filter(p => p.category === 'Frente');
    return catPhotos.length > 1 ? catPhotos[catPhotos.length - 1].id : (studentPhotos[studentPhotos.length - 1]?.id || '');
  });

  // Filter sessions and assessments strictly by studentId and date range
  const { filteredSessions, filteredAssessments, periodLabel } = useMemo(() => {
    const now = new Date();
    let startLimit = new Date(now);

    if (periodType === 'Mensal') {
      startLimit.setDate(now.getDate() - 30);
    } else if (periodType === 'Trimestral') {
      startLimit.setDate(now.getDate() - 90);
    } else if (periodType === 'Semestral') {
      startLimit.setDate(now.getDate() - 180);
    } else if (periodType === 'Anual') {
      startLimit.setDate(now.getDate() - 365);
    } else {
      startLimit = new Date(startDate);
    }

    const endLimit = periodType === 'Personalizado' ? new Date(endDate + 'T23:59:59') : now;

    const sList = sessions.filter(s => {
      if (s.studentId !== student.id || s.status !== 'completed') return false;
      const sDate = new Date(s.startTime);
      return sDate >= startLimit && sDate <= endLimit;
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const aList = assessments.filter(a => {
      if (a.studentId !== student.id) return false;
      const aDate = new Date(a.date);
      return aDate >= startLimit && aDate <= endLimit;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const pLabel = periodType === 'Personalizado'
      ? `${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}`
      : `${periodType} (${startLimit.toLocaleDateString('pt-BR')} a ${now.toLocaleDateString('pt-BR')})`;

    return {
      filteredSessions: sList,
      filteredAssessments: aList.length > 0 ? aList : assessments.filter(a => a.studentId === student.id),
      periodLabel: pLabel
    };
  }, [periodType, startDate, endDate, sessions, assessments, student.id]);

  // Aggregate metrics
  const totalVolume = filteredSessions.reduce((acc, s) => acc + s.totalVolume, 0);
  const totalDuration = filteredSessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const prMap = calculateAllTimePRs(filteredSessions.length > 0 ? filteredSessions : sessions.filter(s => s.studentId === student.id));

  // Assessment summary (first and last in period)
  const latestAssessment = filteredAssessments[filteredAssessments.length - 1];
  const initialAssessment = filteredAssessments[0];

  // Before / After photo objects
  const beforePhoto = studentPhotos.find(p => p.id === beforePhotoId);
  const afterPhoto = studentPhotos.find(p => p.id === afterPhotoId);

  const printableRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const handleDownloadPDF = async (action: 'download' | 'share') => {
    if (!printableRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const filename = buildTFIVEFilename(
        'Evolucao',
        student.name,
        endDate || new Date().toISOString(),
        'pdf'
      );
      
      const pdfBlob = await exportElementToPDF({
        element: printableRef.current,
        filename,
        onProgress: setExportStatus
      });

      if (action === 'share') {
        const { shareOrDownloadFile } = await import('../../utils/fileDownloadService');
        await shareOrDownloadFile({
          blob: pdfBlob,
          filename,
          title: `Relatório de Evolução TFIVE - ${student.name}`,
          text: 'Segue o Relatório de Evolução TFIVE PRO.'
        });
      } else {
        const { downloadBlob } = await import('../../utils/fileDownloadService');
        downloadBlob(pdfBlob, filename);
      }

    } catch (err) {
      console.error('[TFIVE PDF] Erro ao exportar relatório:', err);
      // Direct print fallback if canvas generation fails
      window.print();
    } finally {
      setIsExporting(false);
      setExportStatus(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalInput.trim()) return;
    setNextGoals(prev => [...prev, newGoalInput.trim()]);
    setNewGoalInput('');
  };

  const handleRemoveGoal = (index: number) => {
    setNextGoals(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#27272a] rounded-3xl max-w-5xl w-full my-4 flex flex-col max-h-[96vh] shadow-2xl">
        
        {/* Controls Toolbar (Hidden in Print) */}
        <div className="no-print p-4 sm:p-5 border-b border-[#E5E7EB] bg-white rounded-t-3xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-[#374151] text-white text-[10px] font-black uppercase tracking-wider">
                  Relatório Oficial TFIVE PRO
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[#1F2937]">
                  Relatório de Evolução & Performance
                </h2>
              </div>
              <p className="text-xs text-[#4B5563] mt-0.5">
                Relatório com layout A4 oficial, visualização executiva e dados isolados de {student.name}.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownloadPDF('download')}
                disabled={isExporting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-black font-display uppercase tracking-wider transition-all shadow-md shadow-xs disabled:opacity-80 cursor-pointer"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{exportStatus || 'GERANDO PDF...'}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-zinc-300" />
                    <span>BAIXAR PDF</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleDownloadPDF('share')}
                disabled={isExporting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] hover:text-white border border-[#E5E7EB] text-[#1F2937] text-xs font-black font-display uppercase tracking-wider transition-all disabled:opacity-80 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">COMPARTILHAR PDF</span>
              </button>

              <button
                onClick={onClose}
                className="p-2.5 rounded-xl bg-[#F8F9FA] text-[#4B5563] hover:text-white hover:bg-[#27272A] border border-[#E5E7EB]"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Config Bar: Format & Period */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E5E7EB]/80 text-xs">
            
            {/* Format Toggle */}
            <div className="flex items-center gap-1.5 bg-[#F8F9FA] p-1 rounded-xl border border-[#E5E7EB]">
              <span className="text-[10px] text-[#4B5563] px-2 font-bold uppercase">Formato:</span>
              <button
                onClick={() => setReportFormat('quick')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  reportFormat === 'quick' ? 'bg-[#374151] text-white' : 'text-[#4B5563] hover:text-white'
                }`}
              >
                Rápido (Resumido)
              </button>
              <button
                onClick={() => setReportFormat('complete')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  reportFormat === 'complete' ? 'bg-[#374151] text-white' : 'text-[#4B5563] hover:text-white'
                }`}
              >
                Completo (Executivo)
              </button>
            </div>

            {/* Period Filter */}
            <div className="flex flex-wrap items-center gap-1 bg-[#F8F9FA] p-1 rounded-xl border border-[#E5E7EB]">
              {(['Mensal', 'Trimestral', 'Semestral', 'Anual', 'Personalizado'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setPeriodType(type)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    periodType === type ? 'bg-[#374151] text-white' : 'text-[#4B5563] hover:text-white'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {periodType === 'Personalizado' && (
              <div className="flex items-center gap-2 bg-[#F8F9FA] p-1.5 rounded-xl border border-[#E5E7EB]">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="bg-transparent text-[#262626] px-2 py-0.5 focus:outline-none"
                />
                <span className="text-[#4B5563]">até</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="bg-transparent text-[#262626] px-2 py-0.5 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Section Toggles */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E5E7EB]/50 text-[11px] text-[#4B5563]">
            <span className="font-bold text-[#262626] uppercase text-[10px] mr-1">Seções:</span>
            
            <label className="flex items-center gap-1.5 cursor-pointer bg-[#F8F9FA] px-2.5 py-1 rounded-lg border border-[#E5E7EB]">
              <input
                type="checkbox"
                checked={includeSummary}
                onChange={e => setIncludeSummary(e.target.checked)}
                className="accent-[#374151]"
              />
              <span>Resumo</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer bg-[#F8F9FA] px-2.5 py-1 rounded-lg border border-[#E5E7EB]">
              <input
                type="checkbox"
                checked={includePRs}
                onChange={e => setIncludePRs(e.target.checked)}
                className="accent-[#374151]"
              />
              <span>Recordes (PRs)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer bg-[#F8F9FA] px-2.5 py-1 rounded-lg border border-[#E5E7EB]">
              <input
                type="checkbox"
                checked={includeAssessment}
                onChange={e => setIncludeAssessment(e.target.checked)}
                className="accent-[#374151]"
              />
              <span>Composição Corporal</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer bg-[#F8F9FA] px-2.5 py-1 rounded-lg border border-[#E5E7EB]">
              <input
                type="checkbox"
                checked={includeCircumferences}
                onChange={e => setIncludeCircumferences(e.target.checked)}
                className="accent-[#374151]"
              />
              <span>Circunferências</span>
            </label>

            {studentPhotos.length > 0 && (
              <label className="flex items-center gap-1.5 cursor-pointer bg-[#F8F9FA] px-2.5 py-1 rounded-lg border border-[#E5E7EB]">
                <input
                  type="checkbox"
                  checked={includePhotos}
                  onChange={e => setIncludePhotos(e.target.checked)}
                  className="accent-[#374151]"
                />
                <span>Fotos Comparativas</span>
              </label>
            )}

            <label className="flex items-center gap-1.5 cursor-pointer bg-[#F8F9FA] px-2.5 py-1 rounded-lg border border-[#E5E7EB]">
              <input
                type="checkbox"
                checked={includeTrainerNotes}
                onChange={e => setIncludeTrainerNotes(e.target.checked)}
                className="accent-[#374151]"
              />
              <span>Parecer Técnico</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer bg-[#F8F9FA] px-2.5 py-1 rounded-lg border border-[#E5E7EB]">
              <input
                type="checkbox"
                checked={includeNextGoals}
                onChange={e => setIncludeNextGoals(e.target.checked)}
                className="accent-[#374151]"
              />
              <span>Próximos Objetivos</span>
            </label>
          </div>

          {/* Photo Pair Selector for Report (if photos enabled) */}
          {includePhotos && studentPhotos.length > 0 && (
            <div className="p-3 bg-[#F8F9FA] rounded-xl border border-[#E5E7EB] flex flex-wrap items-center gap-3 text-xs">
              <span className="font-bold text-white flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-[#374151]" />
                <span>Fotos para Comparação no Relatório:</span>
              </span>

              <div className="flex items-center gap-2">
                <span className="text-[#4B5563]">Antes:</span>
                <select
                  value={beforePhotoId}
                  onChange={e => setBeforePhotoId(e.target.value)}
                  className="bg-[#27272A] border border-white/10 rounded-lg px-2 py-1 text-white text-xs"
                >
                  <option value="">Nenhuma</option>
                  {studentPhotos.map(p => (
                    <option key={p.id} value={p.id}>
                      {new Date(p.date).toLocaleDateString('pt-BR')} ({p.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[#4B5563]">Depois:</span>
                <select
                  value={afterPhotoId}
                  onChange={e => setAfterPhotoId(e.target.value)}
                  className="bg-[#27272A] border border-white/10 rounded-lg px-2 py-1 text-white text-xs"
                >
                  <option value="">Nenhuma</option>
                  {studentPhotos.map(p => (
                    <option key={p.id} value={p.id}>
                      {new Date(p.date).toLocaleDateString('pt-BR')} ({p.category})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

        </div>

        {/* PRINTABLE DOCUMENT SHEET (Pure White Background for A4 Perfection) */}
        <div className="overflow-y-auto flex-1 p-3 sm:p-8 bg-[#0a0a0a]">
          <div 
            ref={printableRef}
            className="print-card bg-white text-zinc-950 rounded-2xl p-6 sm:p-12 shadow-2xl max-w-4xl mx-auto space-y-6"
          >
            
            {/* BRANDING HEADER */}
            <div className="flex items-center justify-between border-b-2 border-[#374151] pb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#374151] flex items-center justify-center text-white shadow-sm">
                  <Dumbbell className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="font-display font-black text-3xl tracking-wider text-zinc-950 leading-none">
                    TFIVE <span className="text-[#374151]">PRO</span>
                  </h1>
                  <p className="text-[10px] font-black tracking-widest text-[#374151] uppercase mt-1">
                    {activeTrainer.slogan || 'Performance sem desculpas. Resultados sem limites.'}
                  </p>
                  <p className="text-xs font-bold text-zinc-600 uppercase mt-0.5">
                    {reportFormat === 'complete' ? 'Relatório Executivo de Evolução & Performance' : 'Relatório Sintético de Performance'}
                  </p>
                </div>
              </div>

              <div className="text-right text-xs text-zinc-600">
                <p className="font-black text-sm text-zinc-950">{activeTrainer.name}</p>
                <p className="font-bold text-[#374151]">{activeTrainer.cref || 'Personal Trainer'}</p>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  Emissão: {new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            {/* STUDENT & PERIOD SUMMARY BANNER */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-100 p-4 rounded-2xl text-xs border border-zinc-200">
              <div className="flex items-center gap-3 col-span-2 sm:col-span-1">
                <StudentAvatar
                  name={student.name}
                  photo={student.photo}
                  size="lg"
                  className="w-12 h-12 rounded-xl border border-zinc-300 shrink-0"
                />
                <div className="min-w-0">
                  <span className="text-zinc-600 font-bold block uppercase text-[9px]">Aluno(a)</span>
                  <span className="font-black text-zinc-950 text-sm leading-tight block truncate">{student.name}</span>
                  <span className="text-[10px] text-zinc-600 line-clamp-1">{student.goal || 'Performance Geral'}</span>
                </div>
              </div>

              <div>
                <span className="text-zinc-600 font-bold block uppercase text-[9px]">Período Analisado</span>
                <span className="font-bold text-zinc-950 text-xs block">{periodLabel}</span>
                <span className="text-[10px] text-zinc-600 block">{filteredSessions.length} treinos concluídos</span>
              </div>

              <div>
                <span className="text-zinc-600 font-bold block uppercase text-[9px]">Tempo Total em Treino</span>
                <span className="font-black text-zinc-950 text-sm font-mono-nums">{formatTimer(totalDuration)}</span>
                <span className="text-[10px] text-zinc-600 block">
                  {filteredSessions.length > 0 ? `Média ${(totalDuration / filteredSessions.length / 60).toFixed(0)} min/treino` : '-'}
                </span>
              </div>

              <div>
                <span className="text-zinc-600 font-bold block uppercase text-[9px]">Tonelagem Acumulada</span>
                <span className="font-black text-[#374151] text-sm font-mono-nums">{formatWeight(totalVolume)}</span>
                <span className="text-[10px] text-zinc-600 block">{prMap.size} recordes ativos</span>
              </div>
            </div>

            {/* EXECUTIVE SUMMARY CALLOUT */}
            {includeSummary && (
              <div className="bg-red-50/80 border border-red-200 rounded-2xl p-4 flex items-center gap-3.5 text-xs break-inside-avoid">
                <div className="w-10 h-10 rounded-xl bg-[#374151] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Flame className="w-5 h-5" />
                </div>
                <div className="text-red-950 leading-relaxed">
                  <span className="font-black block uppercase text-[10px] tracking-wider text-[#374151]">
                    Resumo do Período
                  </span>
                  No período selecionado foram completadas <strong className="font-black">{filteredSessions.length} sessões presenciais</strong>,{' '}
                  acumulando uma sobrecarga mecânica total de <strong className="font-black font-mono-nums">{formatWeight(totalVolume)}</strong> e consolidando{' '}
                  <strong className="font-black">{prMap.size} marcas de recorde pessoal (PRs)</strong>.
                </div>
              </div>
            )}

            {/* PHYSICAL ASSESSMENT / BODY COMPOSITION */}
            {includeAssessment && latestAssessment && (
              <div className="border border-zinc-200 rounded-2xl p-5 break-inside-avoid space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-[#374151]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-950">
                      Composição Corporal & Antropometria
                    </h3>
                  </div>
                  <span className="text-[11px] text-zinc-600">
                    Avaliação mais recente: {new Date(latestAssessment.date).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                    <span className="text-[9px] uppercase font-bold text-zinc-600 block">Peso Corporal</span>
                    <p className="text-lg font-black text-zinc-950 font-mono-nums">{latestAssessment.weightKg} kg</p>
                    {initialAssessment && initialAssessment.id !== latestAssessment.id && (
                      <span className="text-[10px] font-bold text-zinc-600">
                        {(latestAssessment.weightKg - initialAssessment.weightKg) > 0 
                          ? `+${(latestAssessment.weightKg - initialAssessment.weightKg).toFixed(1)}kg`
                          : `${(latestAssessment.weightKg - initialAssessment.weightKg).toFixed(1)}kg`}
                      </span>
                    )}
                  </div>

                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                    <span className="text-[9px] uppercase font-bold text-zinc-600 block">% Gordura</span>
                    <p className="text-lg font-black text-[#374151] font-mono-nums">{latestAssessment.bodyFatPercentage}%</p>
                    {initialAssessment && initialAssessment.id !== latestAssessment.id && (
                      <span className={`text-[10px] font-bold ${(latestAssessment.bodyFatPercentage - initialAssessment.bodyFatPercentage) <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {(latestAssessment.bodyFatPercentage - initialAssessment.bodyFatPercentage).toFixed(1)}% delta
                      </span>
                    )}
                  </div>

                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                    <span className="text-[9px] uppercase font-bold text-zinc-600 block">Massa Magra</span>
                    <p className="text-lg font-black text-zinc-950 font-mono-nums">{latestAssessment.leanMassKg} kg</p>
                    {initialAssessment && initialAssessment.id !== latestAssessment.id && (
                      <span className="text-[10px] font-bold text-emerald-600">
                        {(latestAssessment.leanMassKg - initialAssessment.leanMassKg) >= 0 ? '+' : ''}
                        {(latestAssessment.leanMassKg - initialAssessment.leanMassKg).toFixed(1)} kg
                      </span>
                    )}
                  </div>

                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                    <span className="text-[9px] uppercase font-bold text-zinc-600 block">Massa Gorda</span>
                    <p className="text-lg font-black text-zinc-950 font-mono-nums">{latestAssessment.fatMassKg} kg</p>
                    {initialAssessment && initialAssessment.id !== latestAssessment.id && (
                      <span className="text-[10px] font-bold text-zinc-600">
                        {(latestAssessment.fatMassKg - initialAssessment.fatMassKg).toFixed(1)} kg
                      </span>
                    )}
                  </div>
                </div>

                {/* CIRCUMFERENCES TABLE */}
                {includeCircumferences && latestAssessment.circumferences && (
                  <div className="text-xs bg-zinc-50 p-3 rounded-xl border border-zinc-200 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                    <div>
                      <span className="text-[9px] text-zinc-600 block font-bold">Tórax</span>
                      <p className="font-bold text-zinc-950 font-mono-nums">{latestAssessment.circumferences.chest || '-'} cm</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-600 block font-bold">Cintura</span>
                      <p className="font-bold text-zinc-950 font-mono-nums">{latestAssessment.circumferences.waist || '-'} cm</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-600 block font-bold">Abdômen</span>
                      <p className="font-bold text-zinc-950 font-mono-nums">{latestAssessment.circumferences.abdomen || '-'} cm</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-600 block font-bold">Braço Dir.</span>
                      <p className="font-bold text-zinc-950 font-mono-nums">{latestAssessment.circumferences.rightArmContracted || '-'} cm</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-600 block font-bold">Coxa Dir.</span>
                      <p className="font-bold text-zinc-950 font-mono-nums">{latestAssessment.circumferences.rightThigh || '-'} cm</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-600 block font-bold">Panturrilha</span>
                      <p className="font-bold text-zinc-950 font-mono-nums">{latestAssessment.circumferences.rightCalf || '-'} cm</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TOP PRs / RECORD MARKS */}
            {includePRs && (
              <div className="border border-zinc-200 rounded-2xl p-5 break-inside-avoid">
                <div className="flex items-center justify-between mb-3 border-b border-zinc-200 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-[#374151]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-950">
                      Melhores Marcas de Carga (Personal Records)
                    </h3>
                  </div>
                  <span className="text-[11px] text-zinc-600">{prMap.size} recordes consolidados</span>
                </div>

                {prMap.size > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    {Array.from(prMap.values()).slice(0, 6).map(pr => (
                      <div key={pr.exerciseId} className="bg-zinc-50 p-2.5 rounded-xl flex items-center justify-between border border-zinc-200">
                        <div className="min-w-0 flex-1 pr-2">
                          <span className="font-bold text-zinc-950 block truncate">{pr.exerciseName}</span>
                          <span className="text-[10px] text-zinc-600 font-mono-nums">1RM Est: {pr.maxEstimated1RM}kg</span>
                        </div>
                        <span className="font-black text-[#374151] font-mono-nums text-sm whitespace-nowrap">
                          {pr.maxWeight}kg × {pr.bestReps}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600 italic">Nenhum recorde registrado no período.</p>
                )}
              </div>
            )}

            {/* COMPARATIVE EVOLUTION PHOTOS (ANTES / DEPOIS) */}
            {includePhotos && (beforePhoto || afterPhoto) && (
              <div className="border border-zinc-200 rounded-2xl p-5 break-inside-avoid space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-[#374151]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-950">
                      Evolução Fotográfica Comparativa
                    </h3>
                  </div>
                  <span className="text-[11px] text-zinc-600">Registro visual de progresso corporal</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* ANTES */}
                  <div className="space-y-1.5 text-center">
                    <span className="inline-block px-3 py-0.5 rounded-md bg-zinc-200 text-zinc-800 text-[10px] font-black uppercase tracking-wider">
                      ANTES — {beforePhoto ? new Date(beforePhoto.date).toLocaleDateString('pt-BR') : '-'}
                    </span>
                    <div className="bg-zinc-100 rounded-xl overflow-hidden aspect-3/4 max-h-[280px] flex items-center justify-center border border-zinc-200">
                      {beforePhoto ? (
                        <img
                          src={beforePhoto.photoUrl}
                          alt="Antes"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-zinc-600">Sem foto</span>
                      )}
                    </div>
                    {beforePhoto?.notes && (
                      <p className="text-[10px] text-zinc-600 italic truncate">{beforePhoto.notes}</p>
                    )}
                  </div>

                  {/* DEPOIS */}
                  <div className="space-y-1.5 text-center">
                    <span className="inline-block px-3 py-0.5 rounded-md bg-[#374151] text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                      DEPOIS — {afterPhoto ? new Date(afterPhoto.date).toLocaleDateString('pt-BR') : '-'}
                    </span>
                    <div className="bg-zinc-100 rounded-xl overflow-hidden aspect-3/4 max-h-[280px] flex items-center justify-center border border-zinc-200">
                      {afterPhoto ? (
                        <img
                          src={afterPhoto.photoUrl}
                          alt="Depois"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-zinc-600">Sem foto</span>
                      )}
                    </div>
                    {afterPhoto?.notes && (
                      <p className="text-[10px] text-zinc-600 italic truncate">{afterPhoto.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TRAINER WRITTEN ANALYSIS */}
            {includeTrainerNotes && (
              <div className="border border-zinc-200 rounded-2xl p-5 break-inside-avoid space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-950 mb-1">
                  Parecer Técnico & Diretrizes do Treinador
                </h3>
                <div className="no-print mb-2">
                  <textarea
                    value={customReportNotes}
                    onChange={e => setCustomReportNotes(e.target.value)}
                    className="w-full text-xs p-3 border border-zinc-300 rounded-xl bg-white text-zinc-900 focus:outline-none focus:border-[#374151]"
                    rows={3}
                  />
                </div>
                <p className="text-xs text-zinc-700 leading-relaxed italic bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                  &quot;{customReportNotes}&quot;
                </p>
              </div>
            )}

            {/* NEXT CYCLE OBJECTIVES */}
            {includeNextGoals && (
              <div className="border border-zinc-200 rounded-2xl p-5 break-inside-avoid space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-[#374151]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-950">
                      Próximos Objetivos & Metas do Ciclo
                    </h3>
                  </div>
                  <span className="text-[10px] text-zinc-600">{nextGoals.length} metas acordadas</span>
                </div>

                <div className="space-y-2">
                  {nextGoals.map((goal, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-xl border border-zinc-200 text-xs">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-[#374151] shrink-0" />
                        <span className="font-semibold text-zinc-800">{goal}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveGoal(idx)}
                        className="no-print text-zinc-600 hover:text-red-500 p-1"
                        title="Remover meta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Goal Input in Editor Toolbar */}
                <form onSubmit={handleAddGoal} className="no-print flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={newGoalInput}
                    onChange={e => setNewGoalInput(e.target.value)}
                    placeholder="Adicionar nova meta para o próximo ciclo..."
                    className="flex-1 text-xs px-3 py-2 border border-zinc-300 rounded-xl bg-white text-zinc-900 focus:outline-none focus:border-[#374151]"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-900 text-white text-xs font-bold rounded-xl flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </form>
              </div>
            )}

            {/* OFFICIAL SIGNATURE & FOOTER */}
            <div className="pt-6 flex items-center justify-between border-t border-zinc-200 text-xs text-zinc-600 break-inside-avoid">
              <div>
                <p className="font-black text-zinc-950 text-sm">TFIVE PRO</p>
                <p className="text-[10px]">Sistema Oficial de Treinamento & Alta Performance</p>
              </div>

              <div className="text-center">
                <div className="w-48 border-b border-zinc-400 mb-1" />
                <p className="font-black text-zinc-950">{activeTrainer.name}</p>
                <p className="text-[10px] text-zinc-600">{activeTrainer.cref || 'Personal Trainer Responsável'}</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
