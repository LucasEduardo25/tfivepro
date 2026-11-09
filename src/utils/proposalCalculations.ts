/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  PlanPricing, 
  DiscountType, 
  CashDiscountType, 
  CommercialBenefitLabel, 
  Proposal, 
  ProposalPlanItem,
  ProposalParticipant,
  ProposalPlanType
} from '../types/proposal';

/**
 * Calculates total monthly amount for all participants based on same amount vs individual amounts.
 */
export function calculateParticipantMonthlyTotal(
  participants: ProposalParticipant[] = [],
  sameAmountForAll: boolean = true,
  monthlyAmountPerPersonCents: number = 90000
): number {
  const safePerPerson = Math.max(0, Math.round(monthlyAmountPerPersonCents || 0));
  const count = Math.max(1, participants.length || 1);

  if (sameAmountForAll || participants.length === 0) {
    return count * safePerPerson;
  }

  // Individual amounts sum
  return participants.reduce((total, p) => {
    let participantMonthly = p.monthlyAmountCents !== undefined && p.monthlyAmountCents !== null
      ? Math.max(0, Math.round(p.monthlyAmountCents))
      : safePerPerson;
    
    // If individual discount is applied
    if (p.discountPercent && p.discountPercent > 0) {
      const disc = Math.round((participantMonthly * Math.min(100, p.discountPercent)) / 100);
      participantMonthly = Math.max(0, participantMonthly - disc);
    }

    return total + participantMonthly;
  }, 0);
}

/**
 * Calculates the monthly plan total.
 */
export function calculateMonthlyPlanTotal(
  numberOfParticipants: number,
  monthlyAmountPerPersonCents: number,
  participants?: ProposalParticipant[],
  sameAmountForAll: boolean = true
): number {
  if (participants && participants.length > 0) {
    return calculateParticipantMonthlyTotal(participants, sameAmountForAll, monthlyAmountPerPersonCents);
  }
  const safeCount = Math.max(1, Math.round(numberOfParticipants || 1));
  const safePerPerson = Math.max(0, Math.round(monthlyAmountPerPersonCents || 0));
  return safeCount * safePerPerson;
}

/**
 * Calculates original total amount for the full contract period.
 * monthlyPlanAmount * durationMonths
 */
export function calculateOriginalPeriodAmount(
  monthlyPlanAmountCents: number,
  durationMonths: number
): number {
  const safeMonthly = Math.max(0, Math.round(monthlyPlanAmountCents || 0));
  const safeMonths = Math.max(1, Math.round(durationMonths || 1));
  return safeMonthly * safeMonths;
}

/**
 * Legacy alias for backwards compatibility
 */
export const calculateOriginalAmount = calculateOriginalPeriodAmount;

/**
 * Calculates plan discount amount and final price after discount with strict validation.
 * - Percentage: 0% to 100%
 * - Fixed: 0 to originalAmountCents
 */
export function calculatePlanDiscount(
  originalAmountCents: number,
  discountType: DiscountType,
  discountValue: number
): { discountAmountCents: number; finalAmountCents: number } {
  const safeOriginal = Math.max(0, Math.round(originalAmountCents || 0));

  if (discountType === 'percentage') {
    const safePercent = Math.min(100, Math.max(0, discountValue || 0));
    const discountAmountCents = Math.round((safeOriginal * safePercent) / 100);
    const finalAmountCents = Math.max(0, safeOriginal - discountAmountCents);
    return { discountAmountCents, finalAmountCents };
  }

  if (discountType === 'fixed') {
    const safeFixed = Math.max(0, Math.round(discountValue || 0));
    const discountAmountCents = Math.min(safeOriginal, safeFixed);
    const finalAmountCents = Math.max(0, safeOriginal - discountAmountCents);
    return { discountAmountCents, finalAmountCents };
  }

  return { discountAmountCents: 0, finalAmountCents: safeOriginal };
}

/**
 * Legacy alias for backwards compatibility
 */
export const calculateDiscount = calculatePlanDiscount;

/**
 * Calculates final amount after discount.
 */
