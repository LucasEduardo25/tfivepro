/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProposalPlanType, PlanPricing, ProposalParticipant } from './proposal';

export type ActivePlanStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'COMPLETED' | 'CANCELED';

export type FamilyParticipantStatus = 'ACTIVE' | 'SUSPENDED' | 'TRANSFERRED' | 'REMOVED';

export type SuspensionScope = 'PLAN' | 'PARTICIPANT';

export interface FamilyPlanParticipant {
  id: string;                          // Identificador estável da vaga
  activePlanId: string;
  studentId?: string;                  // Vínculo com aluno cadastrado (se houver)
  nameSnapshot: string;                // Nome preservado
  phoneSnapshot?: string;
  emailSnapshot?: string;
  role: 'holder' | 'participant';      // 'holder' (Titular) | 'participant' (Dependente/Membro)
  status: FamilyParticipantStatus;     // 'ACTIVE' | 'SUSPENDED' | 'TRANSFERRED' | 'REMOVED'
  joinedAt: string;                    // Data de entrada (YYYY-MM-DD ou ISO)
  leftAt?: string;                     // Data de saída se transferido/removido
}

export interface ActivePlan {
  id: string;
  proposalId: string;
  organizationId: string;

  type: ProposalPlanType;              // 'individual' | 'duo' | 'family_group'
  status: ActivePlanStatus;

  name: string;                        // Nome do plano (ex: "Personal Training Presencial", "Plano Familiar Anual")
  service: string;
  frequencyPerWeek: string;            // ex: "3x por semana"
  durationMonths: number;              // ex: 12
  startDate: string;                   // YYYY-MM-DD
  endDate?: string;                    // YYYY-MM-DD (Data final calculada ou prorrogada)
  originalEndDate?: string;            // YYYY-MM-DD (Data final original sem prorrogações)

  originalValueCents: number;
  discountCents: number;
  finalValueCents: number;

  // Snapshots imutáveis da proposta comercial no momento da ativação
  pricingSnapshot: PlanPricing;
  participantsSnapshot: ProposalParticipant[];
  conditionsSnapshot: string;

  // Participantes do plano (titular e membros)
  participants: FamilyPlanParticipant[];

  // Configurações de suspensão
  suspensionExtendsPlan: boolean;      // Se true, dias de suspensão prorrogam o endDate

  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export interface PlanTransfer {
  id: string;
  activePlanId: string;

  fromParticipantId: string;
  fromStudentId?: string;
  fromNameSnapshot: string;

  toParticipantId: string;
  toStudentId?: string;
  toNameSnapshot: string;

  effectiveDate: string;               // YYYY-MM-DD
  reason?: string;
  createdAt: string;
}

export interface PlanSuspension {
  id: string;
  activePlanId: string;
  participantId?: string;              // Se escopo PARTICIPANT, id do participante
  participantNameSnapshot?: string;
  scope: SuspensionScope;              // 'PLAN' | 'PARTICIPANT'

  startDate: string;                   // YYYY-MM-DD
  estimatedEndDate?: string;           // YYYY-MM-DD (previsão opcional de retorno)
  endDate?: string;                    // YYYY-MM-DD (data real do retorno/reativação)
  reason?: string;
  extendsPlan: boolean;                // Se prorrogou ou prorrogará a vigência do plano

  status: 'ACTIVE' | 'ENDED';
  createdAt: string;
  reactivatedAt?: string;
}

export type PlanAuditEventType =
  | 'PLAN_ACTIVATED'
  | 'PLAN_SUSPENDED'
  | 'PLAN_REACTIVATED'
  | 'PARTICIPANT_SUSPENDED'
  | 'PARTICIPANT_REACTIVATED'
  | 'PARTICIPANT_TRANSFERRED'
  | 'PLAN_COMPLETED'
  | 'PLAN_CANCELED';

export interface PlanAuditLog {
  id: string;
  activePlanId: string;
  eventType: PlanAuditEventType;
  description: string;
  details?: Record<string, any>;
  timestamp: string;
}
