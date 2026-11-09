/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Student, 
  TrainerProfile, 
  OnboardingGlobalConfig, 
  StudentOnboarding, 
  OnboardingStep,
  OnboardingServiceItem,
  OnboardingTechItem,
  OnboardingTrainerCommitment,
  OnboardingStudentCommitment,
  OnboardingJourneyStep,
  OnboardingOrientationItem,
  OnboardingGuideSnapshot
} from '../types';
import { generateId } from '../db/indexedDB';

export const DEFAULT_WELCOME_MESSAGE_TEMPLATE = 
`Olá, {primeiro_nome}! Seja bem-vindo(a) ao meu acompanhamento.

Preparei um material rápido para explicar como funcionará nosso trabalho e quais serão nossos próximos passos.`;

export const DEFAULT_SERVICES: OnboardingServiceItem[] = [
  {
    id: 'srv-1',
    title: 'TREINAMENTO PERSONALIZADO',
    description: 'Seu treinamento é planejado e acompanhado de acordo com seus objetivos e com a evolução observada durante o processo.',
    enabled: true,
    order: 1
  },
  {
    id: 'srv-2',
    title: 'ACOMPANHAMENTO PRESENCIAL',
    description: 'Condução atenta durante as sessões, garantindo precisão técnica, segurança biomecânica e correção postural constante.',
    enabled: true,
    order: 2
  },
  {
    id: 'srv-3',
    title: 'PLANEJAMENTO INDIVIDUAL',
    description: 'Periodização estratégica desenhada para a sua rotina, capacidades físicas e metas de curto, médio e longo prazo.',
    enabled: true,
    order: 3
  },
  {
    id: 'srv-4',
    title: 'AVALIAÇÕES & REAVALIAÇÕES',
    description: 'Registros periódicos para quantificar respostas biológicas, assimetrias funcionais e parâmetros de evolução física.',
    enabled: true,
    order: 4
  },
  {
    id: 'srv-5',
    title: 'PLANEJAMENTO POR CICLOS',
    description: 'Estruturação por blocos e fases de treinamento com objetivos bem definidos e transições programadas.',
    enabled: true,
    order: 5
  },
  {
    id: 'srv-6',
    title: 'RELATÓRIOS DE EVOLUÇÃO',
    description: 'Gráficos comparativos de tonelagem, sobrecarga progressiva, assimetrias e marcos de desempenho conquistados.',
    enabled: true,
    order: 6
  },
  {
    id: 'srv-7',
    title: 'HISTÓRICO DE TREINAMENTO',
    description: 'Armazenamento contínuo de todas as cargas, repetições, tempos e registros de cada série executada.',
    enabled: true,
    order: 7
  },
  {
    id: 'srv-8',
    title: 'APLICATIVO / SISTEMA TFIVE',
    description: 'Tecnologia dedicada ao acompanhamento minucioso, eliminando fichas de papel e anotações dispersas.',
    enabled: true,
    order: 8
  },
  {
    id: 'srv-9',
    title: 'ATENDIMENTO COM TABLET',
    description: 'Registro em tempo real de cada repetição e carga durante a aula com visualização imediata do histórico.',
    enabled: true,
    order: 9
  }
];

export const DEFAULT_TECH_ITEMS: OnboardingTechItem[] = [
  { id: 'tech-1', title: 'APLICATIVO TFIVE PRO', description: 'Plataforma profissional de gestão e registro do treinamento.', enabled: true, order: 1 },
  { id: 'tech-2', title: 'ATENDIMENTO COM TABLET', description: 'Registro direto à beira do treino com foco 100% na sua execução.', enabled: true, order: 2 },
  { id: 'tech-3', title: 'REGISTRO DAS SESSÕES', description: 'Histórico auditável de frequência, duração e percepção de esforço.', enabled: true, order: 3 },
  { id: 'tech-4', title: 'HISTÓRICO INDIVIDUAL', description: 'Banco de dados exclusivo de todas as suas rotinas e treinos.', enabled: true, order: 4 },
  { id: 'tech-5', title: 'ACOMPANHAMENTO DE CARGAS', description: 'Monitoramento da sobrecarga progressiva exercício por exercício.', enabled: true, order: 5 },
  { id: 'tech-6', title: 'AVALIAÇÕES E RELATÓRIOS', description: 'Relatórios visuais e objetivos para tomada de decisão fundamentada.', enabled: true, order: 6 },
  { id: 'tech-7', title: 'EVOLUÇÃO', description: 'Análise de métricas consistentes ao longo de semanas e meses.', enabled: true, order: 7 }
];