export function calculateFinalAmount(originalAmountCents: number, discountAmountCents: number): number {
  const safeOriginal = Math.max(0, Math.round(originalAmountCents || 0));
  const safeDiscount = Math.max(0, Math.round(discountAmountCents || 0));
  return Math.max(0, safeOriginal - safeDiscount);
}

/**
 * Calculates monthly equivalent for the plan after discount.
 */
export function calculateMonthlyEquivalent(finalAmountCents: number, durationMonths: number): number {
  const safeFinal = Math.max(0, Math.round(finalAmountCents || 0));
  const safeMonths = Math.max(1, Math.round(durationMonths || 1));
  return Math.round(safeFinal / safeMonths);
}

/**
 * Calculates per-person monthly equivalent.
 */
export function calculatePerPersonEquivalent(
  equivalentMonthlyAmountCents: number,
  numberOfParticipants: number
): number {
  const safeMonthly = Math.max(0, Math.round(equivalentMonthlyAmountCents || 0));
  const safeCount = Math.max(1, Math.round(numberOfParticipants || 1));
  return Math.round(safeMonthly / safeCount);
}

/**
 * Calculates installment values ensuring rounding stability.
 */
export function calculateInstallments(
  finalAmountCents: number,
  installmentsCount: number
): { installmentAmountCents: number; totalInstallmentsCents: number; remainderCents: number } {
  const safeFinal = Math.max(0, Math.round(finalAmountCents || 0));
  const safeInstallments = Math.max(1, Math.round(installmentsCount || 1));

  const installmentAmountCents = Math.round(safeFinal / safeInstallments);
  const totalInstallmentsCents = installmentAmountCents * safeInstallments;
  const remainderCents = safeFinal - totalInstallmentsCents;

  return {
    installmentAmountCents,
    totalInstallmentsCents,
    remainderCents
  };
}

/**
 * Calculates cash discount applied strictly over finalAmountCents.
 */
export function calculateCashCondition(
  finalAmountCents: number,
  cashOptionEnabled: boolean,
  cashDiscountType: CashDiscountType,
  cashDiscountValue: number
): { cashDiscountAmountCents: number; cashFinalAmountCents: number } {
  const safeFinal = Math.max(0, Math.round(finalAmountCents || 0));

  if (!cashOptionEnabled) {
    return { cashDiscountAmountCents: 0, cashFinalAmountCents: safeFinal };
  }

  if (cashDiscountType === 'percentage') {
    const safePercent = Math.min(100, Math.max(0, cashDiscountValue || 0));
    const cashDiscountAmountCents = Math.round((safeFinal * safePercent) / 100);
    const cashFinalAmountCents = Math.max(0, safeFinal - cashDiscountAmountCents);
    return { cashDiscountAmountCents, cashFinalAmountCents };
  }

  if (cashDiscountType === 'fixed') {
    const safeFixed = Math.max(0, Math.round(cashDiscountValue || 0));
    const cashDiscountAmountCents = Math.min(safeFinal, safeFixed);
    const cashFinalAmountCents = Math.max(0, safeFinal - cashDiscountAmountCents);
    return { cashDiscountAmountCents, cashFinalAmountCents };
  }

  return { cashDiscountAmountCents: 0, cashFinalAmountCents: safeFinal };
}

/**
 * Legacy alias for backwards compatibility
 */
export const calculateCashDiscount = calculateCashCondition;

/**
 * Calculates plan savings and total cash savings compared to original price.
 */
export function calculateTotalSavings(
  originalAmountCents: number,
  finalAmountCents: number,
  cashFinalAmountCents?: number
): { planSavingsCents: number; totalCashSavingsCents: number } {
  const safeOriginal = Math.max(0, Math.round(originalAmountCents || 0));
  const safeFinal = Math.max(0, Math.round(finalAmountCents || 0));
  const planSavingsCents = Math.max(0, safeOriginal - safeFinal);

  const safeCashFinal = cashFinalAmountCents !== undefined ? Math.max(0, Math.round(cashFinalAmountCents)) : safeFinal;
  const totalCashSavingsCents = Math.max(0, safeOriginal - safeCashFinal);

  return {
    planSavingsCents,
    totalCashSavingsCents
  };
}

