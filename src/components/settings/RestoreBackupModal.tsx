import React, { useState } from 'react';
import { 
  X, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  Dumbbell, 
  FileText, 
  Camera, 
  Calendar, 
  Layers, 
  Clock, 
  ShieldCheck, 
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { BackupValidationResult, BackupMetadata } from '../../services/backupService';

interface RestoreBackupModalProps {
  validationResult: BackupValidationResult;
  fileName: string;
  onConfirmRestore: () => Promise<void>;
  onClose: () => void;
}

export const RestoreBackupModal: React.FC<RestoreBackupModalProps> = ({
  validationResult,
  fileName,
  onConfirmRestore,
  onClose
}) => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { valid, metadata, createdAt, backupVersion, isLegacyFormat } = validationResult;

  const handleRestore = async () => {
    try {
      setIsRestoring(true);
      setErrorMessage(null);
      await onConfirmRestore();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao restaurar banco.';
      setErrorMessage(msg);
      setIsRestoring(false);
    }
  };

  const formattedDate = createdAt ? new Date(createdAt).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : 'Data desconhecida';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121212] border border-[#27272a] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-[#27272a] flex items-center justify-between bg-[#18181B]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              valid ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-[#F3F4F6] border border-[#E5E7EB] text-[#374151]'
            }`}>
              {valid ? <Database className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-black font-display text-white tracking-tight">
                {valid ? 'Backup Encontrado' : 'Arquivo Inválido'}
              </h2>
              <p className="text-xs text-[#4B5563] truncate max-w-[260px] sm:max-w-xs">
                {fileName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isRestoring}
            className="w-8 h-8 rounded-lg bg-[#27272a]/60 hover:bg-[#27272a] text-[#4B5563] hover:text-white flex items-center justify-center transition-colors disabled:opacity-80"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          
          {!valid ? (
            /* Invalid State */
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-[#374151]">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Este arquivo não é um backup válido do TFIVE PRO</span>
                </div>
                <p className="text-white">
                  {validationResult.errorMessage || 'A assinatura ou estrutura de dados do arquivo é incompatível.'}
                </p>
              </div>

              <p className="text-xs text-[#4B5563] text-center">
                Seus dados atuais permanecem <strong className="text-white">100% intactos</strong> e nenhuma alteração foi realizada.
              </p>
            </div>
          ) : (
            /* Valid Preview State */
            <div className="space-y-4">
              
              {/* Date & Version */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#050505] border border-[#27272a] text-xs">
                <div className="flex items-center gap-2 text-[#4B5563]">
                  <Clock className="w-4 h-4 text-[#374151]" />
                  <span>Criado em: <strong className="text-white">{formattedDate}</strong></span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#18181B] border border-[#27272a] text-[#4B5563]">
                  v{backupVersion || 2} {isLegacyFormat ? '(Legado)' : ''}
                </span>
              </div>

              {/* Counts Grid */}
              {metadata && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#050505] border border-[#27272a] text-center">
                    <Users className="w-4 h-4 text-[#374151] mx-auto mb-1" />
                    <span className="block text-base font-black text-white">{metadata.studentsCount}</span>
                    <span className="text-[10px] text-[#71717A] uppercase font-bold">Alunos</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#050505] border border-[#27272a] text-center">
                    <Dumbbell className="w-4 h-4 text-[#374151] mx-auto mb-1" />
                    <span className="block text-base font-black text-white">{metadata.sessionsCount}</span>
                    <span className="text-[10px] text-[#71717A] uppercase font-bold">Treinos</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#050505] border border-[#27272a] text-center">
                    <FileText className="w-4 h-4 text-[#374151] mx-auto mb-1" />
                    <span className="block text-base font-black text-white">{metadata.assessmentsCount}</span>
                    <span className="text-[10px] text-[#71717A] uppercase font-bold">Avaliações</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#050505] border border-[#27272a] text-center">
                    <Layers className="w-4 h-4 text-[#374151] mx-auto mb-1" />
                    <span className="block text-base font-black text-white">{metadata.routinesCount}</span>
                    <span className="text-[10px] text-[#71717A] uppercase font-bold">Rotinas</span>
                  </div>
                </div>
              )}

              {/* Detailed items count */}
              {metadata && (
                <div className="p-3 rounded-xl bg-[#050505] border border-[#27272a] text-xs space-y-1.5">
                  <div className="flex justify-between text-[#4B5563]">
                    <span>Séries executadas no histórico:</span>
                    <strong className="text-white font-mono">{metadata.setsCount.toLocaleString('pt-BR')}</strong>
                  </div>
                  <div className="flex justify-between text-[#4B5563]">
                    <span>Fotos (perfil, avaliações e galeria):</span>
                    <strong className="text-white font-mono">{metadata.photosCount}</strong>
                  </div>
                  <div className="flex justify-between text-[#4B5563]">
                    <span>Agendamentos da agenda:</span>
                    <strong className="text-white font-mono">{metadata.scheduleCount}</strong>
                  </div>
                  {metadata.activeWorkoutsCount > 0 && (
                    <div className="flex justify-between text-[#374151] font-bold">
                      <span>Treinos em andamento preservados:</span>
                      <strong className="font-mono">{metadata.activeWorkoutsCount}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Warning box */}
              <div className="p-3.5 rounded-xl bg-[#18181B] border border-amber-500/40 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Atenção: Substituição de Dados</span>
                </div>
                <p className="text-[#4B5563] leading-relaxed">
                  A restauração substituirá os dados locais atuais deste dispositivo pelos dados do backup selecionado.
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium pt-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Rollback automático ativo caso ocorra qualquer falha na restauração.</span>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-[#F3F4F6] border border-[#374151]/50 text-xs text-[#374151] font-bold">
                  {errorMessage}
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#27272a] flex items-center justify-between bg-[#18181B]">
          <button
            onClick={onClose}
            disabled={isRestoring}
            className="px-4 py-2.5 rounded-xl border border-[#27272a] text-xs font-bold text-[#4B5563] hover:text-white transition-colors disabled:opacity-80"
          >
            Cancelar
          </button>

          {valid && (
            <button
              onClick={handleRestore}
              disabled={isRestoring}
              className="px-5 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-xs font-bold text-white transition-all shadow-[0_0_15px_rgba(217,4,41,0.4)] flex items-center gap-2 disabled:opacity-80"
            >
              {isRestoring ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>RESTAURANDO BANCO…</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>RESTAURAR ESTE BACKUP</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
