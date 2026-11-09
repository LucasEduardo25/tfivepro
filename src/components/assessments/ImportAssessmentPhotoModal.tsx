/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TFIVE PRO — Modal de Importação de Avaliação Física por Foto
 * 
 * Fluxo obrigatório:
 * FOTO/SCREENSHOT → EXTRAÇÃO AUTOMÁTICA LOCAL → CONFERÊNCIA E EDIÇÃO → SALVAR NOVA AVALIAÇÃO
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCw, 
  Eye, 
  ZoomIn, 
  Calculator, 
  ArrowLeft, 
  Save, 
  ShieldCheck,
  HelpCircle,
  Clock,
  User
} from 'lucide-react';
import { Student, PhysicalAssessment, AssessmentProtocol, AssessmentSource, FieldProvenance } from '../../types';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../db/indexedDB';
import { optimizeImageFile } from '../../utils/imageOptimizer';
import { 
  performAssessmentOCR, 
  ExtractedAssessmentData, 
  OcrProgressEvent, 
  calculateDerivedAssessmentMetrics 
} from '../../services/assessmentOcrService';

interface ImportAssessmentPhotoModalProps {
  student: Student;
  onClose: () => void;
  onAssessmentSaved?: (assessment: PhysicalAssessment) => void;
}

type Step = 'select' | 'preview' | 'processing' | 'review';