export const DEFAULT_TRAINER_COMMITMENTS: OnboardingTrainerCommitment[] = [
  {
    id: 'tc-1',
    title: 'PLANEJAMENTO',
    description: 'Seu treinamento será organizado e acompanhado de acordo com seus objetivos e evolução.',
    enabled: true,
    order: 1
  },
  {
    id: 'tc-2',
    title: 'ATENÇÃO',
    description: 'Cada sessão será conduzida com atenção à execução, ao desempenho e às informações relevantes do treinamento.',
    enabled: true,
    order: 2
  },
  {
    id: 'tc-3',
    title: 'ACOMPANHAMENTO',
    description: 'Seu progresso será registrado para que possamos acompanhar sua evolução ao longo do tempo.',
    enabled: true,
    order: 3
  },
  {
    id: 'tc-4',
    title: 'AJUSTES',
    description: 'O planejamento poderá ser revisto conforme as necessidades observadas durante o acompanhamento.',
    enabled: true,
    order: 4
  },
  {
    id: 'tc-5',
    title: 'ORGANIZAÇÃO',
    description: 'Treinos, avaliações e registros serão mantidos de forma organizada durante o acompanhamento.',
    enabled: true,
    order: 5
  },
  {
    id: 'tc-6',
    title: 'COMUNICAÇÃO',
    description: 'Você terá clareza sobre o processo, as etapas do planejamento e os próximos passos.',
    enabled: true,
    order: 6
  }
];

export const DEFAULT_STUDENT_COMMITMENTS: OnboardingStudentCommitment[] = [
  {
    id: 'sc-1',
    title: 'CONSTÂNCIA',
    description: 'Procure manter a frequência combinada para dar continuidade ao planejamento.',
    enabled: true,
    order: 1
  },
  {
    id: 'sc-2',
    title: 'PONTUALIDADE',
    description: 'Respeite os horários agendados e comunique imprevistos conforme as condições combinadas.',
    enabled: true,
    order: 2
  },
  {
    id: 'sc-3',
    title: 'COMUNICAÇÃO',
    description: 'Informe situações relevantes para o treinamento e compartilhe suas percepções durante o acompanhamento.',
    enabled: true,
    order: 3
  },
  {
    id: 'sc-4',
    title: 'COMPROMETIMENTO',
    description: 'Participe ativamente do processo e procure seguir o planejamento combinado.',
    enabled: true,
    order: 4
  },
  {
    id: 'sc-5',
    title: 'FEEDBACK',
    description: 'Suas percepções são importantes para o acompanhamento.',
    enabled: true,
    order: 5
  },
  {
    id: 'sc-6',
    title: 'PROCESSO',
    description: 'Resultados são construídos ao longo do tempo. Nosso foco será manter consistência e acompanhar sua evolução.',
    enabled: true,
    order: 6
  }
];

export const DEFAULT_JOURNEY_STEPS: OnboardingJourneyStep[] = [
  { id: 'j-1', stepNumber: '01', title: 'INÍCIO', description: 'Cadastro e definição dos objetivos.', enabled: true, order: 1 },
  { id: 'j-2', stepNumber: '02', title: 'AVALIAÇÃO', description: 'Registro do ponto de partida.', enabled: true, order: 2 },
  { id: 'j-3', stepNumber: '03', title: 'PLANEJAMENTO', description: 'Organização do treinamento.', enabled: true, order: 3 },
  { id: 'j-4', stepNumber: '04', title: 'TREINAMENTO', description: 'Execução e registro das sessões.', enabled: true, order: 4 },
  { id: 'j-5', stepNumber: '05', title: 'ACOMPANHAMENTO', description: 'Monitoramento da evolução.', enabled: true, order: 5 },
  { id: 'j-6', stepNumber: '06', title: 'REVISÃO', description: 'Análise e ajuste das próximas etapas.', enabled: true, order: 6 }
];

export const DEFAULT_ORIENTATIONS: OnboardingOrientationItem[] = [
  {
    id: 'ori-1',
    title: 'VESTIMENTA ADEQUADA',
    description: 'Utilize roupas esportivas confortáveis que permitam amplitude de movimento e calçado estável apropriado para musculação.',
    enabled: true,
    order: 1
  },
  {
    id: 'ori-2',
    title: 'HIDRATAÇÃO',
    description: 'Traga uma garrafa com água para hidratação frequente durante as séries de esforço.',
    enabled: true,
    order: 2
  },
  {
    id: 'ori-3',
    title: 'ALIMENTAÇÃO & DESCANSO',
    description: 'Evite treinar em jejum prolongado não habitual e procure ter uma noite de descanso adequada antes dos treinos.',
    enabled: true,
    order: 3
  }
];

export const DEFAULT_SCHEDULE_POLICY = 
`Respeite os horários agendados para que tenhamos o melhor aproveitamento do tempo de treino.
Em caso de imprevistos, comunique com antecedência mínima de 24 horas para possibilitar reagendamento conforme disponibilidade na grade.
Atrasos pontuais serão absorvidos dentro do período reservado para a sessão.`;

