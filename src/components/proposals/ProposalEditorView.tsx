/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Save, 
  FileText, 
  User, 
  CreditCard, 
  Plus, 
  Trash2, 
  Copy, 
  Star, 
  CheckCircle2, 
  LayoutTemplate,
  Printer,
  Shield,
  Layers,
  Users,
  UserPlus,
  Calculator,
  Percent,
  DollarSign,
  Calendar,
  Sparkles,
  ChevronRight,
  TrendingDown,
  Info
} from 'lucide-react';
import { 
  Proposal, 
  ProposalPlanItem, 
  ProposalTemplate, 
  PlanPricing, 
  ProposalMode, 
  ProposalParticipant, 
  ProposalPlanType, 
  CommercialBenefitLabel,
  DiscountType,
  DEFAULT_PROPOSAL_BENEFITS,
  DEFAULT_PROPOSAL_CONDITIONS,
  DEFAULT_PROPOSAL_DESCRIPTION
} from '../../types/proposal';
import { useApp } from '../../context/AppContext';
import { 
  recalculatePlanPricing, 
  formatCurrencyCents, 
  centsToFloat, 
  floatToCents,
  addDaysToDate,
  formatDateToISO,
  formatPlanTypeLabel,
  formatBenefitLabel
} from '../../utils/proposalCalculations';

interface ProposalEditorViewProps {
  initialProposal?: Proposal | null;
  selectedStudentId?: string;
  onSave: (proposal: Proposal) => Promise<void>;
  onCancel: () => void;
  onOpenTemplates: () => void;
  onOpenPDF: (proposal: Proposal) => void;
  lockStudentSelection?: boolean;
}

const FREQUENCY_OPTIONS = [
  '1× por semana',
  '2× por semana',
  '3× por semana',
  '4× por semana',
  '5× por semana',
  'Personalizado'
];

const DURATION_OPTIONS = [
  { label: '1 mês (Mensal)', months: 1 },
  { label: '3 meses (Trimestral)', months: 3 },
  { label: '6 meses (Semestral)', months: 6 },
  { label: '12 meses (Anual)', months: 12 },
  { label: 'Personalizado', months: 0 }
];

const SERVICE_PRESETS = [
  'Personal Training Presencial',
  'Consultoria Online de Treino',
  'Acompanhamento Híbrido (Presencial + App)',
  'Personal Training em Dupla/Casal',
  'Treinamento Funcional & Força (Grupo/Família)',
  'Reabilitação & Longevidade'
];

const POPULAR_BENEFIT_CHIPS = [
  'Acompanhamento 100% individualizado',
  'Periodização com sobrecarga progressiva',
  'Avaliações físicas e testes funcionais',
  'Acesso ao App com vídeos de execução',
  'Cronômetro e controle de carga na palma da mão',
  'Suporte direto via WhatsApp para dúvidas',
  'Ajustes estratégicos de volume e intensidade',
  'Treinos personalizados para viagens e férias',
  'Relatórios periódicos de evolução de força',
  'Bioimpedância / Dobras cutâneas periódicas',
  'Planejamento conjunto com metas individualizadas'
];

