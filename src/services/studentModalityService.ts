/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TFIVE PRO — SERVIÇO DE RESOLUÇÃO DE MODALIDADE DO ALUNO (PRESENCIAL X CONSULTORIA)
 * Determina com precisão se o aluno possui atendimento Presencial ou Consultoria Online
 * utilizando estritamente as tabelas e modelos de dados já existentes:
 * - active_plans (campo 'service')
 * - plan_participants (relação student_id -> active_plan_id)
 * - students (campo 'planName' / 'plan_name')
 * - student_access (permissão granular 'permissions.schedule')
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { DATA_BACKEND } from '../utils/constants';
import { ActivePlan } from '../types/activePlan';
import { Student } from '../types';
import { isUUID, resolveStudentUuid } from '../utils/supabaseHelpers';

export type StudentModality = 'PRESENCIAL' | 'CONSULTORIA';

export interface StudentModalityInfo {
  modality: StudentModality;
  hasSchedule: boolean;
  serviceName: string;
  source: 'active_plan' | 'student_plan_name' | 'permission_override' | 'default';
  isSchedulePermittedByTrainer: boolean;
}

/**
 * Normaliza e identifica se uma string de serviço/plano corresponde a Consultoria Online ou Presencial
 */
function classifyServiceString(serviceStr: string): StudentModality | null {
  if (!serviceStr || typeof serviceStr !== 'string') return null;
  const lower = serviceStr.toLowerCase().trim();

  // Se contém termos de consultoria/online e não contém presencial ou híbrido
  const hasConsultoria = lower.includes('consultoria') || lower.includes('online') || lower.includes('remoto');
  const hasPresencial = lower.includes('presencial') || lower.includes('híbrido') || lower.includes('hibrido') || 
                        lower.includes('personal') || lower.includes('dupla') || lower.includes('casal') ||
                        lower.includes('grupo') || lower.includes('família') || lower.includes('familia') ||
                        lower.includes('reabilitação') || lower.includes('reabilitacao');

  if (hasConsultoria && !hasPresencial) {
    return 'CONSULTORIA';
  }

  if (hasPresencial) {
    return 'PRESENCIAL';
  }

  return null;
}

/**
 * Determina a modalidade do aluno (Presencial x Consultoria) e a visibilidade da Agenda.
 * REGRAS CRÍTICAS:
 * 1. Para aluno de Consultoria: hasSchedule = false (o módulo Agenda é removido da navegação).
 * 2. Se a permissão granular schedule em student_access for false: hasSchedule = false.
 * 3. Utiliza as fontes reais de verdade sem inventar novas colunas.
 */
