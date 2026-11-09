import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Key, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Copy, 
  Check, 
  Lock, 
  Unlock, 
  Calendar, 
  Dumbbell, 
  History, 
  TrendingUp, 
  Activity, 
  FileText, 
  Scale, 
  Clock,
  Smartphone
} from 'lucide-react';
import { Student } from '../../types';
import { StudentAccess, StudentAccessPermissions, DEFAULT_STUDENT_PERMISSIONS } from '../../types/auth';
import { studentAccessService } from '../../services/studentAccessService';
import { authService } from '../../services/authService';

interface StudentAccessControlCardProps {
  student: Student;
}

export const StudentAccessControlCard: React.FC<StudentAccessControlCardProps> = ({ student }) => {
  const [access, setAccess] = useState<StudentAccess | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showPermissionsModal, setShowPermissionsModal] = useState<boolean>(false);
  const [copiedInvite, setCopiedInvite] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const loadAccessData = async () => {
    try {
      setLoading(true);
      const data = await studentAccessService.getOrCreateAccess(student.id);
      setAccess(data);
    } catch (err) {
      console.warn('Falha ao carregar acesso do aluno, utilizando padrão seguro:', err);
      setAccess({
        id: `access_${student.id}`,
        studentId: student.id,
        organizationId: student.organizationId || '',
        enabled: false,
        status: 'NOT_ENABLED',
        permissions: { ...DEFAULT_STUDENT_PERMISSIONS },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccessData();
  }, [student.id]);

  const showFeedback = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 3500);
  };

  const handleEnableAccess = async () => {
    try {
      setLoading(true);
      const updated = await studentAccessService.enableAccess(student.id);
      setAccess(updated);
      showFeedback('Acesso liberado com sucesso com configuração padrão de privacidade.');
    } catch (err: any) {
      alert(err.message || 'Erro ao liberar acesso');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableAccess = async () => {
    if (!confirm('Deseja realmente desativar o acesso deste aluno ao TFIVE? O histórico, rotinas e avaliações permanecerão 100% seguros e intactos.')) {
      return;
    }
    try {
      setLoading(true);
      const updated = await studentAccessService.disableAccess(student.id);
      setAccess(updated);
      showFeedback('Acesso desativado. O aluno não poderá mais realizar login.');
    } catch (err: any) {
      alert(err.message || 'Erro ao desativar acesso');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = async (key: keyof StudentAccessPermissions) => {
    if (!access) return;
    try {
      const updatedPermissions = {
        ...access.permissions,
        [key]: !access.permissions[key]
      };
      const updated = await studentAccessService.updatePermissions(student.id, updatedPermissions);
      setAccess(updated);
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar permissão');
    }
  };

  const handleGenerateInvite = async () => {
    try {
      setLoading(true);
      const invite = await studentAccessService.generateInvite(student.id, student.email);
      await loadAccessData();
      showFeedback(`Convite gerado: ${invite.inviteCode}`);
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar convite');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code?: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  if (loading && !access) {
    return (
      <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-6 text-center text-[#4B5563] text-xs animate-pulse">
        Carregando configurações de acesso...
      </div>
    );
  }

  const isInactiveStudent = student.status === 'inactive';

  return (
    <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#27272A]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-[#27272A] flex items-center justify-center text-[#374151]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black font-display text-white tracking-wide uppercase flex items-center gap-2">
              Acesso TFIVE
              <span className="text-[10px] lowercase px-2 py-0.5 rounded-md bg-[#18181B] text-[#4B5563] border border-[#27272A]">
                modo aluno
              </span>
            </h3>
            <p className="text-xs text-[#4B5563]">
              Gerencie a autorização, credenciais de vínculo e privacidade dos dados para {student.name}.
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#4B5563]">Status:</span>
          {isInactiveStudent ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Aluno Inativo (Acesso Suspenso)
            </span>
          ) : access?.status === 'ACTIVE' ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Ativo
            </span>
          ) : access?.status === 'DISABLED' ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" />
              Desativado
            </span>
          ) : access?.status === 'INVITED' ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Convite Pendente
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-600 border border-zinc-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Não Ativado
            </span>
          )}
        </div>
      </div>

      {actionSuccessMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Main Status Information & Actions */}
      {access?.status === 'ACTIVE' && !isInactiveStudent ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#18181B] p-4 rounded-xl border border-[#27272A]">
            <div>
              <span className="text-[#4B5563] block">Data de Ativação:</span>
              <span className="text-white font-medium">
                {access.activatedAt ? new Date(access.activatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recente'}
              </span>
            </div>
            <div>
              <span className="text-[#4B5563] block">Último Acesso Registrado:</span>
              <span className="text-white font-medium">
                {access.lastAccessAt ? new Date(access.lastAccessAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Nenhum acesso ainda'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={async () => {
                try {
                  await authService.loginAsStudent(student.id, student.name, student.email, student.organizationId);
                } catch (err: any) {
                  alert(err.message || 'Erro ao abrir visualização do aluno');
                }
              }}
              className="px-4 py-2 rounded-xl bg-[#D90429] hover:bg-[#A60321] text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-[#D90429]/20"
              title="Abrir a interface do aluno para este aluno"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Visualizar Modo Aluno</span>
            </button>

            <button
              onClick={() => setShowPermissionsModal(true)}
              className="px-4 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-zinc-300" />
              <span>Gerenciar Permissões</span>
            </button>

            <button
              onClick={handleDisableAccess}
              className="px-4 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Desativar Acesso</span>
            </button>
          </div>
        </div>
      ) : access?.status === 'DISABLED' && !isInactiveStudent ? (
        <div className="space-y-3 bg-[#18181B] p-4 rounded-xl border border-[#27272A]">
          <p className="text-xs text-[#4B5563]">
            O acesso deste aluno foi suspenso pelo treinador. As informações do aluno, rotinas prescritas e histórico permanecem preservados no seu painel.
          </p>
          <button
            onClick={handleEnableAccess}
            className="px-4 py-2 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Reativar Acesso</span>
          </button>
        </div>
      ) : isInactiveStudent ? (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
          Este aluno está marcado como <strong>Inativo</strong> no cadastro. Por segurança, o acesso ao TFIVE fica automaticamente bloqueado até que o aluno seja reativado na ficha cadastral.
        </div>
      ) : (
        /* NOT_ENABLED or INVITED */
        <div className="space-y-4 bg-[#18181B] p-4 rounded-xl border border-[#27272A]">
          <p className="text-xs text-[#4B5563] leading-relaxed">
            Este aluno ainda não possui autorização de login no TFIVE. Ao liberar o acesso, o sistema cria o registro de vínculo seguro com isolamento de dados e permissões estritas de privacidade por padrão.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleEnableAccess}
              className="px-4 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-xs transition-all flex items-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              <span>Liberar Acesso ao TFIVE</span>
            </button>

            <button
              onClick={handleGenerateInvite}
              className="px-4 py-2.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] border border-[#3F3F46] text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
            >
              <Key className="w-4 h-4 text-zinc-600" />
              <span>Gerar Convite / Código</span>
            </button>
          </div>

          {access?.inviteCode && (
            <div className="mt-3 p-3 rounded-xl bg-black/40 border border-[#27272A] flex items-center justify-between gap-2">
              <div className="text-xs">
                <span className="text-[#4B5563] block text-[10px] uppercase font-bold">Código de Convite:</span>
                <span className="text-emerald-400 font-mono font-bold tracking-wider">{access.inviteCode}</span>
              </div>
              <button
                onClick={() => handleCopyCode(access.inviteCode)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-white flex items-center gap-1.5 transition-all"
              >
                {copiedInvite ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedInvite ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Permissions Management Modal / Expandable Panel */}
      {showPermissionsModal && access && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-5 sm:p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[#374151]" />
                <h4 className="text-sm font-black font-display text-white uppercase">
                  Permissões de Acesso — {student.name}
                </h4>
              </div>
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-600 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#4B5563]">
              Configure os módulos visíveis para o aluno no aplicativo. Por padrão conservador de privacidade, avaliações, fotos e relatórios permanecem desativados até autorização explícita do Personal.
            </p>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {[
                { 
                  key: 'currentWorkout' as const, 
                  label: 'Treino do Dia / Rotina Atual', 
                  desc: 'Visualização da rotina prescrita e exercícios ativos',
                  icon: Dumbbell,
                  isSensible: false
                },
                { 
                  key: 'workoutHistory' as const, 
                  label: 'Histórico de Treinos', 
                  desc: 'Acesso às sessões e séries previamente concluídas',
                  icon: History,
                  isSensible: false
                },
                { 
                  key: 'schedule' as const, 
                  label: 'Agenda e Aulas', 
                  desc: 'Visualização de horários agendados e próximos treinos',
                  icon: Calendar,
                  isSensible: false
                },
                { 
                  key: 'currentCycle' as const, 
                  label: 'Ciclo de Periodização', 
                  desc: 'Bloco atual, semana e objetivo da periodização',
                  icon: Activity,
                  isSensible: false
                },
                { 
                  key: 'evolution' as const, 
                  label: 'Evolução de Cargas', 
                  desc: 'Gráficos e marcas pessoais (PRs) de exercícios',
                  icon: TrendingUp,
                  isSensible: false
                },
                { 
                  key: 'assessments' as const, 
                  label: 'Avaliações Físicas & Medidas', 
                  desc: 'Dados antropométricos, dobras e fotos corporais',
                  icon: Scale,
                  isSensible: true
                },
                { 
                  key: 'reports' as const, 
                  label: 'Relatórios de Desempenho', 
                  desc: 'Relatórios analíticos periódicos gerados pelo treinador',
                  icon: FileText,
                  isSensible: true
                },
                { 
                  key: 'detailedLoads' as const, 
                  label: 'Cargas Detalhadas por Série', 
                  desc: 'Detalhamento numérico avançado de pesos e RPE',
                  icon: Dumbbell,
                  isSensible: true
                }
              ].map(item => {
                const isEnabled = Boolean(access.permissions[item.key]);
                const Icon = item.icon;
                return (
                  <div 
                    key={item.key}
                    onClick={() => handleTogglePermission(item.key)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isEnabled 
                        ? 'bg-[#18181B] border-[#D1D5DB]' 
                        : 'bg-black/30 border-[#27272A] opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg ${isEnabled ? 'bg-[#F3F4F6] text-[#374151]' : 'bg-zinc-800 text-zinc-600'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">{item.label}</span>
                          {item.isSensible && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Sensível
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#4B5563] truncate">{item.desc}</p>
                      </div>
                    </div>

                    <div className={`w-10 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                      isEnabled ? 'bg-[#374151]' : 'bg-zinc-700'
                    }`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform transform ${
                        isEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#27272A] flex justify-end">
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="px-4 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold uppercase tracking-wider transition-all"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