export function createDefaultGlobalConfig(trainer?: Partial<TrainerProfile>): OnboardingGlobalConfig {
  return {
    trainerName: trainer?.name || '',
    trainerTitle: trainer?.title || 'Personal Trainer',
    trainerCref: trainer?.cref || '',
    trainerPhone: trainer?.phone || '',
    trainerEmail: trainer?.email || '',
    trainerInstagram: '',
    trainerLogoUrl: '',
    slogan: trainer?.slogan || 'Performance sem desculpas. Resultados sem limites.',

    welcomeMessageTemplate: DEFAULT_WELCOME_MESSAGE_TEMPLATE,
    guideIntroduction: 
`Bem-vindo(a).

A partir de agora, seu treinamento fará parte de um processo planejado, registrado e acompanhado ao longo do tempo.

Este guia apresenta como funcionará nosso acompanhamento, o que estará à sua disposição e como podemos trabalhar juntos durante esse processo.`,

    services: DEFAULT_SERVICES,
    showTechnologySection: true,
    technologyItems: DEFAULT_TECH_ITEMS,
    customImages: [],
    trainerCommitments: DEFAULT_TRAINER_COMMITMENTS,
    studentCommitments: DEFAULT_STUDENT_COMMITMENTS,
    mutualCommitmentQuote: 'O acompanhamento funciona melhor quando existe compromisso dos dois lados.',
    journeySteps: DEFAULT_JOURNEY_STEPS,
    showOrientationsSection: true,
    orientations: DEFAULT_ORIENTATIONS,
    showSchedulePolicySection: true,
    schedulePolicyTitle: 'HORÁRIOS E AGENDAMENTOS',
    schedulePolicyText: DEFAULT_SCHEDULE_POLICY,
    closingTitle: 'ESTAMOS COMEÇANDO.',
    closingMessage: 
`A partir de agora, cada treino faz parte de um processo maior.

Vamos registrar, acompanhar e avaliar sua evolução ao longo do caminho.`
  };
}

export function createInitialOnboardingSteps(): OnboardingStep[] {
  return [
    {
      id: 'registration',
      label: 'Cadastro',
      description: 'Registro do aluno concluído no TFIVE PRO',
      completed: true,
      completedAt: new Date().toISOString()
    },
    {
      id: 'welcome_message',
      label: 'Boas-vindas',
      description: 'Mensagem de boas-vindas enviada',
      completed: false
    },
    {
      id: 'welcome_guide',
      label: 'Guia de Boas-vindas',
      description: 'Apresentação do acompanhamento em PDF gerada e compartilhada',
      completed: false
    },
    {
      id: 'initial_assessment',
      label: 'Avaliação inicial',
      description: 'Ponto de partida físico ou funcional registrado',
      completed: false
    },
    {
      id: 'initial_planning',
      label: 'Planejamento inicial',
      description: 'Rotina de treino ou ciclo de periodização criado',
      completed: false
    },
    {
      id: 'ready_to_start',
      label: 'Pronto para iniciar',
      description: 'Primeiro atendimento e início das sessões ativas',
      completed: false
    }
  ];
}

export function createInitialStudentOnboarding(
  student: Student, 
  sourceProposalId?: string,
  planNameOverride?: string,
  frequencyOverride?: string
): StudentOnboarding {
  const now = new Date().toISOString();
  return {
    id: generateId('onb'),
    studentId: student.id,
    status: 'in_progress',
    startedAt: now,
    steps: createInitialOnboardingSteps(),
    customWelcomeMessage: '',
    planNameOverride: planNameOverride || student.planName,
    frequencyOverride: frequencyOverride || '',
    startDateOverride: student.startDate || now.split('T')[0],
    sourceProposalId,
    createdAt: now,
    updatedAt: now
  };
}

