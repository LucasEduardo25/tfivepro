import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Scale, 
  Ruler, 
  Layers, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import { Student, PhysicalAssessment, AssessmentProtocol } from '../../types';
import { useApp } from '../../context/AppContext';
import { 
  computeCompleteJP7Assessment, 
  calculateJP3Density,
  calculateSiriBodyFat,
  calculateFatMass,
  calculateLeanMass,
  calculateBMI,
  calculateWHR,
  calculateSkinfoldAverage,
  calculateSumOf7Skinfolds,
  formatNumberBR,
  SkinfoldMap,
  CircumferenceMap,
  SKINFOLD_LABELS_PT,
  CIRCUMFERENCE_LABELS_PT
} from '../../utils/assessmentCalculations';

interface NewPhysicalAssessmentModalProps {
  student: Student;
  onClose: () => void;
  onSaved?: (savedAssessment: PhysicalAssessment) => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

interface SkinfoldMultiEntry {
  measures: number[];
}

export const NewPhysicalAssessmentModal: React.FC<NewPhysicalAssessmentModalProps> = ({
  student,
  onClose,
  onSaved
}) => {
  const { saveAssessment, assessments } = useApp();

  // Find previous assessment for default height / prefill
  const latestPastAssessment = useMemo(() => {
    return assessments
      .filter(a => a.studentId === student.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }, [assessments, student.id]);

  // Current Wizard Step: 1-Dados Básicos, 2-Perimetria, 3-Dobras Cutâneas, 4-Resultados, 5-Conferir/Salvar
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  // STEP 1: DADOS BÁSICOS
  const todayStr = new Date().toISOString().split('T')[0];
  const [assessmentDate, setAssessmentDate] = useState<string>(todayStr);
  const [protocol, setProtocol] = useState<AssessmentProtocol>('jackson_pollock_7');
  
  // Derive age only from a valid birth date; never invent demographic data.
  const calculatedAge = useMemo(() => {
    if (student.birthDate) {
      const birth = new Date(student.birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      if (age >= 10 && age <= 110) return age;
    }
    return 0;
  }, [student.birthDate]);

  const [age, setAge] = useState<number>(calculatedAge);
  const [gender, setGender] = useState<'male' | 'female'>(student.gender || 'male');
  const [heightCm, setHeightCm] = useState<number>(latestPastAssessment?.heightCm || (student as any).heightCm || 175);
  const [weightKg, setWeightKg] = useState<string>(latestPastAssessment?.weightKg ? String(latestPastAssessment.weightKg) : '');

  // STEP 2: PERIMETRIA (cm)
  const [circumferences, setCircumferences] = useState<{
    neck?: string;
    shoulders?: string;
    chest?: string;
    waist?: string;
    abdomen?: string;
    hips?: string;
    rightArmContracted?: string;
    rightArmRelaxed?: string;
    leftArmContracted?: string;
    leftArmRelaxed?: string;
    rightForearm?: string;
    leftForearm?: string;
    rightThigh?: string;
    leftThigh?: string;
    rightCalf?: string;
    leftCalf?: string;
  }>({});

  // STEP 3: DOBRAS CUTÂNEAS (mm)
  // Multi-measure support: for each point, store array of entries
  const [multiMeasures, setMultiMeasures] = useState<Record<string, number[]>>({
    chest: [],
    midaxillary: [],
    triceps: [],
    subscapular: [],
    abdominal: [],
    suprailiac: [],
    thigh: []
  });

  // Single string inputs for active typing in mm
  const [skinfoldInputs, setSkinfoldInputs] = useState<Record<string, string>>({
    chest: '',
    midaxillary: '',
    triceps: '',
    subscapular: '',
    abdominal: '',
    suprailiac: '',
    thigh: ''
  });

  // Bioimpedance / External Fallback inputs (if protocol != JP7/JP3)
  const [manualBodyFatPct, setManualBodyFatPct] = useState<string>('');

  // General Notes & Conclusions
  const [notes, setNotes] = useState<string>('');

  // First input ref for auto-focusing on step transition
  const weightInputRef = useRef<HTMLInputElement>(null);
  const chestInputRef = useRef<HTMLInputElement>(null);
  const circNeckRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentStep === 1) {
      setTimeout(() => weightInputRef.current?.focus(), 150);
    } else if (currentStep === 2) {
      setTimeout(() => circNeckRef.current?.focus(), 150);
    } else if (currentStep === 3) {
      setTimeout(() => chestInputRef.current?.focus(), 150);
    }
  }, [currentStep]);

  // Derived effective skinfolds in mm
  const effectiveSkinfolds = useMemo<SkinfoldMap>(() => {
    const map: SkinfoldMap = {};
    const keys: Array<keyof SkinfoldMap> = ['chest', 'midaxillary', 'triceps', 'subscapular', 'abdominal', 'suprailiac', 'thigh'];
    
    for (const key of keys) {
      const arr = multiMeasures[key];
      if (arr && arr.length > 0) {
        map[key] = calculateSkinfoldAverage(arr);
      } else {
        const raw = parseFloat(skinfoldInputs[key]?.replace(',', '.'));
        if (!isNaN(raw) && raw > 0) {
          map[key] = Number(raw.toFixed(1));
        }
      }
    }
    return map;
  }, [multiMeasures, skinfoldInputs]);

  // Sum of 7 Skinfolds (Σ7) in real-time
  const liveSumOf7 = useMemo(() => {
    return calculateSumOf7Skinfolds(effectiveSkinfolds);
  }, [effectiveSkinfolds]);