/**
 * Determines proposal plan type based on participant count if not explicitly provided.
 */
export function inferPlanType(numberOfParticipants: number): ProposalPlanType {
  if (numberOfParticipants <= 1) return 'individual';
  if (numberOfParticipants === 2) return 'duo';
  return 'family_group';
}

/**
 * Centralized proposal calculation engine with strict integer cents.
 */
export interface CalculateProposalInput {
  participantCount: number;
  monthlyPricePerPersonCents: number;
  durationMonths: number;
  discountType: DiscountType;
  discountValue: number;
  sameAmountForAll?: boolean;
  participants?: ProposalParticipant[];
}

export interface CalculateProposalOutput {
  monthlySubtotalCents: number;
  periodSubtotalCents: number;
  discountAmountCents: number;
  finalAmountCents: number;
  monthlyEquivalentCents: number;
  perPersonMonthlyEquivalentCents: number;
  perPersonOriginalMonthlyCents: number;
}

export function calculateProposal(input: CalculateProposalInput): CalculateProposalOutput {
  const participantCount = Math.max(1, Math.round(input.participantCount || 1));
  const monthlyPricePerPersonCents = Math.max(0, Math.round(input.monthlyPricePerPersonCents || 0));
  const durationMonths = Math.max(1, Math.round(input.durationMonths || 1));
  const sameAmountForAll = input.sameAmountForAll !== undefined ? input.sameAmountForAll : true;

  let monthlySubtotalCents = 0;
  if (sameAmountForAll || !input.participants || input.participants.length === 0) {
    monthlySubtotalCents = participantCount * monthlyPricePerPersonCents;
  } else {
    monthlySubtotalCents = input.participants.reduce((sum, p) => {
      const pAmount = p.monthlyAmountCents !== undefined && p.monthlyAmountCents !== null
        ? Math.max(0, Math.round(p.monthlyAmountCents))
        : monthlyPricePerPersonCents;
      return sum + pAmount;
    }, 0);
  }

  const periodSubtotalCents = monthlySubtotalCents * durationMonths;

  let discountAmountCents = 0;
  if (input.discountType === 'percentage') {
    const safePercent = Math.min(100, Math.max(0, input.discountValue || 0));
    discountAmountCents = Math.round((periodSubtotalCents * safePercent) / 100);
  } else if (input.discountType === 'fixed') {
    const safeFixed = Math.max(0, Math.round(input.discountValue || 0));
    discountAmountCents = Math.min(periodSubtotalCents, safeFixed);
  }

  const finalAmountCents = Math.max(0, periodSubtotalCents - discountAmountCents);
  const monthlyEquivalentCents = Math.round(finalAmountCents / durationMonths);
  const perPersonMonthlyEquivalentCents = Math.round(monthlyEquivalentCents / participantCount);
  const perPersonOriginalMonthlyCents = sameAmountForAll 
    ? monthlyPricePerPersonCents 
    : Math.round(monthlySubtotalCents / participantCount);

  return {
    monthlySubtotalCents,
    periodSubtotalCents,
    discountAmountCents,
    finalAmountCents,
    monthlyEquivalentCents,
    perPersonMonthlyEquivalentCents,
    perPersonOriginalMonthlyCents
  };
}

/**
 * Recalculates full PlanPricing object consistently in real-time.
 */
