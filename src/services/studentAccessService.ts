import { 
  StudentAccess, 
  StudentAccessPermissions, 
  DEFAULT_STUDENT_PERMISSIONS,
  StudentInvite,
  SecurityViolationError 
} from '../types/auth';
import { generateId } from '../utils/idGenerator';
import { authService } from './authService';
import { recordSanitizedError } from './errorLogService';
import { DATA_BACKEND } from '../utils/constants';
import { getSupabaseClient } from './supabaseClient';
import { isUUID, resolveStudentUuid } from '../utils/supabaseHelpers';

class StudentAccessService {
  private async getAccessFromSupabase(studentId: string): Promise<StudentAccess | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    try {
      const stdUuid = await resolveStudentUuid(studentId);
      if (!stdUuid || !isUUID(stdUuid)) {
        return null;
      }

      const { data, error } = await supabase
        .from('student_access')
        .select('*')
        .eq('student_id', stdUuid)
        .maybeSingle() as any;

      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        studentId: studentId,
        organizationId: data.organization_id,
        enabled: data.enabled,
        status: data.status as any,
        permissions: data.permissions || { ...DEFAULT_STUDENT_PERMISSIONS },
        inviteCode: data.invite_code,
        invitedEmail: data.invited_email,
        activatedAt: data.activated_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (err) {
      console.warn('Erro ao ler student_access no Supabase:', err);
      return null;
    }
  }

  private async saveAccessToSupabase(access: StudentAccess): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');
    
    const stdUuid = await resolveStudentUuid(access.studentId);
    if (!stdUuid || !isUUID(stdUuid)) {
      console.info(`[StudentAccess] Aluno '${access.studentId}' não possui UUID registrado no Supabase.`);
      return;
    }

    const payload = {
      id: isUUID(access.id) ? access.id : undefined,
      student_id: stdUuid,
      organization_id: access.organizationId,
      enabled: access.enabled,
      status: access.status,
      permissions: access.permissions,
      invite_code: access.inviteCode || null,
      invited_email: access.invitedEmail || null,
      activated_at: access.activatedAt || null,
      updated_at: new Date().toISOString()
    };
    
    const { error } = await (supabase.from('student_access') as any).upsert(payload, { onConflict: 'student_id' });
    if (error) {
      throw error;
    }
  }

  /**
   * Obtém ou cria o registro conceitual de acesso do aluno com padrão conservador.
   * Não cria conta automaticamente até a aprovação expressa do Personal Trainer.
   */
  public async getOrCreateAccess(studentId: string, organizationId?: string): Promise<StudentAccess> {
    const orgId = organizationId || authService.getOrganizationId();
    try {
      const remote = await this.getAccessFromSupabase(studentId);
      if (remote) return remote;

      const initialAccess: StudentAccess = {
        id: `access_${studentId}`,
        studentId,
        organizationId: orgId,
        enabled: false,
        status: 'NOT_ENABLED',
        permissions: { ...DEFAULT_STUDENT_PERMISSIONS },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.saveAccessToSupabase(initialAccess);
      return initialAccess;
    } catch (err) {
      recordSanitizedError('getOrCreateAccess_error', err);
      return {
        id: `access_${studentId}`,
        studentId,
        organizationId: orgId,
        enabled: false,
        status: 'NOT_ENABLED',
        permissions: { ...DEFAULT_STUDENT_PERMISSIONS },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Personal Trainer libera o acesso ao TFIVE (Requisito 22 e 23).
   * Define o status como ACTIVE ou INVITED com permissões conservadoras.
   */
  public async enableAccess(studentId: string, organizationId?: string): Promise<StudentAccess> {
    authService.assertTrainer('liberar acesso de aluno');

    const access = await this.getOrCreateAccess(studentId, organizationId);
    const nowIso = new Date().toISOString();

    const updated: StudentAccess = {
      ...access,
      enabled: true,
      status: 'ACTIVE',
      activatedAt: access.activatedAt || nowIso,
      updatedAt: nowIso
    };

    await this.saveAccessToSupabase(updated);
    return updated;
  }

  /**
   * Personal Trainer desativa o acesso ao TFIVE (Requisito 24).
   * NÃO exclui o aluno, histórico, sessões nem avaliações. Apenas revoga o acesso.
   */
  public async disableAccess(studentId: string): Promise<StudentAccess> {
    authService.assertTrainer('desativar acesso de aluno');

    const access = await this.getOrCreateAccess(studentId);
    const nowIso = new Date().toISOString();

    const updated: StudentAccess = {
      ...access,
      enabled: false,
      status: 'DISABLED',
      updatedAt: nowIso
    };

    await this.saveAccessToSupabase(updated);
    return updated;
  }

  /**
   * Personal Trainer atualiza permissões granulares do aluno (Requisito 10 e 11).
   */
  public async updatePermissions(
    studentId: string, 
    permissions: Partial<StudentAccessPermissions>
  ): Promise<StudentAccess> {
    authService.assertTrainer('atualizar permissões do aluno');

    const access = await this.getOrCreateAccess(studentId);
    const updated: StudentAccess = {
      ...access,
      permissions: {
        ...access.permissions,
        ...permissions
      },
      updatedAt: new Date().toISOString()
    };

    await this.saveAccessToSupabase(updated);
    return updated;
  }

  /**
   * Gera código/token de convite seguro (Requisito 26).
   * NÃO armazena nem envia senhas geradas pelo Personal (Requisito 27).
   */
  public async generateInvite(studentId: string, invitedEmail?: string): Promise<StudentInvite> {
    authService.assertTrainer('gerar convite de acesso para aluno');

    const access = await this.getOrCreateAccess(studentId);
    const inviteCode = `TFIVE-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).substring(3, 7).toUpperCase()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 dias

    const invite: StudentInvite = {
      id: generateId('inv'),
      studentId,
      organizationId: access.organizationId,
      status: 'PENDING',
      inviteCode,
      invitedEmail,
      createdAt: now.toISOString(),
      expiresAt
    };

    // Atualiza o registro de acesso com o convite pendente
    const updatedAccess: StudentAccess = {
      ...access,
      status: access.status === 'ACTIVE' ? 'ACTIVE' : 'INVITED',
      inviteCode,
      invitedEmail,
      updatedAt: now.toISOString()
    };

    await this.saveAccessToSupabase(updatedAccess);
    return invite;
  }

  /**
   * Aluno arquivado suspende o acesso sem apagar dados (Requisito 25).
   */
  public async handleStudentArchived(studentId: string, isArchived: boolean): Promise<void> {
    try {
      const access = await this.getAccessFromSupabase(studentId);
      if (!access) return;

      if (isArchived && access.enabled) {
        // Suspende acesso temporariamente
        await this.saveAccessToSupabase({
          ...access,
          enabled: false,
          status: 'DISABLED',
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      recordSanitizedError('handleStudentArchived_error', err);
    }
  }
}

export const studentAccessService = new StudentAccessService();
