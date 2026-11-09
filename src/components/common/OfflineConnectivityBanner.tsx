/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TFIVE PRO — BANNER DE CONECTIVIDADE EM TEMPO REAL
 * Informa com clareza o estado offline para prevenir confirmação falsa de salvamento.
 */

import React, { useState } from 'react';
import { WifiOff, Wifi, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineConnectivityBanner: React.FC = () => {
  const { isOnline, justReconnected, checkConnectivity } = useOnlineStatus();
  const [isChecking, setIsChecking] = useState(false);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      await checkConnectivity();
    } finally {
      setIsChecking(false);
    }
  };

  if (justReconnected) {
    return (
      <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-4 py-2 text-xs text-emerald-300 flex items-center justify-between transition-all duration-300 animate-in fade-in slide-in-from-top">
        <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">
            <strong>Conexão restabelecida:</strong> O TFIVE PRO está 100% sincronizado com a nuvem do Supabase.
          </span>
        </div>
      </div>
    );
  }

  if (isOnline) {
    return null;
  }

  return (
    <div className="bg-[#F3F4F6] border-b border-[#D1D5DB] px-4 py-2.5 text-xs text-rose-200 flex items-center justify-between shadow-lg relative z-50 animate-in fade-in slide-in-from-top">
      <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="p-1 rounded bg-[#E5E7EB] text-rose-400 shrink-0">
            <WifiOff className="w-4 h-4 animate-pulse" />
          </span>
          <div>
            <span className="font-bold text-white tracking-wide uppercase text-[11px] block sm:inline mr-2">
              Sem Conexão com a Internet
            </span>
            <span className="text-rose-300/90 text-xs">
              O TFIVE PRO opera em tempo real com o Supabase. Gravações de treinos e cadastros exigem reconexão para garantir a segurança dos dados.
            </span>
          </div>
        </div>

        <button
          onClick={handleManualCheck}
          disabled={isChecking}
          className="self-end sm:self-center px-3 py-1.5 rounded-lg bg-[#374151] hover:bg-[#1F2937] text-white text-[11px] font-bold tracking-tight transition-all flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer disabled:opacity-80"
        >
          <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
          <span>{isChecking ? 'Testando...' : 'Verificar Conexão'}</span>
        </button>
      </div>
    </div>
  );
};
