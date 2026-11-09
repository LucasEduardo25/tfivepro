/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ActivePlan,
  ActivePlanStatus,
  FamilyPlanParticipant,
  FamilyParticipantStatus,
  PlanTransfer,
  PlanSuspension,
  PlanAuditLog,
  PlanAuditEventType,
  Proposal,
  ProposalParticipant
} from '../types';
import { generateId } from '../utils/idGenerator';
import { getActivePlanRepository } from '../repositories/repositoryConfig';
import { authService } from './authService';

async function persistPlan(plan: ActivePlan): Promise<void> {
  await getActivePlanRepository().save(plan);
}

async function persistSuspension(susp: PlanSuspension): Promise<void> {
  await getActivePlanRepository().saveSuspension(susp);
}

async function persistTransfer(transfer: PlanTransfer): Promise<void> {
  await getActivePlanRepository().saveTransfer(transfer);
}

async function persistAuditLog(log: PlanAuditLog): Promise<void> {
  await getActivePlanRepository().recordAuditLog(log);
}

async function fetchPlan(id: string): Promise<ActivePlan | null> {
  return await getActivePlanRepository().getById(id);
}

async function fetchSuspensions(planId: string): Promise<PlanSuspension[]> {
  return await getActivePlanRepository().getSuspensions(planId);
}

/**
 * Utilitário de data para adicionar meses (YYYY-MM-DD)
 */
export function addMonthsToDate(dateStr: string, months: number): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-based
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      d.setMonth(d.getMonth() + months);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayFormatted = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dayFormatted}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
}

/**
 * Utilitário de data para adicionar dias (YYYY-MM-DD)
 */
export function addDaysToDateStr(dateStr: string, days: number): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      d.setDate(d.getDate() + days);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayFormatted = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dayFormatted}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
}

/**
 * Calcula a diferença em dias entre duas datas (YYYY-MM-DD)
 */
