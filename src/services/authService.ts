import { AppUser, AuthContextState, SecurityViolationError } from '../types/auth';
import { saveAppUserToDb } from '../db/indexedDB';
import { recordSanitizedError } from './errorLogService';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { DATA_BACKEND } from '../utils/constants';

class TransientAuthError extends Error {
  constructor(message: string) { super(message); this.name = 'TransientAuthError'; }
}

const AUTH_STORAGE_KEY = 'tfive_auth_session_v1';
const SESSION_TOKEN_KEY = 'tfive_session_token_v1';

// Usuário padrão do Personal Trainer (sem organização fixa atribuída)
export const DEFAULT_TRAINER_USER: AppUser = {
  id: 'user_trainer_default',
  authUid: 'auth_trainer_default',
  role: 'OWNER',
  organizationId: '',
  status: 'active',
  email: 'suportfive25@gmail.com',
  displayName: 'Personal Trainer',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

class AuthService {
  private currentUser: AppUser | null = null;
  private listeners: Array<(state: AuthContextState) => void> = [];
  private isInitialized = false;

  constructor() {
    this.initSession();
  }

  private async initSession(): Promise<void> {
    if (typeof window === 'undefined') {
      this.currentUser = DATA_BACKEND === 'supabase' ? null : DEFAULT_TRAINER_USER;
      this.isInitialized = true;
      return;
    }

    if (DATA_BACKEND === 'supabase' && isSupabaseConfigured()) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          try {
            await this.syncSupabaseUser(session.user);
          } catch (err) {
            if (err instanceof SecurityViolationError) {
              await supabase.auth.signOut().catch(() => {});
            }
            throw err;
          }
        } else {
          this.currentUser = null;
          this.saveSessionToStorage(null);
        }

        // Monitora mudanças de autenticação no Supabase Auth
        supabase.auth.onAuthStateChange((event, newSession) => {
          // Renovar token ao acordar o tablet NÃO muda o usuário: ignora.
          if (event === 'TOKEN_REFRESHED') return;
          // Evita deadlock do supabase-js: nunca chamar o client dentro do callback.
          setTimeout(async () => {
            if (newSession?.user) {
              if (this.currentUser?.authUid === newSession.user.id) return; // mesmo usuário já carregado
              try {
                await this.syncSupabaseUser(newSession.user);
              } catch (err) {
                if (err instanceof SecurityViolationError) {
                  // Sessões autenticadas sem membership administrativa são encerradas.
                  await supabase.auth.signOut().catch(() => {});
                }
              }
            } else if (event === 'SIGNED_OUT') {
              this.currentUser = null;
              this.saveSessionToStorage(null);
              this.notify();
            }
          }, 0);
        });
      } catch (err) {
        recordSanitizedError('supabase_auth_init_error', err);
        this.currentUser = null;
      } finally {
        this.isInitialized = true;
        this.notify();
      }
      return;
    }

    // Modo local / legada
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed: AppUser = JSON.parse(stored);
        if (parsed && parsed.authUid && parsed.role && parsed.organizationId) {
          if ((parsed as any).role === 'STUDENT') {
            // Remove sessões legadas do portal de aluno; somente contas administrativas são aceitas.
            this.currentUser = null;
            localStorage.removeItem(AUTH_STORAGE_KEY);
            localStorage.removeItem(SESSION_TOKEN_KEY);
          } else {
            this.currentUser = parsed;
          }
        } else {
          this.currentUser = null;
        }
      } else {
        this.currentUser = null;
      }
    } catch (err) {
      recordSanitizedError('auth_session_init_error', err);
      this.currentUser = null;
    } finally {
      this.isInitialized = true;
      this.notify();
    }
  }

  /**
   * Sincroniza exclusivamente contas administrativas OWNER/TRAINER.
   * O workspace é provisionado pelo RPC seguro e a identidade é confirmada
   * exclusivamente por uma membership administrativa ativa.
   */
  public async syncSupabaseUser(authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }): Promise<AppUser | null> {
    try {
      // Provisiona o workspace somente após autenticação confirmada.
      // O servidor valida auth.uid(), confirmação do e-mail e vínculos administrativos existentes.
      if (typeof window !== 'undefined') {
        const pendingWorkspace = localStorage.getItem('tfive_pending_google_workspace');
        const metadataWorkspace = authUser.user_metadata?.organization_name;
        const requestedWorkspace =
          pendingWorkspace ||
          (typeof metadataWorkspace === 'string' ? metadataWorkspace.trim() : '');

        if (requestedWorkspace) {
          const pendingFullName = localStorage.getItem('tfive_pending_google_full_name');
          const metadataFullName =
            authUser.user_metadata?.full_name ??
            authUser.user_metadata?.name;
          const requestedFullName =
            pendingFullName ||
            (typeof metadataFullName === 'string' ? metadataFullName : null);

          const { error: provisionError } = await (supabase as any).rpc(
            'provision_google_trainer_workspace',
            {
              p_organization_name: requestedWorkspace,
              p_full_name: requestedFullName
            }
          );
          if (provisionError) throw new TransientAuthError(provisionError.message);

          localStorage.removeItem('tfive_pending_google_workspace');
          localStorage.removeItem('tfive_pending_google_full_name');
        }
      }
      // 1. Verifica se o usuário é OWNER ou TRAINER em organization_members
      const { data: member, error: memberErr } = await (supabase as any)
        .from('organization_members')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('status', 'active')
        .maybeSingle();
      if (memberErr) throw new TransientAuthError(memberErr.message);

      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      // Se for membro administrativo da organização (OWNER / TRAINER)
      if (member && (member.role === 'OWNER' || member.role === 'TRAINER')) {
        if (!member.organization_id) {
          throw new SecurityViolationError('Membro administrativo sem organização vinculada no Supabase.', 'NO_ORGANIZATION_ID');
        }
        const appUser: AppUser = {
          id: authUser.id,
          authUid: authUser.id,
          role: member.role,
          organizationId: member.organization_id,
          status: 'active',
          email: authUser.email || profile?.email || '',
          displayName: profile?.full_name || authUser.email || 'Personal Trainer',
          photoUrl: profile?.avatar_url || undefined,
          createdAt: member.created_at || new Date().toISOString(),
          updatedAt: member.updated_at || new Date().toISOString(),
        };

        this.currentUser = appUser;
        this.saveSessionToStorage(appUser);
        this.notify();
        return appUser;
      }

      throw new SecurityViolationError(
        'Conta sem vínculo ativo de Personal Trainer ou OWNER no TFIVE PRO.'
      );
    } catch (err: any) {
      recordSanitizedError('sync_supabase_user_error', err);
      // Falha de rede/transitória: mantém o usuário logado (não derruba o treino ao vivo).
      const isTransient = err instanceof TransientAuthError || err?.name === 'TypeError' || !(err instanceof SecurityViolationError);
      if (isTransient && this.currentUser) {
        throw err;
      }
      this.currentUser = null;
      this.saveSessionToStorage(null);
      this.notify();
      throw err;
    }
  }

  /**
   * Traduz erros comuns do Supabase Auth para mensagens em português
   */
  private translateAuthError(msg: string): string {
    const lower = msg.toLowerCase();
    if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
      return 'E-mail ou senha incorretos.';
    }
    if (lower.includes('user already registered') || lower.includes('already exists')) {
      return 'Este e-mail já está cadastrado.';
    }
    if (lower.includes('password should be at least')) {
      return 'A senha deve ter pelo menos 6 caracteres.';
    }
    if (lower.includes('email not confirmed')) {
      return 'E-mail ainda não confirmado. Verifique sua caixa de entrada.';
    }
    return msg || 'Ocorreu um erro na autenticação.';
  }

  /**
   * Login oficial via Supabase Auth
   */
  public async loginWithSupabase(email: string, password: string): Promise<AppUser> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      throw new Error(this.translateAuthError(error.message));
    }

    if (!data.user) {
      throw new Error('Não foi possível autenticar o usuário.');
    }

    try {
      const synced = await this.syncSupabaseUser(data.user);
      if (!synced) {
        throw new SecurityViolationError('Conta sem vínculo ativo de Personal Trainer ou OWNER no TFIVE PRO.');
      }
      return synced;
    } catch (err) {
      if (err instanceof SecurityViolationError) {
        await supabase.auth.signOut().catch(() => {});
      }
      throw err;
    }
  }

  /**
   * Inicia autenticação Google. No cadastro, guarda o nome do workspace
   * para provisioná-lo após o retorno do OAuth, com validação server-side.
   */
  public async signInWithGoogle(organizationName?: string, fullName?: string): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('A autenticação com Google só pode ser iniciada no navegador.');
    }

    const pendingKey = 'tfive_pending_google_workspace';
    const pendingNameKey = 'tfive_pending_google_full_name';
    if (organizationName?.trim()) {
      localStorage.setItem(pendingKey, organizationName.trim());
      if (fullName?.trim()) localStorage.setItem(pendingNameKey, fullName.trim());
      else localStorage.removeItem(pendingNameKey);
    } else {
      localStorage.removeItem(pendingKey);
      localStorage.removeItem(pendingNameKey);
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' },
      },
    });

    if (error) {
      localStorage.removeItem(pendingKey);
      localStorage.removeItem(pendingNameKey);
      throw new Error(this.translateAuthError(error.message));
    }
  }

  /**
   * Cadastro oficial via Supabase Auth
   */
  public async signUpWithSupabase(
    email: string,
    password: string,
    fullName: string,
    organizationName: string
  ) {
    const normalizedOrganizationName = organizationName.trim();
    if (!normalizedOrganizationName) {
      throw new Error('Informe o nome do seu espaço de trabalho.');
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          organization_name: normalizedOrganizationName,
        },
      },
    });

    if (error) {
      throw new Error(this.translateAuthError(error.message));
    }

    return data;
  }

  private saveSessionToStorage(user: AppUser | null): void {
    if (typeof window === 'undefined') return;
    try {
      if (user) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        const token = btoa(JSON.stringify({
          uid: user.authUid,
          role: user.role,
          org: user.organizationId,
          exp: Date.now() + (7 * 24 * 60 * 60 * 1000)
        }));
        localStorage.setItem(SESSION_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(SESSION_TOKEN_KEY);
      }
    } catch (err) {
      recordSanitizedError('saveSessionToStorage_error', err);
    }
  }

  public getAuthState(): AuthContextState {
    return {
      user: this.currentUser,
      role: this.currentUser?.role || null,
      organizationId: this.currentUser?.organizationId || '',
      isAuthenticated: Boolean(this.currentUser && this.currentUser.status === 'active' && Boolean(this.currentUser.organizationId)),
      isLoading: !this.isInitialized
    };
  }

  public getCurrentUser(): AppUser | null {
    return this.currentUser;
  }

  public getOrganizationId(): string {
    const orgId = this.currentUser?.organizationId;
    if (!orgId) {
      throw new SecurityViolationError('Usuário autenticado não possui organização válida associada.', 'NO_ORGANIZATION_ID');
    }
    return orgId;
  }

  public subscribe(callback: (state: AuthContextState) => void): () => void {
    this.listeners.push(callback);
    callback(this.getAuthState());
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify(): void {
    const state = this.getAuthState();
    this.listeners.forEach(cb => {
      try {
        cb(state);
      } catch (err) {
        console.error('Error in auth listener:', err);
      }
    });
  }

  /**
   * Realiza login local exclusivamente para contas administrativas.
   */
  public async loginAsUser(user: AppUser): Promise<AppUser> {
    if (!user || !user.authUid) {
      throw new SecurityViolationError('Identificador de autenticação inválido');
    }

    if (!user.organizationId || !user.organizationId.trim()) {
      throw new SecurityViolationError('Usuário deve estar associado a uma organizationId válida', 'NO_ORGANIZATION_ID');
    }

    if (user.status !== 'active') {
      throw new SecurityViolationError('Esta conta de usuário está desativada ou suspensa');
    }

    if ((user as any).role !== 'OWNER' && (user as any).role !== 'TRAINER') {
      throw new SecurityViolationError('Somente contas de Personal Trainer ou OWNER podem entrar no TFIVE PRO.');
    }

    // Persiste no IndexedDB para histórico local
    await saveAppUserToDb(user);

    this.currentUser = user;
    this.saveSessionToStorage(user);
    this.notify();
    return user;
  }

  /**
   * Encerra a sessão autenticada no Supabase e limpa a sessão local.
   */
  public async logout(): Promise<void> {
    if (DATA_BACKEND === 'supabase') {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Erro durante signOut no Supabase:', err);
      }
    }

    this.currentUser = null;
    this.saveSessionToStorage(null);
    this.notify();
  }

  /**
   * Verifica se uma operação requer privilégios de Personal Trainer ou Owner
   */
  public assertTrainer(operationName: string = 'esta operação'): void {
    const state = this.getAuthState();
    if (!state.isAuthenticated || (state.role !== 'TRAINER' && state.role !== 'OWNER')) {
      throw new SecurityViolationError(`Acesso negado: apenas o Personal Trainer ou Owner pode executar ${operationName}.`);
    }
  }


}

export const authService = new AuthService();
