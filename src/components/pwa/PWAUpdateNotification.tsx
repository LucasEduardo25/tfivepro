/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TFIVE PRO — NOTIFICADOR DE ATUALIZAÇÃO PWA
 * Detecta novas versões em segundo plano e oferece atualização segura sem perda de dados.
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';

export const PWAUpdateNotification: React.FC = () => {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Escuta evento de mudança de controlador para recarregar com novo cache ativo
    const handleControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Checa registro existente do SW
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
        setShowNotification(true);
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setShowNotification(true);
          }
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      setIsUpdating(true);
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  if (!showNotification) {
    return null;
  }

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 max-w-sm w-full bg-[#121212] border border-[#D1D5DB] rounded-2xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.8)] backdrop-blur-md animate-in slide-in-from-bottom-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-[#F3F4F6] text-[#374151] mt-0.5 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Nova Versão Disponível
            </h4>
            <p className="text-[11px] text-[#4B5563] mt-1 leading-snug">
              Uma nova versão otimizada do TFIVE PRO foi carregada. Seus dados no Supabase estão preservados.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowNotification(false)}
          className="p-1 rounded-lg text-[#71717A] hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3.5 flex items-center gap-2">
        <button
          onClick={handleUpdate}
          disabled={isUpdating}
          className="flex-1 py-2 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-80"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
          <span>{isUpdating ? 'Atualizando...' : 'Atualizar Agora'}</span>
        </button>
        <button
          onClick={() => setShowNotification(false)}
          className="px-3 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-zinc-300 text-xs font-semibold tracking-tight transition-all cursor-pointer"
        >
          Mais tarde
        </button>
      </div>
    </div>
  );
};
