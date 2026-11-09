import React, { useState } from 'react';
import { 
  Student, 
  EvolutionReport 
} from '../../types';
import { useApp } from '../../context/AppContext';
import { 
  FileText, 
  Plus, 
  Calendar, 
  TrendingUp, 
  Award, 
  CheckCircle2, 
  Clock, 
  Eye, 
  Edit, 
  Copy, 
  Trash2, 
  Printer, 
  Share2, 
  Layers, 
  Zap, 
  Activity,
  ArrowRight,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { NewEvolutionReportWizardModal } from './NewEvolutionReportWizardModal';
import { EvolutionReportDetailView } from './EvolutionReportDetailView';
import { EvolutionReportPDFModal } from './EvolutionReportPDFModal';
import { EvolutionReportCompareModal } from './EvolutionReportCompareModal';
import { generateId } from '../../db/indexedDB';

interface EvolutionReportsTabProps {
  student: Student;
}

export const EvolutionReportsTab: React.FC<EvolutionReportsTabProps> = ({ student }) => {
  const { 
    evolutionReports, 
    saveEvolutionReport, 
    deleteEvolutionReport 
  } = useApp();

  const [showWizardModal, setShowWizardModal] = useState<boolean>(false);
  const [editingReport, setEditingReport] = useState<EvolutionReport | null>(null);
  const [viewingReport, setViewingReport] = useState<EvolutionReport | null>(null);
  const [pdfReport, setPdfReport] = useState<EvolutionReport | null>(null);
  const [comparingReports, setComparingReports] = useState<[EvolutionReport, EvolutionReport] | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter reports for this student, sorted descending
  const studentReports = (evolutionReports || [])
    .filter(r => r.studentId === student.id)
    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

  const handleCreateNew = () => {
    setEditingReport(null);
    setShowWizardModal(true);
  };

  const handleEdit = (report: EvolutionReport) => {
    setEditingReport(report);
    setShowWizardModal(true);
  };

  const handleDuplicate = async (report: EvolutionReport) => {
    const duplicated: EvolutionReport = {
      ...report,
      id: generateId('rep'),
      title: `${report.title} (Cópia)`,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      finalizedAt: undefined
    };
    await saveEvolutionReport(duplicated);
  };

  const handleDelete = async (id: string) => {
    await deleteEvolutionReport(id);
    setDeleteConfirmId(null);
    if (viewingReport?.id === id) setViewingReport(null);
  };

  const handleToggleCompareSelect = (id: string) => {
    setSelectedForCompare(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const handleStartComparison = () => {
    if (selectedForCompare.length === 2) {
      const repA = studentReports.find(r => r.id === selectedForCompare[0]);
      const repB = studentReports.find(r => r.id === selectedForCompare[1]);
      if (repA && repB) {
        // Chronological order: older report first
        const sorted = [repA, repB].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        setComparingReports([sorted[0], sorted[1]]);
      }
    }
  };

  // If user opened detail view
  if (viewingReport) {
    return (
      <EvolutionReportDetailView
        report={viewingReport}
        onBack={() => setViewingReport(null)}
        onEdit={(rep) => {
          setViewingReport(null);
          handleEdit(rep);
        }}
        onPrint={(rep) => setPdfReport(rep)}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner / Actions */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#374151]/15 text-[#374151] text-[10px] font-black uppercase tracking-wider">
                Módulo Oficial
              </span>
              <span className="text-xs text-[#4B5563]">
                {studentReports.length} {studentReports.length === 1 ? 'relatório gerado' : 'relatórios gerados'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#1F2937] tracking-tight">
              Relatórios de Performance & Evolução
            </h2>
            <p className="text-xs sm:text-sm text-[#4B5563] mt-1 max-w-2xl">
              Consolidação trimestral, semestral e anual integrando adesão, histórico de cargas, testes de longevidade funcional, avaliação física e parecer do personal trainer.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {studentReports.length >= 2 && (
              <button
                onClick={handleStartComparison}
                disabled={selectedForCompare.length !== 2}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold font-display uppercase tracking-wider flex items-center gap-2 transition-all ${
                  selectedForCompare.length === 2
                    ? 'bg-[#27272A] text-white hover:bg-[#18181B] border border-[#27272A] shadow-sm'
                    : 'bg-[#F8F9FA]/50 text-[#4B5563] border border-[#E5E7EB]/50 cursor-not-allowed'
                }`}
                title={selectedForCompare.length === 2 ? 'Comparar 2 relatórios selecionados' : 'Selecione 2 relatórios abaixo para comparar'}
              >
                <Layers className="w-4 h-4 text-[#374151]" />
                <span>Comparar ({selectedForCompare.length}/2)</span>
              </button>
            )}

            <button
              onClick={handleCreateNew}
              className="px-5 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all shadow-md shadow-xs flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Relatório</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reports List or Empty State */}
      {studentReports.length === 0 ? (
        <div className="bg-white border border-dashed border-[#E5E7EB] rounded-2xl p-10 sm:p-14 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#F8F9FA] border border-[#E5E7EB] flex items-center justify-center mx-auto mb-4 text-[#374151]">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#1F2937] mb-2">
            Nenhum relatório de evolução criado ainda
          </h3>
          <p className="text-xs sm:text-sm text-[#4B5563] max-w-md mx-auto mb-6">
            Gere o primeiro relatório profissional para <strong>{student.name}</strong>. O sistema compilará automaticamente os treinos, cargas, adesão e avaliações do período.
          </p>
          <button
            onClick={handleCreateNew}
            className="px-6 py-3 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all shadow-md shadow-xs inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Relatório de Evolução</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {studentReports.map(report => {
            const isSelectedForCompare = selectedForCompare.includes(report.id);
            const isFinalized = report.status === 'finalized';

            return (
              <div
                key={report.id}
                className={`bg-white border rounded-2xl p-5 transition-all flex flex-col justify-between relative ${
                  isSelectedForCompare 
                    ? 'border-[#374151] shadow-lg shadow-xs' 
                    : 'border-[#E5E7EB] hover:border-[#D1D5DB]'
                }`}
              >
                {/* Card Header */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                        isFinalized 
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' 
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}>
                        {isFinalized ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {isFinalized ? 'Finalizado' : 'Rascunho'}
                      </span>

                      <span className="px-2.5 py-0.5 rounded-full bg-[#F8F9FA] text-[#374151] text-[10px] font-bold uppercase tracking-wider border border-[#E5E7EB]">
                        {report.periodType} ({report.durationDays} dias)
                      </span>
                    </div>

                    {/* Compare Selection Checkbox */}
                    {studentReports.length >= 2 && (
                      <button
                        onClick={() => handleToggleCompareSelect(report.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold font-display uppercase tracking-wider transition-all border ${
                          isSelectedForCompare
                            ? 'bg-[#374151] text-white border-[#374151]'
                            : 'bg-[#F8F9FA] text-[#4B5563] border-[#E5E7EB] hover:text-white'
                        }`}
                        title="Marcar para comparação"
                      >
                        {isSelectedForCompare ? 'Selecionado' : 'Comparar'}
                      </button>
                    )}
                  </div>

                  {/* Title & Dates */}
                  <h3 className="text-base font-bold text-[#1F2937] mb-1 leading-snug line-clamp-1">
                    {report.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[#4B5563] mb-4 font-mono-nums">
                    <Calendar className="w-3.5 h-3.5 text-[#374151]" />
                    <span>{report.startDate} a {report.endDate}</span>
                    <span className="text-[#3F3F46]">•</span>
                    <span className="text-[#374151] font-semibold">{report.primaryGoal}</span>
                  </div>

                  {/* Score & Status Highlight */}
                  <div className="bg-[#F8F9FA] rounded-xl p-3.5 border border-[#E5E7EB] mb-4 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="text-[10px] text-[#4B5563] block uppercase font-bold">Evolution Score</span>
                      <span className="text-xl font-black text-[#1F2937] font-mono-nums flex items-center justify-center gap-1">
                        <Zap className="w-4 h-4 text-[#374151] fill-[#374151]" />
                        {report.evolutionScore?.overallScore || 0}
                        <span className="text-xs text-[#4B5563] font-normal">/100</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#4B5563] block uppercase font-bold">Adesão</span>
                      <span className="text-xl font-black font-display text-emerald-700 dark:text-emerald-400 font-mono-nums">
                        {report.adherence?.adherenceRatePercent || 0}%
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#4B5563] block uppercase font-bold">Treinos</span>
                      <span className="text-xl font-black text-[#1F2937] font-mono-nums">
                        {report.adherence?.completedSessions || 0}
                      </span>
                    </div>
                  </div>

                  {/* Status Tagline */}
                  <div className="mb-4 flex items-center justify-between text-xs">
                    <span className="text-[#4B5563]">Status do Ciclo:</span>
                    <span className="font-bold text-[#27272A] bg-[#F1F1F0] px-2.5 py-0.5 rounded-lg border border-[#D1D5DB]">
                      {report.periodStatus}
                    </span>
                  </div>

                  {/* Key Highlights Snippet */}
                  {report.achievements && report.achievements.length > 0 && (
                    <div className="mb-4 text-xs text-[#4B5563] bg-[#F7F7F6] p-2.5 rounded-lg border border-[#E5E7EB] line-clamp-2">
                      <strong className="text-[#1F2937]">Destaque:</strong> {report.achievements[0].title} — {report.achievements[0].description}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setViewingReport(report)}
                      className="px-3.5 py-2 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-bold font-display uppercase tracking-wider transition-all flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Visualizar</span>
                    </button>

                    <button
                      onClick={() => setPdfReport(report)}
                      className="p-2 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] text-[#374151] hover:text-white border border-[#E5E7EB] transition-all"
                      title="Gerar PDF / Imprimir"
                    >
                      <Printer className="w-4 h-4 text-[#4B5563] hover:text-white" />
                    </button>

                    <button
                      onClick={() => handleEdit(report)}
                      className="p-2 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] text-[#374151] hover:text-white border border-[#E5E7EB] transition-all"
                      title="Editar dados e parecer"
                    >
                      <Edit className="w-4 h-4 text-[#4B5563] hover:text-white" />
                    </button>

                    <button
                      onClick={() => handleDuplicate(report)}
                      className="p-2 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] text-[#374151] hover:text-white border border-[#E5E7EB] transition-all"
                      title="Duplicar relatório"
                    >
                      <Copy className="w-4 h-4 text-[#4B5563] hover:text-white" />
                    </button>
                  </div>

                  {deleteConfirmId === report.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(report.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold uppercase transition-all"
                      >
                        Excluir
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1.5 rounded-lg bg-[#27272A] text-white text-[11px] font-bold uppercase transition-all"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(report.id)}
                      className="p-2 rounded-xl text-[#4B5563] hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Excluir relatório"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODALS */}
      {showWizardModal && (
        <NewEvolutionReportWizardModal
          student={student}
          reportToEdit={editingReport || null}
          onClose={() => {
            setShowWizardModal(false);
            setEditingReport(null);
          }}
          onSaved={(saved) => {
            setShowWizardModal(false);
            setEditingReport(null);
            setViewingReport(saved);
          }}
        />
      )}

      {pdfReport && (
        <EvolutionReportPDFModal
          report={pdfReport}
          student={student}
          onClose={() => setPdfReport(null)}
        />
      )}

      {comparingReports && (
        <EvolutionReportCompareModal
          reportA={comparingReports[0]}
          reportB={comparingReports[1]}
          student={student}
          onClose={() => setComparingReports(null)}
        />
      )}
    </div>
  );
};
