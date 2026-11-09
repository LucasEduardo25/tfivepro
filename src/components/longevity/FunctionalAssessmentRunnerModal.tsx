import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  Check, 
  Plus, 
  Minus, 
  HelpCircle, 
  ShieldAlert, 
  Activity, 
  Clock, 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  Layers,
  Award
} from 'lucide-react';
import { 
  FunctionalTest, 
  FunctionalAssessment, 
  FunctionalTestResult, 
  FunctionalTestTrial,
  Student, 
  FunctionalBattery 
} from '../../types';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../db/indexedDB';
import { soundEffects } from '../../utils/audio';
import { compareTestResults, formatTestValue } from '../../utils/functionalCalculations';
import { BUILT_IN_FUNCTIONAL_TESTS } from '../../data/functionalTestsBank';

interface FunctionalAssessmentRunnerModalProps {
  student: Student;
  initialTest?: FunctionalTest;
  battery?: FunctionalBattery;
  onClose: () => void;
  onComplete?: (assessment: FunctionalAssessment) => void;
}

export const FunctionalAssessmentRunnerModal: React.FC<FunctionalAssessmentRunnerModalProps> = ({
  student,
  initialTest,
  battery,
  onClose,
  onComplete
}) => {
  const { functionalTests, saveFunctionalAssessment, saveFunctionalMilestone } = useApp();

  // Test Queue (either single test or all tests in battery)
  const testQueue: FunctionalTest[] = React.useMemo(() => {
    const list = functionalTests.length > 0 ? functionalTests : BUILT_IN_FUNCTIONAL_TESTS;
    if (battery && battery.testIds.length > 0) {
      return battery.testIds
        .map(id => list.find(t => t.id === id))
        .filter((t): t is FunctionalTest => !!t);
    }
    if (initialTest) {
      return [initialTest];
    }
    return list.slice(0, 5);
  }, [battery, initialTest, functionalTests]);

  const [currentTestIndex, setCurrentTestIndex] = useState<number>(0);
  const currentTest = testQueue[currentTestIndex] || (functionalTests[0] || BUILT_IN_FUNCTIONAL_TESTS[0]);

  if (!currentTest) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4">
          <h3 className="text-lg font-bold text-[#262626]">Nenhum teste disponível</h3>
          <p className="text-xs text-[#525252]">Não foi possível carregar os testes funcionais.</p>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-[#27272A] text-white text-xs font-bold">
            Fechar
          </button>
        </div>
      </div>
    );
  }

  // Assessment Session Results Accumulator
  const [sessionResults, setSessionResults] = useState<FunctionalTestResult[]>([]);
  const [assessmentDate, setAssessmentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [sessionNotes, setSessionNotes] = useState<string>('');

  // Current Test Form State
  const [primaryValueNumeric, setPrimaryValueNumeric] = useState<number>(0);
  const [primaryValueCategorical, setPrimaryValueCategorical] = useState<string>('');
  const [distanceMeters, setDistanceMeters] = useState<number>(4);
  const [loadKg, setLoadKg] = useState<number>(0);
  const [chairHeightCm, setChairHeightCm] = useState<number>(44);
  const [stepHeightCm, setStepHeightCm] = useState<number>(18);
  const [usedHands, setUsedHands] = useState<boolean>(false);
  const [usedAssistiveDevice, setUsedAssistiveDevice] = useState<boolean>(false);
  const [assistiveDeviceDetails, setAssistiveDeviceDetails] = useState<string>('');
  const [testNotes, setTestNotes] = useState<string>('');
  const [rightSideValue, setRightSideValue] = useState<number>(0);
  const [leftSideValue, setLeftSideValue] = useState<number>(0);
  const [eyesCondition, setEyesCondition] = useState<'open' | 'closed'>('open');
  const [trials, setTrials] = useState<FunctionalTestTrial[]>([]);

  // Integrated Timer / Stopwatch State
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerTarget, setTimerTarget] = useState<number | null>(null);
  const [countdownPrep, setCountdownPrep] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prepRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize test form state on test switch
  useEffect(() => {
    if (!currentTest) return;

    // Reset timer
    if (timerRef.current) clearInterval(timerRef.current);
    if (prepRef.current) clearInterval(prepRef.current);
    setTimerRunning(false);
    setCountdownPrep(null);

    if (currentTest.defaultDurationSeconds) {
      setTimerSeconds(currentTest.defaultDurationSeconds);
      setTimerTarget(currentTest.defaultDurationSeconds);
    } else {
      setTimerSeconds(0);
      setTimerTarget(null);
    }

    // Default values by test type
    if (currentTest.unit === 'reps') {
      setPrimaryValueNumeric(0);
    } else if (currentTest.unit === 'seconds') {
      setPrimaryValueNumeric(0);
    } else if (currentTest.unit === 'levels' && currentTest.categoricalLevels && currentTest.categoricalLevels.length > 0) {
      setPrimaryValueCategorical(currentTest.categoricalLevels[currentTest.categoricalLevels.length - 1].label);
    } else if (currentTest.unit === 'm/s') {
      setDistanceMeters(4);
      setPrimaryValueNumeric(0);
    } else if (currentTest.unit === 'kg') {
      setLoadKg(10);
      setPrimaryValueNumeric(10);
    } else if (currentTest.unit === 'meters') {
      setPrimaryValueNumeric(300);
    }

    setUsedHands(false);
    setUsedAssistiveDevice(false);
    setAssistiveDeviceDetails('');
    setTestNotes('');
    setRightSideValue(0);
    setLeftSideValue(0);
    setEyesCondition('open');
    setTrials([]);
  }, [currentTest?.id]);

  // Stopwatch / Countdown Tick Effect
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (timerTarget && timerTarget > 0) {
            // Countdown mode
            if (prev <= 1) {
              clearInterval(timerRef.current!);
              setTimerRunning(false);
              soundEffects.playBeepHigh();
              return 0;
            }
            if (prev === 4 || prev === 3 || prev === 2) {
              soundEffects.playBeepLow();
            }
            return prev - 1;
          } else {
            // Stopwatch mode (increments)
            return prev + 1;
          }
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, timerTarget]);

  // Start with 3-2-1 Audio Countdown
  const handleStartWithCountdown = () => {
    soundEffects.playClick();
    setCountdownPrep(3);
    soundEffects.playBeepLow();

    let count = 3;
    prepRef.current = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdownPrep(count);
        soundEffects.playBeepLow();
      } else {
        clearInterval(prepRef.current!);
        setCountdownPrep(null);
        soundEffects.playBeepHigh();
        setTimerRunning(true);
      }
    }, 1000);
  };

  const handleStopTimer = () => {
    soundEffects.playClick();
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);

    // If test unit is seconds and stopwatch mode, prefill primary value
    if (currentTest.unit === 'seconds' && !timerTarget) {
      setPrimaryValueNumeric(Number(timerSeconds.toFixed(1)));
    }
  };

  const handleResetTimer = () => {
    soundEffects.playClick();
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (currentTest.defaultDurationSeconds) {
      setTimerSeconds(currentTest.defaultDurationSeconds);
    } else {
      setTimerSeconds(0);
    }
  };

  // Add a trial for bilateral or multi-trial tests
  const handleAddTrial = (side?: 'right' | 'left' | 'bilateral', value?: number) => {
    soundEffects.playClick();
    const val = value !== undefined ? value : primaryValueNumeric;
    const newTrial: FunctionalTestTrial = {
      trialNumber: trials.length + 1,
      valueNumeric: val,
      side: side || 'bilateral',
      eyes: eyesCondition
    };
    setTrials(prev => [...prev, newTrial]);

    if (side === 'right') {
      setRightSideValue(val);
    } else if (side === 'left') {
      setLeftSideValue(val);
    }
  };

  // Build current test result object
  const buildCurrentTestResult = (): FunctionalTestResult => {
    let finalNumeric: number | undefined = primaryValueNumeric;
    let calculatedSpeed: number | undefined = undefined;

    if (currentTest.unit === 'm/s') {
      const timeSec = primaryValueNumeric > 0 ? primaryValueNumeric : timerSeconds;
      if (timeSec > 0 && distanceMeters > 0) {
        calculatedSpeed = Number((distanceMeters / timeSec).toFixed(2));
        finalNumeric = calculatedSpeed;
      }
    } else if (currentTest.hasBilateral) {
      // Best of right / left or highest
      finalNumeric = Math.max(rightSideValue || 0, leftSideValue || 0, primaryValueNumeric || 0);
    }

    return {
      id: generateId('ftr'),
      testId: currentTest.id,
      testName: currentTest.name,
      domain: currentTest.domain,
      autonomyTask: currentTest.autonomyTask,
      direction: currentTest.direction,
      unit: currentTest.unit,
      unitLabel: currentTest.unitLabel,
      primaryValueNumeric: finalNumeric,
      primaryValueCategorical: currentTest.unit === 'levels' ? primaryValueCategorical : undefined,
      calculatedSpeedMs: calculatedSpeed,
      trials: trials.length > 0 ? trials : undefined,
      rightSideValue: currentTest.hasBilateral ? rightSideValue : undefined,
      leftSideValue: currentTest.hasBilateral ? leftSideValue : undefined,
      eyesCondition: currentTest.hasEyesCondition ? eyesCondition : undefined,
      usedHands: currentTest.hasArmSupportOption ? usedHands : undefined,
      usedAssistiveDevice: currentTest.hasAssistiveDeviceOption ? usedAssistiveDevice : undefined,
      assistiveDeviceDetails: usedAssistiveDevice ? assistiveDeviceDetails : undefined,
      chairHeightCm: currentTest.autonomyTask === 'stand_up' ? chairHeightCm : undefined,
      stepHeightCm: currentTest.hasStepHeightOption ? stepHeightCm : undefined,
      distanceMeters: currentTest.unit === 'm/s' || currentTest.id === 'test-farmer-carry' ? distanceMeters : undefined,
      loadKg: currentTest.id === 'test-farmer-carry' ? loadKg : undefined,
      notes: testNotes,
      createdAt: new Date().toISOString()
    };
  };

  // Save and Advance to next test in battery or finish
  const handleConfirmCurrentTest = async (isFinalSave: boolean = false) => {
    soundEffects.playFinish();
    const result = buildCurrentTestResult();

    const updatedResults = [
      ...sessionResults.filter(r => r.testId !== currentTest.id),
      result
    ];
    setSessionResults(updatedResults);

    if (currentTestIndex < testQueue.length - 1 && !isFinalSave) {
      setCurrentTestIndex(prev => prev + 1);
    } else {
      // Save entire functional assessment to database
      const finalAssessment: FunctionalAssessment = {
        id: generateId('fassess'),
        studentId: student.id,
        date: assessmentDate,
        title: battery ? battery.title : `Avaliação Funcional • ${currentTest.shortName || currentTest.name}`,
        batteryId: battery?.id,
        batteryName: battery?.title,
        results: updatedResults,
        trainerNotes: sessionNotes,
        createdAt: new Date().toISOString()
      };

      await saveFunctionalAssessment(finalAssessment);

      // Check if student achieved key milestones (e.g. Floor Rise Level 4)
      if (result.testId === 'test-floor-rise' && result.primaryValueCategorical?.includes('Sem apoio')) {
        await saveFunctionalMilestone({
          id: generateId('milestone'),
          studentId: student.id,
          date: assessmentDate,
          title: 'Autonomia Total: Levantar do Chão',
          description: 'Conquistou a capacidade de erguer-se do solo sem necessidade de apoio externo ou móveis.',
          domain: 'autonomy',
          testId: 'test-floor-rise',
          createdAt: new Date().toISOString()
        });
      }

      if (onComplete) onComplete(finalAssessment);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto select-none">
      <div className="bg-[#121212] border border-[#27272a] rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#27272a] bg-[#18181B]/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F3F4F6] border border-[#D1D5DB] flex items-center justify-center">
              <Activity className="w-5 h-5 text-[#374151]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#374151] bg-[#F3F4F6] px-2 py-0.5 rounded-full border border-[#E5E7EB]">
                  {battery ? battery.title : 'Teste Individual'}
                </span>
                <span className="text-xs text-[#4B5563]">
                  Aluno: <strong className="text-white">{student.name}</strong>
                </span>
              </div>
              <h2 className="text-lg font-black font-display text-white">
                Avaliação de Longevidade Funcional
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-[#4B5563] hover:text-white transition-all"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Battery Step Navigation Bar */}
        {testQueue.length > 1 && (
          <div className="px-5 py-2.5 bg-[#09090B] border-b border-[#27272a] flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-2">
              {testQueue.map((t, idx) => {
                const isCompleted = sessionResults.some(r => r.testId === t.id);
                const isCurrent = idx === currentTestIndex;
                return (
                  <button
                    key={t.id}
                    onClick={() => setCurrentTestIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold font-display whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      isCurrent
                        ? 'bg-[#374151] text-white shadow-md shadow-xs'
                        : isCompleted
                        ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                        : 'bg-[#18181B] text-[#4B5563] hover:text-white border border-[#27272A]'
                    }`}
                  >
                    {isCompleted && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{idx + 1}. {t.shortName || t.name}</span>
                  </button>
                );
              })}
            </div>
            <span className="text-xs font-bold text-[#4B5563] whitespace-nowrap">
              {currentTestIndex + 1} de {testQueue.length}
            </span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Current Test Title & Protocol Details */}
          <div className="bg-[#18181B] border border-[#27272a] rounded-2xl p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#27272A] text-[#4B5563]">
                {currentTest.category}
              </span>
              <span className="text-xs text-[#4B5563]">
                Melhoria: <strong className="text-[#374151]">{currentTest.direction === 'higher_is_better' ? 'Maior valor é melhor' : currentTest.direction === 'lower_is_better' ? 'Menor tempo é melhor' : 'Progressão de níveis'}</strong>
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black font-display text-white">
              {currentTest.name}
            </h3>

            {/* Step by Step Instructions Accordion */}
            <div className="mt-3 text-xs text-[#D4D4D8] space-y-1.5 bg-[#0D0D0D] p-3 rounded-xl border border-[#27272A]">
              <p className="font-bold text-white uppercase text-[10px] tracking-wider mb-1 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#374151]" />
                Instruções de Execução Padronizada
              </p>
              {currentTest.instructions.map((inst, i) => (
                <p key={i} className="leading-relaxed flex items-start gap-1.5">
                  <span className="text-[#374151] font-bold">•</span>
                  <span>{inst}</span>
                </p>
              ))}
            </div>
          </div>

          {/* Countdown Overlay (3-2-1) */}
          {countdownPrep !== null && (
            <div className="bg-[#374151] text-white rounded-3xl p-8 text-center flex flex-col items-center justify-center animate-pulse">
              <span className="text-7xl font-black font-mono-nums">{countdownPrep}</span>
              <p className="text-sm font-black uppercase tracking-widest mt-2">PREPARE-SE...</p>
            </div>
          )}

          {/* Integrated Stopwatch / Timer Area (if applicable) */}
          <div className="bg-[#18181B] border border-[#27272a] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-mono-nums font-black text-2xl ${
                timerRunning ? 'bg-[#374151] text-white shadow-lg shadow-xs animate-pulse' : 'bg-[#27272A] text-white'
              }`}>
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#4B5563]">
                  {timerTarget ? `Cronômetro (${timerTarget}s)` : 'Cronômetro Livre'}
                </p>
                <div className="text-3xl sm:text-4xl font-black font-mono-nums text-white">
                  {Math.floor(timerSeconds / 60).toString().padStart(2, '0')}:{(timerSeconds % 60).toFixed(0).padStart(2, '0')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {!timerRunning ? (
                <button
                  onClick={handleStartWithCountdown}
                  className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-xs"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Iniciar 3-2-1</span>
                </button>
              ) : (
                <button
                  onClick={handleStopTimer}
                  className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black font-display uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-600/30"
                >
                  <Pause className="w-4 h-4" />
                  <span>Parar Cronômetro</span>
                </button>
              )}

              <button
                onClick={handleResetTimer}
                className="p-3 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-[#4B5563] hover:text-white transition-all"
                title="Zerar Cronômetro"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Test Specific Input Panels */}
          {/* 1. Categorical Levels (e.g. Levantar do Chão) */}
          {currentTest.unit === 'levels' && currentTest.categoricalLevels && (
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                Selecione o Nível de Autonomia Observado:
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                {currentTest.categoricalLevels.map((lvl) => {
                  const isSelected = primaryValueCategorical === lvl.label;
                  return (
                    <button
                      key={lvl.level}
                      type="button"
                      onClick={() => {
                        soundEffects.playClick();
                        setPrimaryValueCategorical(lvl.label);
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
                        isSelected
                          ? 'bg-[#F3F4F6] border-[#374151] text-white shadow-lg shadow-xs'
                          : 'bg-[#18181B] border-[#27272a] text-[#4B5563] hover:border-[#3F3F46]'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-display font-black text-sm shrink-0 ${
                        isSelected ? 'bg-[#374151] text-white' : 'bg-[#27272A] text-[#4B5563]'
                      }`}>
                        N{lvl.level}
                      </div>
                      <div>
                        <p className={`text-sm font-black font-display uppercase tracking-wide ${isSelected ? 'text-white' : 'text-[#E4E4E7]'}`}>
                          {lvl.label}
                        </p>
                        {lvl.description && (
                          <p className="text-xs text-[#4B5563] mt-0.5 leading-relaxed">
                            {lvl.description}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Numeric Stepper / Big Input (Reps, Seconds, Kg, Meters) */}
          {currentTest.unit !== 'levels' && (
            <div className="bg-[#18181B] border border-[#27272a] rounded-2xl p-5 text-center space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563] block">
                Resultado do Teste ({currentTest.unitLabel})
              </label>

              {/* Big Value Display */}
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playClick();
                    setPrimaryValueNumeric(prev => Math.max(0, Number((prev - (currentTest.unit === 'reps' ? 1 : 0.5)).toFixed(1))));
                  }}
                  className="w-14 h-14 rounded-2xl bg-[#27272A] hover:bg-[#3F3F46] active:scale-95 text-white flex items-center justify-center text-2xl font-bold transition-all"
                >
                  <Minus className="w-6 h-6" />
                </button>

                <div className="min-w-[160px]">
                  <input
                    type="number"
                    step={currentTest.unit === 'reps' ? '1' : '0.1'}
                    value={primaryValueNumeric}
                    onChange={e => setPrimaryValueNumeric(Number(e.target.value))}
                    className="w-full text-center text-4xl sm:text-5xl font-black font-mono-nums bg-transparent text-white border-b-2 border-[#374151] pb-1 focus:outline-none"
                  />
                  <p className="text-xs font-bold text-[#4B5563] mt-1">{currentTest.unitLabel}</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playClick();
                    setPrimaryValueNumeric(prev => Number((prev + (currentTest.unit === 'reps' ? 1 : 0.5)).toFixed(1)));
                  }}
                  className="w-14 h-14 rounded-2xl bg-[#374151] hover:bg-[#1F2937] active:scale-95 text-white flex items-center justify-center text-2xl font-bold transition-all shadow-lg shadow-xs"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>

              {/* Quick Stepper Pills */}
              <div className="flex items-center justify-center gap-2 pt-2">
                {[
                  { label: '-5', delta: -5 },
                  { label: '-1', delta: -1 },
                  { label: '+1', delta: 1 },
                  { label: '+5', delta: 5 }
                ].map(pill => (
                  <button
                    key={pill.label}
                    type="button"
                    onClick={() => {
                      soundEffects.playClick();
                      setPrimaryValueNumeric(prev => Math.max(0, Number((prev + pill.delta).toFixed(1))));
                    }}
                    className="px-3 py-1 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-xs font-bold text-[#4B5563] hover:text-white transition-all font-mono-nums"
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Bilateral Support (Right / Left) for Unipodal Balance & Grip Strength */}
          {currentTest.hasBilateral && (
            <div className="bg-[#18181B] border border-[#27272a] rounded-2xl p-4 sm:p-5 space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563] block">
                Registro Bilateral (Membro Direito vs Membro Esquerdo)
              </label>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#121212] p-4 rounded-xl border border-[#27272A] text-center">
                  <p className="text-xs font-bold text-[#4B5563] uppercase mb-1">Lado Direito</p>
                  <input
                    type="number"
                    step="0.1"
                    value={rightSideValue}
                    onChange={e => setRightSideValue(Number(e.target.value))}
                    className="w-full text-center text-2xl font-black font-mono-nums bg-transparent text-white focus:outline-none"
                    placeholder="0.0"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTrial('right', rightSideValue || primaryValueNumeric)}
                    className="mt-2 text-[10px] font-bold text-[#374151] hover:underline uppercase tracking-wider"
                  >
                    Gravar Tentativa Direita
                  </button>
                </div>

                <div className="bg-[#121212] p-4 rounded-xl border border-[#27272A] text-center">
                  <p className="text-xs font-bold text-[#4B5563] uppercase mb-1">Lado Esquerdo</p>
                  <input
                    type="number"
                    step="0.1"
                    value={leftSideValue}
                    onChange={e => setLeftSideValue(Number(e.target.value))}
                    className="w-full text-center text-2xl font-black font-mono-nums bg-transparent text-white focus:outline-none"
                    placeholder="0.0"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTrial('left', leftSideValue || primaryValueNumeric)}
                    className="mt-2 text-[10px] font-bold text-[#374151] hover:underline uppercase tracking-wider"
                  >
                    Gravar Tentativa Esquerda
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. Qualitative Flags & Support Conditions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {currentTest.hasArmSupportOption && (
              <label className="flex items-center gap-3 p-3.5 rounded-xl bg-[#18181B] border border-[#27272A] cursor-pointer hover:border-[#3F3F46]">
                <input
                  type="checkbox"
                  checked={usedHands}
                  onChange={e => setUsedHands(e.target.checked)}
                  className="w-4 h-4 rounded text-[#374151] focus:ring-[#374151] bg-[#27272A] border-[#3F3F46]"
                />
                <div>
                  <p className="text-xs font-bold text-white">Utilizou apoio das mãos</p>
                  <p className="text-[10px] text-[#4B5563]">Empurrou coxas ou braços da cadeira</p>
                </div>
              </label>
            )}

            {currentTest.hasAssistiveDeviceOption && (
              <label className="flex items-center gap-3 p-3.5 rounded-xl bg-[#18181B] border border-[#27272A] cursor-pointer hover:border-[#3F3F46]">
                <input
                  type="checkbox"
                  checked={usedAssistiveDevice}
                  onChange={e => setUsedAssistiveDevice(e.target.checked)}
                  className="w-4 h-4 rounded text-[#374151] focus:ring-[#374151] bg-[#27272A] border-[#3F3F46]"
                />
                <div>
                  <p className="text-xs font-bold text-white">Dispositivo Auxiliar</p>
                  <p className="text-[10px] text-[#4B5563]">Bengala, andador ou muleta</p>
                </div>
              </label>
            )}

            {currentTest.hasEyesCondition && (
              <div className="p-3.5 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-between">
                <span className="text-xs font-bold text-white">Condição Visual</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEyesCondition('open')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      eyesCondition === 'open' ? 'bg-[#374151] text-white' : 'bg-[#27272A] text-[#4B5563]'
                    }`}
                  >
                    Olhos Abertos
                  </button>
                  <button
                    type="button"
                    onClick={() => setEyesCondition('closed')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      eyesCondition === 'closed' ? 'bg-[#374151] text-white' : 'bg-[#27272A] text-[#4B5563]'
                    }`}
                  >
                    Olhos Fechados
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Test Notes */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1.5 block">
              Observações Técnicas do Personal Trainer
            </label>
            <input
              type="text"
              value={testNotes}
              onChange={e => setTestNotes(e.target.value)}
              placeholder="Estratégia motora, compensações articulares, estabilidade..."
              className="w-full px-4 py-2.5 rounded-xl bg-[#18181B] border border-[#27272A] text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-[#374151]"
            />
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-4 border-t border-[#27272a] bg-[#18181B]/90 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#4B5563]">Data:</span>
            <input
              type="date"
              value={assessmentDate}
              onChange={e => setAssessmentDate(e.target.value)}
              className="bg-[#27272A] border border-[#3F3F46] rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            {testQueue.length > 1 && currentTestIndex < testQueue.length - 1 ? (
              <button
                type="button"
                onClick={() => handleConfirmCurrentTest(false)}
                className="px-5 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all shadow-lg shadow-xs flex items-center gap-2"
              >
                <span>Próximo Teste</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleConfirmCurrentTest(true)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black font-display uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Avaliação</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