export function createDefaultStudentOnboarding(
  studentIdOrStudent: string | Student,
  studentName?: string
): StudentOnboarding {
  if (typeof studentIdOrStudent === 'object') {
    return createInitialStudentOnboarding(studentIdOrStudent);
  }
  const now = new Date().toISOString();
  return {
    id: generateId('onb'),
    studentId: studentIdOrStudent,
    status: 'in_progress',
    startedAt: now,
    steps: createInitialOnboardingSteps(),
    customWelcomeMessage: '',
    startDateOverride: now.split('T')[0],
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Replaces placeholders safely:
 * {primeiro_nome} -> student's first name
 * {nome} -> student's full name
 * {data_inicio} -> formatted start date
 */
export function interpolatePlaceholders(
  template: string, 
  student: Student, 
  startDateStr?: string
): string {
  if (!template) return '';
  const fullName = student.name?.trim() || '';
  const firstName = fullName.split(' ')[0] || '';
  
  let formattedDate = '';
  const rawDate = startDateStr || student.startDate;
  if (rawDate) {
    try {
      const parts = rawDate.split('T')[0].split('-');
      if (parts.length === 3) {
        formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } else {
        formattedDate = new Date(rawDate).toLocaleDateString('pt-BR');
      }
    } catch {
      formattedDate = rawDate;
    }
  }

  return template
    .replace(/\{primeiro_nome\}/gi, firstName)
    .replace(/\{nome\}/gi, fullName)
    .replace(/\{data_inicio\}/gi, formattedDate);
}

/**
 * Determines the cover greeting safely:
 * "BEM-VINDO / BEM-VINDA SOMENTE se essa informação estiver explicitamente configurada.
 * Caso contrário usar texto neutro: OLÁ, {PRIMEIRO_NOME}."
 * Não infere gênero pelo nome.
 */
export function getCoverGreeting(student: Student): { greeting: string; nameDisplay: string } {
  const firstName = (student.name?.trim().split(' ')[0] || student.name || '').toUpperCase();
  
  if (student.gender === 'female') {
    return {
      greeting: 'BEM-VINDA,',
      nameDisplay: firstName
    };
  }
  if (student.gender === 'male') {
    return {
      greeting: 'BEM-VINDO,',
      nameDisplay: firstName
    };
  }

  // Neutro caso não esteja explicitamente configurado como male/female
  return {
    greeting: 'OLÁ,',
    nameDisplay: firstName
  };
}

/**
 * Creates an immutable snapshot of the guide content for a student
 */
export function buildGuideSnapshot(
  student: Student,
  config: OnboardingGlobalConfig,
  planName?: string,
  frequency?: string,
  startDate?: string
): OnboardingGuideSnapshot {
  const { greeting, nameDisplay } = getCoverGreeting(student);
  const firstName = student.name?.trim().split(' ')[0] || student.name || '';

  return {
    generatedAt: new Date().toISOString(),
    studentName: student.name,
    studentFirstName: firstName,
    genderGreeting: `${greeting} ${nameDisplay}`.trim(),
    planName: planName || student.planName,
    frequency: frequency || '',
    startDate: startDate || student.startDate,
    trainerName: config.trainerName,
    trainerTitle: config.trainerTitle,
    trainerCref: config.trainerCref,
    trainerPhone: config.trainerPhone,
    trainerEmail: config.trainerEmail,
    trainerInstagram: config.trainerInstagram,
    trainerLogoUrl: config.trainerLogoUrl,
    slogan: config.slogan,
    introduction: config.guideIntroduction,
    services: config.services.filter(s => s.enabled),
    showTechnologySection: config.showTechnologySection,
    technologyItems: config.technologyItems.filter(t => t.enabled),
    customImages: config.customImages || [],
    trainerCommitments: config.trainerCommitments.filter(c => c.enabled),
    studentCommitments: config.studentCommitments.filter(c => c.enabled),
    mutualCommitmentQuote: config.mutualCommitmentQuote,
    journeySteps: config.journeySteps.filter(j => j.enabled),
    showOrientationsSection: config.showOrientationsSection,
    orientations: config.orientations.filter(o => o.enabled),
    showSchedulePolicySection: config.showSchedulePolicySection,
    schedulePolicyTitle: config.schedulePolicyTitle,
    schedulePolicyText: config.schedulePolicyText,
    closingTitle: config.closingTitle,
    closingMessage: config.closingMessage
  };
}

/**
 * Computes progress of an onboarding checklist
 */
export function computeOnboardingProgress(steps: OnboardingStep[]): {
  completedCount: number;
  totalCount: number;
  percent: number;
  nextStep: OnboardingStep | null;
  isAllCompleted: boolean;
} {
  const totalCount = steps.length;
  const completedCount = steps.filter(s => s.completed).length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const nextStep = steps.find(s => !s.completed) || null;
  const isAllCompleted = totalCount > 0 && completedCount === totalCount;

  return {
    completedCount,
    totalCount,
    percent,
    nextStep,
    isAllCompleted
  };
}

/**
 * Sanitizes file name for PDF export:
 * Ex: TFIVE_Boas_Vindas_Juliana_2026-09-08.pdf
 */
export function sanitizePdfFileName(studentName: string, dateStr?: string): string {
  const cleanName = (studentName || 'Aluno')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_');
  
  const dateFormatted = dateStr 
    ? dateStr.split('T')[0]
    : new Date().toISOString().split('T')[0];

  return `TFIVE_Boas_Vindas_${cleanName}_${dateFormatted}.pdf`;
}
