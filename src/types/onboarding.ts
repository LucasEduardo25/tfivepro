/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed';

export type OnboardingStepId = 
  | 'registration'        // 1. Cadastro
  | 'welcome_message'     // 2. Mensagem de boas-vindas
  | 'welcome_guide'       // 3. Guia de boas-vindas
  | 'initial_assessment'  // 4. Avaliação inicial
  | 'initial_planning'    // 5. Planejamento inicial
  | 'ready_to_start';     // 6. Pronto para iniciar / Primeiro atendimento

export interface OnboardingStep {
  id: OnboardingStepId;
  label: string;
  description: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

export interface OnboardingServiceItem {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  order: number;
}

export interface OnboardingTechItem {
  id: string;
  title: string;
  description?: string;
  enabled: boolean;
  order: number;
}

export interface OnboardingCustomImage {
  id: string;
  title: string;
  dataUrl: string; // Base64 data URL
  category: 'tablet' | 'app' | 'assessment' | 'evolution' | 'other';
  createdAt: string;
}

export interface OnboardingTrainerCommitment {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  order: number;
}

export interface OnboardingStudentCommitment {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  order: number;
}

export interface OnboardingJourneyStep {
  id: string;
  stepNumber: string; // "01", "02", etc.
  title: string;
  description: string;
  enabled: boolean;
  order: number;
}

export interface OnboardingOrientationItem {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  order: number;
}

export interface OnboardingGlobalConfig {
  trainerName: string;
  trainerTitle: string;
  trainerCref: string;
  trainerPhone: string;
  trainerEmail: string;
  trainerInstagram: string;
  trainerLogoUrl?: string;
  slogan: string;

  welcomeMessageTemplate: string;
  guideIntroduction: string;

  services: OnboardingServiceItem[];
  showTechnologySection: boolean;
  technologyItems: OnboardingTechItem[];

  customImages: OnboardingCustomImage[];

  trainerCommitments: OnboardingTrainerCommitment[];
  studentCommitments: OnboardingStudentCommitment[];
  mutualCommitmentQuote: string;

  journeySteps: OnboardingJourneyStep[];

  showOrientationsSection: boolean;
  orientations: OnboardingOrientationItem[];

  showSchedulePolicySection: boolean;
  schedulePolicyTitle: string;
  schedulePolicyText: string;

  closingTitle: string;
  closingMessage: string;
}

export interface OnboardingGuideSnapshot {
  generatedAt: string;
  studentName: string;
  studentFirstName: string;
  genderGreeting: string; // e.g. "BEM-VINDO" | "BEM-VINDA" | "OLÁ"
  planName?: string;
  frequency?: string;
  startDate?: string;
  trainerName: string;
  trainerTitle?: string;
  trainerCref?: string;
  trainerPhone?: string;
  trainerEmail?: string;
  trainerInstagram?: string;
  trainerLogoUrl?: string;
  slogan?: string;
  introduction: string;
  services: OnboardingServiceItem[];
  showTechnologySection: boolean;
  technologyItems: OnboardingTechItem[];
  customImages: OnboardingCustomImage[];
  trainerCommitments: OnboardingTrainerCommitment[];
  studentCommitments: OnboardingStudentCommitment[];
  mutualCommitmentQuote: string;
  journeySteps: OnboardingJourneyStep[];
  showOrientationsSection: boolean;
  orientations: OnboardingOrientationItem[];
  showSchedulePolicySection: boolean;
  schedulePolicyTitle: string;
  schedulePolicyText: string;
  closingTitle: string;
  closingMessage: string;
}

export interface StudentOnboarding {
  id: string;
  studentId: string;
  status: OnboardingStatus;
  startedAt: string;
  completedAt?: string;
  steps: OnboardingStep[];
  customWelcomeMessage?: string;
  welcomeMessageSnapshot?: {
    text: string;
    sentAt: string;
  };
  guideSnapshot?: OnboardingGuideSnapshot;
  planNameOverride?: string;
  frequencyOverride?: string;
  startDateOverride?: string;
  notes?: string;
  sourceProposalId?: string;
  createdAt: string;
  updatedAt: string;
}
