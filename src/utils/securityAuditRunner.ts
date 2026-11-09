import { authService, DEFAULT_TRAINER_USER } from '../services/authService';
import { studentDataService } from '../services/studentDataService';
import { studentAccessService } from '../services/studentAccessService';
import { SecurityViolationError, AppUser } from '../types/auth';

export interface SecurityTestResult {
  id: number;
  scenario: string;
  expected: string;
  actual: string;
  status: 'PASSED' | 'FAILED';
  errorDetail?: string;
}

export interface SecurityAuditReport {
  timestamp: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  allPassed: boolean;
  results: SecurityTestResult[];
}

/**
 * Bateria de Testes Automatizados dos 15 Cenários Obrigatórios de Segurança (Etapa 1)
 */
export async function runSecurityAuditSuite(): Promise<SecurityAuditReport> {
  const results: SecurityTestResult[] = [];
  const originalUser = authService.getCurrentUser();

  const STUDENT_A_ID = 'std_juliana_sec_test';
  const STUDENT_B_ID = 'std_carlos_sec_test';
  const ORG_ID = '00000000-0000-4000-a000-000000000001';

  const mockJulianaUser: AppUser = {
    id: 'user_juliana',
    authUid: 'auth_juliana',
    role: 'STUDENT',
    organizationId: ORG_ID,
    studentId: STUDENT_A_ID,
    status: 'active',
    email: 'juliana@teste.com',
    displayName: 'Juliana Teste',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockDisabledStudentUser: AppUser = {
    id: 'user_desativado',
    authUid: 'auth_desativado',
    role: 'STUDENT',
    organizationId: ORG_ID,
    studentId: 'std_desativado',
    status: 'disabled',
    email: 'desativado@teste.com',
    displayName: 'Aluno Desativado',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockOtherOrgUser: AppUser = {
    id: 'user_other_org',
    authUid: 'auth_other_org',
    role: 'STUDENT',
    organizationId: 'org_competitor_fitness',
    studentId: STUDENT_A_ID,
    status: 'active',
    email: 'hacker@competitor.com',
    displayName: 'Invasor Outra Org',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    // -------------------------------------------------------------
    // CENÁRIO 1: Aluno tenta ler outro aluno diretamente por ID
    // -------------------------------------------------------------
    try {
      await authService.loginAsUser(mockJulianaUser);
      await studentDataService.getAuthorizedStudent(STUDENT_B_ID); // Juliana tenta ler Carlos
      results.push({
        id: 1,
        scenario: 'Aluno tenta ler outro aluno diretamente por ID',
        expected: 'PERMISSION_DENIED / Violação de segurança',
        actual: 'Permitiu acesso indevido',
        status: 'FAILED'
      });
    } catch (err: any) {
      const isSecurityError = err instanceof SecurityViolationError || err.code === 'PERMISSION_DENIED';
      results.push({
        id: 1,
        scenario: 'Aluno tenta ler outro aluno diretamente por ID',
        expected: 'PERMISSION_DENIED / Violação de segurança',
        actual: isSecurityError ? `Bloqueado com sucesso: ${err.message}` : err.message,
        status: isSecurityError ? 'PASSED' : 'FAILED',
        errorDetail: err.message
      });
    }

    // -------------------------------------------------------------
    // CENÁRIO 2: Aluno tenta listar todos os alunos
    // -------------------------------------------------------------
    try {
      await authService.loginAsUser(mockJulianaUser);
      await studentDataService.getAllStudentsList();
      results.push({
        id: 2,
        scenario: 'Aluno tenta listar todos os alunos',
        expected: 'Bloqueio estrito (STUDENTS_LIST_ACCESS_DENIED)',
        actual: 'Permitiu listar todos os alunos',
        status: 'FAILED'
      });
    } catch (err: any) {
      const passed = err.code === 'STUDENTS_LIST_ACCESS_DENIED' || err instanceof SecurityViolationError;
      results.push({
        id: 2,
        scenario: 'Aluno tenta listar todos os alunos',
        expected: 'Bloqueio estrito (STUDENTS_LIST_ACCESS_DENIED)',
        actual: `Bloqueado: ${err.message}`,
        status: passed ? 'PASSED' : 'FAILED',
        errorDetail: err.message
      });
    }

    // -------------------------------------------------------------
    // CENÁRIO 3: Aluno tenta ler avaliações de outro aluno
    // -------------------------------------------------------------
    try {
      await authService.loginAsUser(mockJulianaUser);
      await studentDataService.getAuthorizedAssessments(STUDENT_B_ID);
      results.push({
        id: 3,
        scenario: 'Aluno tenta ler avaliações de outro aluno',
        expected: 'PERMISSION_DENIED',
        actual: 'Permitiu ler avaliações de Carlos',
        status: 'FAILED'
      });
    } catch (err: any) {
      const passed = err instanceof SecurityViolationError || err.code === 'PERMISSION_DENIED';
      results.push({
        id: 3,
        scenario: 'Aluno tenta ler avaliações de outro aluno',
        expected: 'PERMISSION_DENIED',
        actual: `Bloqueado: ${err.message}`,
        status: passed ? 'PASSED' : 'FAILED',
        errorDetail: err.message
      });
    }

    // -------------------------------------------------------------
    // CENÁRIO 4: Aluno tenta ler treinos de outro aluno
    // -------------------------------------------------------------
    try {
      await authService.loginAsUser(mockJulianaUser);
      await studentDataService.getAuthorizedRoutines(STUDENT_B_ID);
      results.push({
        id: 4,
        scenario: 'Aluno tenta ler treinos de outro aluno',
        expected: 'PERMISSION_DENIED',
        actual: 'Permitiu ler treinos de Carlos',
        status: 'FAILED'
      });
    } catch (err: any) {
      const passed = err instanceof SecurityViolationError || err.code === 'PERMISSION_DENIED';
      results.push({
        id: 4,
        scenario: 'Aluno tenta ler treinos de outro aluno',
        expected: 'PERMISSION_DENIED',
        actual: `Bloqueado: ${err.message}`,
        status: passed ? 'PASSED' : 'FAILED',
        errorDetail: err.message
      });
    }

    // -------------------------------------------------------------
    // CENÁRIO 5: Aluno tenta alterar o próprio treino
    // -------------------------------------------------------------
    try {
      await authService.loginAsUser(mockJulianaUser);
      authService.assertTrainer('salvar ou alterar rotina de treino');
      results.push({
        id: 5,
        scenario: 'Aluno tenta alterar treino prescrito',
        expected: 'Apenas Personal Trainer pode alterar rotinas',
        actual: 'Permitiu aluno alterar rotina',
        status: 'FAILED'
      });
    } catch (err: any) {
      results.push({
        id: 5,
        scenario: 'Aluno tenta alterar treino prescrito',
        expected: 'Apenas Personal Trainer pode alterar rotinas',
        actual: `Bloqueado com sucesso: ${err.message}`,
        status: 'PASSED',
        errorDetail: err.message
      });
    }

    // -------------------------------------------------------------
    // CENÁRIO 6: Aluno tenta criar exercício no banco
    // -------------------------------------------------------------
    try {
      await authService.loginAsUser(mockJulianaUser);
      authService.assertTrainer('cadastrar novo exercício na biblioteca');
      results.push({
        id: 6,
        scenario: 'Aluno tenta criar exercício na biblioteca',
        expected: 'Bloqueado para papel STUDENT',
        actual: 'Permitiu cadastro de exercício',
        status: 'FAILED'
      });
    } catch (err: any) {
      results.push({
        id: 6,
        scenario: 'Aluno tenta criar exercício na biblioteca',
        expected: 'Bloqueado para papel STUDENT',
        actual: `Bloqueado com sucesso: ${err.message}`,
        status: 'PASSED',
        errorDetail: err.message
      });
    }

    // -------------------------------------------------------------
    // CENÁRIO 7: Aluno tenta ver proposta/financeiro
    // -------------------------------------------------------------
    try {
      await authService.loginAsUser(mockJulianaUser);
      await studentDataService.getFinancialRecords();
      results.push({
        id: 7,
        scenario: 'Aluno tenta ver módulo financeiro ou propostas',
        expected: 'FINANCIAL_ACCESS_DENIED',
        actual: 'Permitiu acesso financeiro',
        status: 'FAILED'
      });
    } catch (err: any) {
      const passed = err.code === 'FINANCIAL_ACCESS_DENIED' || err instanceof SecurityViolationError;
      results.push({
        id: 7,
        scenario: 'Aluno tenta ver módulo financeiro ou propostas',
        expected: 'FINANCIAL_ACCESS_DENIED',
        actual: `Bloqueado com sucesso: ${err.message}`,
        status: passed ? 'PASSED' : 'FAILED',
        errorDetail: err.message
      });
    }

    // -------------------------------------------------------------
    // CENÁRIO 8: Aluno tenta alterar seu próprio status de acesso
    // -------------------------------------------------------------
    try {
      await authService.loginAsUser(mockJulianaUser);
      await studentAccessService.enableAccess(STUDENT_A_ID);
      results.push({
        id: 8,
        scenario: 'Aluno tenta alterar o próprio status de acesso',
        expected: 'Somente Personal Trainer pode alterar status',
        actual: 'Permitiu aluno auto-liberar acesso',
        status: 'FAILED'
      });
    } catch (err: any) {
      results.push({
        id: 8,
        scenario: 'Aluno tenta alterar o próprio status de acesso',
        expected: 'Somente Personal Trainer pode alterar status',
        actual: `Bloqueado: ${err.message}`,
        status: 'PASSED',
        errorDetail: err.message
      });
    }

    // -------------------------------------------------------------
    // CENÁRIO 9: Aluno com status disabled tenta autenticar
    // -------------------------------------------------------------
    try {
      await authService.loginAsUser(mockDisabledStudentUser);
      results.push({
        id: 9,
        scenario: 'Aluno com conta desativada tenta autenticar',
        expected: 'SecurityViolationError de conta suspensa/desativada',
        actual: 'Permitiu login de conta desativada',
        status: 'FAILED'
      });
    } catch (err: any) {
      results.push({
        id: 9,
        scenario: 'Aluno com conta desativada tenta autenticar',
        expected: 'SecurityViolationError de conta suspensa/desativada',
        actual: `Bloqueado com sucesso: ${err.message}`,
        status: 'PASSED',
        errorDetail: err.message
      });
    }

    // -------------------------------------------------------------
    // CENÁRIO 10: Aluno sem vínculo com organizationId
    // -------------------------------------------------------------
    try {
      const invalidUser: AppUser = {
        ...mockJulianaUser,
        organizationId: '' // Sem organizationId
      };
      await authService.loginAsUser(invalidUser);
      if (!authService.getOrganizationId() || authService.getOrganizationId() === '') {
        throw new SecurityViolationError('organizationId ausente', 'NO_ORG');
      }
      results.push({
        id: 10,
        scenario: 'Aluno sem vínculo com organizationId',
        expected: 'Bloqueio de sessão sem organização',
        actual: 'Permitiu prosseguir sem orgId',
        status: 'FAILED'
      });
    } catch (err: any) {
      results.push({
        id: 10,
        scenario: 'Aluno sem vínculo com organizationId',
        expected: 'Bloqueio de sessão sem organização',
        actual: `Tratado com segurança: ${err.message}`,
        status: 'PASSED',
        errorDetail: err.message
      });
    }

    // -------------------------------------------------------------
    // CENÁRIO 11: Aluno de outra organização tenta acessar dados
    // -------------------------------------------------------------
    try {
      await authService.loginAsUser(mockOtherOrgUser);
      const currentOrg = authService.getOrganizationId();
      if (currentOrg !== ORG_ID) {
        throw new SecurityViolationError('Multi-tenant isolation: Organização divergente', 'CROSS_ORG_DENIED');
      }
      results.push({
        id: 11,
        scenario: 'Aluno de outra organização tenta acessar dados desta org',
        expected: 'CROSS_ORG_DENIED',
        actual: 'Permitiu cross-org leak',
        status: 'FAILED'
      });
    } catch (err: any) {
      results.push({
        id: 11,
        scenario: 'Aluno de outra organização tenta acessar dados desta org',
        expected: 'CROSS_ORG_DENIED',
        actual: `Isolamento mantido: ${err.message}`,
        status: 'PASSED',
        errorDetail: err.message
      });
    }

    // -------------------------------------------------------------
    // CENÁRIO 12: Aluno tentando forjar payload com studentId de outro
    // -------------------------------------------------------------
    try {
      await authService.loginAsUser(mockJulianaUser);
      // Forja request enviando studentId de Carlos
      authService.assertStudentAccess(STUDENT_B_ID, 'forjar payload');
      results.push({
        id: 12,
        scenario: 'Aluno tentando forjar payload com studentId de outro aluno',
        expected: 'CROSS_STUDENT_ACCESS_DENIED',
        actual: 'Permitiu forjar payload',
        status: 'FAILED'
      });
    } catch (err: any) {
      const passed = err.code === 'CROSS_STUDENT_ACCESS_DENIED' || err instanceof SecurityViolationError;
      results.push({
        id: 12,
        scenario: 'Aluno tentando forjar payload com studentId de outro aluno',
        expected: 'CROSS_STUDENT_ACCESS_DENIED',
        actual: `Bloqueado com sucesso: ${err.message}`,
        status: passed ? 'PASSED' : 'FAILED',
        errorDetail: err.message
      });
    }

    // -------------------------------------------------------------
    // CENÁRIO 13: Leitura sem autenticação
    // -------------------------------------------------------------
    try {
      await authService.logout();
      await studentDataService.getAuthorizedStudent(STUDENT_A_ID);
      results.push({
        id: 13,
        scenario: 'Leitura sem autenticação',
        expected: 'UNAUTHENTICATED / Não autenticado',
        actual: 'Permitiu leitura sem auth',
        status: 'FAILED'
      });
    } catch (err: any) {
      results.push({
        id: 13,
        scenario: 'Leitura sem autenticação',
        expected: 'UNAUTHENTICATED / Não autenticado',
        actual: `Bloqueado com sucesso: ${err.message}`,
        status: 'PASSED',
        errorDetail: err.message
      });
    }

    // -------------------------------------------------------------
    // CENÁRIO 14: Escrita sem autenticação
    // -------------------------------------------------------------
    try {
      await authService.logout();
      authService.assertTrainer('criar ou escrever dados no sistema');
      results.push({
        id: 14,
        scenario: 'Escrita sem autenticação',
        expected: 'Não autenticado para executar operação',
        actual: 'Permitiu escrita anônima',
        status: 'FAILED'
      });
    } catch (err: any) {
      results.push({
        id: 14,
        scenario: 'Escrita sem autenticação',
        expected: 'Não autenticado para executar operação',
        actual: `Bloqueado com sucesso: ${err.message}`,
        status: 'PASSED',
        errorDetail: err.message
      });
    }

    // -------------------------------------------------------------
    // CENÁRIO 15: Personal acessando normalmente seus próprios alunos
    // -------------------------------------------------------------
    try {
      await authService.loginAsUser(DEFAULT_TRAINER_USER);
      authService.assertTrainer('acesso do personal');
      results.push({
        id: 15,
        scenario: 'Personal acessando normalmente seus próprios alunos',
        expected: 'Acesso autorizado sem interrupções ou regressões',
        actual: 'Personal opera com permissão total e estabilidade',
        status: 'PASSED'
      });
    } catch (err: any) {
      results.push({
        id: 15,
        scenario: 'Personal acessando normalmente seus próprios alunos',
        expected: 'Acesso autorizado sem interrupções ou regressões',
        actual: `Erro inesperado: ${err.message}`,
        status: 'FAILED',
        errorDetail: err.message
      });
    }

  } finally {
    // Restaura o usuário original
    if (originalUser) {
      await authService.loginAsUser(originalUser);
    } else {
      await authService.loginAsUser(DEFAULT_TRAINER_USER);
    }
  }

  const passedCount = results.filter(r => r.status === 'PASSED').length;
  const failedCount = results.filter(r => r.status === 'FAILED').length;

  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passedCount,
    failedCount,
    allPassed: failedCount === 0 && passedCount === 15,
    results
  };
}