export async function resolveStudentModality(
  studentId: string,
  schedulePermission: boolean = true
): Promise<StudentModalityInfo> {
  if (!studentId) {
    return {
      modality: 'PRESENCIAL',
      hasSchedule: false,
      serviceName: 'Indefinido',
      source: 'default',
      isSchedulePermittedByTrainer: false
    };
  }

  try {
    // 1. Fonte Primária: active_plans vinculados ao aluno
    let activePlansForStudent: ActivePlan[] = [];
    const stdUuid = await resolveStudentUuid(studentId);

    if (DATA_BACKEND === 'supabase' && isSupabaseConfigured() && stdUuid && isUUID(stdUuid)) {
      try {
        // Busca plano ativo na tabela active_plans e plan_participants
        const { data: participants } = await (supabase as any)
          .from('plan_participants')
          .select('active_plan_id')
          .eq('student_id', stdUuid);

        const planIds = participants?.map((p: any) => p.active_plan_id) || [];

        if (planIds.length > 0) {
          const { data: plans } = await (supabase as any)
            .from('active_plans')
            .select('*')
            .in('id', planIds)
            .eq('status', 'ACTIVE');

          if (plans && plans.length > 0) {
            activePlansForStudent = plans as ActivePlan[];
          }
        }
      } catch (err) {
        console.warn('Erro ao consultar planos no Supabase:', err);
      }
    }

    // Se encontrou plano ativo
    if (activePlansForStudent.length > 0) {
      const activePlan = activePlansForStudent[0];
      const serviceClass = classifyServiceString(activePlan.service || activePlan.name);

      if (serviceClass) {
        const hasSchedule = serviceClass === 'PRESENCIAL' && schedulePermission;
        return {
          modality: serviceClass,
          hasSchedule,
          serviceName: activePlan.service || activePlan.name || 'Plano Ativo',
          source: 'active_plan',
          isSchedulePermittedByTrainer: schedulePermission
        };
      }
    }

    // 2. Fonte Secundária: campo plan_name / planName na ficha do aluno (tabela students)
    let studentRecord: any = null;
    if (DATA_BACKEND === 'supabase' && isSupabaseConfigured()) {
      try {
        const query = (supabase as any).from('students').select('id, name, plan_name, status, tags');
        const isU = isUUID(studentId);
        let res: any = null;
        if (isU) {
          res = await query.eq('id', studentId).maybeSingle();
        } else if (stdUuid) {
          res = await query.eq('id', stdUuid).maybeSingle();
        } else {
          res = await query.eq('legacy_id', studentId).maybeSingle();
        }
        if (res?.data) {
          studentRecord = res.data;
        }
      } catch (err) {
        console.warn('Erro ao buscar estudante no Supabase:', err);
      }
    }
    
    // NEW: Source of Truth = Explicit Modality
    if (studentRecord) {
      let explicitModality = studentRecord.modality;
      if (!explicitModality && studentRecord.tags) {
        const tag = (studentRecord.tags as string[]).find(t => t.startsWith('modality:'));
        if (tag) explicitModality = tag.split(':')[1];
      }
      
      if (explicitModality === 'ONLINE_COACHING' || explicitModality === 'CONSULTORIA') {
         return {
            modality: 'CONSULTORIA',
            hasSchedule: false,
            serviceName: studentRecord.plan_name || studentRecord.planName || 'Consultoria Online',
            source: 'student_plan_name',
            isSchedulePermittedByTrainer: schedulePermission
         };
      } else if (explicitModality === 'IN_PERSON' || explicitModality === 'PRESENCIAL') {
         return {
            modality: 'PRESENCIAL',
            hasSchedule: schedulePermission,
            serviceName: studentRecord.plan_name || studentRecord.planName || 'Personal Training',
            source: 'student_plan_name',
            isSchedulePermittedByTrainer: schedulePermission
         };
      }
    }
    // Fallback to legacy string parsing if no explicit modality found
    // let studentRecord: Student | null = null;

    if (DATA_BACKEND === 'supabase' && isSupabaseConfigured()) {
      try {
        const query = (supabase as any).from('students').select('id, name, plan_name, status');
        const isU = isUUID(studentId);
        let res: any = null;
        if (isU) {
          res = await query.eq('id', studentId).maybeSingle();
        } else if (stdUuid) {
          res = await query.eq('id', stdUuid).maybeSingle();
        } else {
          res = await query.eq('legacy_id', studentId).maybeSingle();
        }

        if (res?.data) {
          studentRecord = {
            ...res.data,
            planName: res.data.plan_name
          } as unknown as Student;
        }
      } catch (err) {
        console.warn('Erro ao buscar plano na tabela students do Supabase:', err);
      }
    }

    if (studentRecord?.planName) {
      const planClass = classifyServiceString(studentRecord.planName);
      if (planClass) {
        const hasSchedule = planClass === 'PRESENCIAL' && schedulePermission;
        return {
          modality: planClass,
          hasSchedule,
          serviceName: studentRecord.planName,
          source: 'student_plan_name',
          isSchedulePermittedByTrainer: schedulePermission
        };
      }
    }

    // 3. Se a permissão granular explícita de Agenda foi desabilitada pelo treinador
    if (!schedulePermission) {
      return {
        modality: 'CONSULTORIA',
        hasSchedule: false,
        serviceName: studentRecord?.planName || 'Consultoria Online',
        source: 'permission_override',
        isSchedulePermittedByTrainer: false
      };
    }

    // 4. Padrão TFIVE: Atendimento Presencial Personal Training com Agenda liberada
    return {
      modality: 'PRESENCIAL',
      hasSchedule: schedulePermission,
      serviceName: studentRecord?.planName || 'Personal Training Presencial',
      source: 'default',
      isSchedulePermittedByTrainer: schedulePermission
    };
  } catch (err) {
    console.warn('Erro ao resolver modalidade do aluno:', err);
    return {
      modality: 'PRESENCIAL',
      hasSchedule: schedulePermission,
      serviceName: 'Personal Training Presencial',
      source: 'default',
      isSchedulePermittedByTrainer: schedulePermission
    };
  }
}