export function recalculatePlanPricing(
  current: Partial<PlanPricing>,
  participants?: ProposalParticipant[]
): PlanPricing {
  const planType: ProposalPlanType = current.planType || (
    participants && participants.length === 2 ? 'duo' :
    participants && participants.length > 2 ? 'family_group' : 'individual'
  );

  let numberOfParticipants = 1;
  if (planType === 'duo') {
    numberOfParticipants = 2;
  } else if (planType === 'family_group') {
    numberOfParticipants = Math.max(3, participants?.length || current.numberOfParticipants || 3);
  } else {
    numberOfParticipants = 1;
  }

  const sameAmountForAll = current.sameAmountForAll !== undefined ? current.sameAmountForAll : true;

  // Monthly per person rate (e.g. 60000 = R$ 600,00)
  const monthlyAmountPerPersonCents = current.monthlyAmountPerPersonCents !== undefined
    ? Math.max(0, Math.round(current.monthlyAmountPerPersonCents))
    : current.baseMonthlyAmountCents !== undefined
      ? Math.max(0, Math.round(current.baseMonthlyAmountCents / numberOfParticipants))
      : 60000;

  const durationMonths = Math.max(1, Math.round(current.durationMonths || 12));
  const discountType: DiscountType = current.discountType || 'none';
  const discountValue = Math.max(0, current.discountValue || 0);

  const proposalResult = calculateProposal({
    participantCount: numberOfParticipants,
    monthlyPricePerPersonCents: monthlyAmountPerPersonCents,
    durationMonths,
    discountType,
    discountValue,
    sameAmountForAll,
    participants
  });

  const baseMonthlyAmountCents = proposalResult.monthlySubtotalCents;
  const originalAmountCents = proposalResult.periodSubtotalCents;
  const discountAmountCents = proposalResult.discountAmountCents;
  const finalAmountCents = proposalResult.finalAmountCents;
  const equivalentMonthlyAmountCents = proposalResult.monthlyEquivalentCents;
  const perPersonEquivalentMonthlyAmountCents = proposalResult.perPersonMonthlyEquivalentCents;

  const installments = Math.max(1, Math.round(current.installments || durationMonths || 1));
  const { installmentAmountCents } = calculateInstallments(finalAmountCents, installments);

  const cashOptionEnabled = Boolean(current.cashOptionEnabled);
  const cashDiscountType: CashDiscountType = current.cashDiscountType || 'percentage';
  const cashDiscountValue = Math.max(0, current.cashDiscountValue !== undefined ? current.cashDiscountValue : 5);

  const { cashDiscountAmountCents, cashFinalAmountCents } = calculateCashCondition(
    finalAmountCents,
    cashOptionEnabled,
    cashDiscountType,
    cashDiscountValue
  );

  let defaultBenefitLabel: CommercialBenefitLabel = 'desconto';
  if (planType === 'family_group') {
    defaultBenefitLabel = 'condicao_familiar';
  } else if (planType === 'duo') {
    defaultBenefitLabel = 'condicao_dupla';
  }
  const benefitLabelType: CommercialBenefitLabel = current.benefitLabelType || defaultBenefitLabel;

  return {
    planType,
    numberOfParticipants,
    sameAmountForAll,
    monthlyAmountPerPersonCents,
    baseMonthlyAmountCents,
    durationMonths,
    originalAmountCents,
    discountType,
    discountValue,
    discountAmountCents,
    finalAmountCents,
    equivalentMonthlyAmountCents,
    perPersonEquivalentMonthlyAmountCents,
    installments,
    installmentAmountCents,
    cashOptionEnabled,
    cashDiscountType,
    cashDiscountValue,
    cashDiscountAmountCents,
    cashFinalAmountCents,
    benefitLabelType
  };
}

/**
 * Formats monetary integer cents into Brazilian Real string (e.g. "R$ 14.280,00" or "R$ 14.280")
 */
