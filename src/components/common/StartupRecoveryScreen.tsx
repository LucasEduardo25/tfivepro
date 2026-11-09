/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  Download, 
  ShieldCheck, 
  Activity, 
  Copy, 
  Check, 
  ShieldAlert, 
  HardDrive
} from 'lucide-react';
import { TFiveLogo } from './TFiveLogo';
import { exportEmergencyBackup } from '../../services/emergencyBackup';
import { runDiagnosticReport, formatDiagnosticAsText, DiagnosticData } from '../../services/diagnosticService';

interface StartupRecoveryScreenProps {
  errorMessage?: string;
  onRetry?: () => void;
  onEnterSafeMode?: () => void;
  isSafeModeActive?: boolean;
}

export const StartupRecoveryScreen: React.FC<StartupRecoveryScreenProps> = ({
  errorMessage,
  onRetry,
  onEnterSafeMode,
  isSafeModeActive = false
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticData | null>(null);
  const [isLoadingDiag, setIsLoadingDiag] = useState(false);
  const [hasCopiedDiag, setHasCopiedDiag] = useState(false);

  const handleExportEmergencyBackup = async () => {
    try {
      setIsExporting(true);
      setExportMessage(null);
      const res = await exportEmergencyBackup();
      if (res.success) {
        setExportMessage({
          type: 'success',
          text: `Backup baixado: ${res.filename} (${res.sizeFormatted})`
        });
      } else {
        setExportMessage({
          type: 'error',
          text: `Erro ao exportar: ${res.error || 'Falha desconhecida'}`
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na exportação.';
      setExportMessage({ type: 'error', text: msg });
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenDiagnostic = async () => {
    setIsDiagnosticOpen(true);
    setIsLoadingDiag(true);
    try {
      const diag = await runDiagnosticReport();
      setDiagnosticData(diag);
    } catch {
      // Ignore
    } finally {
      setIsLoadingDiag(false);
    }
  };

  const handleCopyDiagnostic = async () => {
    if (!diagnosticData) return;
    try {
      const text = formatDiagnosticAsText(diagnosticData);
      await navigator.clipboard.writeText(text);
      setHasCopiedDiag(true);
      setTimeout(() => setHasCopiedDiag(false), 3000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] text-white flex flex-col items-center justify-center p-4 sm:p-6 select-none relative">
      
      <div className="max-w-md w-full bg-[#121212] border border-[#27272A] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative z-10">
        
        {/* Header Lockup */}
        <div className="flex items-center justify-between border-b border-[#27272A] pb-4">
          <TFiveLogo size="md" showProBadge={true} />
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] text-[#374151] text-[11px] font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Recuperação Segura</span>
          </div>
        </div>

        {/* Title & Explicit Non-Destructive Assurance */}
        <div className="space-y-2">
          <h2 className="text-lg sm:text-xl font-black font-display text-white tracking-tight uppercase">
            Não foi possível iniciar o TFIVE PRO
          </h2>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-300 font-medium">
              <span className="font-bold block text-emerald-400">Seus dados locais não serão apagados.</span>
              O sistema protegeu seus alunos, treinos e histórico contra exclusão acidental.
            </div>
          </div>
        </div>

        {/* Error Detail Note (if available) */}
        {errorMessage && (
          <div className="p-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs space-y-1">
            <span className="text-[10px] text-[#71717A] uppercase font-mono tracking-wider font-bold">Detalhe Técnico</span>
            <p className="text-[#D4D4D8] font-mono text-[11px] break-words">
              {errorMessage}
            </p>
          </div>
        )}

        {/* Export Feedback Toast */}
        {exportMessage && (
          <div className={`p-3 rounded-xl border text-xs font-bold ${
            exportMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-[#F3F4F6] border-[#E5E7EB] text-[#374151]'
          }`}>
            {exportMessage.text}
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="space-y-2.5 pt-2">
          
          {/* Action 1: Tentar Novamente */}
          <button
            onClick={() => {
              if (onRetry) {
                onRetry();
              } else {
                window.location.reload();
              }
            }}
            className="w-full py-3 px-4 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-xs active:scale-98"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Tentar Novamente</span>
          </button>

          {/* Action 2: Exportar Backup de Emergência */}
          <button
            onClick={handleExportEmergencyBackup}
            disabled={isExporting}
            className="w-full py-3 px-4 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-80"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{isExporting ? 'Extraindo dados...' : 'Exportar Backup de Emergência'}</span>
          </button>

          {/* Action 3: Abrir em Modo Seguro */}
          {onEnterSafeMode && !isSafeModeActive && (
            <button
              onClick={onEnterSafeMode}
              className="w-full py-2.5 px-4 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#4B5563] hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Abrir em Modo Seguro</span>
            </button>
          )}

          {/* Action 4: Diagnóstico do Aplicativo */}
          <button
            onClick={handleOpenDiagnostic}
            className="w-full py-2.5 px-4 rounded-xl bg-transparent hover:bg-[#18181B] border border-transparent hover:border-[#27272A] text-[#71717A] hover:text-white font-medium text-xs flex items-center justify-center gap-2 transition-all"
          >
            <Activity className="w-4 h-4" />
            <span>Diagnóstico do Aplicativo</span>
          </button>
        </div>

      </div>

      {/* Diagnostic Modal */}
      {isDiagnosticOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#27272A] rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#374151]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Diagnóstico do Sistema
                </h3>
              </div>
              <button
                onClick={() => setIsDiagnosticOpen(false)}
                className="text-xs text-[#71717A] hover:text-white px-2 py-1"
              >
                Fechar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 text-xs pr-1">
              {isLoadingDiag ? (
                <div className="py-8 text-center text-[#71717A]">
                  Executando testes no dispositivo...
                </div>
              ) : diagnosticData ? (
                <>
                  <div className="bg-[#18181B] p-3 rounded-xl space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[#71717A]">Versão TFIVE:</span>
                      <span className="text-white font-bold">{diagnosticData.appVersion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#71717A]">Banco Local:</span>
                      <span className="text-white">{diagnosticData.dbName} (v{diagnosticData.dbVersion})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#71717A]">IndexedDB Acessível:</span>
                      <span className={diagnosticData.indexedDB.accessible ? 'text-emerald-400 font-bold' : 'text-[#374151] font-bold'}>
                        {diagnosticData.indexedDB.accessible ? 'SIM' : 'NÃO'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#71717A]">Modo PWA:</span>
                      <span className="text-white">{diagnosticData.environment.isPWA ? 'Instalado (Standalone)' : 'Navegador'}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold text-[#4B5563] mb-1.5 uppercase tracking-wider">
                      Registros Detectados no Banco
                    </h4>
                    <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                      {diagnosticData.indexedDB.storesDetected.map(store => (
                        <div key={store} className="bg-[#18181B] p-2 rounded-lg flex justify-between">
                          <span className="text-[#71717A] truncate">{store}:</span>
                          <span className="text-white font-bold">{diagnosticData.indexedDB.storeCounts[store] ?? 0}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-4 text-center text-[#71717A]">Falha ao coletar diagnóstico.</div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-2 border-t border-[#27272A] flex gap-2">
              <button
                onClick={handleCopyDiagnostic}
                disabled={!diagnosticData}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white font-bold text-xs uppercase flex items-center justify-center gap-2"
              >
                {hasCopiedDiag ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{hasCopiedDiag ? 'Copiado!' : 'Copiar Diagnóstico'}</span>
              </button>
              <button
                onClick={() => setIsDiagnosticOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-white font-bold text-xs uppercase"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
