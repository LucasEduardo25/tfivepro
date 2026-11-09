/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export type ProposalMode = 'single_plan' | 'compare_plans';

export type ProposalPlanType = 'individual' | 'duo' | 'family_group';

export type ParticipantRole = 'holder' | 'participant';

export type DiscountType = 'none' | 'percentage' | 'fixed';

export type CashDiscountType = 'none' | 'percentage' | 'fixed';

export type CommercialBenefitLabel = 
  | 'desconto' 
  | 'condicao_especial' 
  | 'beneficio_plano' 
  | 'desconto_familiar' 
  | 'condicao_familiar' 
  | 'beneficio_familiar'
  | 'condicao_dupla';

export interface StudentSnapshot {
  name: string;
  phone?: string;
  email?: string;
  goal?: string;
}

export interface ProposalParticipant {
  id: string;
  studentId?: string;          // Optional: stable reference if existing student
  nameSnapshot: string;        // Preserved name
  phoneSnapshot?: string;
  emailSnapshot?: string;
  role: ParticipantRole;       // 'holder' (Titular) | 'participant' (Participante)
  monthlyAmountCents?: number; // Custom individual monthly amount when sameAmountForAll is false
  discountPercent?: number;    // Optional individual discount percent
}

export interface TrainerSnapshot {
  name: string;
  title?: string;
  cref?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  qrCodeUrl?: string;
  slogan?: string;
}

export interface PlanPricing {
  // Per-person & Participants engine
  planType: ProposalPlanType;           // 'individual' | 'duo' | 'family_group'
  numberOfParticipants: number;         // Count of participants (e.g. 1, 2, 3, 5)
  sameAmountForAll: boolean;            // Default true: same amount per person
  monthlyAmountPerPersonCents: number;  // Base monthly rate per person in cents (e.g. 90000 for R$ 900,00)
  
  // Total Monthly & Duration
  baseMonthlyAmountCents: number;       // Total monthly for the whole plan before discounts (e.g. 270000 for R$ 2.700,00)
  durationMonths: number;               // Number of months (e.g. 1, 3, 6, 12)
  originalAmountCents: number;          // baseMonthlyAmountCents * durationMonths (e.g. 3240000 for R$ 32.400,00)

  // Plan Discount
  discountType: DiscountType;           // 'none' | 'percentage' | 'fixed'
  discountValue: number;                // 10 for 10%, or 324000 for R$ 3.240,00
  discountAmountCents: number;          // Calculated discount in cents (e.g. 324000)

  // Subtotal & Equivalents
  finalAmountCents: number;             // originalAmountCents - discountAmountCents (e.g. 2916000)
  equivalentMonthlyAmountCents: number; // Math.round(finalAmountCents / durationMonths) (e.g. 243000)
  perPersonEquivalentMonthlyAmountCents: number; // Math.round(equivalentMonthlyAmountCents / numberOfParticipants) (e.g. 81000)

  // Installments
  installments: number;                 // e.g. 12
  installmentAmountCents: number;       // Math.round(finalAmountCents / installments) (e.g. 243000)

  // Cash payment condition (Pagamento à vista)
  cashOptionEnabled: boolean;
  cashDiscountType: CashDiscountType;
  cashDiscountValue: number;
  cashDiscountAmountCents: number;      // Applied on finalAmountCents
  cashFinalAmountCents: number;         // finalAmountCents - cashDiscountAmountCents

  benefitLabelType: CommercialBenefitLabel; // 'desconto' | 'condicao_especial' | 'beneficio_plano' | 'desconto_familiar' | 'condicao_familiar' | 'beneficio_familiar'
}

export interface ProposalPlanItem {
  id: string;
  name: string;                         // e.g. "Plano Familiar Anual", "Plano Dupla Semestral"
  service: string;                      // e.g. "Personal Training Presencial", "Consultoria Híbrida"
  description: string;                  // Short description
  durationMonths: number;               // 1, 3, 6, 12, etc.
  frequency: string;                    // e.g. "3x por semana", "2x por semana"
  isRecommended?: boolean;              // Highlighted as recommended in comparison mode
  pricing: PlanPricing;
  benefits: string[];                   // Included benefits (e.g. "Treinamento personalizado")
}

export interface Proposal {
  id: string;
  organizationId?: string;
  studentId: string;                    // Holder's studentId (or empty if unassigned)
  studentSnapshot: StudentSnapshot;     // Holder's snapshot for backwards compatibility
  participants: ProposalParticipant[];  // Full participants list (Holder + Participants)
  planType: ProposalPlanType;           // 'individual' | 'duo' | 'family_group'
  title: string;                        // e.g. "Proposta Comercial — Plano Familiar Anual"
  service: string;                      // e.g. "Personal Training Presencial"
  description: string;
  mode: ProposalMode;                   // 'single_plan' | 'compare_plans'
  plans: ProposalPlanItem[];            // 1 plan for single_plan, 2-3 for compare_plans
  conditions: string;                   // Free-form conditions / terms
  notes?: string;                       // Internal trainer notes
  validUntil: string;                   // ISO date string (e.g. "2026-09-11")
  status: ProposalStatus;
  createdAt: string;                    // ISO date string
  updatedAt: string;                    // ISO date string
  sentAt?: string;
  acceptedAt?: string;
  version: number;
  templateId?: string;
  trainerSnapshot: TrainerSnapshot;
  uuid?: string;
  legacyId?: string;
  studentUuid?: string;
}

export interface ProposalTemplate {
  id: string;
  name: string;                         // Model name (e.g. "Modelo Padrão — Plano Familiar Anual")
  title: string;
  service: string;
  description: string;
  defaultDescription?: string;
  planType?: ProposalPlanType;          // 'individual' | 'duo' | 'family_group'
  mode: ProposalMode;
  plans: ProposalPlanItem[];
  conditions: string;
  defaultValidityDays: number;          // e.g. 15 days
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_PROPOSAL_BENEFITS: string[] = [
  'Acompanhamento e suporte presencial 100% individualizado',
  'Periodização estratégica avançada adaptada aos seus objetivos',
  'Avaliação física e postural completa com relatórios de evolução',
  'Acesso ao aplicativo TFIVE PRO para registro e histórico de cargas',
  'Ajustes dinâmicos de treino conforme sua resposta biológica',
  'Suporte direto via WhatsApp para dúvidas e orientações'
];

export const DEFAULT_PROPOSAL_CONDITIONS = `1. Validade da Proposta: Esta proposta comercial é válida pelo período especificado no cabeçalho deste documento.
2. Formas de Pagamento: Cartão de Crédito recorrente, Pix ou Transferência Bancária conforme as condições acordadas.
3. Política de Reposição: Aulas desmarcadas com antecedência mínima de 24 horas poderão ser repostas dentro do mês vigente, conforme disponibilidade de agenda.
4. Férias e Pausas: O aluno tem direito ao trancamento programado de até 30 dias por ano em planos anuais (15 dias em semestrais).
5. Confidencialidade: Todas as informações físicas e anamnese são estritamente sigilosas e para uso exclusivo da prescrição do treinamento.`;

export const DEFAULT_PROPOSAL_DESCRIPTION = 
  'Programa de treinamento personalizado de alta performance desenhado exclusivamente para otimizar sua composição corporal, saúde articular, longevidade e força com total segurança e metodologia científica.';