export const ProposalEditorView: React.FC<ProposalEditorViewProps> = ({
  initialProposal,
  selectedStudentId,
  onSave,
  onCancel,
  onOpenTemplates,
  onOpenPDF,
  lockStudentSelection
}) => {
  const { students, trainerProfile, saveProposalTemplate } = useApp();

  // 1. TIPO DE PLANO
  // Defaults to 'duo' for maximum productivity as requested, or adapts from initial proposal
  const [planType, setPlanType] = useState<ProposalPlanType>(() => {
    if (initialProposal?.planType) return initialProposal.planType;
    if (initialProposal?.participants && initialProposal.participants.length > 2) return 'family_group';
    if (initialProposal?.participants && initialProposal.participants.length === 2) return 'duo';
    return 'duo';
  });

  // 2. PESSOAS (PARTICIPANTES)
  // Initializes cleanly without forcing pre-filled names unless editing or opened from a student
  const [participants, setParticipants] = useState<ProposalParticipant[]>(() => {
    if (initialProposal?.participants && initialProposal.participants.length > 0) {
      return initialProposal.participants;
    }
    const studentHolder = selectedStudentId ? students.find(s => s.id === selectedStudentId) : null;

    if (planType === 'duo') {
      return [
        {
          id: 'part_1',
          studentId: studentHolder ? studentHolder.id : undefined,
          nameSnapshot: studentHolder ? studentHolder.name : '',
          phoneSnapshot: studentHolder?.phone || '',
          emailSnapshot: studentHolder?.email || '',
          role: 'holder'
        },
        {
          id: 'part_2',
          studentId: undefined,
          nameSnapshot: '',
          phoneSnapshot: '',
          emailSnapshot: '',
          role: 'participant'
        }
      ];
    } else if (planType === 'family_group') {
      return [
        {
          id: 'part_1',
          studentId: studentHolder ? studentHolder.id : undefined,
          nameSnapshot: studentHolder ? studentHolder.name : '',
          role: 'holder'
        },
        { id: 'part_2', nameSnapshot: '', role: 'participant' },
        { id: 'part_3', nameSnapshot: '', role: 'participant' }
      ];
    }
    // Individual
    return [
      {
        id: 'part_1',
        studentId: studentHolder ? studentHolder.id : undefined,
        nameSnapshot: studentHolder ? studentHolder.name : '',
        phoneSnapshot: studentHolder?.phone || '',
        emailSnapshot: studentHolder?.email || '',
        role: 'holder'
      }
    ];
  });

  // Mode for each participant slot: 'select' (existing student) or 'custom' (just name)
  const [participantInputModes, setParticipantInputModes] = useState<Record<string, 'select' | 'custom'>>(() => {
    const initialModes: Record<string, 'select' | 'custom'> = {};
    if (initialProposal?.participants) {
      initialProposal.participants.forEach((p, idx) => {
        initialModes[p.id || `part_${idx + 1}`] = p.studentId ? 'select' : 'custom';
      });
    }
    return initialModes;
  });

  // Primary Proposal Header States
  const [title, setTitle] = useState<string>(() => {
    if (initialProposal?.title) return initialProposal.title;
    return 'Proposta Comercial de Treinamento';
  });

  const [service, setService] = useState<string>(() => {
    if (initialProposal?.service) return initialProposal.service;
    if (planType === 'duo') return 'Personal Training em Dupla/Casal';
    if (planType === 'family_group') return 'Treinamento Funcional & Força (Grupo/Família)';
    return 'Personal Training Presencial';
  });

  const [description, setDescription] = useState<string>(() => {
    return initialProposal?.description || DEFAULT_PROPOSAL_DESCRIPTION;
  });

  const [conditions, setConditions] = useState<string>(() => {
    return initialProposal?.conditions || DEFAULT_PROPOSAL_CONDITIONS;
  });

  const [validUntil, setValidUntil] = useState<string>(() => {
    if (initialProposal?.validUntil) return initialProposal.validUntil.split('T')[0];
    const defaultValidity = addDaysToDate(new Date(), 15);
    return formatDateToISO(defaultValidity);
  });

  const [notes, setNotes] = useState<string>(() => {
    return initialProposal?.notes || '';
  });

  // 3. FREQUÊNCIA & 4. DURAÇÃO & 5. VALOR POR PESSOA & 6. DESCONTO & 7. RESUMO
  // Central Plan Item State
  const [plans, setPlans] = useState<ProposalPlanItem[]>(() => {
    if (initialProposal && initialProposal.plans.length > 0) {
      return initialProposal.plans;
    }

    const initialDuration = 12;
    const initialPricePerPerson = 60000; // R$ 600,00 por pessoa/mês

    const defaultPricing: PlanPricing = recalculatePlanPricing({
      planType: 'duo',
      durationMonths: initialDuration,
      monthlyAmountPerPersonCents: initialPricePerPerson,
      sameAmountForAll: true,
      discountType: 'percentage',
      discountValue: 10,
      benefitLabelType: 'condicao_dupla',
      installments: initialDuration,
      cashOptionEnabled: false,
      cashDiscountType: 'percentage',
      cashDiscountValue: 5
    }, [
      { id: 'p1', nameSnapshot: '', role: 'holder' },
      { id: 'p2', nameSnapshot: '', role: 'participant' }
    ]);

    return [
      {
        id: 'plan_' + Math.random().toString(36).substring(2, 9),
        name: 'Plano Anual Dupla',
        durationMonths: initialDuration,
        frequency: '3× por semana',
        service: 'Personal Training em Dupla/Casal',
        description: 'Acompanhamento estratégico em dupla com periodização completa, sobrecarga progressiva e suporte contínuo.',
        benefits: [
          'Acompanhamento 100% individualizado para cada aluno',
          'Periodização contínua com sobrecarga progressiva',
          'Avaliações físicas e funcionais periódicas',
          'Acesso completo ao App TFIVE PRO com vídeos de execução',
          'Suporte prioritário via WhatsApp'
        ],
        pricing: defaultPricing,
        isRecommended: true
      }
    ];
  });

  const [activePlanIndex, setActivePlanIndex] = useState<number>(0);
  const currentPlan = plans[activePlanIndex] || plans[0];

  // Custom inputs for Frequency / Duration / Discount
  const [isCustomFrequency, setIsCustomFrequency] = useState<boolean>(() => {
    return !FREQUENCY_OPTIONS.slice(0, 5).includes(currentPlan?.frequency || '');
  });
  const [isCustomDuration, setIsCustomDuration] = useState<boolean>(() => {
    return !DURATION_OPTIONS.slice(0, 4).some(d => d.months === currentPlan?.durationMonths);
  });

  const [newBenefitInput, setNewBenefitInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Synchronized Pricing Updater (NEVER overridden by useEffect)
  const updatePricing = (
    pricingChanges: Partial<PlanPricing>,
    newParticipants?: ProposalParticipant[],
    newPlanType?: ProposalPlanType,
    newDuration?: number
  ) => {
    const effectivePlanType = newPlanType ?? planType;
    const effectiveParticipants = newParticipants ?? participants;
    const effectiveDuration = newDuration ?? currentPlan.durationMonths;

    setPlans(prevPlans => {
      const copy = [...prevPlans];
      const target = copy[activePlanIndex] || copy[0];

      const updatedPricing = recalculatePlanPricing({
        ...target.pricing,
        ...pricingChanges,
        durationMonths: effectiveDuration,
        planType: effectivePlanType
      }, effectiveParticipants);

      copy[activePlanIndex] = {
        ...target,
        durationMonths: effectiveDuration,
        pricing: updatedPricing
      };
      return copy;
    });
  };

  // 1. HANDLER: MUDANÇA DE TIPO DE PLANO
  const handleSelectPlanType = (newType: ProposalPlanType) => {
    setPlanType(newType);

    let updatedParticipants: ProposalParticipant[] = [...participants];

    if (newType === 'individual') {
      const holder = updatedParticipants.find(p => p.role === 'holder') || updatedParticipants[0];
      updatedParticipants = [
        holder ? { ...holder, role: 'holder' } : { id: 'part_1', nameSnapshot: '', role: 'holder' }
      ];
      setService('Personal Training Presencial');
    } else if (newType === 'duo') {
      const holder = updatedParticipants.find(p => p.role === 'holder') || updatedParticipants[0] || { id: 'part_1', nameSnapshot: '', role: 'holder' };
      const second = updatedParticipants.find(p => p.id !== holder.id) || { id: 'part_2', nameSnapshot: '', role: 'participant' };
      updatedParticipants = [
        { ...holder, role: 'holder' },
        { ...second, role: 'participant' }
      ];
      setService('Personal Training em Dupla/Casal');
    } else if (newType === 'family_group') {
      while (updatedParticipants.length < 3) {
        updatedParticipants.push({
          id: 'part_' + (updatedParticipants.length + 1),
          nameSnapshot: '',
          role: 'participant'
        });
      }
      setService('Treinamento Funcional & Força (Grupo/Família)');
    }

    setParticipants(updatedParticipants);

    // Auto-update benefit label based on type if appropriate
    let newBenefitLabel: CommercialBenefitLabel = currentPlan.pricing.benefitLabelType;
    if (newType === 'duo') newBenefitLabel = 'condicao_dupla';
    else if (newType === 'family_group') newBenefitLabel = 'condicao_familiar';
    else if (newBenefitLabel === 'condicao_dupla' || newBenefitLabel === 'condicao_familiar') newBenefitLabel = 'desconto';

    updatePricing({
      benefitLabelType: newBenefitLabel,
      planType: newType
    }, updatedParticipants, newType);
  };

  // 2. HANDLER: ATUALIZAÇÃO DE PARTICIPANTE
  const handleUpdateParticipant = (index: number, updates: Partial<ProposalParticipant>) => {
    const updated = [...participants];
    if (!updated[index]) return;
    updated[index] = { ...updated[index], ...updates };
    setParticipants(updated);

    // If custom individual pricing is active, recalculate
    if (!currentPlan.pricing.sameAmountForAll) {
      updatePricing({}, updated);
    }
  };

  const handleAddGroupParticipant = () => {
    const newPart: ProposalParticipant = {
      id: 'part_' + Math.random().toString(36).substring(2, 9),
      nameSnapshot: '',
      role: 'participant'
    };
    const nextParts = [...participants, newPart];
    setParticipants(nextParts);
    updatePricing({}, nextParts);
  };

  const handleRemoveGroupParticipant = (index: number) => {
    if (participants.length <= 1) return;
    const nextParts = participants.filter((_, idx) => idx !== index);
    setParticipants(nextParts);
    updatePricing({}, nextParts);
  };

  // 3. HANDLER: FREQUÊNCIA
  const handleSelectFrequency = (freq: string) => {
    if (freq === 'Personalizado') {
      setIsCustomFrequency(true);
    } else {
      setIsCustomFrequency(false);
      setPlans(prev => {
        const copy = [...prev];
        copy[activePlanIndex] = { ...copy[activePlanIndex], frequency: freq };
        return copy;
      });
    }
  };

  // 4. HANDLER: DURAÇÃO DO PLANO
  const handleSelectDuration = (months: number) => {
    if (months === 0) {
      setIsCustomDuration(true);
    } else {
      setIsCustomDuration(false);
      updatePricing({
        durationMonths: months,
        installments: months
      }, undefined, undefined, months);
    }
  };

  // 5. HANDLER: VALOR MENSAL POR PESSOA (MANUAL EDIT STABLE)
  const handlePricePerPersonChange = (valCents: number) => {
    const safeCents = Math.max(0, valCents);
    updatePricing({
      monthlyAmountPerPersonCents: safeCents
    });
  };

  // 6. HANDLER: DESCONTO
  const handleDiscountTypeChange = (type: DiscountType) => {
    let defaultValue = currentPlan.pricing.discountValue;
    if (type === 'none') defaultValue = 0;
    else if (type === 'percentage' && defaultValue === 0) defaultValue = 10;
    else if (type === 'fixed' && defaultValue === 0) defaultValue = 100000; // R$ 1.000,00

    updatePricing({
      discountType: type,
      discountValue: defaultValue
    });
  };

  const handleDiscountValueChange = (val: number) => {
    updatePricing({
      discountValue: Math.max(0, val)
    });
  };

  // 7. HANDLER: MESMO VALOR VS VALORES DIFERENTES
  const handleToggleSameAmount = (same: boolean) => {
    if (!same) {
      // Initialize each participant with the current per person price if missing
      const basePerPerson = currentPlan.pricing.monthlyAmountPerPersonCents || 60000;
      const updatedParts = participants.map(p => ({
        ...p,
        monthlyAmountCents: p.monthlyAmountCents || basePerPerson
      }));
      setParticipants(updatedParts);
      updatePricing({ sameAmountForAll: false }, updatedParts);
    } else {
      updatePricing({ sameAmountForAll: true });
    }
  };

  // Benefits handler
  const handleAddBenefit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !currentPlan) return;
    if (currentPlan.benefits.includes(trimmed)) return;

    setPlans(prev => {
      const copy = [...prev];
      copy[activePlanIndex] = {
        ...copy[activePlanIndex],
        benefits: [...copy[activePlanIndex].benefits, trimmed]
      };
      return copy;
    });
    setNewBenefitInput('');
  };

  const handleRemoveBenefit = (bIndex: number) => {
    setPlans(prev => {
      const copy = [...prev];
      copy[activePlanIndex] = {
        ...copy[activePlanIndex],
        benefits: copy[activePlanIndex].benefits.filter((_, idx) => idx !== bIndex)
      };
      return copy;
    });
  };

  // Object Builder for Saving / Previewing
  const buildProposalObject = (): Proposal => {
    const holderPart = participants.find(p => p.role === 'holder') || participants[0];
    const registeredStudent = holderPart?.studentId 
      ? students.find(s => s.id === holderPart.studentId) 
      : (selectedStudentId ? students.find(s => s.id === selectedStudentId) : null);

    const displayName = participants
      .map(p => p.nameSnapshot?.trim())
      .filter(Boolean)
      .join(' & ') || registeredStudent?.name || holderPart?.nameSnapshot || 'Aluno TFIVE';

    const studentSnapshot = {
      name: displayName,
      phone: registeredStudent?.phone || holderPart?.phoneSnapshot || '',
      email: registeredStudent?.email || holderPart?.emailSnapshot || '',
      goal: registeredStudent?.goal || '',
      avatarUrl: (registeredStudent as any)?.avatarUrl || ''
    };

    const trainerSnapshot = {
      name: trainerProfile?.name || 'Personal Trainer',
      title: trainerProfile?.title || 'Personal Trainer',
      cref: trainerProfile?.cref || '',
      phone: trainerProfile?.phone || '',
      email: trainerProfile?.email || '',
      slogan: trainerProfile?.slogan || 'PERFORMANCE SEM DESCULPAS. RESULTADOS SEM LIMITES.'
    };

    let generatedTitle = title.trim();
    if (!generatedTitle || generatedTitle === 'Proposta Comercial de Treinamento') {
      if (planType === 'duo') {
        generatedTitle = `Proposta Dupla — ${displayName}`;
      } else if (planType === 'family_group') {
        generatedTitle = `Proposta Grupo — ${displayName}`;
      } else {
        generatedTitle = `Proposta Comercial — ${displayName}`;
      }
    }

    return {
      id: initialProposal?.id || ('prop_' + Math.random().toString(36).substring(2, 9)),
      title: generatedTitle,
      studentId: registeredStudent?.id || holderPart?.studentId || '',
      studentSnapshot,
      participants,
      planType,
      service,
      description,
      mode: 'single_plan',
      plans,
      conditions,
      validUntil: validUntil ? `${validUntil}T23:59:59.000Z` : '',
      status: initialProposal?.status || 'draft',
      createdAt: initialProposal?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sentAt: initialProposal?.sentAt,
      acceptedAt: initialProposal?.acceptedAt,
      version: initialProposal?.version || 1,
      notes,
      trainerSnapshot
    };
  };

  const hasValidPersons = () => {
    return participants.some(p => p.nameSnapshot && p.nameSnapshot.trim().length > 0);
  };

  const handleSave = async () => {
    if (!hasValidPersons()) {
      alert('Por favor, informe o nome de pelo menos um participante da proposta.');
      return;
    }
    try {
      setIsSaving(true);
      const proposal = buildProposalObject();
      await onSave(proposal);
      setSaveSuccessMessage('Proposta salva com sucesso!');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Falha ao salvar proposta:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreviewPDF = () => {
    if (!hasValidPersons()) {
      alert('Por favor, informe o nome de pelo menos um participante para visualizar o PDF.');
      return;
    }
    const proposal = buildProposalObject();
    onOpenPDF(proposal);
  };

  const handleSaveAsTemplate = async () => {
    try {
      const templateName = prompt('Nome do novo modelo comercial:', currentPlan.name || 'Modelo de Proposta');
      if (!templateName) return;

      const newTemplate: ProposalTemplate = {
        id: 'ptpl_' + Math.random().toString(36).substring(2, 9),
        name: templateName.trim(),
        title: title.trim() || templateName.trim(),
        service,
        description,
        defaultDescription: description,
        planType,
        mode: 'single_plan',
        plans,
        conditions,
        defaultValidityDays: 15,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveProposalTemplate(newTemplate);
      alert('Modelo de proposta comercial salvo com sucesso!');
    } catch (err) {
      console.error('Falha ao salvar modelo:', err);
    }
  };

  // Financial Metrics Shortcuts for UI
  const participantCount = planType === 'duo' ? 2 : (planType === 'individual' ? 1 : Math.max(1, participants.length));
  const pricing = currentPlan.pricing;
  const normalPerPersonMonthly = pricing.monthlyAmountPerPersonCents;
  const discountedPerPersonMonthly = pricing.perPersonEquivalentMonthlyAmountCents;
  const normalTotalMonthly = pricing.baseMonthlyAmountCents;
  const discountedTotalMonthly = pricing.equivalentMonthlyAmountCents;

  return (
    <div className="space-y-6 pb-20 animate-fadeIn text-zinc-100">
      
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121212] border border-[#27272A] rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-zinc-400 hover:text-white transition-all border border-[#27272A]"
            title="Voltar para a lista"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight font-display flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#374151]" />
              <span>{initialProposal ? 'Editar Proposta Comercial' : 'Criar Nova Proposta Comercial'}</span>
            </h1>
            <p className="text-xs text-zinc-400">
              Fluxo rápido com cálculo automático e proposta executiva para fechar negócios.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenTemplates}
            className="px-3.5 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-zinc-300 hover:text-white text-xs font-bold transition-all border border-[#27272A] flex items-center gap-2"
          >
            <LayoutTemplate className="w-4 h-4 text-[#374151]" />
            <span>Modelos</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAsTemplate}
            className="px-3.5 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-zinc-300 hover:text-white text-xs font-bold transition-all border border-[#27272A] flex items-center gap-2"
          >
            <Copy className="w-4 h-4 text-emerald-400" />
            <span>Salvar Modelo</span>
          </button>

          <button
            type="button"
            onClick={handlePreviewPDF}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all border border-zinc-700 flex items-center gap-2"
          >
            <Printer className="w-4 h-4 text-[#374151]" />
            <span>Visualizar &amp; Gerar PDF</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-xs flex items-center gap-2 disabled:opacity-80"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Salvando...' : 'Salvar Proposta'}</span>
          </button>
        </div>
      </div>

      {saveSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* Main Responsive Grid: Tablet/Desktop Left Form + Right Live Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Ordered 10-step Configuration (7 cols on lg, 8 on xl) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">

          {/* =======================================================
              PASSO 1: TIPO DE PLANO (INDIVIDUAL, DUPLA, FAMILIAR)
             ======================================================= */}
          <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#F3F4F6] text-[#374151] font-black text-xs flex items-center justify-center border border-[#E5E7EB]">
                  1
                </span>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  Tipo de Plano
                </h2>
              </div>
              <span className="text-xs font-bold text-zinc-400">
                {planType === 'duo' && '2 participantes automáticos'}
                {planType === 'individual' && '1 participante'}
                {planType === 'family_group' && `${participants.length} participantes`}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 p-1 bg-[#18181B] border border-[#27272A] rounded-xl">
              <button
                type="button"
                onClick={() => handleSelectPlanType('individual')}
                className={`py-3 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-2 ${
                  planType === 'individual'
                    ? 'bg-[#374151] text-white shadow-lg'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Individual</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPlanType('duo')}
                className={`py-3 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-2 ${
                  planType === 'duo'
                    ? 'bg-[#374151] text-white shadow-lg'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Dupla (2 Pessoas)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPlanType('family_group')}
                className={`py-3 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-2 ${
                  planType === 'family_group'
                    ? 'bg-[#374151] text-white shadow-lg'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Familiar / Grupo</span>
              </button>
            </div>
          </div>

          {/* =======================================================
              PASSO 2: SELEÇÃO DAS PESSOAS
             ======================================================= */}
          <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#F3F4F6] text-[#374151] font-black text-xs flex items-center justify-center border border-[#E5E7EB]">
                  2
                </span>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  {planType === 'duo' ? 'Seleção das Duas Pessoas' : 'Participantes da Proposta'}
                </h2>
              </div>
              <span className="text-[11px] text-zinc-400">
                Não é obrigatório cadastrar como aluno
              </span>
            </div>

            <div className="space-y-3">
              {participants.map((part, pIdx) => {
                const partId = part.id || `part_${pIdx + 1}`;
                const inputMode = participantInputModes[partId] || (part.studentId ? 'select' : 'custom');
                const isHolder = pIdx === 0;

                return (
                  <div 
                    key={partId}
                    className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-zinc-800 text-zinc-300 text-xs font-black flex items-center justify-center">
                          {pIdx + 1}
                        </span>
                        <span className="text-xs font-black uppercase text-white tracking-wide">
                          {planType === 'duo' 
                            ? (isHolder ? 'Pessoa 1 (Titular / Contratante)' : 'Pessoa 2')
                            : `Pessoa ${pIdx + 1} ${isHolder ? '(Titular)' : ''}`}
                        </span>
                        {isHolder && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]">
                            Principal
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Inline Mode Switcher: Aluno vs Nome */}
                        {!lockStudentSelection || part.role !== 'holder' ? (
                        <div className="flex items-center bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setParticipantInputModes(prev => ({ ...prev, [partId]: 'select' }))}
                            className={`px-2 py-1 rounded font-bold transition-all ${
                              inputMode === 'select' ? 'bg-[#374151] text-white' : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            Selecionar Aluno
                          </button>
                          <button
                            type="button"
                            onClick={() => setParticipantInputModes(prev => ({ ...prev, [partId]: 'custom' }))}
                            className={`px-2 py-1 rounded font-bold transition-all ${
                              inputMode === 'custom' ? 'bg-[#374151] text-white' : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            Digitar Nome
                          </button>
                        </div>
                        ) : null}
                        {/* Remove participant for group (if 3 or more) */}
                        {planType === 'family_group' && participants.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveGroupParticipant(pIdx)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Remover pessoa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inputs based on mode */}
                    {inputMode === 'select' ? (
                      <div>
                        {lockStudentSelection && part.role === 'holder' ? (
                          <div className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-zinc-400">
                            {students.find(s => s.id === part.studentId)?.name || part.nameSnapshot} (Bloqueado)
                          </div>
                        ) : (
                        <select
                          value={part.studentId || ''}
                          onChange={e => {
                            const foundStudent = students.find(s => s.id === e.target.value);
                            if (foundStudent) {
                              handleUpdateParticipant(pIdx, {
                                studentId: foundStudent.id,
                                nameSnapshot: foundStudent.name,
                                phoneSnapshot: foundStudent.phone || '',
                                emailSnapshot: foundStudent.email || ''
                              });
                            } else {
                              handleUpdateParticipant(pIdx, {
                                studentId: undefined,
                                nameSnapshot: ''
                              });
                            }
                          }}
                          className="w-full bg-[#121212] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#374151]"
                        >
                          <option value="" className="bg-[#18181B] text-white">-- Selecione um aluno cadastrado --</option>
                          {students.map(s => (
                            <option key={s.id} value={s.id} className="bg-[#18181B] text-white">
                              {s.name} {s.phone ? `(${s.phone})` : ''}
                            </option>
                          ))}
                        </select>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <input
                            type="text"
                            value={part.nameSnapshot}
                            onChange={e => handleUpdateParticipant(pIdx, { nameSnapshot: e.target.value, studentId: undefined })}
                            placeholder="Nome da pessoa (ex: Ana)"
                            className="w-full bg-[#121212] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#374151]"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={part.phoneSnapshot || ''}
                            onChange={e => handleUpdateParticipant(pIdx, { phoneSnapshot: e.target.value })}
                            placeholder="WhatsApp / Telefone (opcional)"
                            className="w-full bg-[#121212] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#374151]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {planType === 'family_group' && (
                <button
                  type="button"
                  onClick={handleAddGroupParticipant}
                  className="w-full py-2.5 px-4 rounded-xl border border-dashed border-[#27272A] hover:border-[#374151] bg-zinc-900/40 text-xs font-bold text-zinc-300 hover:text-white flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4 text-[#374151]" />
                  <span>Adicionar Mais uma Pessoa ao Grupo</span>
                </button>
              )}
            </div>
          </div>

          {/* =======================================================
              PASSO 3: FREQUÊNCIA SEMANAL
             ======================================================= */}
          <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#F3F4F6] text-[#374151] font-black text-xs flex items-center justify-center border border-[#E5E7EB]">
                  3
                </span>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  Frequência Semanal
                </h2>
              </div>
              <span className="text-xs font-bold text-[#374151] font-mono-nums">
                {currentPlan.frequency}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              {FREQUENCY_OPTIONS.map((freqOption) => {
                const isSelected = !isCustomFrequency && currentPlan.frequency === freqOption;
                const isCustomSelected = freqOption === 'Personalizado' && isCustomFrequency;
                const active = isSelected || isCustomSelected;

                return (
                  <button
                    key={freqOption}
                    type="button"
                    onClick={() => handleSelectFrequency(freqOption)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                      active
                        ? 'bg-[#374151] text-white border-[#374151] shadow-md'
                        : 'bg-[#18181B] text-zinc-300 hover:text-white border-[#27272A] hover:bg-zinc-800'
                    }`}
                  >
                    {freqOption === 'Personalizado' ? 'Outra' : freqOption.replace(' por semana', '')}
                  </button>
                );
              })}
            </div>

            {isCustomFrequency && (
              <div className="pt-2 animate-fadeIn">
                <label className="text-[11px] font-bold text-zinc-400 block mb-1">
                  Descreva a frequência personalizada:
                </label>
                <input
                  type="text"
                  value={currentPlan.frequency}
                  onChange={e => {
                    const val = e.target.value;
                    setPlans(prev => {
                      const copy = [...prev];
                      copy[activePlanIndex] = { ...copy[activePlanIndex], frequency: val };
                      return copy;
                    });
                  }}
                  placeholder="Ex: 3× por semana + 1× treino livre"
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#374151]"
                />
              </div>
            )}
          </div>

          {/* =======================================================
              PASSO 4: DURAÇÃO DO PLANO
             ======================================================= */}
          <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#F3F4F6] text-[#374151] font-black text-xs flex items-center justify-center border border-[#E5E7EB]">
                  4
                </span>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  Duração do Plano
                </h2>
              </div>
              <span className="text-xs font-bold text-white font-mono-nums">
                {currentPlan.durationMonths} {currentPlan.durationMonths === 1 ? 'mês' : 'meses'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {DURATION_OPTIONS.map((durOption) => {
                const isSelected = !isCustomDuration && currentPlan.durationMonths === durOption.months;
                const isCustomSelected = durOption.months === 0 && isCustomDuration;
                const active = isSelected || isCustomSelected;

                return (
                  <button
                    key={durOption.label}
                    type="button"
                    onClick={() => handleSelectDuration(durOption.months)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                      active
                        ? 'bg-[#374151] text-white border-[#374151] shadow-md'
                        : 'bg-[#18181B] text-zinc-300 hover:text-white border-[#27272A] hover:bg-zinc-800'
                    }`}
                  >
                    {durOption.months > 0 ? `${durOption.months} ${durOption.months === 1 ? 'Mês' : 'Meses'}` : 'Outra'}
                  </button>
                );
              })}
            </div>

            {isCustomDuration && (
              <div className="pt-2 animate-fadeIn flex items-center gap-3">
                <label className="text-[11px] font-bold text-zinc-400">
                  Quantidade de meses personalizada:
                </label>
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={currentPlan.durationMonths}
                  onChange={e => {
                    const val = Math.max(1, parseInt(e.target.value) || 1);
                    updatePricing({ durationMonths: val, installments: val }, undefined, undefined, val);
                  }}
                  className="w-24 bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-1.5 text-xs text-white font-mono-nums focus:outline-none focus:border-[#374151]"
                />
              </div>
            )}

            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Total do período contratado:</span>
              <span className="font-bold text-white font-mono-nums">
                {currentPlan.durationMonths} meses ({currentPlan.durationMonths * 4} semanas estimadas)
              </span>
            </div>
          </div>

          {/* =======================================================
              PASSO 5: VALOR MENSAL POR PESSOA (COM PERSISTÊNCIA MANUAL)
             ======================================================= */}
          <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-5 sm:p-6 space-y-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#F3F4F6] text-[#374151] font-black text-xs flex items-center justify-center border border-[#E5E7EB]">
                  5
                </span>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  Valor do Plano
                </h2>
              </div>
              
              {/* Toggle Mesmo valor para todos vs Diferente */}
              <button
                type="button"
                onClick={() => handleToggleSameAmount(!pricing.sameAmountForAll)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                  pricing.sameAmountForAll
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
              >
                {pricing.sameAmountForAll ? '✓ Mesmo valor para todos' : 'Valores individuais'}
              </button>
            </div>

            {/* Main Price Input */}
            {pricing.sameAmountForAll ? (
              <div className="space-y-3">
                <label className="text-xs font-black text-zinc-300 uppercase tracking-wider block">
                  Valor Mensal por Pessoa
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">
                    R$
                  </span>
                  <input
                    type="number"
                    step="10"
                    min="0"
                    value={centsToFloat(pricing.monthlyAmountPerPersonCents)}
                    onChange={e => handlePricePerPersonChange(floatToCents(parseFloat(e.target.value) || 0))}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-xl pl-12 pr-4 py-3 text-lg font-black text-white font-mono-nums focus:outline-none focus:border-[#374151] transition-colors"
                  />
                </div>

                {/* Instant Calculation Pill */}
                <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>
                      {planType === 'duo' 
                        ? 'Valor mensal da dupla (2 pessoas):' 
                        : (planType === 'family_group' ? `Valor mensal do grupo (${participantCount} pessoas):` : 'Valor mensal:')}
                    </span>
                    <strong className="text-base text-[#374151] font-mono-nums">
                      {formatCurrencyCents(pricing.baseMonthlyAmountCents)} / mês
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800">
                    <span>Valor original no período ({pricing.durationMonths} meses):</span>
                    <span className="font-mono-nums font-bold text-zinc-300">
                      {formatCurrencyCents(pricing.originalAmountCents)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Individual Amounts for Each Person */
              <div className="space-y-4">
                <p className="text-xs text-zinc-400">
                  Defina o valor mensal individual de cada participante:
                </p>
                <div className="space-y-2.5">
                  {participants.map((part, pIdx) => {
                    const currentPartMonthlyCents = part.monthlyAmountCents !== undefined 
                      ? part.monthlyAmountCents 
                      : pricing.monthlyAmountPerPersonCents;

                    return (
                      <div 
                        key={part.id || pIdx}
                        className="p-3 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-between gap-4"
                      >
                        <span className="text-xs font-bold text-white">
                          {part.nameSnapshot || `Pessoa ${pIdx + 1}`}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-400 font-bold">R$</span>
                          <input
                            type="number"
                            step="10"
                            min="0"
                            value={centsToFloat(currentPartMonthlyCents)}
                            onChange={e => {
                              const newAmount = floatToCents(parseFloat(e.target.value) || 0);
                              handleUpdateParticipant(pIdx, { monthlyAmountCents: newAmount });
                            }}
                            className="w-28 bg-[#121212] border border-[#27272A] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono-nums text-right focus:outline-none focus:border-[#374151]"
                          />
                          <span className="text-xs text-zinc-400">/mês</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-300">Total Mensal Acumulado:</span>
                  <span className="text-sm font-black text-[#374151] font-mono-nums">
                    {formatCurrencyCents(pricing.baseMonthlyAmountCents)} / mês
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* =======================================================
              PASSO 6: DESCONTO
             ======================================================= */}
          <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#F3F4F6] text-[#374151] font-black text-xs flex items-center justify-center border border-[#E5E7EB]">
                  6
                </span>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  Desconto / Condição Comercial
                </h2>
              </div>
              {pricing.discountAmountCents > 0 && (
                <span className="text-xs font-bold text-emerald-400 font-mono-nums">
                  Economia: {formatCurrencyCents(pricing.discountAmountCents)}
                </span>
              )}
            </div>

            {/* Discount Type Selector */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-[#18181B] border border-[#27272A] rounded-xl">
              <button
                type="button"
                onClick={() => handleDiscountTypeChange('none')}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                  pricing.discountType === 'none'
                    ? 'bg-zinc-700 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Sem Desconto
              </button>

              <button
                type="button"
                onClick={() => handleDiscountTypeChange('percentage')}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  pricing.discountType === 'percentage'
                    ? 'bg-[#374151] text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Percent className="w-3.5 h-3.5" />
                <span>% Porcentagem</span>
              </button>

              <button
                type="button"
                onClick={() => handleDiscountTypeChange('fixed')}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  pricing.discountType === 'fixed'
                    ? 'bg-[#374151] text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>R$ Valor Fixo</span>
              </button>
            </div>

            {/* Discount Input Field */}
            {pricing.discountType !== 'none' && (
              <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-3 animate-fadeIn">
                <label className="text-xs font-bold text-zinc-300 block">
                  {pricing.discountType === 'percentage' 
                    ? 'Porcentagem de Desconto (%):' 
                    : 'Valor do Desconto Total (R$):'}
                </label>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={pricing.discountType === 'percentage' ? 100 : centsToFloat(pricing.originalAmountCents)}
                    value={pricing.discountType === 'percentage' ? pricing.discountValue : centsToFloat(pricing.discountValue)}
                    onChange={e => {
                      const inputVal = parseFloat(e.target.value) || 0;
                      if (pricing.discountType === 'percentage') {
                        handleDiscountValueChange(Math.min(100, Math.max(0, inputVal)));
                      } else {
                        handleDiscountValueChange(floatToCents(inputVal));
                      }
                    }}
                    className="w-full bg-[#121212] border border-[#27272A] rounded-xl px-4 py-2.5 text-base font-bold text-white font-mono-nums focus:outline-none focus:border-[#374151]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                    {pricing.discountType === 'percentage' ? '%' : 'R$'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-emerald-400 pt-1">
                  <span>Você economiza:</span>
                  <strong className="font-mono-nums text-sm">
                    {formatCurrencyCents(pricing.discountAmountCents)}
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* =======================================================
              PASSO 7: RESUMO DO INVESTIMENTO (DETALHADO NO FLUXO)
             ======================================================= */}
          <div className="bg-[#121212] border-2 border-[#D1D5DB] rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#374151] text-white font-black text-xs flex items-center justify-center">
                  7
                </span>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  Resumo do Investimento
                </h2>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]">
                {formatPlanTypeLabel(planType)}
              </span>
            </div>

            {/* Mandatory Comparison Box (Normal vs Com Desconto) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-[#18181B] border border-zinc-800 space-y-1">
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">
                  Por Pessoa
                </span>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-zinc-400">Valor Normal:</span>
                  <span className="font-mono-nums line-through text-zinc-400">
                    {formatCurrencyCents(normalPerPersonMonthly)}/mês
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs pt-1 border-t border-zinc-800/60">
                  <span className="font-bold text-emerald-400">Com Desconto:</span>
                  <span className="font-mono-nums font-black text-sm text-white">
                    {formatCurrencyCents(discountedPerPersonMonthly)}/mês
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#18181B] border border-zinc-800 space-y-1">
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">
                  {planType === 'duo' ? 'Total da Dupla' : 'Total do Plano'}
                </span>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-zinc-400">Valor Normal:</span>
                  <span className="font-mono-nums line-through text-zinc-400">
                    {formatCurrencyCents(normalTotalMonthly)}/mês
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs pt-1 border-t border-zinc-800/60">
                  <span className="font-bold text-emerald-400">Com Desconto:</span>
                  <span className="font-mono-nums font-black text-sm text-[#374151]">
                    {formatCurrencyCents(discountedTotalMonthly)}/mês
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Ledger */}
            <div className="space-y-2 text-xs pt-1">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Duração do Contrato:</span>
                <span className="font-bold text-white font-mono-nums">{pricing.durationMonths} meses</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Valor Original do Período:</span>
                <span className="font-bold text-zinc-400 line-through font-mono-nums">{formatCurrencyCents(pricing.originalAmountCents)}</span>
              </div>
              {pricing.discountAmountCents > 0 && (
                <div className="flex items-center justify-between text-emerald-400 font-bold">
                  <span>Desconto ({pricing.discountType === 'percentage' ? `${pricing.discountValue}%` : 'Fixo'}):</span>
                  <span className="font-mono-nums">- {formatCurrencyCents(pricing.discountAmountCents)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm font-black text-white pt-2 border-t border-zinc-800">
                <span className="uppercase">Investimento Final:</span>
                <span className="text-lg text-[#374151] font-mono-nums">
                  {formatCurrencyCents(pricing.finalAmountCents)}
                </span>
              </div>
            </div>

            {/* Installments & Cash Condition */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-400 block">
                  Parcelamento no Cartão:
                </label>
                <select
                  value={pricing.installments}
                  onChange={e => updatePricing({ installments: parseInt(e.target.value) || 1 })}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#374151]"
                >
                  {[1, 2, 3, 4, 5, 6, 10, 12, 18, 24].map(n => (
                    <option key={n} value={n} className="bg-[#18181B] text-white">
                      Em até {n}× de {formatCurrencyCents(Math.round(pricing.finalAmountCents / n))}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-400 block">
                  Nome do Benefício no PDF:
                </label>
                <select
                  value={pricing.benefitLabelType}
                  onChange={e => updatePricing({ benefitLabelType: e.target.value as CommercialBenefitLabel })}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#374151]"
                >
                  <option value="condicao_dupla" className="bg-[#18181B] text-white">Condição Especial Dupla</option>
                  <option value="condicao_familiar" className="bg-[#18181B] text-white">Condição Especial Familiar</option>
                  <option value="condicao_especial" className="bg-[#18181B] text-white">Condição Especial</option>
                  <option value="desconto" className="bg-[#18181B] text-white">Desconto Direto</option>
                  <option value="beneficio_plano" className="bg-[#18181B] text-white">Benefício do Plano</option>
                </select>
              </div>
            </div>

            {/* Optional Cash Discount (PIX) */}
            <div className="border-t border-zinc-800 pt-3 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pricing.cashOptionEnabled}
                  onChange={e => updatePricing({ cashOptionEnabled: e.target.checked })}
                  className="w-4 h-4 text-emerald-500 rounded border-zinc-700 bg-zinc-900 focus:ring-0"
                />
                <span className="text-xs font-bold text-emerald-400">
                  Oferecer opção de pagamento à vista (PIX) com desconto adicional
                </span>
              </label>

              {pricing.cashOptionEnabled && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-300 font-bold">Desconto Extra (%):</span>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={pricing.cashDiscountValue}
                      onChange={e => updatePricing({ cashDiscountValue: parseFloat(e.target.value) || 0 })}
                      className="w-16 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white font-mono-nums"
                    />
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 block">Total à Vista (PIX):</span>
                    <span className="font-black text-emerald-400 font-mono-nums">
                      {formatCurrencyCents(pricing.cashFinalAmountCents)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* =======================================================
              PASSO 8: BENEFÍCIOS & CONDIÇÕES GERAIS
             ======================================================= */}
          <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-5 sm:p-6 space-y-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#F3F4F6] text-[#374151] font-black text-xs flex items-center justify-center border border-[#E5E7EB]">
                  8
                </span>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  Benefícios &amp; Condições
                </h2>
              </div>
            </div>

            {/* Plan Name & Service */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Nome do Plano
                </label>
                <input
                  type="text"
                  value={currentPlan.name}
                  onChange={e => {
                    const val = e.target.value;
                    setPlans(prev => {
                      const copy = [...prev];
                      copy[activePlanIndex] = { ...copy[activePlanIndex], name: val };
                      return copy;
                    });
                  }}
                  placeholder="Ex: Plano Anual Dupla"
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#374151]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Validade da Proposta
                </label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={e => setValidUntil(e.target.value)}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#374151]"
                />
              </div>
            </div>

            {/* Quick Benefits Chips */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-zinc-300 block">
                Sugestões Rápidas de Benefícios (Clique para adicionar/remover):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_BENEFIT_CHIPS.map((chip, cIdx) => {
                  const isIncluded = currentPlan.benefits.includes(chip);
                  return (
                    <button
                      key={cIdx}
                      type="button"
                      onClick={() => {
                        if (isIncluded) {
                          handleRemoveBenefit(currentPlan.benefits.indexOf(chip));
                        } else {
                          handleAddBenefit(chip);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 border ${
                        isIncluded
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-bold'
                          : 'bg-[#18181B] text-zinc-400 hover:text-white border-[#27272A]'
                      }`}
                    >
                      {isIncluded && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      <span>{chip}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Benefit Input */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newBenefitInput}
                onChange={e => setNewBenefitInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddBenefit(newBenefitInput);
                  }
                }}
                placeholder="Adicionar outro benefício..."
                className="flex-1 bg-[#18181B] border border-[#27272A] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#374151]"
              />
              <button
                type="button"
                onClick={() => handleAddBenefit(newBenefitInput)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all border border-zinc-700"
              >
                Adicionar
              </button>
            </div>

            {/* Current Plan Benefits List */}
            <div className="space-y-1.5 pt-2">
              {currentPlan.benefits.map((b, bIdx) => (
                <div 
                  key={bIdx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#18181B] border border-[#27272A] text-xs text-zinc-200"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#374151] shrink-0" />
                    <span>{b}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveBenefit(bIdx)}
                    className="text-zinc-400 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* General Conditions Textarea */}
            <div className="pt-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                Termos &amp; Condições Gerais
              </label>
              <textarea
                rows={3}
                value={conditions}
                onChange={e => setConditions(e.target.value)}
                className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#374151] leading-relaxed"
              />
            </div>
          </div>

        </div>

        {/* Right Column: Sticky Executive Card (Tablet & Desktop Preview & Actions) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 sticky top-6">
          
          <div className="bg-[#18181B] border-2 border-[#374151]/50 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#374151] block">
                  Resumo da Proposta
                </span>
                <h3 className="text-base font-black text-white uppercase font-display">
                  {currentPlan.name || 'Plano Comercial'}
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#374151] text-white text-[10px] font-black uppercase">
                {planType === 'duo' ? 'DUPLA' : (planType === 'family_group' ? 'GRUPO' : 'INDIVIDUAL')}
              </span>
            </div>

            {/* Big Numbers */}
            <div className="bg-[#121212] rounded-xl p-4 border border-[#27272A] text-center space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                {planType === 'duo' ? 'Mensalidade da Dupla' : 'Mensalidade Total'}
              </span>
              <div className="text-3xl font-black text-white font-mono-nums">
                {formatCurrencyCents(discountedTotalMonthly)}
                <span className="text-xs font-bold text-zinc-400"> /mês</span>
              </div>
              {participantCount > 1 && (
                <div className="text-xs font-bold text-[#374151] font-mono-nums pt-1">
                  {formatCurrencyCents(discountedPerPersonMonthly)} / pessoa / mês
                </div>
              )}
            </div>

            {/* Participants Summary */}
            <div className="space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase text-zinc-400 block tracking-wider">
                Participantes:
              </span>
              {participants.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between text-zinc-300">
                  <span className="font-medium">
                    {idx + 1}. {p.nameSnapshot?.trim() || '(Aguardando nome)'}
                  </span>
                  {p.role === 'holder' && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                      Titular
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Financial Specs */}
            <div className="space-y-2 text-xs border-t border-[#27272A] pt-3">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Frequência:</span>
                <span className="font-bold text-white">{currentPlan.frequency}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Duração:</span>
                <span className="font-bold text-white">{currentPlan.durationMonths} meses</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Valor Original:</span>
                <span className="font-bold text-zinc-400 line-through font-mono-nums">
                  {formatCurrencyCents(pricing.originalAmountCents)}
                </span>
              </div>
              {pricing.discountAmountCents > 0 && (
                <div className="flex items-center justify-between text-emerald-400 font-bold">
                  <span>Desconto:</span>
                  <span className="font-mono-nums">- {formatCurrencyCents(pricing.discountAmountCents)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm font-black text-white pt-2 border-t border-[#27272A]">
                <span>Investimento Final:</span>
                <span className="text-[#374151] font-mono-nums">{formatCurrencyCents(pricing.finalAmountCents)}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                <span>Parcelamento:</span>
                <span className="font-bold text-white font-mono-nums">
                  {pricing.installments}× de {formatCurrencyCents(pricing.installmentAmountCents)}
                </span>
              </div>
            </div>

            {/* Action Buttons: 9. PREVIEW & 10. GERAR PDF */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handlePreviewPDF}
                className="w-full py-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-zinc-700 shadow-md"
              >
                <Printer className="w-4 h-4 text-[#374151]" />
                <span>9. Visualizar &amp; Gerar PDF</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-3.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-xs flex items-center justify-center gap-2 disabled:opacity-80"
              >
                <Save className="w-4 h-4" />
                <span>10. {isSaving ? 'Salvando Proposta...' : 'Salvar Proposta'}</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