  // Derived numeric circumferences
  const numericCircumferences = useMemo<CircumferenceMap>(() => {
    const map: CircumferenceMap = {};
    for (const [k, v] of Object.entries(circumferences)) {
      if (v) {
        const parsed = parseFloat(v.replace(',', '.'));
        if (!isNaN(parsed) && parsed > 0) {
          (map as any)[k] = Number(parsed.toFixed(1));
        }
      }
    }
    return map;
  }, [circumferences]);

  // Real-time RCQ
  const liveWHR = useMemo(() => {
    return calculateWHR(numericCircumferences.waist, numericCircumferences.hips);
  }, [numericCircumferences.waist, numericCircumferences.hips]);

  // Parsed numeric Weight
  const numericWeight = useMemo(() => {
    const p = parseFloat(weightKg.replace(',', '.'));
    return !isNaN(p) && p > 0 ? p : 0;
  }, [weightKg]);

  // Integrated calculation results
  const computedResults = useMemo(() => {
    if (numericWeight <= 0 || age < 10 || age > 110) return null;

    if (protocol === 'jackson_pollock_7') {
      return computeCompleteJP7Assessment({
        gender,
        age,
        weightKg: numericWeight,
        heightCm,
        skinfolds: effectiveSkinfolds,
        circumferences: numericCircumferences
      });
    }

    if (protocol === 'jackson_pollock_3') {
      let sum3 = 0;
      if (gender === 'male') {
        sum3 = (effectiveSkinfolds.chest || 0) + (effectiveSkinfolds.abdominal || 0) + (effectiveSkinfolds.thigh || 0);
      } else {
        sum3 = (effectiveSkinfolds.triceps || 0) + (effectiveSkinfolds.suprailiac || 0) + (effectiveSkinfolds.thigh || 0);
      }
      const density = calculateJP3Density(gender, age, sum3);
      const bf = calculateSiriBodyFat(density);
      const fatKg = calculateFatMass(numericWeight, bf);
      const leanKg = calculateLeanMass(numericWeight, fatKg);
      const bmi = calculateBMI(numericWeight, heightCm);

      return {
        sumOfSkinfolds: sum3,
        bodyDensity: density,
        bodyFatPercentage: bf,
        fatMassKg: fatKg,
        leanMassKg: leanKg,
        leanMassPercentage: Number((100 - bf).toFixed(1)),
        bmi,
        waistHipRatio: liveWHR,
        formulaUsed: 'Jackson & Pollock — 3 Dobras + Siri'
      };
    }

    // Bioimpedance / External app fallback
    const manualBf = parseFloat(manualBodyFatPct.replace(',', '.'));
    if (!Number.isFinite(manualBf) || manualBf < 1 || manualBf > 75) return null;
    const safeBf = manualBf;
    const fatKg = calculateFatMass(numericWeight, safeBf);
    const leanKg = calculateLeanMass(numericWeight, fatKg);
    const bmi = calculateBMI(numericWeight, heightCm);

    return {
      sumOfSkinfolds: 0,
      bodyDensity: 1.0,
      bodyFatPercentage: safeBf,
      fatMassKg: fatKg,
      leanMassKg: leanKg,
      leanMassPercentage: Number((100 - safeBf).toFixed(1)),
      bmi,
      waistHipRatio: liveWHR,
      formulaUsed: protocol === 'bioimpedance' ? 'Bioimpedância Tetrapolar' : 'Relatório Externo'
    };
  }, [numericWeight, protocol, gender, age, heightCm, effectiveSkinfolds, numericCircumferences, liveWHR, manualBodyFatPct]);

  // Validation warnings
  const warnings = useMemo<string[]>(() => {
    const list: string[] = [];
    if (numericWeight < 30 || numericWeight > 300) {
      list.push('Confira o peso corporal informado antes de continuar.');
    }
    if (heightCm < 90 || heightCm > 240) {
      list.push('Confira a altura informada.');
    }
    if (protocol === 'jackson_pollock_7') {
      const keys: Array<keyof SkinfoldMap> = ['chest', 'midaxillary', 'triceps', 'subscapular', 'abdominal', 'suprailiac', 'thigh'];
      for (const k of keys) {
        const val = effectiveSkinfolds[k];
        if (typeof val === 'number' && (val < 2 || val > 80)) {
          list.push(`Dobra ${SKINFOLD_LABELS_PT[k]} com valor (${val} mm) incomum. Confira a medida.`);
        }
      }
    }
    return list;
  }, [numericWeight, heightCm, protocol, effectiveSkinfolds]);

  // Handlers for Multiple Measures
  const handleAddMeasure = (key: string) => {
    const currentVal = parseFloat(skinfoldInputs[key]?.replace(',', '.'));
    if (!isNaN(currentVal) && currentVal > 0) {
      const existing = multiMeasures[key] || [];
      const updated = [...existing, currentVal];
      setMultiMeasures({
        ...multiMeasures,
        [key]: updated
      });
      setSkinfoldInputs({
        ...skinfoldInputs,
        [key]: ''
      });
    }
  };

  const handleRemoveMeasure = (key: string, index: number) => {
    const existing = multiMeasures[key] || [];
    const updated = existing.filter((_, i) => i !== index);
    setMultiMeasures({
      ...multiMeasures,
      [key]: updated
    });
  };

  // Step 1 Validation & Next
  const handleStep1Next = () => {
    if (age < 10 || age > 110) {
      alert('Informe a idade real do aluno (entre 10 e 110 anos).');
      return;
    }
    if (numericWeight < 30 || numericWeight > 300) {
      alert('Informe um peso válido entre 30 e 300 kg.');
      return;
    }
    if (heightCm < 90 || heightCm > 240) {
      alert('Por favor, informe a altura do aluno.');
      return;
    }
    setCurrentStep(2);
  };