export const ImportAssessmentPhotoModal: React.FC<ImportAssessmentPhotoModalProps> = ({
  student,
  onClose,
  onAssessmentSaved
}) => {
  const { assessments, saveAssessment } = useApp();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<Step>('select');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [ocrProgress, setOcrProgress] = useState<OcrProgressEvent>({
    stage: 'preprocessing',
    progress: 0,
    message: 'Preparando imagem...'
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form & Review State
  const [assessmentDate, setAssessmentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [protocol, setProtocol] = useState<AssessmentProtocol>('bioimpedance');
  const [keepOriginalImage, setKeepOriginalImage] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');

  // Primary Metrics
  const [weightKg, setWeightKg] = useState<string>('');
  const [heightCm, setHeightCm] = useState<string>('');
  const [bmi, setBmi] = useState<string>('');
  const [bodyFatPercentage, setBodyFatPercentage] = useState<string>('');
  const [fatMassKg, setFatMassKg] = useState<string>('');
  const [leanMassPercentage, setLeanMassPercentage] = useState<string>('');
  const [leanMassKg, setLeanMassKg] = useState<string>('');
  const [waistHipRatio, setWaistHipRatio] = useState<string>('');

  // Circumferences
  const [circumferences, setCircumferences] = useState<{
    chest: string;
    waist: string;
    abdomen: string;
    hips: string;
    rightArmContracted: string;
    leftArmContracted: string;
    rightArmRelaxed: string;
    leftArmRelaxed: string;
    rightForearm: string;
    leftForearm: string;
    rightThigh: string;
    leftThigh: string;
    rightCalf: string;
    leftCalf: string;
    neck: string;
    shoulders: string;
  }>({
    chest: '',
    waist: '',
    abdomen: '',
    hips: '',
    rightArmContracted: '',
    leftArmContracted: '',
    rightArmRelaxed: '',
    leftArmRelaxed: '',
    rightForearm: '',
    leftForearm: '',
    rightThigh: '',
    leftThigh: '',
    rightCalf: '',
    leftCalf: '',
    neck: '',
    shoulders: ''
  });

  // Skinfolds
  const [skinfolds, setSkinfolds] = useState<{
    triceps: string;
    subscapular: string;
    suprailiac: string;
    abdominal: string;
    thigh: string;
    chest: string;
    midaxillary: string;
  }>({
    triceps: '',
    subscapular: '',
    suprailiac: '',
    abdominal: '',
    thigh: '',
    chest: '',
    midaxillary: ''
  });

  // Metadata & Warnings
  const [provenanceMap, setProvenanceMap] = useState<Record<string, FieldProvenance>>({});
  const [warningsMap, setWarningsMap] = useState<Record<string, string>>({});
  const [originalClassifications, setOriginalClassifications] = useState<Record<string, string>>({});
  const [rawOcrText, setRawOcrText] = useState<string>('');
  const [showRawText, setShowRawText] = useState<boolean>(false);
  const [activeTabMobile, setActiveTabMobile] = useState<'form' | 'image'>('form');

  // Check for duplicate assessment on the same date
  const existingAssessmentOnDate = assessments.find(
    a => a.studentId === student.id && a.date === assessmentDate
  );

  // Handle Image File Selection
  const handleFileSelect = async (file: File) => {
    if (!file) return;
    setErrorMessage(null);
    setImageFileName(file.name || 'avaliacao_foto.jpg');

    try {
      // Optimize image locally
      const optimized = await optimizeImageFile(file, 1800, 0.9);
      setSelectedImage(optimized);
      setStep('preview');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao processar arquivo de imagem.';
      setErrorMessage(msg);
    }
  };

  // Start OCR Extraction Process
  const handleStartExtraction = async () => {
    if (!selectedImage) return;
    setStep('processing');
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await performAssessmentOCR(selectedImage, (prog) => {
        setOcrProgress(prog);
      });

      // Populate Form from Extraction Result
      if (result.assessmentDate) {
        setAssessmentDate(result.assessmentDate);
      }
      if (result.protocol) {
        setProtocol(result.protocol);
      }
      if (result.weightKg !== undefined) {
        setWeightKg(result.weightKg.toString());
      }
      if (result.heightCm !== undefined) {
        setHeightCm(result.heightCm.toString());
      }
      if (result.bmi !== undefined) {
        setBmi(result.bmi.toString());
      }
      if (result.bodyFatPercentage !== undefined) {
        setBodyFatPercentage(result.bodyFatPercentage.toString());
      }
      if (result.fatMassKg !== undefined) {
        setFatMassKg(result.fatMassKg.toString());
      }
      if (result.leanMassPercentage !== undefined) {
        setLeanMassPercentage(result.leanMassPercentage.toString());
      }
      if (result.leanMassKg !== undefined) {
        setLeanMassKg(result.leanMassKg.toString());
      }
      if (result.waistHipRatio !== undefined) {
        setWaistHipRatio(result.waistHipRatio.toString());
      }

      // Populate circumferences
      if (result.circumferences) {
        setCircumferences(prev => ({
          ...prev,
          chest: result.circumferences?.chest?.toString() || '',
          waist: result.circumferences?.waist?.toString() || '',
          abdomen: result.circumferences?.abdomen?.toString() || '',
          hips: result.circumferences?.hips?.toString() || '',
          rightArmContracted: result.circumferences?.rightArmContracted?.toString() || '',
          leftArmContracted: result.circumferences?.leftArmContracted?.toString() || '',
          rightArmRelaxed: result.circumferences?.rightArmRelaxed?.toString() || '',
          leftArmRelaxed: result.circumferences?.leftArmRelaxed?.toString() || '',
          rightForearm: result.circumferences?.rightForearm?.toString() || '',
          leftForearm: result.circumferences?.leftForearm?.toString() || '',
          rightThigh: result.circumferences?.rightThigh?.toString() || '',
          leftThigh: result.circumferences?.leftThigh?.toString() || '',
          rightCalf: result.circumferences?.rightCalf?.toString() || '',
          leftCalf: result.circumferences?.leftCalf?.toString() || '',
          neck: result.circumferences?.neck?.toString() || '',
          shoulders: result.circumferences?.shoulders?.toString() || ''
        }));
      }

      // Populate skinfolds
      if (result.skinfolds) {
        setSkinfolds(prev => ({
          ...prev,
          triceps: result.skinfolds?.triceps?.toString() || '',
          subscapular: result.skinfolds?.subscapular?.toString() || '',
          suprailiac: result.skinfolds?.suprailiac?.toString() || '',
          abdominal: result.skinfolds?.abdominal?.toString() || '',
          thigh: result.skinfolds?.thigh?.toString() || '',
          chest: result.skinfolds?.chest?.toString() || '',
          midaxillary: result.skinfolds?.midaxillary?.toString() || ''
        }));
      }

      setProvenanceMap(result.provenance || {});
      setWarningsMap(result.fieldWarnings || {});
      setOriginalClassifications(result.originalClassifications || {});
      setRawOcrText(result.rawText || '');

      setStep('review');
    } catch (err: unknown) {
      console.error('OCR Processing error:', err);
      setErrorMessage('Não foi possível ler os dados da imagem. Você ainda pode preencher os dados manualmente.');
      setStep('review');
    } finally {
      setIsProcessing(false);
    }
  };

  // Trigger Derived Calculations
  const handleCalculateDerived = () => {
    const w = parseFloat(weightKg);
    const h = parseFloat(heightCm);
    const bf = parseFloat(bodyFatPercentage);
    const lm = parseFloat(leanMassKg);
    const fm = parseFloat(fatMassKg);

    const derived = calculateDerivedAssessmentMetrics(
      isNaN(w) ? undefined : w,
      isNaN(h) ? undefined : h,
      isNaN(bf) ? undefined : bf,
      isNaN(lm) ? undefined : lm,
      isNaN(fm) ? undefined : fm
    );

    if (derived.calculatedBmi && !bmi) {
      setBmi(derived.calculatedBmi.toString());
      setProvenanceMap(p => ({ ...p, bmi: 'calculated' }));
    }
    if (derived.calculatedFatMassKg && !fatMassKg) {
      setFatMassKg(derived.calculatedFatMassKg.toString());
      setProvenanceMap(p => ({ ...p, fatMassKg: 'calculated' }));
    }
    if (derived.calculatedLeanMassKg && !leanMassKg) {
      setLeanMassKg(derived.calculatedLeanMassKg.toString());
      setProvenanceMap(p => ({ ...p, leanMassKg: 'calculated' }));
    }
    if (derived.calculatedLeanMassPercentage && !leanMassPercentage) {
      setLeanMassPercentage(derived.calculatedLeanMassPercentage.toString());
      setProvenanceMap(p => ({ ...p, leanMassPercentage: 'calculated' }));
    }

    // Auto-calculate Waist-Hip Ratio if both are present
    const waistNum = parseFloat(circumferences.waist);
    const hipNum = parseFloat(circumferences.hips);
    if (!isNaN(waistNum) && !isNaN(hipNum) && hipNum > 0 && !waistHipRatio) {
      const whr = (waistNum / hipNum).toFixed(2);
      setWaistHipRatio(whr);
      setProvenanceMap(p => ({ ...p, waistHipRatio: 'calculated' }));
    }
  };

  // Helper to mark field as manually edited
  const handleFieldChange = (key: string, value: string, setter: (v: string) => void) => {
    setter(value);
    setProvenanceMap(p => ({ ...p, [key]: 'manual' }));
    // Clear warning on edit
    if (warningsMap[key]) {
      setWarningsMap(w => {
        const copy = { ...w };
        delete copy[key];
        return copy;
      });
    }
  };

  // Validate and Save Assessment
  const handleSaveAssessment = async () => {
    const wNum = parseFloat(weightKg);
    if (isNaN(wNum) || wNum <= 0) {
      setErrorMessage('Informe um peso corporal válido maior que zero.');
      return;
    }

    const hNum = parseFloat(heightCm) || 170;
    const bfNum = parseFloat(bodyFatPercentage) || 0;
    const fatKgNum = parseFloat(fatMassKg) || ((wNum * bfNum) / 100);
    const leanKgNum = parseFloat(leanMassKg) || (wNum - fatKgNum);
    const bmiNum = parseFloat(bmi) || (wNum / Math.pow(hNum / 100, 2));
    const whrNum = parseFloat(waistHipRatio) || undefined;
    const leanPctNum = parseFloat(leanMassPercentage) || (100 - bfNum);

    // Calculate Student Age on Assessment Date if birthDate exists
    let calculatedAge = 30;
    if (student.birthDate) {
      const birth = new Date(student.birthDate);
      const assessDate = new Date(assessmentDate);
      let age = assessDate.getFullYear() - birth.getFullYear();
      const m = assessDate.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && assessDate.getDate() < birth.getDate())) {
        age--;
      }
      calculatedAge = Math.max(1, age);
    }

    // Build Circumferences object with only provided numbers
    const cleanCircumferences: NonNullable<PhysicalAssessment['circumferences']> = {};
    Object.entries(circumferences).forEach(([k, v]) => {
      const num = parseFloat(v);
      if (!isNaN(num) && num > 0) {
        (cleanCircumferences as any)[k] = num;
      }
    });

    // Build Skinfolds object with only provided numbers
    const cleanSkinfolds: NonNullable<PhysicalAssessment['skinfolds']> = {};
    Object.entries(skinfolds).forEach(([k, v]) => {
      const num = parseFloat(v);
      if (!isNaN(num) && num > 0) {
        (cleanSkinfolds as any)[k] = num;
      }
    });

    const newAssessment: PhysicalAssessment = {
      id: generateId('assessment'),
      studentId: student.id,
      date: assessmentDate,
      weightKg: parseFloat(wNum.toFixed(2)),
      heightCm: parseFloat(hNum.toFixed(1)),
      age: calculatedAge,
      gender: student.gender || 'male',
      protocol,
      source: 'photo_import',
      importedAt: new Date().toISOString(),
      originalImageUrl: keepOriginalImage && selectedImage ? selectedImage : undefined,
      originalClassifications: Object.keys(originalClassifications).length > 0 ? originalClassifications : undefined,
      provenance: provenanceMap,
      bodyFatPercentage: parseFloat(bfNum.toFixed(1)),
      fatMassKg: parseFloat(fatKgNum.toFixed(2)),
      leanMassKg: parseFloat(leanKgNum.toFixed(2)),
      leanMassPercentage: parseFloat(leanPctNum.toFixed(1)),
      waistHipRatio: whrNum ? parseFloat(whrNum.toFixed(2)) : undefined,
      bmi: parseFloat(bmiNum.toFixed(2)),
      circumferences: Object.keys(cleanCircumferences).length > 0 ? cleanCircumferences : undefined,
      skinfolds: Object.keys(cleanSkinfolds).length > 0 ? cleanSkinfolds : undefined,
      notes: notes.trim() ? notes.trim() : undefined,
      updatedAt: new Date().toISOString()
    };

    await saveAssessment(newAssessment);
    if (onAssessmentSaved) {
      onAssessmentSaved(newAssessment);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white border border-[#E5E7EB] rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="px-5 py-4 sm:px-6 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F8F9FA]/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#374151]/15 border border-[#374151]/30 flex items-center justify-center text-[#374151] shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold font-display uppercase tracking-wide text-[#1F2937]">
                  Importar Avaliação por Foto
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Local-First
                </span>
              </div>
              <p className="text-xs text-[#4B5563] flex items-center gap-1.5 mt-0.5">
                <span>Importando para:</span>
                <span className="font-bold text-[#1F2937] bg-[#E5E7EB] px-2 py-0.5 rounded-md">{student.name}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#F8F9FA] text-[#4B5563] hover:text-[#1F2937] hover:bg-[#E5E7EB] border border-[#E5E7EB] transition-all cursor-pointer"
            title="Fechar sem salvar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-amber-300">Atenção</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* STEP 1: IMAGE ORIGIN SELECTION */}
          {step === 'select' && (
            <div className="space-y-6">
              <div className="text-center max-w-md mx-auto py-2">
                <h4 className="text-base sm:text-lg font-bold text-[#1F2937] mb-1">
                  Envie uma foto, screenshot ou relatório
                </h4>
                <p className="text-xs text-[#4B5563]">
                  O TFIVE PRO analisará a imagem diretamente no seu navegador para extrair peso, IMC, dobras, circunferências e massa magra/gorda.
                </p>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />

              {/* 3 Main Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-6 rounded-2xl bg-[#F8F9FA] hover:bg-[#27272A] border border-[#E5E7EB] hover:border-[#374151] flex flex-col items-center justify-center text-center gap-3 transition-all group cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#374151]/15 group-hover:bg-[#374151] text-[#374151] group-hover:text-white flex items-center justify-center transition-all">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-[#1F2937] group-hover:text-white block">TIRAR FOTO</span>
                    <span className="text-[11px] text-[#4B5563] group-hover:text-zinc-300 mt-1 block">Usar câmera do aparelho</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 rounded-2xl bg-[#F8F9FA] hover:bg-[#27272A] border border-[#E5E7EB] hover:border-[#374151] flex flex-col items-center justify-center text-center gap-3 transition-all group cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#374151]/15 group-hover:bg-[#374151] text-[#374151] group-hover:text-white flex items-center justify-center transition-all">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-[#1F2937] group-hover:text-white block">ESCOLHER DA GALERIA</span>
                    <span className="text-[11px] text-[#4B5563] group-hover:text-zinc-300 mt-1 block">Fotos e capturas de tela</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 rounded-2xl bg-[#F8F9FA] hover:bg-[#27272A] border border-[#E5E7EB] hover:border-[#374151] flex flex-col items-center justify-center text-center gap-3 transition-all group cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#374151]/15 group-hover:bg-[#374151] text-[#374151] group-hover:text-white flex items-center justify-center transition-all">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-[#1F2937] group-hover:text-white block">ESCOLHER ARQUIVO</span>
                    <span className="text-[11px] text-[#4B5563] group-hover:text-zinc-300 mt-1 block">JPG, PNG ou WEBP</span>
                  </div>
                </button>
              </div>

              {/* Drag & Drop Area */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFileSelect(f);
                }}
                className="border-2 border-dashed border-[#E5E7EB] rounded-2xl p-8 text-center text-xs text-[#4B5563] flex flex-col items-center justify-center gap-2 hover:border-[#71717A] transition-colors"
              >
                <FileText className="w-8 h-8 text-[#4B5563]" />
                <p className="text-[#1F2937] font-medium">Ou arraste e solte o print ou relatório aqui</p>
                <span className="text-[10px] text-[#4B5563]">Compatível com InBody, Bioimpedâncias, Next Fit, Tecnofit, Planilhas e Relatórios impressos</span>
              </div>

              {/* Privacy Notice */}
              <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB] flex items-center gap-3 text-xs text-[#4B5563]">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <p>
                  <strong className="text-[#1F2937]">Privacidade Garantida:</strong> O processamento OCR é realizado 100% no seu dispositivo (Local-First). Nenhuma imagem é enviada para terceiros.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW BEFORE OCR */}
          {step === 'preview' && selectedImage && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-[#1F2937]">Imagem Selecionada</h4>
                  <p className="text-xs text-[#4B5563]">{imageFileName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="px-3 py-1.5 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB] hover:bg-[#E5E7EB] text-xs font-bold text-[#4B5563] hover:text-[#1F2937] cursor-pointer"
                >
                  Trocar Imagem
                </button>
              </div>

              {/* Image Preview Window */}
              <div className="relative rounded-2xl overflow-hidden bg-black border border-[#E5E7EB] flex items-center justify-center max-h-[380px]">
                <img
                  src={selectedImage}
                  alt="Preview da Avaliação"
                  className="max-h-[380px] w-auto object-contain"
                />
              </div>

              {/* Call to Action Button */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="py-3 px-5 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB] text-[#4B5563] hover:text-[#1F2937] text-xs font-bold hover:bg-[#E5E7EB] cursor-pointer"
                >
                  Voltar
                </button>

                <button
                  type="button"
                  onClick={handleStartExtraction}
                  className="flex-1 py-3.5 px-6 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all shadow-lg shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>LER AVALIAÇÃO COM OCR</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PROCESSING OCR */}
          {step === 'processing' && (
            <div className="py-12 px-4 text-center space-y-6 max-w-md mx-auto">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-[#E5E7EB]" />
                <div className="absolute inset-0 rounded-full border-4 border-[#374151] border-t-transparent animate-spin" />
                <Camera className="w-8 h-8 text-[#374151] animate-pulse" />
              </div>

              <div className="space-y-2">
                <h4 className="text-lg font-bold text-[#1F2937] font-display uppercase tracking-wide">
                  Lendo Avaliação...
                </h4>
                <p className="text-xs text-[#4B5563]">
                  {ocrProgress.message}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[#F8F9FA] h-2.5 rounded-full overflow-hidden border border-[#E5E7EB]">
                <div 
                  className="h-full bg-[#374151] transition-all duration-300 rounded-full"
                  style={{ width: `${ocrProgress.progress}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] text-[#4B5563] pt-2">
                <div className={ocrProgress.progress >= 20 ? 'text-[#1F2937] font-bold' : ''}>1. Imagem</div>
                <div className={ocrProgress.progress >= 50 ? 'text-[#1F2937] font-bold' : ''}>2. OCR Local</div>
                <div className={ocrProgress.progress >= 85 ? 'text-[#1F2937] font-bold' : ''}>3. Medidas</div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsProcessing(false);
                  setStep('preview');
                }}
                className="text-xs text-[#4B5563] hover:text-[#1F2937] underline pt-4 cursor-pointer"
              >
                Cancelar leitura
              </button>
            </div>
          )}

          {/* STEP 4: REVIEW & EDIT EXTRACTED DATA (CONFERIR DADOS EXTRAÍDOS) */}
          {step === 'review' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* Header Info & Duplicate warning */}
              <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black font-display uppercase text-[#1F2937] tracking-wider">
                      CONFERIR DADOS EXTRAÍDOS
                    </span>
                    <span className="text-[10px] text-[#4B5563]">
                      (Revise e ajuste antes de salvar)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCalculateDerived}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F8F9FA] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-[#1F2937] text-xs font-bold transition-all shrink-0 cursor-pointer"
                    title="Calcular automaticamente métricas ausentes a partir do peso e % de gordura"
                  >
                    <Calculator className="w-3.5 h-3.5 text-[#374151]" />
                    <span>Calcular Métricas Ausentes</span>
                  </button>
                </div>

                {/* Duplicate assessment alert if detected */}
                {existingAssessmentOnDate && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Já existe uma avaliação registrada para esta data ({existingAssessmentOnDate.date})</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        Ao salvar, uma nova avaliação histórica será adicionada sem sobrescrever a anterior.
                      </p>
                    </div>
                  </div>
                )}

                {/* Global Assessment Setup Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E5E7EB]">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#4B5563] mb-1">
                      Data da Avaliação Realizada
                    </label>
                    <input
                      type="date"
                      value={assessmentDate}
                      onChange={e => setAssessmentDate(e.target.value)}
                      className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-bold text-[#1F2937] focus:outline-none focus:border-[#374151]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#4B5563] mb-1">
                      Protocolo / Origem do Exame
                    </label>
                    <select
                      value={protocol}
                      onChange={e => setProtocol(e.target.value as AssessmentProtocol)}
                      className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-bold text-[#1F2937] focus:outline-none focus:border-[#374151]"
                    >
                      <option value="bioimpedance">Bioimpedância (InBody / Balança)</option>
                      <option value="jackson_pollock_7">Dobras Cutâneas (Jackson & Pollock 7)</option>
                      <option value="jackson_pollock_3">Dobras Cutâneas (Jackson & Pollock 3)</option>
                      <option value="external_app">Avaliação Externa / Outro Aplicativo</option>
                      <option value="other">Outro Protocolo</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Mobile View Tabs: Form vs Original Photo */}
              <div className="flex sm:hidden rounded-xl bg-[#F8F9FA] p-1 border border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setActiveTabMobile('form')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTabMobile === 'form' ? 'bg-[#374151] text-white' : 'text-[#4B5563]'
                  }`}
                >
                  Campos & Valores
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabMobile('image')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTabMobile === 'image' ? 'bg-[#374151] text-white' : 'text-[#4B5563]'
                  }`}
                >
                  Foto Original
                </button>
              </div>

              {/* Side-by-Side Grid (Desktop / Tablet) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                
                {/* Left Column: Original Image (Desktop) */}
                <div className={`lg:col-span-4 space-y-3 ${activeTabMobile === 'image' ? 'block' : 'hidden lg:block'}`}>
                  <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#1F2937] flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-[#374151]" />
                        Imagem Fonte
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowRawText(!showRawText)}
                        className="text-[10px] text-[#4B5563] hover:text-[#1F2937] underline cursor-pointer"
                      >
                        {showRawText ? 'Ocultar Texto OCR' : 'Ver Texto OCR'}
                      </button>
                    </div>

                    {selectedImage ? (
                      <div className="rounded-xl overflow-hidden bg-black border border-[#E5E7EB] max-h-[420px] overflow-y-auto">
                        <img
                          src={selectedImage}
                          alt="Imagem Original"
                          className="w-full h-auto object-contain"
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-[#4B5563] text-center py-6">Nenhuma imagem carregada</p>
                    )}

                    {showRawText && rawOcrText && (
                      <div className="p-2.5 rounded-xl bg-white border border-[#E5E7EB] text-[10px] font-mono text-[#4B5563] max-h-36 overflow-y-auto whitespace-pre-wrap">
                        {rawOcrText}
                      </div>
                    )}

                    {/* External Classifications Badges */}
                    {Object.keys(originalClassifications).length > 0 && (
                      <div className="pt-2 border-t border-[#E5E7EB] space-y-1">
                        <span className="text-[10px] font-bold uppercase text-[#4B5563] block">
                          Classificações Identificadas no Relatório
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(originalClassifications).map(([k, v]) => (
                            <span key={k} className="px-2 py-0.5 rounded-md bg-[#E5E7EB] text-[#4B5563] text-[10px] font-bold">
                              {k}: <strong className="text-[#1F2937]">{v}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Editable Assessment Fields */}
                <div className={`lg:col-span-8 space-y-5 ${activeTabMobile === 'form' ? 'block' : 'hidden lg:block'}`}>
                  
                  {/* 1. Composição Corporal Principal */}
                  <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
                    <h5 className="text-xs font-black font-display uppercase tracking-wider text-[#374151] flex items-center justify-between">
                      <span>Composição Corporal</span>
                      <span className="text-[10px] font-normal text-[#4B5563]">Todos os valores editáveis</span>
                    </h5>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      {/* Peso */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold uppercase text-[#4B5563]">
                            Peso (kg) *
                          </label>
                          {provenanceMap.weightKg === 'imported' && (
                            <span className="text-[9px] font-bold text-emerald-400">OCR</span>
                          )}
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={weightKg}
                          onChange={e => handleFieldChange('weightKg', e.target.value, setWeightKg)}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#1F2937] font-bold font-mono-nums focus:outline-none focus:border-[#374151]"
                          placeholder="Ex: 69.50"
                        />
                        {warningsMap.weightKg && (
                          <span className="text-[10px] text-amber-400 block mt-0.5">{warningsMap.weightKg}</span>
                        )}
                      </div>

                      {/* Altura */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold uppercase text-[#4B5563]">
                            Altura (cm)
                          </label>
                          {provenanceMap.heightCm === 'imported' && (
                            <span className="text-[9px] font-bold text-emerald-400">OCR</span>
                          )}
                        </div>
                        <input
                          type="number"
                          step="0.1"
                          value={heightCm}
                          onChange={e => handleFieldChange('heightCm', e.target.value, setHeightCm)}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#1F2937] font-bold font-mono-nums focus:outline-none focus:border-[#374151]"
                          placeholder="Ex: 175"
                        />
                      </div>

                      {/* IMC */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold uppercase text-[#4B5563]">
                            IMC
                          </label>
                          {provenanceMap.bmi === 'calculated' ? (
                            <span className="text-[9px] font-bold text-blue-400">Calc</span>
                          ) : provenanceMap.bmi === 'imported' ? (
                            <span className="text-[9px] font-bold text-emerald-400">OCR</span>
                          ) : null}
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          value={bmi}
                          onChange={e => handleFieldChange('bmi', e.target.value, setBmi)}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#1F2937] font-bold font-mono-nums focus:outline-none focus:border-[#374151]"
                          placeholder="Ex: 29.31"
                        />
                      </div>

                      {/* % Gordura */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold uppercase text-[#4B5563]">
                            % Gordura
                          </label>
                          {provenanceMap.bodyFatPercentage === 'imported' && (
                            <span className="text-[9px] font-bold text-emerald-400">OCR</span>
                          )}
                        </div>
                        <input
                          type="number"
                          step="0.1"
                          value={bodyFatPercentage}
                          onChange={e => handleFieldChange('bodyFatPercentage', e.target.value, setBodyFatPercentage)}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#1F2937] font-bold font-mono-nums focus:outline-none focus:border-[#374151]"
                          placeholder="Ex: 33.9"
                        />
                      </div>

                      {/* Massa Gorda (kg) */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold uppercase text-[#4B5563]">
                            Massa Gorda (kg)
                          </label>
                          {provenanceMap.fatMassKg === 'calculated' ? (
                            <span className="text-[9px] font-bold text-blue-400">Calc</span>
                          ) : provenanceMap.fatMassKg === 'imported' ? (
                            <span className="text-[9px] font-bold text-emerald-400">OCR</span>
                          ) : null}
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          value={fatMassKg}
                          onChange={e => handleFieldChange('fatMassKg', e.target.value, setFatMassKg)}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#1F2937] font-bold font-mono-nums focus:outline-none focus:border-[#374151]"
                          placeholder="Ex: 23.53"
                        />
                      </div>

                      {/* Massa Magra (kg) */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold uppercase text-[#4B5563]">
                            Massa Magra (kg)
                          </label>
                          {provenanceMap.leanMassKg === 'calculated' ? (
                            <span className="text-[9px] font-bold text-blue-400">Calc</span>
                          ) : provenanceMap.leanMassKg === 'imported' ? (
                            <span className="text-[9px] font-bold text-emerald-400">OCR</span>
                          ) : null}
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          value={leanMassKg}
                          onChange={e => handleFieldChange('leanMassKg', e.target.value, setLeanMassKg)}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#1F2937] font-bold font-mono-nums focus:outline-none focus:border-[#374151]"
                          placeholder="Ex: 45.97"
                        />
                      </div>

                      {/* % Massa Magra */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold uppercase text-[#4B5563]">
                            % Massa Magra
                          </label>
                          {provenanceMap.leanMassPercentage === 'calculated' ? (
                            <span className="text-[9px] font-bold text-blue-400">Calc</span>
                          ) : provenanceMap.leanMassPercentage === 'imported' ? (
                            <span className="text-[9px] font-bold text-emerald-400">OCR</span>
                          ) : null}
                        </div>
                        <input
                          type="number"
                          step="0.1"
                          value={leanMassPercentage}
                          onChange={e => handleFieldChange('leanMassPercentage', e.target.value, setLeanMassPercentage)}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#1F2937] font-bold font-mono-nums focus:outline-none focus:border-[#374151]"
                          placeholder="Ex: 66.1"
                        />
                      </div>

                      {/* Relação Cintura/Quadril */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold uppercase text-[#4B5563]">
                            Relação C/Q (RCQ)
                          </label>
                          {provenanceMap.waistHipRatio === 'imported' && (
                            <span className="text-[9px] font-bold text-emerald-400">OCR</span>
                          )}
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          value={waistHipRatio}
                          onChange={e => handleFieldChange('waistHipRatio', e.target.value, setWaistHipRatio)}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#1F2937] font-bold font-mono-nums focus:outline-none focus:border-[#374151]"
                          placeholder="Ex: 0.86"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Circunferências (Perímetros em cm) */}
                  <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
                    <h5 className="text-xs font-black font-display uppercase tracking-wider text-[#1F2937]">
                      Circunferências Corporais (cm)
                    </h5>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#4B5563] mb-1">Tórax</label>
                        <input
                          type="number"
                          step="0.1"
                          value={circumferences.chest}
                          onChange={e => setCircumferences({ ...circumferences, chest: e.target.value })}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-[#1F2937] font-bold font-mono-nums"
                          placeholder="cm"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#4B5563] mb-1">Cintura</label>
                        <input
                          type="number"
                          step="0.1"
                          value={circumferences.waist}
                          onChange={e => setCircumferences({ ...circumferences, waist: e.target.value })}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-[#1F2937] font-bold font-mono-nums"
                          placeholder="cm"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#4B5563] mb-1">Abdômen</label>
                        <input
                          type="number"
                          step="0.1"
                          value={circumferences.abdomen}
                          onChange={e => setCircumferences({ ...circumferences, abdomen: e.target.value })}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-[#1F2937] font-bold font-mono-nums"
                          placeholder="cm"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#4B5563] mb-1">Quadril</label>
                        <input
                          type="number"
                          step="0.1"
                          value={circumferences.hips}
                          onChange={e => setCircumferences({ ...circumferences, hips: e.target.value })}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-[#1F2937] font-bold font-mono-nums"
                          placeholder="cm"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#4B5563] mb-1">Braço D. (Contr.)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={circumferences.rightArmContracted}
                          onChange={e => setCircumferences({ ...circumferences, rightArmContracted: e.target.value })}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-[#1F2937] font-bold font-mono-nums"
                          placeholder="cm"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#4B5563] mb-1">Braço E. (Contr.)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={circumferences.leftArmContracted}
                          onChange={e => setCircumferences({ ...circumferences, leftArmContracted: e.target.value })}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-[#1F2937] font-bold font-mono-nums"
                          placeholder="cm"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#4B5563] mb-1">Coxa Dir.</label>
                        <input
                          type="number"
                          step="0.1"
                          value={circumferences.rightThigh}
                          onChange={e => setCircumferences({ ...circumferences, rightThigh: e.target.value })}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-[#1F2937] font-bold font-mono-nums"
                          placeholder="cm"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#4B5563] mb-1">Panturrilha Dir.</label>
                        <input
                          type="number"
                          step="0.1"
                          value={circumferences.rightCalf}
                          onChange={e => setCircumferences({ ...circumferences, rightCalf: e.target.value })}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-[#1F2937] font-bold font-mono-nums"
                          placeholder="cm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Dobras Cutâneas (mm) */}
                  <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
                    <h5 className="text-xs font-black font-display uppercase tracking-wider text-[#1F2937]">
                      Dobras Cutâneas (mm)
                    </h5>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#4B5563] mb-1">Tríceps</label>
                        <input
                          type="number"
                          step="0.5"
                          value={skinfolds.triceps}
                          onChange={e => setSkinfolds({ ...skinfolds, triceps: e.target.value })}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-[#1F2937] font-bold font-mono-nums"
                          placeholder="mm"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#4B5563] mb-1">Subescapular</label>
                        <input
                          type="number"
                          step="0.5"
                          value={skinfolds.subscapular}
                          onChange={e => setSkinfolds({ ...skinfolds, subscapular: e.target.value })}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-[#1F2937] font-bold font-mono-nums"
                          placeholder="mm"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#4B5563] mb-1">Suprailíaca</label>
                        <input
                          type="number"
                          step="0.5"
                          value={skinfolds.suprailiac}
                          onChange={e => setSkinfolds({ ...skinfolds, suprailiac: e.target.value })}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-[#1F2937] font-bold font-mono-nums"
                          placeholder="mm"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#4B5563] mb-1">Abdominal</label>
                        <input
                          type="number"
                          step="0.5"
                          value={skinfolds.abdominal}
                          onChange={e => setSkinfolds({ ...skinfolds, abdominal: e.target.value })}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-[#1F2937] font-bold font-mono-nums"
                          placeholder="mm"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#4B5563] mb-1">Coxa</label>
                        <input
                          type="number"
                          step="0.5"
                          value={skinfolds.thigh}
                          onChange={e => setSkinfolds({ ...skinfolds, thigh: e.target.value })}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-[#1F2937] font-bold font-mono-nums"
                          placeholder="mm"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#4B5563] mb-1">Peitoral</label>
                        <input
                          type="number"
                          step="0.5"
                          value={skinfolds.chest}
                          onChange={e => setSkinfolds({ ...skinfolds, chest: e.target.value })}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-[#1F2937] font-bold font-mono-nums"
                          placeholder="mm"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#4B5563] mb-1">Axilar Média</label>
                        <input
                          type="number"
                          step="0.5"
                          value={skinfolds.midaxillary}
                          onChange={e => setSkinfolds({ ...skinfolds, midaxillary: e.target.value })}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-[#1F2937] font-bold font-mono-nums"
                          placeholder="mm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. Observações & Opção de Foto */}
                  <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#4B5563] mb-1">
                        Observações da Avaliação
                      </label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Ex: Avaliação importada via foto do app anterior. Aluno em jejum."
                        className="w-full bg-white border border-[#E5E7EB] rounded-xl p-2.5 text-xs text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#374151]"
                      />
                    </div>

                    <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={keepOriginalImage}
                        onChange={e => setKeepOriginalImage(e.target.checked)}
                        className="w-4 h-4 rounded text-[#374151] bg-white border-[#E5E7EB] focus:ring-0"
                      />
                      <span className="text-xs text-[#1F2937] font-medium select-none">
                        Guardar imagem original anexada à avaliação física (permite consultar a fonte a qualquer momento)
                      </span>
                    </label>
                  </div>

                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-4 sm:px-6 border-t border-[#E5E7EB] bg-[#F8F9FA] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-white hover:bg-[#E5E7EB] border border-[#E5E7EB] text-xs font-bold text-[#4B5563] hover:text-[#1F2937] transition-all cursor-pointer"
          >
            Cancelar
          </button>

          {step === 'review' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep('preview')}
                className="py-2.5 px-4 rounded-xl bg-white hover:bg-[#E5E7EB] border border-[#E5E7EB] text-xs font-bold text-[#4B5563] hover:text-[#1F2937] transition-all cursor-pointer"
              >
                Voltar à Imagem
              </button>

              <button
                type="button"
                onClick={handleSaveAssessment}
                className="py-2.5 px-5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all shadow-md shadow-xs flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>CONFIRMAR E SALVAR AVALIAÇÃO</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