export function daysBetweenDates(startStr: string, endStr: string): number {
  try {
    const d1 = new Date(startStr);
    const d2 = new Date(endStr);
    const diffMs = d2.getTime() - d1.getTime();
    return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
}

export interface ActivatePlanOptions {
  planItemIndex?: number;
  startDate?: string;
  suspensionExtendsPlan?: boolean;
  participantsMapping?: Array<{
    originalParticipantId?: string;
    studentId?: string;
    nameSnapshot: string;
    phoneSnapshot?: string;
    emailSnapshot?: string;
    role: 'holder' | 'participant';
  }>;
  notes?: string;
}

export class ActivePlanService {
  /**
   * Ativa um plano a partir de uma proposta comercial aceita
   */
  public async activatePlanFromProposal(
    proposal: Proposal,
    options: ActivatePlanOptions = {}
  ): Promise<ActivePlan> {
    if (!proposal) {
      throw new Error('Proposta não encontrada');
    }

    const planIndex = options.planItemIndex ?? 0;
    const chosenPlan = proposal.plans[planIndex] || proposal.plans[0];
    if (!chosenPlan) {
      throw new Error('A proposta não contém planos configurados');
    }

    const startDate = options.startDate || new Date().toISOString().split('T')[0];
    const durationMonths = chosenPlan.durationMonths || 12;
    const calculatedEndDate = addMonthsToDate(startDate, durationMonths);
    const planId = generateId('plan');

    // Mapeamento de participantes garantindo IDs únicos e imutabilidade
    const sourceParticipants = options.participantsMapping && options.participantsMapping.length > 0
      ? options.participantsMapping
      : (proposal.participants && proposal.participants.length > 0
          ? proposal.participants
          : [{
              studentId: proposal.studentId || undefined,
              nameSnapshot: proposal.studentSnapshot.name,
              phoneSnapshot: proposal.studentSnapshot.phone,
              emailSnapshot: proposal.studentSnapshot.email,
              role: 'holder' as const
            }]);

    const activeParticipants: FamilyPlanParticipant[] = sourceParticipants.map((p, idx) => ({
      id: generateId('part'),
      activePlanId: planId,
      studentId: p.studentId || undefined,
      nameSnapshot: p.nameSnapshot.trim(),
      phoneSnapshot: p.phoneSnapshot,
      emailSnapshot: p.emailSnapshot,
      role: p.role || (idx === 0 ? 'holder' : 'participant'),
      status: 'ACTIVE' as FamilyParticipantStatus,
      joinedAt: startDate
    }));

    const activePlan: ActivePlan = {
      id: planId,
      proposalId: proposal.id,
      organizationId: proposal.organizationId || authService.getOrganizationId(),
      type: proposal.planType || chosenPlan.pricing.planType || 'individual',
      status: 'ACTIVE',
      name: chosenPlan.name || proposal.title,
      service: chosenPlan.service || proposal.service,
      frequencyPerWeek: chosenPlan.frequency || '3x por semana',
      durationMonths,
      startDate,
      endDate: calculatedEndDate,
      originalEndDate: calculatedEndDate,
      originalValueCents: chosenPlan.pricing.originalAmountCents,
      discountCents: chosenPlan.pricing.discountAmountCents,
      finalValueCents: chosenPlan.pricing.finalAmountCents,
      pricingSnapshot: JSON.parse(JSON.stringify(chosenPlan.pricing)),
      participantsSnapshot: JSON.parse(JSON.stringify(proposal.participants || [])),
      conditionsSnapshot: proposal.conditions || '',
      participants: activeParticipants,
      suspensionExtendsPlan: options.suspensionExtendsPlan !== undefined ? options.suspensionExtendsPlan : true,
      notes: options.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Salva no Supabase e banco local
    await persistPlan(activePlan);

    // Registra evento no Audit Log
    await this.logEvent({
      activePlanId: planId,
      eventType: 'PLAN_ACTIVATED',
      description: `Plano "${activePlan.name}" ativado com início em ${startDate} e ${activeParticipants.length} participante(s).`
    });

    return activePlan;
  }

  /**
   * Suspende o plano por inteiro
   */
  public async suspendPlan(
    activePlanId: string,
    options: {
      startDate: string;
      estimatedEndDate?: string;
      reason?: string;
      extendsPlan?: boolean;
    }
  ): Promise<ActivePlan> {
    const plan = await fetchPlan(activePlanId);
    if (!plan) {
      throw new Error(`Plano ${activePlanId} não encontrado`);
    }

    const extendsPlan = options.extendsPlan !== undefined ? options.extendsPlan : plan.suspensionExtendsPlan;

    // Cria registro de suspensão
    const suspension: PlanSuspension = {
      id: generateId('susp'),
      activePlanId,
      scope: 'PLAN',
      startDate: options.startDate,
      estimatedEndDate: options.estimatedEndDate,
      reason: options.reason,
      extendsPlan,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    await persistSuspension(suspension);

    // Atualiza status do plano
    plan.status = 'SUSPENDED';
    plan.updatedAt = new Date().toISOString();
    await persistPlan(plan);

    // Registra log
    await this.logEvent({
      activePlanId,
      eventType: 'PLAN_SUSPENDED',
      description: `Plano suspenso a partir de ${options.startDate}.${options.reason ? ' Motivo: ' + options.reason : ''}${options.estimatedEndDate ? ' Previsão de retorno: ' + options.estimatedEndDate : ''}. Prorroga plano: ${extendsPlan ? 'Sim' : 'Não'}.`
    });

    return plan;
  }

  /**
   * Reativa um plano suspenso
   */
  public async reactivatePlan(
    activePlanId: string,
    options?: { reactivatedAt?: string }
  ): Promise<ActivePlan> {
    const plan = await fetchPlan(activePlanId);
    if (!plan) {
      throw new Error(`Plano ${activePlanId} não encontrado`);
    }

    const reactivatedAt = options?.reactivatedAt || new Date().toISOString().split('T')[0];

    // Busca suspensões ativas no escopo de PLAN
    const suspensions = await fetchSuspensions(activePlanId);
    const activeSuspension = suspensions.find(s => s.scope === 'PLAN' && s.status === 'ACTIVE');

    let daysExtended = 0;
    if (activeSuspension) {
      activeSuspension.status = 'ENDED';
      activeSuspension.endDate = reactivatedAt;
      activeSuspension.reactivatedAt = new Date().toISOString();
      await persistSuspension(activeSuspension);

      if (activeSuspension.extendsPlan && plan.endDate) {
        daysExtended = daysBetweenDates(activeSuspension.startDate, reactivatedAt);
        if (daysExtended > 0) {
          plan.endDate = addDaysToDateStr(plan.endDate, daysExtended);
        }
      }
    }

    plan.status = 'ACTIVE';
    plan.updatedAt = new Date().toISOString();
    await persistPlan(plan);

    await this.logEvent({
      activePlanId,
      eventType: 'PLAN_REACTIVATED',
      description: `Plano reativado em ${reactivatedAt}.${daysExtended > 0 ? ' Vigência prorrogada em ' + daysExtended + ' dias (novo término: ' + plan.endDate + ').' : ''}`
    });

    return plan;
  }

  /**
   * Suspende individualmente um participante no plano familiar/dupla
   */
  public async suspendParticipant(
    activePlanId: string,
    participantId: string,
    options: {
      startDate: string;
      estimatedEndDate?: string;
      reason?: string;
    }
  ): Promise<ActivePlan> {
    const plan = await fetchPlan(activePlanId);
    if (!plan) {
      throw new Error(`Plano ${activePlanId} não encontrado`);
    }

    const participant = plan.participants.find(p => p.id === participantId);
    if (!participant) {
      throw new Error(`Participante ${participantId} não encontrado no plano`);
    }

    participant.status = 'SUSPENDED';
    plan.updatedAt = new Date().toISOString();

    const suspension: PlanSuspension = {
      id: generateId('susp'),
      activePlanId,
      participantId,
      participantNameSnapshot: participant.nameSnapshot,
      scope: 'PARTICIPANT',
      startDate: options.startDate,
      estimatedEndDate: options.estimatedEndDate,
      reason: options.reason,
      extendsPlan: false,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    await persistSuspension(suspension);
    await persistPlan(plan);

    await this.logEvent({
      activePlanId,
      eventType: 'PARTICIPANT_SUSPENDED',
      description: `Participante "${participant.nameSnapshot}" suspenso(a) a partir de ${options.startDate}.${options.reason ? ' Motivo: ' + options.reason : ''}`
    });

    return plan;
  }

  /**
   * Reativa um participante individual
   */
  public async reactivateParticipant(
    activePlanId: string,
    participantId: string,
    options?: { reactivatedAt?: string }
  ): Promise<ActivePlan> {
    const plan = await fetchPlan(activePlanId);
    if (!plan) {
      throw new Error(`Plano ${activePlanId} não encontrado`);
    }

    const participant = plan.participants.find(p => p.id === participantId);
    if (!participant) {
      throw new Error(`Participante ${participantId} não encontrado no plano`);
    }

    const reactivatedAt = options?.reactivatedAt || new Date().toISOString().split('T')[0];

    // Finaliza suspensão ativa do participante
    const suspensions = await fetchSuspensions(activePlanId);
    const activeSusp = suspensions.find(s => s.participantId === participantId && s.status === 'ACTIVE');
    if (activeSusp) {
      activeSusp.status = 'ENDED';
      activeSusp.endDate = reactivatedAt;
      activeSusp.reactivatedAt = new Date().toISOString();
      await persistSuspension(activeSusp);
    }

    participant.status = 'ACTIVE';
    plan.updatedAt = new Date().toISOString();
    await persistPlan(plan);

    await this.logEvent({
      activePlanId,
      eventType: 'PARTICIPANT_REACTIVATED',
      description: `Participante "${participant.nameSnapshot}" reativado(a) em ${reactivatedAt}.`
    });

    return plan;
  }

  /**
   * Transfere uma vaga de um participante antigo para um novo participante
   * REGRAS CRÍTICAS (Requisitos 9, 10, 11 e 21):
   * - Não apaga o participante antigo (marca como TRANSFERRED com leftAt)
   * - Cria novo participante ACTIVE com joinedAt
   * - Não altera treinos, avaliações, PRs ou sessões
   * - Não altera preço, descontos ou valores comerciais do plano
   */
  public async transferParticipantSlot(
    activePlanId: string,
    fromParticipantId: string,
    target: {
      studentId?: string;
      nameSnapshot: string;
      phoneSnapshot?: string;
      emailSnapshot?: string;
    },
    options: {
      effectiveDate: string;
      reason?: string;
    }
  ): Promise<{ activePlan: ActivePlan; transfer: PlanTransfer }> {
    const plan = await fetchPlan(activePlanId);
    if (!plan) {
      throw new Error(`Plano ${activePlanId} não encontrado`);
    }

    const fromParticipant = plan.participants.find(p => p.id === fromParticipantId);
    if (!fromParticipant) {
      throw new Error(`Participante de origem ${fromParticipantId} não encontrado`);
    }

    // Marca participante anterior como TRANSFERRED sem apagar
    fromParticipant.status = 'TRANSFERRED';
    fromParticipant.leftAt = options.effectiveDate;

    // Cria novo participante
    const newParticipantId = generateId('part');
    const newParticipant: FamilyPlanParticipant = {
      id: newParticipantId,
      activePlanId,
      studentId: target.studentId || undefined,
      nameSnapshot: target.nameSnapshot.trim(),
      phoneSnapshot: target.phoneSnapshot,
      emailSnapshot: target.emailSnapshot,
      role: fromParticipant.role,
      status: 'ACTIVE',
      joinedAt: options.effectiveDate
    };

    plan.participants.push(newParticipant);
    plan.updatedAt = new Date().toISOString();

    // Registra transferência imutável
    const transfer: PlanTransfer = {
      id: generateId('trans'),
      activePlanId,
      fromParticipantId,
      fromStudentId: fromParticipant.studentId,
      fromNameSnapshot: fromParticipant.nameSnapshot,
      toParticipantId: newParticipantId,
      toStudentId: target.studentId,
      toNameSnapshot: target.nameSnapshot.trim(),
      effectiveDate: options.effectiveDate,
      reason: options.reason,
      createdAt: new Date().toISOString()
    };

    await persistTransfer(transfer);
    await persistPlan(plan);

    await this.logEvent({
      activePlanId,
      eventType: 'PARTICIPANT_TRANSFERRED',
      description: `Vaga transferida de "${fromParticipant.nameSnapshot}" para "${target.nameSnapshot}" em ${options.effectiveDate}.${options.reason ? ' Motivo: ' + options.reason : ''}`
    });

    return { activePlan: plan, transfer };
  }

  /**
   * Cancela o plano definitivamente
   */
  public async cancelPlan(activePlanId: string, reason?: string): Promise<ActivePlan> {
    const plan = await fetchPlan(activePlanId);
    if (!plan) {
      throw new Error(`Plano ${activePlanId} não encontrado`);
    }

    plan.status = 'CANCELED';
    plan.updatedAt = new Date().toISOString();
    await persistPlan(plan);

    await this.logEvent({
      activePlanId,
      eventType: 'PLAN_CANCELED',
      description: `Plano cancelado.${reason ? ' Motivo: ' + reason : ''}`
    });

    return plan;
  }

  /**
   * Conclui o plano após o término da vigência
   */
  public async completePlan(activePlanId: string): Promise<ActivePlan> {
    const plan = await fetchPlan(activePlanId);
    if (!plan) {
      throw new Error(`Plano ${activePlanId} não encontrado`);
    }

    plan.status = 'COMPLETED';
    plan.updatedAt = new Date().toISOString();
    await persistPlan(plan);

    await this.logEvent({
      activePlanId,
      eventType: 'PLAN_COMPLETED',
      description: 'Plano concluído ao término do período de vigência.'
    });

    return plan;
  }

  /**
   * Registra log de auditoria
   */
  public async logEvent(params: {
    activePlanId: string;
    eventType: PlanAuditEventType;
    description: string;
    details?: Record<string, any>;
  }): Promise<PlanAuditLog> {
    const log: PlanAuditLog = {
      id: generateId('log'),
      activePlanId: params.activePlanId,
      eventType: params.eventType,
      description: params.description,
      details: params.details,
      timestamp: new Date().toISOString()
    };
    await persistAuditLog(log);
    return log;
  }
}

export const activePlanService = new ActivePlanService();