  // Step 2 Validation & Next
  const handleStep2Next = () => {
    setCurrentStep(3);
  };

  // Step 3 Validation & Next
  const handleStep3Next = () => {
    if (protocol === 'jackson_pollock_7') {
      const missing: string[] = [];
      const keys: Array<keyof SkinfoldMap> = ['chest', 'midaxillary', 'triceps', 'subscapular', 'abdominal', 'suprailiac', 'thigh'];
      for (const k of keys) {
        if (!effectiveSkinfolds[k] || effectiveSkinfolds[k]! <= 0) {
          missing.push(SKINFOLD_LABELS_PT[k]);
        }
      }
      if (missing.length > 0) {
        alert(`Para o protocolo Jackson & Pollock 7 Dobras, preencha todas as dobras obrigatórias:\n- ${missing.join('\n- ')}`);
        return;
      }
    } else if (protocol === 'jackson_pollock_3') {
      if (gender === 'male') {
        if (!effectiveSkinfolds.chest || !effectiveSkinfolds.abdominal || !effectiveSkinfolds.thigh) {
          alert('Preencha as 3 dobras masculinas: Peitoral, Abdominal e Coxa.');
          return;
        }
      } else {
        if (!effectiveSkinfolds.triceps || !effectiveSkinfolds.suprailiac || !effectiveSkinfolds.thigh) {
          alert('Preencha as 3 dobras femininas: Tríceps, Supra-ilíaca e Coxa.');
          return;
        }
      }
    } else {
      const parsedBf = parseFloat(manualBodyFatPct.replace(',', '.'));
      if (!Number.isFinite(parsedBf) || parsedBf < 1 || parsedBf > 75) {
        alert('Informe um percentual de gordura válido entre 1% e 75%.');
        return;
      }
    }
    setCurrentStep(4);
  };