export function formatCurrencyCents(cents: number, options?: { hideDecimalsIfZero?: boolean }): string {
  const safeCents = Math.round(cents || 0);
  const value = safeCents / 100;

  if (options?.hideDecimalsIfZero && safeCents % 100 === 0) {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Parses user input string (e.g. "900", "900,00", "R$ 900,00") into integer cents.
 */
export function parseCurrencyInputToCents(val: string | number): number {
  if (typeof val === 'number') {
    return Math.round(val * 100);
  }
  if (!val || typeof val !== 'string') {
    return 0;
  }

  const cleaned = val
    .replace(/[^\d.,]/g, '')
    .trim();

  if (!cleaned) return 0;

  // If comma is the decimal separator
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    const integerPart = parts[0].replace(/\./g, '') || '0';
    const decimalPart = (parts[1] || '').padEnd(2, '0').slice(0, 2);
    const parsed = parseInt(`${integerPart}${decimalPart}`, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  // If only dot is used, check if it's thousands separator or decimal
  if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Decimal dot
      const integerPart = parts[0] || '0';
      const decimalPart = parts[1].padEnd(2, '0').slice(0, 2);
      const parsed = parseInt(`${integerPart}${decimalPart}`, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    // Thousands dot
    const integerOnly = cleaned.replace(/\./g, '');
    const parsed = parseInt(integerOnly, 10);
    return isNaN(parsed) ? 0 : parsed * 100;
  }

  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed * 100;
}

/**
 * Returns commercial benefit badge string for UI or PDF.
 */
export function formatBenefitLabel(pricing: PlanPricing): string {
  if (pricing.discountType === 'none' || pricing.discountAmountCents <= 0) {
    return 'Sem Desconto';
  }

  let amountText = '';
  if (pricing.discountType === 'percentage') {
    amountText = `${pricing.discountValue}%`;
  } else {
    amountText = formatCurrencyCents(pricing.discountAmountCents, { hideDecimalsIfZero: true });
  }

  switch (pricing.benefitLabelType) {
    case 'condicao_familiar':
      return `Condição Familiar (${amountText})`;
    case 'beneficio_familiar':
      return `Benefício Familiar (${amountText})`;
    case 'desconto_familiar':
      return `Desconto Familiar (${amountText})`;
    case 'condicao_especial':
      return `Condição Especial (${amountText})`;
    case 'beneficio_plano':
      return `Benefício do Plano (${amountText})`;
    case 'desconto':
    default:
      return `${amountText} de Desconto`;
  }
}

/**
 * Normalizes text to create safe, clean filenames for PDF export.
 * Example: "TFIVE_Proposta_Aluno_Plano_Familiar_2026-09-01.pdf"
 */
export function generateProposalFilename(proposal: Proposal): string {
  const sanitize = (text: string) => {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-zA-Z0-9_-]/g, '_') // replace spaces and special chars
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const studentName = sanitize(proposal.studentSnapshot?.name || proposal.participants?.[0]?.nameSnapshot || 'Aluno');
  const planTitle = sanitize(proposal.plans[0]?.name || proposal.title || 'Plano');
  const date = (proposal.createdAt || new Date().toISOString()).split('T')[0];

  return `TFIVE_Proposta_${studentName}_${planTitle}_${date}.pdf`;
}

/**
 * Factory for creating a clean, default PlanPricing instance.
 */
export function createDefaultPlanPricing(options?: Partial<PlanPricing>, participants?: ProposalParticipant[]): PlanPricing {
  const partCount = Math.max(1, participants?.length || options?.numberOfParticipants || 1);
  const defaultPricing: PlanPricing = {
    planType: inferPlanType(partCount),
    numberOfParticipants: partCount,
    sameAmountForAll: true,
    monthlyAmountPerPersonCents: 90000, // R$ 900,00
    baseMonthlyAmountCents: 90000 * partCount,
    durationMonths: 12,
    originalAmountCents: 90000 * partCount * 12,
    discountType: 'percentage',
    discountValue: 10,
    discountAmountCents: Math.round((90000 * partCount * 12 * 10) / 100),
    finalAmountCents: Math.round((90000 * partCount * 12 * 90) / 100),
    equivalentMonthlyAmountCents: Math.round(((90000 * partCount * 12 * 90) / 100) / 12),
    perPersonEquivalentMonthlyAmountCents: 81000,
    installments: 12,
    installmentAmountCents: Math.round(((90000 * partCount * 12 * 90) / 100) / 12),
    cashOptionEnabled: false,
    cashDiscountType: 'none',
    cashDiscountValue: 0,
    cashDiscountAmountCents: 0,
    cashFinalAmountCents: Math.round((90000 * partCount * 12 * 90) / 100),
    benefitLabelType: partCount >= 3 ? 'condicao_familiar' : 'desconto',
    ...options
  };

  return recalculatePlanPricing(defaultPricing, participants);
}

/**
 * Factory for creating a clean ProposalPlanItem.
 */
export function createDefaultPlanItem(
  name: string = 'Plano Anual', 
  service: string = 'Personal Training Presencial',
  participants?: ProposalParticipant[]
): ProposalPlanItem {
  return {
    id: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name,
    service,
    description: 'Acompanhamento presencial com periodização estratégica, métricas de carga e suporte contínuo.',
    durationMonths: 12,
    frequency: '3x por semana',
    isRecommended: true,
    pricing: createDefaultPlanPricing({}, participants),
    benefits: []
  };
}

/**
 * Converts integer cents to float number (e.g. 140000 -> 1400.00).
 */
export function centsToFloat(cents: number): number {
  return (cents || 0) / 100;
}

/**
 * Converts float or string number to integer cents (e.g. 1400.50 -> 140050).
 */
export function floatToCents(amount: number | string): number {
  const num = typeof amount === 'string' ? parseFloat(amount.replace(',', '.')) : amount;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Adds a specified number of days to a date and returns ISO formatted string YYYY-MM-DD.
 */
export function addDaysToDate(date: Date | string, days: number): string {
  const d = typeof date === 'string' ? new Date(date) : new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Formats proposal plan type enum to human-friendly Portuguese string.
 */
export function formatPlanTypeLabel(planType: ProposalPlanType): string {
  switch (planType) {
    case 'duo':
      return 'Plano em Dupla / Casal';
    case 'family_group':
      return 'Plano Familiar / Grupo';
    case 'individual':
    default:
      return 'Plano Individual';
  }
}

/**
 * Formats a Date object or ISO string to YYYY-MM-DD.
 */
export function formatDateToISO(date: Date | string): string {
  if (typeof date === 'string') {
    return date.split('T')[0];
  }
  return date.toISOString().split('T')[0];
}

export interface ProposalIdentifiers {
  id: string;
  uuid: string | null;
  legacyId: string | null;
  allIds: string[];
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolução canônica e segura dos identificadores de uma proposta comercial.
 * Garante que id, uuid e legacyId sejam extraídos confiavelmente, permitindo
 * comparações seguras com active_plans.proposal_id e chaves de banco/cache.
 */
export function resolveProposalIdentifiers(
  proposal: { id?: string | null; uuid?: string | null; legacyId?: string | null } | string | null | undefined
): ProposalIdentifiers {
  if (!proposal) {
    return { id: '', uuid: null, legacyId: null, allIds: [] };
  }

  if (typeof proposal === 'string') {
    const isU = UUID_REGEX.test(proposal);
    const uuid = isU ? proposal : null;
    const legacyId = !isU ? proposal : null;
    return {
      id: proposal,
      uuid,
      legacyId,
      allIds: [proposal]
    };
  }

  const rawId = proposal.id || '';
  const isU = UUID_REGEX.test(rawId);
  const uuid = proposal.uuid || (isU ? rawId : null);
  const legacyId = proposal.legacyId || (!isU && rawId ? rawId : null);

  const ids = new Set<string>();
  if (rawId) ids.add(rawId);
  if (uuid) ids.add(uuid);
  if (legacyId) ids.add(legacyId);

  return {
    id: rawId,
    uuid,
    legacyId,
    allIds: Array.from(ids)
  };
}

/**
 * Verifica se uma proposta corresponde a um determinado identificador (id, uuid ou legacyId).
 */
export function isProposalMatchingId(
  proposal: { id?: string | null; uuid?: string | null; legacyId?: string | null } | string | null | undefined,
  targetId: string | null | undefined
): boolean {
  if (!targetId) return false;
  const resolved = resolveProposalIdentifiers(proposal);
  return resolved.allIds.includes(targetId);
}

/**
 * Verifica de forma canônica se a proposta possui vínculo direto com qualquer plano ativo.
 * Compara todos os identificadores conhecidos (id, uuid, legacyId) com activePlan.proposalId.
 */
export function isProposalLinkedToActivePlan(
  proposal: { id?: string | null; uuid?: string | null; legacyId?: string | null } | null | undefined,
  activePlansList: Array<{ proposalId?: string | null }> = []
): boolean {
  if (!proposal || !activePlansList || activePlansList.length === 0) return false;
  const resolved = resolveProposalIdentifiers(proposal);
  return activePlansList.some(plan => {
    if (!plan.proposalId) return false;
    return resolved.allIds.includes(plan.proposalId);
  });
}
