import React, { useState, useRef, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Download, 
  Upload, 
  RefreshCw, 
  User, 
  CheckCircle, 
  Database, 
  ShieldCheck, 
  AlertTriangle,
  Smartphone,
  Save,
  Share2,
  HardDrive,
  FileCheck,
  Clock,
  Trash2,
  X,
  Lock,
  Sparkles,
  Dumbbell,
  Activity,
  Copy,
  Check,
  ShieldAlert,
  FileText,
  LogOut
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TrainerProfile, Student } from '../../types';
import { TFiveLogo } from '../common/TFiveLogo';
import { authService } from '../../services/authService';
import { 
  createFullBackup, 
  validateBackup, 
  downloadBackupFile, 
  shareBackupFile, 
  BackupValidationResult,
  formatBytes
} from '../../services/backupService';
import { RestoreBackupModal } from './RestoreBackupModal';
import { runDiagnosticReport, formatDiagnosticAsText, DiagnosticData } from '../../services/diagnosticService';
import { exportEmergencyBackup } from '../../services/emergencyBackup';
import { SyncSettingsSection } from './SyncSettingsSection';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

export const SettingsView: React.FC = () => {
  const { 
    trainerProfile, 
    updateTrainerProfile, 
    workoutSettings,
    updateWorkoutSettings,
    restoreBackupPayload, 
    resetDatabase,
    lastBackupInfo,
    refreshData
  } = useApp();
  
  const [profileForm, setProfileForm] = useState<TrainerProfile>(trainerProfile);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  
  // Settings Sections Tab
  const [activeSection, setActiveSection] = useState<'general' | 'sync' | 'backup'>('general');
  
  // Backup Creation State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportedBackup, setExportedBackup] = useState<{
    filename: string;
    blob: Blob;
    sizeFormatted: string;
    studentsCount: number;
    sessionsCount: number;
    assessmentsCount: number;
    photosCount: number;
    date: string;
  } | null>(null);

  // Backup Restore State
  const [validationResult, setValidationResult] = useState<BackupValidationResult | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [isValidationModalOpen, setIsValidationModalOpen] = useState<boolean>(false);

  // Status / Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Reset / Clear Data Modal
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [resetConfirmText, setResetConfirmText] = useState<string>('');
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Logout State
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  const currentUser = authService.getCurrentUser();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await authService.logout();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao sair da conta.';
      showToast(`Falha ao sair: ${msg}`, 'error');
      setIsLoggingOut(false);
    }
  };

  const [diagnosticData, setDiagnosticData] = useState<DiagnosticData | null>(null);
  const [isLoadingDiag, setIsLoadingDiag] = useState<boolean>(false);

  useEffect(() => {
    runDiagnosticReport().then(setDiagnosticData).catch(() => {});
  }, []);

  const handleRefreshDiagnostic = async () => {
    setIsLoadingDiag(true);
    try {
      const diag = await runDiagnosticReport();
      setDiagnosticData(diag);
      showToast('Diagnóstico atualizado!', 'success');
    } finally {
      setIsLoadingDiag(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTrainerProfile(profileForm);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  /**
   * Generates a Full TFIVE PRO Backup file with all stores, photos, and SHA-256 Checksum
   */
  const handleCreateBackup = async () => {
    try {
      setIsExporting(true);
      const backupResult = await createFullBackup();
      
      setExportedBackup({
        filename: backupResult.filename,
        blob: backupResult.blob,
        sizeFormatted: backupResult.sizeFormatted,
        studentsCount: backupResult.backupFile.metadata.studentsCount,
        sessionsCount: backupResult.backupFile.metadata.sessionsCount,
        assessmentsCount: backupResult.backupFile.metadata.assessmentsCount,
        photosCount: backupResult.backupFile.metadata.photosCount,
        date: new Date().toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      });

      // Automatically trigger download as immediate protection fallback
      downloadBackupFile(backupResult.blob, backupResult.filename);
      await refreshData();
      showToast(`Backup criado com sucesso! (${backupResult.sizeFormatted})`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao criar backup.';
      showToast(`Erro ao criar backup: ${msg}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Shares backup file via native Web Share API (Drive, iCloud, WhatsApp, Email, Files)
   */
  const handleShareBackup = async () => {
    if (!exportedBackup) return;
    const shared = await shareBackupFile(exportedBackup.blob, exportedBackup.filename);
    if (!shared) {
      // Fallback: regular download if share cancelled or unavailable
      downloadBackupFile(exportedBackup.blob, exportedBackup.filename);
      showToast('Arquivo baixado para o seu dispositivo.');
    }
  };

  /**
   * Handles user selecting a backup file (.tfivebackup or .json)
   */
  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSelectedFileName(file.name);
      const text = await file.text();
      const validation = await validateBackup(text);
      setValidationResult(validation);
      setIsValidationModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Arquivo corrompido';
      setValidationResult({
        valid: false,
        errorMessage: `Não foi possível ler o arquivo: ${msg}`
      });
      setIsValidationModalOpen(true);
    } finally {
      // Reset input value so the same file can be re-selected if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * Confirms and restores the validated backup data
   */
  const handleConfirmRestore = async () => {
    if (!validationResult || !validationResult.valid || !validationResult.data) {
      throw new Error('Dados do backup inválidos.');
    }

    const restoreResult = await restoreBackupPayload(validationResult.data);
    if (restoreResult.success) {
      setIsValidationModalOpen(false);
      setValidationResult(null);
      showToast('Backup restaurado com sucesso! Todos os dados foram restabelecidos.');
    } else {
      throw new Error(restoreResult.message);
    }
  };

  /**
   * Wipes all user data completely while keeping default exercise bank
   */
  const handleConfirmReset = async () => {
    if (resetConfirmText.trim().toUpperCase() !== 'APAGAR') {
      return;
    }

    try {
      setIsResetting(true);
      await resetDatabase();
      setIsResetModalOpen(false);
      setResetConfirmText('');
      setExportedBackup(null);
      showToast('Todos os dados locais foram apagados. O banco está limpo.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao limpar banco.';
      showToast(`Falha ao apagar dados: ${msg}`, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const formattedLastBackupDate = lastBackupInfo?.date ? new Date(lastBackupInfo.date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : null;

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <SettingsIcon className="w-5 h-5 text-[#374151]" />
          <h1 className="text-2xl sm:text-3xl font-black font-display text-white">Configurações & Backup Local</h1>
        </div>
        <p className="text-xs sm:text-sm text-[#4B5563]">
          Perfil do treinador, backup completo em arquivo único e restauração total 100% offline
        </p>
      </div>

      {/* Global Toast / Feedback */}
      {toast && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in duration-200 ${
          toast.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-[#F3F4F6] border-[#E5E7EB] text-[#374151]'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

      {/* Main Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#27272A] pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveSection('general')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${
            activeSection === 'general'
              ? 'bg-[#374151] text-white shadow-lg shadow-xs'
              : 'bg-[#18181B] text-[#4B5563] hover:text-white border border-[#27272A]'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Geral & Treinador</span>
        </button>

        <button
          onClick={() => setActiveSection('sync')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${
            activeSection === 'sync'
              ? 'bg-[#374151] text-white shadow-lg shadow-xs'
              : 'bg-[#18181B] text-[#4B5563] hover:text-white border border-[#27272A]'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Sincronização</span>
        </button>

        <button
          onClick={() => setActiveSection('backup')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${
            activeSection === 'backup'
              ? 'bg-[#374151] text-white shadow-lg shadow-xs'
              : 'bg-[#18181B] text-[#4B5563] hover:text-white border border-[#27272A]'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Backup & Dados</span>
        </button>
      </div>

      {/* SECTION: SINCRONIZAÇÃO / CONEXÃO */}
      {activeSection === 'sync' && (
        <div className="space-y-6">
          <SyncSettingsSection />
        </div>
      )}

      {/* SECTION: GERAL & TREINADOR */}
      {activeSection === 'general' && (
        <div className="space-y-6">

          {/* Conta de Acesso & Logout */}
          <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-center font-bold text-base text-white shadow-xs shrink-0">
                  {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : (trainerProfile.name ? trainerProfile.name.charAt(0).toUpperCase() : 'T')}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-white truncate">
                      {currentUser?.displayName || trainerProfile.name || 'Personal Trainer'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                      {currentUser?.role || 'TRAINER'}
                    </span>
                  </div>
                  <p className="text-xs text-[#71717A] truncate mt-0.5">
                    {currentUser?.email || trainerProfile.email || 'suportfive25@gmail.com'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Sair da conta</span>
              </button>
            </div>
          </div>

      {/* Trainer Profile Form */}
      <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#27272A]">
          <User className="w-5 h-5 text-[#374151]" />
          <h3 className="text-base font-bold font-display uppercase tracking-wider text-white">
            Perfil do Personal Trainer
          </h3>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-bold mb-1">Nome Completo</label>
              <input
                type="text"
                value={profileForm.name}
                onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-white focus:outline-none focus:border-[#374151]"
                placeholder="Ex: Prof. Carlos Silva"
              />
            </div>

            <div>
              <label className="block text-white font-bold mb-1">CREF / Registro Profissional</label>
              <input
                type="text"
                value={profileForm.cref}
                onChange={e => setProfileForm({ ...profileForm, cref: e.target.value })}
                className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-white focus:outline-none focus:border-[#374151]"
                placeholder="Ex: 012345-G/SP"
              />
            </div>

            <div>
              <label className="block text-white font-bold mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={profileForm.phone}
                onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-white focus:outline-none focus:border-[#374151]"
                placeholder="Ex: (11) 99999-9999"
              />
            </div>

            <div>
              <label className="block text-white font-bold mb-1">E-mail Profissional</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-white focus:outline-none focus:border-[#374151]"
                placeholder="Ex: personal@exemplo.com"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-white font-bold mb-1">Slogan / Assinatura nos Relatórios</label>
              <input
                type="text"
                value={profileForm.slogan || ''}
                onChange={e => setProfileForm({ ...profileForm, slogan: e.target.value })}
                className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-white focus:outline-none focus:border-[#374151]"
                placeholder="Performance sem desculpas. Resultados sem limites."
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Perfil</span>
            </button>

            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-[#16a34a] font-bold">
                <CheckCircle className="w-4 h-4" />
                <span>Salvo com sucesso!</span>
              </span>
            )}
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* CONFIGURAÇÕES DE TREINO & AVISOS DE PR */}
      {/* ========================================================================= */}
      <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#27272A]">
          <Dumbbell className="w-5 h-5 text-[#374151]" />
          <div>
            <h3 className="text-base font-bold font-display uppercase tracking-wider text-white">
              Configurações de Treino
            </h3>
            <p className="text-xs text-[#4B5563]">
              Ajuste as preferências de avisos e notificações durante a execução dos treinos
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-white font-bold text-xs mb-1.5">
              Avisos de PR durante o treino
            </label>
            <p className="text-[11px] text-[#4B5563] mb-3">
              Define como os recordes pessoais (PRs) são sinalizados em tempo real para não interromper o fluxo da sessão.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* DISCRETO */}
              <button
                type="button"
                onClick={() => {
                  updateWorkoutSettings({ prNotificationMode: 'discreet' });
                  showToast('Configuração atualizada: Avisos de PR discretos.');
                }}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  workoutSettings.prNotificationMode === 'discreet'
                    ? 'bg-[#18181B] border-amber-500/60 ring-1 ring-amber-500/40 shadow-lg shadow-amber-500/5'
                    : 'bg-[#0A0A0A] border-[#27272A] hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    DISCRETO (Padrão)
                  </span>
                  {workoutSettings.prNotificationMode === 'discreet' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  )}
                </div>
                <p className="text-[11px] text-[#4B5563] leading-relaxed">
                  Salva silenciosamente e exibe um pequeno aviso não bloqueante de 2.5s. Sem alertas invasivos ou interrupções no fluxo de trabalho.
                </p>
              </button>

              {/* DESATIVADO */}
              <button
                type="button"
                onClick={() => {
                  updateWorkoutSettings({ prNotificationMode: 'disabled' });
                  showToast('Configuração atualizada: Avisos visuais de PR desativados durante o treino.');
                }}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  workoutSettings.prNotificationMode === 'disabled'
                    ? 'bg-[#18181B] border-[#374151] ring-1 ring-[#374151] shadow-lg shadow-xs'
                    : 'bg-[#0A0A0A] border-[#27272A] hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-zinc-600" />
                    DESATIVADO
                  </span>
                  {workoutSettings.prNotificationMode === 'disabled' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#374151]"></span>
                  )}
                </div>
                <p className="text-[11px] text-[#4B5563] leading-relaxed">
                  Nenhum aviso visual durante o treino. Os recordes continuam sendo calculados e registrados para a celebração na finalização.
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION: BACKUP & DADOS */}
      {/* ========================================================================= */}
      {activeSection === 'backup' && (
        <div className="space-y-6">

      {/* ========================================================================= */}
      {/* SEUS DADOS & BACKUP COMPLETO (ARQUIVO ÚNICO .TFIVEBACKUP) */}
      {/* ========================================================================= */}
      <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-5 sm:p-6 space-y-6">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#27272A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#374151]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display uppercase tracking-wider text-white">
                Seus Dados & Backup Completo
              </h3>
              <p className="text-xs text-[#4B5563]">
                Crie um arquivo único contendo todos os alunos, treinos, fotos e configurações
              </p>
            </div>
          </div>

          {/* Last Backup Info Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#050505] border border-[#27272a] text-xs">
            <Clock className="w-3.5 h-3.5 text-[#374151]" />
            <span className="text-[#4B5563]">
              Último backup:{' '}
              <strong className="text-white font-mono">
                {formattedLastBackupDate || 'Nenhum'}
              </strong>
            </span>
          </div>
        </div>

        {/* Security Recommendation Notice */}
        <div className="p-4 rounded-xl bg-[#050505] border border-[#27272a] text-xs text-[#4B5563] flex items-start gap-3">
          <HardDrive className="w-4 h-4 text-[#374151] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-white font-bold">
              Guarde este arquivo em um local seguro fora deste dispositivo
            </p>
            <p className="leading-relaxed">
              Recomendamos salvar no Google Drive, iCloud, OneDrive, pen drive ou enviar para o seu e-mail. Em caso de troca ou perda do aparelho, basta importar o arquivo para recuperar 100% do TFIVE PRO.
            </p>
          </div>
        </div>

        {/* Action Buttons: Create Backup & Restore Backup */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* CREATE BACKUP BUTTON */}
          <div className="p-5 rounded-2xl bg-[#18181B] border border-[#27272a] hover:border-[#374151]/50 transition-all flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <Download className="w-5 h-5 text-[#374151]" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Criar Backup</h4>
              </div>
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Gera um arquivo <strong className="text-white font-mono">.tfivebackup</strong> com todos os dados (alunos, fotos, histórico, PRs, treinos ativos e financeiro).
              </p>
            </div>

            <button
              onClick={handleCreateBackup}
              disabled={isExporting}
              className="w-full py-3 px-4 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(217,4,41,0.4)] flex items-center justify-center gap-2 disabled:opacity-80"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>CRIANDO BACKUP…</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>CRIAR BACKUP COMPLETO</span>
                </>
              )}
            </button>
          </div>

          {/* RESTORE BACKUP BUTTON */}
          <div className="p-5 rounded-2xl bg-[#18181B] border border-[#27272a] hover:border-[#374151]/50 transition-all flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <Upload className="w-5 h-5 text-white" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Restaurar Backup</h4>
              </div>
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Selecione um arquivo de backup para restaurar seus dados. A integridade é validada com prévia antes da aplicação.
              </p>
            </div>

            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".tfivebackup,.json,application/json"
                onChange={handleSelectFile}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-white font-bold text-xs uppercase tracking-wider transition-all border border-[#3f3f46] hover:border-[#374151] flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4 text-[#374151]" />
                <span>RESTAURAR BACKUP</span>
              </button>
            </div>
          </div>

        </div>

        {/* Recently Created Backup Card with Direct Share & Download */}
        {exportedBackup && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <FileCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    Backup Criado com Sucesso • {exportedBackup.sizeFormatted}
                  </h4>
                  <p className="text-[11px] text-[#4B5563] font-mono">
                    {exportedBackup.filename}
                  </p>
                </div>
              </div>

              <span className="text-[11px] text-[#4B5563]">
                {exportedBackup.studentsCount} alunos • {exportedBackup.sessionsCount} treinos • {exportedBackup.assessmentsCount} avaliações
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={handleShareBackup}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-xs font-bold text-white transition-all shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5 text-[#374151]" />
                <span>Compartilhar (Drive, iCloud, WhatsApp, Email)</span>
              </button>

              <button
                onClick={() => downloadBackupFile(exportedBackup.blob, exportedBackup.filename)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-xs font-bold text-[#4B5563] hover:text-white transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Novamente</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* DIAGNÓSTICO & INTEGRIDADE DO SISTEMA */}
      {/* ========================================================================= */}
      <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#27272A]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display uppercase tracking-wider text-white">
                Diagnóstico Técnico do Sistema
              </h3>
              <p className="text-xs text-[#4B5563]">
                Estado em tempo real do IndexedDB, Service Worker, Sincronização e Logs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshDiagnostic}
              disabled={isLoadingDiag}
              className="px-3 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-xs font-bold text-[#4B5563] hover:text-white flex items-center gap-1.5 transition-all disabled:opacity-80"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDiag ? 'animate-spin text-[#374151]' : ''}`} />
              <span>Atualizar</span>
            </button>

            <button
              onClick={async () => {
                const diag = await runDiagnosticReport();
                const text = formatDiagnosticAsText(diag);
                await navigator.clipboard.writeText(text);
                showToast('Diagnóstico copiado para a área de transferência!', 'success');
              }}
              className="px-3 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-xs font-bold text-white flex items-center gap-1.5 transition-all"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copiar Relatório</span>
            </button>

            <button
              onClick={async () => {
                try {
                  const res = await exportEmergencyBackup();
                  if (res.success) {
                    showToast(`Backup de emergência baixado: ${res.filename}`, 'success');
                  } else {
                    showToast(`Falha ao exportar: ${res.error}`, 'error');
                  }
                } catch (e: any) {
                  showToast(e?.message || 'Falha na extração', 'error');
                }
              }}
              className="px-3 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-xs font-bold text-white flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-[#374151]" />
              <span>Extração Direta</span>
            </button>
          </div>
        </div>

        {/* PWA App Status & Installation Action */}
        <PWAInstallButton variant="card" />

        {/* System Vitals Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-[#18181B] p-3 rounded-xl border border-[#27272A] space-y-1">
            <span className="text-[10px] text-[#71717A] uppercase font-bold tracking-wider">Versão do App</span>
            <div className="text-white font-bold font-mono">
              v{diagnosticData?.appVersion || '5.0.0'}
            </div>
          </div>

          <div className="bg-[#18181B] p-3 rounded-xl border border-[#27272A] space-y-1">
            <span className="text-[10px] text-[#71717A] uppercase font-bold tracking-wider">IndexedDB Local</span>
            <div className="text-white font-bold flex items-center gap-1.5 truncate">
              <span className={`w-2 h-2 rounded-full ${diagnosticData?.indexedDB.accessible ? 'bg-emerald-400' : 'bg-[#374151]'}`}></span>
              <span className="truncate">{diagnosticData?.dbName || 'tfive_pro_v5_db'} (v{diagnosticData?.dbVersion || 5})</span>
            </div>
          </div>

          <div className="bg-[#18181B] p-3 rounded-xl border border-[#27272A] space-y-1">
            <span className="text-[10px] text-[#71717A] uppercase font-bold tracking-wider">Service Worker & Cache</span>
            <div className="text-white font-bold flex items-center gap-1.5 truncate">
              <span className={`w-2 h-2 rounded-full ${diagnosticData?.serviceWorker.active ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className="truncate">{diagnosticData?.serviceWorker.activeCacheVersion || 'tfive-pro-cache-v5.0.0'}</span>
            </div>
          </div>

          <div className="bg-[#18181B] p-3 rounded-xl border border-[#27272A] space-y-1">
            <span className="text-[10px] text-[#71717A] uppercase font-bold tracking-wider">Conexão & Nuvem</span>
            <div className="text-white font-bold flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${diagnosticData?.environment.isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span>{diagnosticData?.environment.isOnline ? 'Online' : 'Offline'} • {diagnosticData?.cloudSync.status || 'Local'}</span>
            </div>
          </div>
        </div>

        {/* Store Registry Counts Breakdown */}
        {diagnosticData?.indexedDB.storeCounts && Object.keys(diagnosticData.indexedDB.storeCounts).length > 0 && (
          <div className="p-3.5 bg-[#18181B] border border-[#27272A] rounded-xl space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#4B5563] uppercase tracking-wider">
              <span>Registros por Store IndexedDB</span>
              <span className="text-emerald-400 font-normal">
                {Object.values(diagnosticData.indexedDB.storeCounts).reduce((a, b) => (b > 0 ? a + b : a), 0)} itens totais
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {Object.entries(diagnosticData.indexedDB.storeCounts).map(([store, count]) => (
                <div key={store} className="bg-[#121212] px-2.5 py-1.5 rounded-lg border border-[#27272A] flex items-center justify-between">
                  <span className="text-[11px] text-[#4B5563] font-mono truncate">{store}</span>
                  <span className="text-[11px] font-bold text-white font-mono ml-2">
                    {count >= 0 ? count : 'err'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Real React Error Inspector */}
        {diagnosticData?.lastReactError ? (
          <div className="p-4 rounded-xl bg-[#F3F4F6] border border-[#D1D5DB] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[#374151]">
                <AlertTriangle className="w-4 h-4" />
                <span>Último Erro React Registrado</span>
              </div>
              <span className="text-[10px] text-[#4B5563] font-mono">
                {new Date(diagnosticData.lastReactError.timestamp).toLocaleTimeString('pt-BR')}
              </span>
            </div>

            <div className="text-xs text-white space-y-1">
              <div className="font-semibold text-rose-200">
                {diagnosticData.lastReactError.name}: {diagnosticData.lastReactError.message}
              </div>
              {diagnosticData.lastReactError.componentName && (
                <div className="text-[11px] text-amber-300 font-mono">
                  Componente: &lt;{diagnosticData.lastReactError.componentName} /&gt;
                </div>
              )}
              {diagnosticData.lastReactError.route && (
                <div className="text-[11px] text-[#4B5563]">
                  Rota: <span className="font-mono">{diagnosticData.lastReactError.route}</span>
                </div>
              )}
              {diagnosticData.lastReactError.stackSummary && (
                <div className="p-2 rounded bg-black/40 border border-[#27272A] text-[10px] font-mono text-[#4B5563] max-h-20 overflow-y-auto">
                  {diagnosticData.lastReactError.stackSummary}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle className="w-4 h-4" />
              <span>Nenhum erro React recente detectado. Interface 100% estável.</span>
            </div>
            <span className="text-[11px] text-[#4B5563]">0 exceções críticas ativas</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DADOS DO DISPOSITIVO — AÇÃO DESTRUTIVA SEPARADA */}
      {/* ========================================================================= */}
      <div className="bg-rose-500/5 border border-rose-500/30 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#27272A]">
          <Trash2 className="w-5 h-5 text-rose-500" />
          <h3 className="text-base font-bold font-display uppercase tracking-wider text-rose-500">
            Dados do Dispositivo
          </h3>
        </div>

        <p className="text-xs text-[#5F5F5F] leading-relaxed">
          Esta ação apagará permanentemente todos os alunos, treinos, fotos, avaliações e agendamentos deste dispositivo, restabelecendo o banco para o estado inicial de fábrica.
        </p>

        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-[#8A8A8A]">
            Certifique-se de ter um backup antes de prosseguir.
          </span>

          <button
            onClick={() => {
              setResetConfirmText('');
              setIsResetModalOpen(true);
            }}
            className="semantic-danger px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-600 border border-rose-500/40 text-rose-500 hover:text-white font-bold text-xs uppercase tracking-wider transition-all"
          >
            Apagar Todos os Dados
          </button>
        </div>
      </div>

      {/* Official Identity & PWA Status */}
      <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <TFiveLogo variant="badge" size="md" />
          <div>
            <h4 className="text-sm font-bold text-white">Identidade Oficial TFIVE PRO</h4>
            <p className="text-xs text-[#4B5563]">
              PWA 100% Offline com ícone de alta fidelidade para Android e iOS.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-[#18181B] border border-[#27272a] text-xs font-bold text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>PWA Instalável</span>
          </span>
        </div>
      </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* RESTORE PREVIEW & VALIDATION MODAL */}
      {/* ========================================================================= */}
      {isValidationModalOpen && validationResult && (
        <RestoreBackupModal
          validationResult={validationResult}
          fileName={selectedFileName}
          onConfirmRestore={handleConfirmRestore}
          onClose={() => {
            setIsValidationModalOpen(false);
            setValidationResult(null);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* STRONG RESET CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121212] border border-[#374151]/50 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            
            {/* Header */}
            <div className="p-5 border-b border-[#27272a] flex items-center justify-between bg-[#18181B]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] border border-[#D1D5DB] flex items-center justify-center text-[#374151]">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black font-display text-white tracking-tight">
                    Apagar Todos os Dados
                  </h2>
                  <p className="text-xs text-[#4B5563]">
                    Ação destrutiva irreversível
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResetting}
                className="w-8 h-8 rounded-lg bg-[#27272a]/60 hover:bg-[#27272a] text-[#4B5563] hover:text-white flex items-center justify-center transition-colors disabled:opacity-80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] text-[#374151] space-y-1.5">
                <p className="font-bold">
                  Atenção: Esta ação não pode ser desfeita!
                </p>
                <p className="text-white leading-relaxed">
                  Todos os alunos cadastrados, treinos realizados, fotos de evolução, avaliações físicas e agendamentos serão excluídos permanentemente deste dispositivo.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-white font-bold">
                  Digite <span className="text-[#374151] font-mono">APAGAR</span> abaixo para confirmar:
                </label>
                <input
                  type="text"
                  value={resetConfirmText}
                  onChange={e => setResetConfirmText(e.target.value)}
                  placeholder="APAGAR"
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-white focus:outline-none focus:border-[#374151] font-mono uppercase"
                  autoFocus
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#27272a] flex items-center justify-between bg-[#18181B]">
              <button
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResetting}
                className="px-4 py-2.5 rounded-xl border border-[#27272a] text-xs font-bold text-[#4B5563] hover:text-white transition-colors disabled:opacity-80"
              >
                Cancelar
              </button>

              <button
                onClick={handleConfirmReset}
                disabled={resetConfirmText.trim().toUpperCase() !== 'APAGAR' || isResetting}
                className="px-5 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-xs font-bold text-white transition-all shadow-md shadow-xs flex items-center gap-2 disabled:opacity-80 disabled:cursor-not-allowed"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>APAGANDO…</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>CONFIRMAR EXCLUSÃO TOTAL</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LOGOUT CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121212] border border-[#27272a] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            
            {/* Header */}
            <div className="p-5 border-b border-[#27272a] flex items-center justify-between bg-[#18181B]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black font-display text-white tracking-tight">
                    Sair da Conta
                  </h2>
                  <p className="text-xs text-[#71717A]">
                    Encerrar sessão no TFIVE PRO
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                disabled={isLoggingOut}
                className="w-8 h-8 rounded-lg bg-[#27272a]/60 hover:bg-[#27272a] text-[#71717A] hover:text-white flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-3 text-xs">
              <p className="text-[#A1A1AA] leading-relaxed">
                Tem certeza que deseja sair da sua conta? Sua sessão do Supabase Auth será encerrada com segurança.
              </p>
              <div className="p-3.5 rounded-xl bg-[#18181B] border border-[#27272A] space-y-1.5">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Seus dados continuam 100% seguros</span>
                </div>
                <p className="text-[11px] text-[#71717A] leading-relaxed pl-6">
                  Alunos, treinos, rotinas, histórico e treinos em andamento não serão excluídos.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#27272a] flex items-center justify-end gap-3 bg-[#18181B]">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                disabled={isLoggingOut}
                className="px-4 py-2.5 rounded-xl border border-[#27272a] text-xs font-bold text-[#A1A1AA] hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition-all shadow-md shadow-rose-950/40 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoggingOut ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saindo...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>Confirmar Saída</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