  // Final Save Handler
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleFinalSave = async () => {
    if (!computedResults || numericWeight <= 0) {
      alert('Erro nos cálculos. Verifique os dados inseridos.');
      return;
    }

    setIsSaving(true);
    try {
      const assessmentId = `assess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const newAssessment: PhysicalAssessment = {
        id: assessmentId,
        studentId: student.id,
        date: assessmentDate,
        weightKg: numericWeight,
        heightCm,
        age,
        gender,
        protocol,
        source: 'manual_tfive',
        formulaUsed: computedResults.formulaUsed,
        bodyDensity: computedResults.bodyDensity,
        sumOfSkinfolds: computedResults.sumOfSkinfolds,
        bodyFatPercentage: computedResults.bodyFatPercentage,
        fatMassKg: computedResults.fatMassKg,
        leanMassKg: computedResults.leanMassKg,
        leanMassPercentage: computedResults.leanMassPercentage,
        bmi: computedResults.bmi,
        waistHipRatio: computedResults.waistHipRatio,
        skinfolds: effectiveSkinfolds,
        skinfoldMeasurements: multiMeasures,
        circumferences: numericCircumferences,
        notes: notes.trim() || undefined,
        provenance: {
          weightKg: 'manual',
          heightCm: 'manual',
          bodyFatPercentage: 'calculated',
          fatMassKg: 'calculated',
          leanMassKg: 'calculated',
          bmi: 'calculated'
        },
        updatedAt: new Date().toISOString()
      };

      await saveAssessment(newAssessment);
      if (onSaved) onSaved(newAssessment);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar avaliação física:', err);
      alert('Não foi possível salvar a avaliação física. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white border border-[#E5E7EB] rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* MODAL HEADER WITH PROGRESS TABS */}
        <div className="p-4 sm:p-5 border-b border-[#E5E7EB] bg-[#F8F9FA]/50 shrink-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#F3F4F6] text-[#374151] flex items-center justify-center font-black">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black font-display uppercase tracking-wider text-[#1F2937]">
                  Nova Avaliação Física
                </h3>
                <p className="text-xs text-[#4B5563]">
                  Aluno: <strong className="text-[#1F2937]">{student.name}</strong> • {gender === 'male' ? 'Masculino' : 'Feminino'} • {age} anos
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#F8F9FA] hover:bg-[#E5E7EB] text-[#4B5563] hover:text-[#1F2937] transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* STEP INDICATOR PILLS */}
          <div className="grid grid-cols-5 gap-1.5 pt-1">
            {[
              { num: 1, label: 'Básicos' },
              { num: 2, label: 'Perimetria' },
              { num: 3, label: 'Dobras' },
              { num: 4, label: 'Resultados' },
              { num: 5, label: 'Salvar' }
            ].map(s => {
              const isCurrent = currentStep === s.num;
              const isPassed = currentStep > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    // Only allow jumping back or to completed steps
                    if (s.num <= currentStep) setCurrentStep(s.num as WizardStep);
                  }}
                  className={`flex flex-col items-center py-1.5 px-1 rounded-xl transition-all text-center ${
                    isCurrent 
                      ? 'bg-[#374151] text-white shadow-md shadow-xs' 
                      : isPassed
                      ? 'bg-[#E5E7EB] text-[#1F2937] hover:bg-[#D1D5DB]'
                      : 'bg-[#F8F9FA] text-[#4B5563]'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase font-mono-nums">
                    {s.num}. {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP BODY (SCROLLABLE CONTENT) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* ========================================================================= */}
          {/* ETAPA 1: DADOS BÁSICOS */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#374151] block mb-1">
                  Etapa 1 de 5
                </span>
                <h4 className="text-lg font-black font-display uppercase text-[#1F2937]">
                  Dados Básicos & Protocolo
                </h4>
                <p className="text-xs text-[#4B5563]">
                  Informações essenciais para os cálculos matemáticos de densidade corporal.
                </p>
              </div>

              {/* Protocol Selector */}
              <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1F2937]">
                  Protocolo de Composição Corporal
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setProtocol('jackson_pollock_7')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      protocol === 'jackson_pollock_7'
                        ? 'border-[#374151] bg-[#374151]/10 text-[#1F2937] shadow-md'
                        : 'border-[#E5E7EB] bg-white text-[#4B5563] hover:text-[#1F2937]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase font-display">Jackson & Pollock — 7 Dobras</span>
                      {protocol === 'jackson_pollock_7' && <CheckCircle2 className="w-4 h-4 text-[#374151]" />}
                    </div>
                    <p className="text-[11px] text-[#4B5563] mt-1">
                      Padrão Ouro antropométrico (Peitoral, Axilar, Tríceps, Subescapular, Abdômen, Ilíaca, Coxa).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProtocol('jackson_pollock_3')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      protocol === 'jackson_pollock_3'
                        ? 'border-[#374151] bg-[#374151]/10 text-[#1F2937] shadow-md'
                        : 'border-[#E5E7EB] bg-white text-[#4B5563] hover:text-[#1F2937]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase font-display">Jackson & Pollock — 3 Dobras</span>
                      {protocol === 'jackson_pollock_3' && <CheckCircle2 className="w-4 h-4 text-[#374151]" />}
                    </div>
                    <p className="text-[11px] text-[#4B5563] mt-1">
                      Protocolo rápido de 3 pontos específicos por sexo.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProtocol('bioimpedance')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      protocol === 'bioimpedance'
                        ? 'border-[#374151] bg-[#374151]/10 text-[#1F2937] shadow-md'
                        : 'border-[#E5E7EB] bg-white text-[#4B5563] hover:text-[#1F2937]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase font-display">Bioimpedância Tetrapolar</span>
                      {protocol === 'bioimpedance' && <CheckCircle2 className="w-4 h-4 text-[#374151]" />}
                    </div>
                    <p className="text-[11px] text-[#4B5563] mt-1">
                      Entrada direta do % de gordura obtido em balança de bioimpedância.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProtocol('external_app')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      protocol === 'external_app'
                        ? 'border-[#374151] bg-[#374151]/10 text-[#1F2937] shadow-md'
                        : 'border-[#E5E7EB] bg-white text-[#4B5563] hover:text-[#1F2937]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase font-display">Outro / Relatório Externo</span>
                      {protocol === 'external_app' && <CheckCircle2 className="w-4 h-4 text-[#374151]" />}
                    </div>
                    <p className="text-[11px] text-[#4B5563] mt-1">
                      Registro de dados manuais de outros sistemas.
                    </p>
                  </button>
                </div>
              </div>

              {/* Core Parameters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Current Weight - Prominent Input */}
                <div className="bg-[#F8F9FA] border-2 border-[#374151]/60 rounded-2xl p-4 sm:p-5">
                  <label className="block text-xs font-black uppercase tracking-wider text-[#374151] mb-1">
                    Peso Atual (kg) *
                  </label>
                  <div className="relative mt-2">
                    <input
                      ref={weightInputRef}
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="78,4"
                      value={weightKg}
                      onChange={e => setWeightKg(e.target.value)}
                      className="w-full bg-white border border-[#E5E7EB] focus:border-[#374151] rounded-xl p-3.5 text-2xl font-black font-mono-nums text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#4B5563]">
                      kg
                    </span>
                  </div>
                  <p className="text-[11px] text-[#4B5563] mt-2">
                    Ex: 78,4 kg. Utilize vírgula ou ponto para decimais.
                  </p>
                </div>

                {/* Height */}
                <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1F2937] mb-1">
                    Altura (cm) *
                  </label>
                  <div className="relative mt-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      required
                      placeholder="175"
                      value={heightCm || ''}
                      onChange={e => setHeightCm(parseInt(e.target.value) || 0)}
                      className="w-full bg-white border border-[#E5E7EB] focus:border-[#374151] rounded-xl p-3.5 text-2xl font-black font-mono-nums text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#4B5563]">
                      cm
                    </span>
                  </div>
                  <p className="text-[11px] text-[#4B5563] mt-2">
                    Preenchido a partir do cadastro do aluno.
                  </p>
                </div>
              </div>

              {/* Age, Gender, Date row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#4B5563] mb-1">
                    Idade (anos)
                  </label>
                  <input
                    type="number"
                    value={age || ''}
                    min={10}
                    max={110}
                    onChange={e => setAge(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-lg p-2 text-sm font-bold text-[#1F2937] font-mono-nums focus:outline-none focus:border-[#374151]"
                  />
                </div>

                <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#4B5563] mb-1">
                    Sexo Biológico (Fórmula)
                  </label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value as 'male' | 'female')}
                    className="w-full bg-white border border-[#E5E7EB] rounded-lg p-2 text-sm font-bold text-[#1F2937] focus:outline-none focus:border-[#374151]"
                  >
                    <option value="male">Masculino (Fórmula Homens)</option>
                    <option value="female">Feminino (Fórmula Mulheres)</option>
                  </select>
                </div>

                <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#4B5563] mb-1">
                    Data da Avaliação
                  </label>
                  <input
                    type="date"
                    value={assessmentDate}
                    onChange={e => setAssessmentDate(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-lg p-2 text-sm font-bold text-[#1F2937] font-mono-nums focus:outline-none focus:border-[#374151]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ETAPA 2: PERIMETRIA */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-[#374151] block mb-1">
                    Etapa 2 de 5
                  </span>
                  <h4 className="text-lg font-black font-display uppercase text-[#1F2937]">
                    Perimetria & Circunferências (cm)
                  </h4>
                  <p className="text-xs text-[#4B5563]">
                    Campos rápidos para tablet. Nenhum é obrigatório. Digite apenas os que medir.
                  </p>
                </div>

                {liveWHR && (
                  <div className="bg-[#F8F9FA] border border-[#374151]/40 rounded-xl px-4 py-2 self-start sm:self-auto">
                    <span className="text-[10px] font-bold uppercase text-[#4B5563] block">RCQ Calculado</span>
                    <span className="text-base font-black font-mono-nums text-[#1F2937]">
                      {liveWHR}
                    </span>
                  </div>
                )}
              </div>

              {/* Tronco & Cabeça */}
              <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-[#1F2937]">
                  Tronco & Circunferências Centrais
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#4B5563] mb-1">Pescoço</label>
                    <div className="relative">
                      <input
                        ref={circNeckRef}
                        type="text"
                        inputMode="decimal"
                        placeholder="38,0"
                        value={circumferences.neck || ''}
                        onChange={e => setCircumferences({ ...circumferences, neck: e.target.value })}
                        className="w-full bg-white border border-[#E5E7EB] rounded-xl p-2.5 text-sm font-bold font-mono-nums text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#374151]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#4B5563]">cm</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#4B5563] mb-1">Ombros</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="115,0"
                        value={circumferences.shoulders || ''}
                        onChange={e => setCircumferences({ ...circumferences, shoulders: e.target.value })}
                        className="w-full bg-white border border-[#E5E7EB] rounded-xl p-2.5 text-sm font-bold font-mono-nums text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#374151]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#4B5563]">cm</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#4B5563] mb-1">Tórax</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="100,5"
                        value={circumferences.chest || ''}
                        onChange={e => setCircumferences({ ...circumferences, chest: e.target.value })}
                        className="w-full bg-white border border-[#E5E7EB] rounded-xl p-2.5 text-sm font-bold font-mono-nums text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#374151]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#4B5563]">cm</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#1F2937] mb-1">Cintura (Menor Perímetro)</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="82,0"
                        value={circumferences.waist || ''}
                        onChange={e => setCircumferences({ ...circumferences, waist: e.target.value })}
                        className="w-full bg-white border border-[#E5E7EB] focus:border-[#374151] rounded-xl p-2.5 text-sm font-black font-mono-nums text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#4B5563]">cm</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#4B5563] mb-1">Abdômen (Cicatriz Umbilical)</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="86,5"
                        value={circumferences.abdomen || ''}
                        onChange={e => setCircumferences({ ...circumferences, abdomen: e.target.value })}
                        className="w-full bg-white border border-[#E5E7EB] rounded-xl p-2.5 text-sm font-bold font-mono-nums text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#374151]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#4B5563]">cm</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#1F2937] mb-1">Quadril (Maior Perímetro)</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="98,0"
                        value={circumferences.hips || ''}
                        onChange={e => setCircumferences({ ...circumferences, hips: e.target.value })}
                        className="w-full bg-white border border-[#E5E7EB] focus:border-[#374151] rounded-xl p-2.5 text-sm font-black font-mono-nums text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#4B5563]">cm</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Membros Superiores */}
              <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-[#1F2937]">
                  Membros Superiores
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#4B5563] mb-1">Braço Dir. Contraído</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="36,5"
                        value={circumferences.rightArmContracted || ''}
                        onChange={e => setCircumferences({ ...circumferences, rightArmContracted: e.target.value })}
                        className="w-full bg-white border border-[#E5E7EB] rounded-xl p-2.5 text-sm font-bold font-mono-nums text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#374151]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#4B5563]">cm</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#4B5563] mb-1">Braço Esq. Contraído</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="36,0"
                        value={circumferences.leftArmContracted || ''}
                        onChange={e => setCircumferences({ ...circumferences, leftArmContracted: e.target.value })}
                        className="w-full bg-white border border-[#E5E7EB] rounded-xl p-2.5 text-sm font-bold font-mono-nums text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#374151]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#4B5563]">cm</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#4B5563] mb-1">Antebraço Direito</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="29,5"
                        value={circumferences.rightForearm || ''}
                        onChange={e => setCircumferences({ ...circumferences, rightForearm: e.target.value })}
                        className="w-full bg-white border border-[#E5E7EB] rounded-xl p-2.5 text-sm font-bold font-mono-nums text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#374151]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#4B5563]">cm</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Membros Inferiores */}
              <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-[#1F2937]">
                  Membros Inferiores
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#4B5563] mb-1">Coxa Direita</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="58,0"
                        value={circumferences.rightThigh || ''}
                        onChange={e => setCircumferences({ ...circumferences, rightThigh: e.target.value })}
                        className="w-full bg-white border border-[#E5E7EB] rounded-xl p-2.5 text-sm font-bold font-mono-nums text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#374151]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#4B5563]">cm</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#4B5563] mb-1">Coxa Esquerda</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="58,0"
                        value={circumferences.leftThigh || ''}
                        onChange={e => setCircumferences({ ...circumferences, leftThigh: e.target.value })}
                        className="w-full bg-white border border-[#E5E7EB] rounded-xl p-2.5 text-sm font-bold font-mono-nums text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#374151]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#4B5563]">cm</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#4B5563] mb-1">Panturrilha Dir.</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="38,0"
                        value={circumferences.rightCalf || ''}
                        onChange={e => setCircumferences({ ...circumferences, rightCalf: e.target.value })}
                        className="w-full bg-white border border-[#E5E7EB] rounded-xl p-2.5 text-sm font-bold font-mono-nums text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#374151]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#4B5563]">cm</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#4B5563] mb-1">Panturrilha Esq.</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="38,0"
                        value={circumferences.leftCalf || ''}
                        onChange={e => setCircumferences({ ...circumferences, leftCalf: e.target.value })}
                        className="w-full bg-white border border-[#E5E7EB] rounded-xl p-2.5 text-sm font-bold font-mono-nums text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#374151]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#4B5563]">cm</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ETAPA 3: DOBRAS CUTÂNEAS (JACKSON & POLLOCK 7 DOBRAS) */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-[#374151] block mb-1">
                    Etapa 3 de 5
                  </span>
                  <h4 className="text-lg font-black font-display uppercase text-[#1F2937]">
                    {protocol === 'jackson_pollock_7' && 'Jackson & Pollock — 7 Dobras'}
                    {protocol === 'jackson_pollock_3' && 'Jackson & Pollock — 3 Dobras'}
                    {protocol !== 'jackson_pollock_7' && protocol !== 'jackson_pollock_3' && 'Composição Corporal'}
                  </h4>
                  <p className="text-xs text-[#4B5563]">
                    Digite os valores em milímetros (mm). O TFIVE calcula a soma e a composição em tempo real.
                  </p>
                </div>

                {/* SOMA DAS DOBRAS LIVE BADGE */}
                {protocol === 'jackson_pollock_7' && (
                  <div className="bg-[#F8F9FA] border-2 border-[#374151] rounded-2xl px-5 py-3 text-right self-start sm:self-auto shadow-lg shadow-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#374151] block">
                      SOMA DAS 7 DOBRAS (Σ7)
                    </span>
                    <span className="text-2xl font-black font-mono-nums text-[#1F2937]">
                      {liveSumOf7} <span className="text-sm font-bold text-[#4B5563]">mm</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Protocol: Jackson & Pollock 7 Dobras */}
              {protocol === 'jackson_pollock_7' && (
                <div className="space-y-3">
                  {[
                    { key: 'chest', label: '1. Peitoral', hint: 'Dobra diagonal na metade da distância entre a linha axilar anterior e o mamilo.' },
                    { key: 'midaxillary', label: '2. Axilar Média', hint: 'Dobra vertical ou oblíqua na linha axilar média na altura do apêndice xifoide.' },
                    { key: 'triceps', label: '3. Tríceps', hint: 'Dobra vertical na face posterior do braço, no ponto médio entre o acrômio e o olécrano.' },
                    { key: 'subscapular', label: '4. Subescapular', hint: 'Dobra oblíqua a 45°, 1 a 2 cm abaixo do ângulo inferior da escápula.' },
                    { key: 'abdominal', label: '5. Abdominal', hint: 'Dobra vertical ou horizontal, 2 cm lateralmente à cicatriz umbilical.' },
                    { key: 'suprailiac', label: '6. Supra-ilíaca', hint: 'Dobra oblíqua na linha axilar anterior, imediatamente acima da crista ilíaca.' },
                    { key: 'thigh', label: '7. Coxa', hint: 'Dobra vertical na face anterior da coxa, no ponto médio entre a prega inguinal e a patela.' }
                  ].map(item => {
                    const k = item.key;
                    const multi = multiMeasures[k] || [];
                    const effectiveVal = effectiveSkinfolds[k as keyof SkinfoldMap];
                    const isSuspicious = effectiveVal && (effectiveVal < 2 || effectiveVal > 80);

                    return (
                      <div 
                        key={k} 
                        className={`bg-[#F8F9FA] border rounded-2xl p-4 transition-all ${
                          isSuspicious ? 'border-amber-500/60 bg-amber-500/5' : 'border-[#E5E7EB] hover:border-[#D1D5DB]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black font-display uppercase tracking-wide text-[#1F2937]">
                                {item.label}
                              </span>
                              {effectiveVal !== undefined && effectiveVal > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono-nums font-bold">
                                  {effectiveVal} mm
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#4B5563] mt-0.5">{item.hint}</p>
                          </div>

                          {/* Input and Multi-measure controller */}
                          <div className="flex items-center gap-2">
                            <div className="relative w-32">
                              <input
                                ref={k === 'chest' ? chestInputRef : undefined}
                                type="text"
                                inputMode="decimal"
                                placeholder="0,0"
                                value={skinfoldInputs[k] || ''}
                                onChange={e => setSkinfoldInputs({ ...skinfoldInputs, [k]: e.target.value })}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddMeasure(k);
                                  }
                                }}
                                className="w-full bg-white border border-[#E5E7EB] focus:border-[#374151] rounded-xl py-2.5 px-3 text-lg font-black font-mono-nums text-[#1F2937] text-right pr-9 placeholder-[#9CA3AF] focus:outline-none"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#4B5563]">
                                mm
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleAddMeasure(k)}
                              title="Adicionar repetição de medida (calcula média)"
                              className="px-2.5 py-2.5 rounded-xl bg-[#E5E7EB] hover:bg-[#D1D5DB] text-[#374151] hover:text-[#1F2937] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline text-[11px]">Medida</span>
                            </button>
                          </div>
                        </div>

                        {/* List of multiple measures for this point */}
                        {multi.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-[#E5E7EB] flex flex-wrap items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-[#4B5563]">
                              Medidas registradas ({multi.length}x):
                            </span>
                            {multi.map((m, idx) => (
                              <div key={idx} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-[#E5E7EB] text-xs font-mono-nums text-[#1F2937]">
                                <span>M{idx + 1}: <strong>{m} mm</strong></span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMeasure(k, idx)}
                                  className="text-[#4B5563] hover:text-red-400 p-0.5 ml-1"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            <span className="text-[11px] font-bold text-[#374151] ml-auto">
                              Média utilizada: {effectiveVal} mm
                            </span>
                          </div>
                        )}

                        {isSuspicious && (
                          <div className="mt-2 text-[11px] text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>Confira esta medida antes de continuar.</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Protocol: Jackson & Pollock 3 Dobras */}
              {protocol === 'jackson_pollock_3' && (
                <div className="space-y-3">
                  <div className="bg-[#F8F9FA] p-3 rounded-xl text-xs text-[#4B5563]">
                    Protocolo JP3 para {gender === 'male' ? 'Homens (Peitoral, Abdominal, Coxa)' : 'Mulheres (Tríceps, Supra-ilíaca, Coxa)'}.
                  </div>
                  {(gender === 'male' 
                    ? [
                        { key: 'chest', label: '1. Peitoral' },
                        { key: 'abdominal', label: '2. Abdominal' },
                        { key: 'thigh', label: '3. Coxa' }
                      ]
                    : [
                        { key: 'triceps', label: '1. Tríceps' },
                        { key: 'suprailiac', label: '2. Supra-ilíaca' },
                        { key: 'thigh', label: '3. Coxa' }
                      ]
                  ).map(item => (
                    <div key={item.key} className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 flex items-center justify-between">
                      <span className="text-sm font-bold text-[#1F2937] uppercase">{item.label}</span>
                      <div className="relative w-32">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0,0"
                          value={skinfoldInputs[item.key] || ''}
                          onChange={e => setSkinfoldInputs({ ...skinfoldInputs, [item.key]: e.target.value })}
                          className="w-full bg-white border border-[#E5E7EB] focus:border-[#374151] rounded-xl py-2 px-3 text-lg font-black font-mono-nums text-[#1F2937] text-right pr-9 focus:outline-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#4B5563]">mm</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Fallback Bioimpedance / External App input */}
              {protocol !== 'jackson_pollock_7' && protocol !== 'jackson_pollock_3' && (
                <div className="bg-[#F8F9FA] border-2 border-[#374151]/60 rounded-2xl p-5 space-y-3">
                  <label className="block text-xs font-black uppercase tracking-wider text-[#374151]">
                    Percentual de Gordura Corporal (% Gordura) *
                  </label>
                  <div className="relative max-w-xs">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="18,5"
                      value={manualBodyFatPct}
                      onChange={e => setManualBodyFatPct(e.target.value)}
                      className="w-full bg-white border border-[#E5E7EB] focus:border-[#374151] rounded-xl p-3 text-2xl font-black font-mono-nums text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-black text-[#4B5563]">%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* ETAPA 4: RESULTADOS AUTOMÁTICOS */}
          {/* ========================================================================= */}
          {currentStep === 4 && computedResults && (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#374151] block mb-1">
                  Etapa 4 de 5
                </span>
                <h4 className="text-lg font-black font-display uppercase text-[#1F2937]">
                  Resultado da Avaliação
                </h4>
                <p className="text-xs text-[#4B5563]">
                  Composição corporal calculada automaticamente pelo motor TFIVE. Sem necessidade de calculadora externa.
                </p>
              </div>

              {/* MAIN METRIC HIGHLIGHTS */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* PESO */}
                <div className="bg-[#F8F9FA] border border-[#E5E7EB] p-4 rounded-2xl text-center">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] block">
                    PESO CORPORAL
                  </span>
                  <p className="text-2xl sm:text-3xl font-black font-mono-nums text-[#1F2937] mt-1">
                    {formatNumberBR(numericWeight)} <span className="text-xs font-bold text-[#4B5563]">kg</span>
                  </p>
                </div>

                {/* IMC */}
                <div className="bg-[#F8F9FA] border border-[#E5E7EB] p-4 rounded-2xl text-center">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] block">
                    IMC
                  </span>
                  <p className="text-2xl sm:text-3xl font-black font-mono-nums text-[#1F2937] mt-1">
                    {formatNumberBR(computedResults.bmi)}
                  </p>
                </div>

                {/* SOMA DAS 7 DOBRAS */}
                <div className="bg-[#F8F9FA] border border-[#E5E7EB] p-4 rounded-2xl text-center">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] block">
                    SOMA DAS DOBRAS
                  </span>
                  <p className="text-2xl sm:text-3xl font-black font-mono-nums text-[#1F2937] mt-1">
                    {formatNumberBR(computedResults.sumOfSkinfolds)} <span className="text-xs font-bold text-[#4B5563]">mm</span>
                  </p>
                </div>

                {/* GORDURA CORPORAL */}
                <div className="bg-[#F8F9FA] border-2 border-[#374151] p-4 rounded-2xl text-center shadow-lg shadow-xs col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#374151] block">
                    GORDURA CORPORAL
                  </span>
                  <p className="text-3xl sm:text-4xl font-black font-mono-nums text-[#374151] mt-1">
                    {formatNumberBR(computedResults.bodyFatPercentage)}%
                  </p>
                </div>

                {/* MASSA GORDA */}
                <div className="bg-[#F8F9FA] border border-[#E5E7EB] p-4 rounded-2xl text-center">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] block">
                    MASSA GORDA
                  </span>
                  <p className="text-2xl sm:text-3xl font-black font-mono-nums text-[#1F2937] mt-1">
                    {formatNumberBR(computedResults.fatMassKg)} <span className="text-xs font-bold text-[#4B5563]">kg</span>
                  </p>
                </div>

                {/* MASSA MAGRA */}
                <div className="bg-[#F8F9FA] border border-[#E5E7EB] p-4 rounded-2xl text-center">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">
                    MASSA MAGRA
                  </span>
                  <p className="text-2xl sm:text-3xl font-black font-mono-nums text-[#1F2937] mt-1">
                    {formatNumberBR(computedResults.leanMassKg)} <span className="text-xs font-bold text-[#4B5563]">kg</span>
                  </p>
                  <span className="text-[10px] text-[#4B5563] font-mono-nums">
                    ({formatNumberBR(computedResults.leanMassPercentage)}%)
                  </span>
                </div>
              </div>

              {/* TECHNICAL FORMULA & DENSITY DETAILS */}
              <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                  <span className="text-[#4B5563] font-bold">Metodologia & Protocolo:</span>
                  <span className="text-[#1F2937] font-bold">{computedResults.formulaUsed}</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                  <span className="text-[#4B5563] font-bold">Densidade Corporal (D):</span>
                  <span className="text-[#1F2937] font-mono-nums font-bold">
                    {computedResults.bodyDensity > 0 ? computedResults.bodyDensity.toFixed(6) : '—'} g/cm³
                  </span>
                </div>
                {computedResults.waistHipRatio && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#4B5563] font-bold">Relação Cintura / Quadril (RCQ):</span>
                    <span className="text-[#1F2937] font-mono-nums font-bold">{computedResults.waistHipRatio}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ETAPA 5: CONFERÊNCIA & SALVAR */}
          {/* ========================================================================= */}
          {currentStep === 5 && computedResults && (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#374151] block mb-1">
                  Etapa 5 de 5
                </span>
                <h4 className="text-lg font-black font-display uppercase text-[#1F2937]">
                  Conferência Final & Salvar
                </h4>
                <p className="text-xs text-[#4B5563]">
                  Confira todos os dados brutos e calculados. Se precisar corrigir uma dobra, volte à etapa anterior.
                </p>
              </div>

              {/* Raw Skinfolds Summary */}
              {protocol === 'jackson_pollock_7' && (
                <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase text-[#1F2937] tracking-wider">Dobras Cutâneas (mm)</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="text-[11px] font-bold text-[#374151] hover:underline"
                    >
                      Editar Dobras
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {Object.entries(SKINFOLD_LABELS_PT).map(([k, label]) => {
                      const val = effectiveSkinfolds[k as keyof SkinfoldMap];
                      return (
                        <div key={k} className="p-2 rounded-xl bg-white border border-[#E5E7EB] flex justify-between items-center">
                          <span className="text-[#4B5563] text-[11px]">{label}:</span>
                          <strong className="text-[#1F2937] font-mono-nums">{val ?? 0} mm</strong>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Circumferences Summary */}
              {Object.keys(numericCircumferences).length > 0 && (
                <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase text-[#1F2937] tracking-wider">Perímetros (cm)</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="text-[11px] font-bold text-[#374151] hover:underline"
                    >
                      Editar Perímetros
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {Object.entries(numericCircumferences).map(([k, val]) => (
                      <div key={k} className="p-2 rounded-xl bg-white border border-[#E5E7EB] flex justify-between items-center">
                        <span className="text-[#4B5563] text-[11px]">{(CIRCUMFERENCE_LABELS_PT as any)[k] || k}:</span>
                        <strong className="text-[#1F2937] font-mono-nums">{val} cm</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes Input */}
              <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 space-y-2">
                <label className="block text-xs font-bold uppercase text-[#1F2937]">
                  Observações do Treinador (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ex: Aluno em fase de cutting, excelente adesão à dieta e evolução de densidade muscular..."
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl p-3 text-xs text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#374151]"
                />
              </div>

              {warnings.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Avisos de Conferência</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                    {warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

        </div>

        {/* MODAL FOOTER (CONTROLS) */}
        <div className="p-4 sm:p-5 border-t border-[#E5E7EB] bg-[#F8F9FA]/80 flex items-center justify-between gap-3 shrink-0">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((currentStep - 1) as WizardStep)}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#F3F4F6] border border-[#E5E7EB] text-[#374151] hover:text-[#1F2937] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#F3F4F6] border border-[#E5E7EB] text-[#4B5563] hover:text-[#1F2937] text-xs font-bold transition-all cursor-pointer"
            >
              Cancelar
            </button>
          )}

          {/* NEXT / SAVE ACTION */}
          {currentStep === 1 && (
            <button
              type="button"
              onClick={handleStep1Next}
              className="px-6 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-xs cursor-pointer"
            >
              <span>Avançar para Perimetria</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {currentStep === 2 && (
            <button
              type="button"
              onClick={handleStep2Next}
              className="px-6 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-xs cursor-pointer"
            >
              <span>Avançar para Dobras</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {currentStep === 3 && (
            <button
              type="button"
              onClick={handleStep3Next}
              className="px-6 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-xs cursor-pointer"
            >
              <span>Calcular Composição</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {currentStep === 4 && (
            <button
              type="button"
              onClick={() => setCurrentStep(5)}
              className="px-6 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-xs cursor-pointer"
            >
              <span>Revisar & Salvar</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {currentStep === 5 && (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleFinalSave}
              className="px-6 py-3 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-xs cursor-pointer disabled:opacity-80"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'SALVANDO...' : 'CONFIRMAR E SALVAR AVALIAÇÃO'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
