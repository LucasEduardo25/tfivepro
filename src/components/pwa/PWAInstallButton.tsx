/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TFIVE PRO — BOTÃO DE INSTALAÇÃO PWA
 * Oferece gatilho nativo para Android/Desktop e modal guiado para iPad/iPhone Safari.
 */

import React, { useState } from 'react';
import { Download, Share, PlusSquare, X, CheckCircle2, Tablet } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'navbar' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);

  // Se já estiver instalado em modo standalone nativo, oculta o botão
  if (isInstalled) {
    if (variant === 'card') {
      return (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>TFIVE PRO instalado com sucesso em Modo Standalone.</span>
        </div>
      );
    }
    return null;
  }

  // Fluxo 1: Android (Chrome, Samsung Internet, Edge) & Desktop
  if (isInstallable) {
    if (variant === 'card') {
      return (
        <div className="p-4 bg-[#18181B] border border-[#27272A] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]">
              <Tablet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-tight">Instalar TFIVE PRO no Dispositivo</h4>
              <p className="text-xs text-[#4B5563]">Acesso rápido em tela cheia com alta taxa de resposta para treinos no tablet.</p>
            </div>
          </div>
          <button
            onClick={install}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Instalar App</span>
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={install}
        title="Instalar TFIVE PRO no Tablet / Celular"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F3F4F6] border border-[#D1D5DB] text-[#374151] hover:bg-[#1F2937] hover:text-white text-[11px] font-bold tracking-tight transition-all select-none cursor-pointer"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden md:inline">Instalar App</span>
      </button>
    );
  }

  // Fluxo 2: iOS Safari (WebKit não dispara beforeinstallprompt automaticamente)
  if (isIOS) {
    return (
      <>
        {variant === 'card' ? (
          <div className="p-4 bg-[#18181B] border border-[#27272A] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]">
                <Tablet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-tight">Instalar no iPad / iPhone</h4>
                <p className="text-xs text-[#4B5563]">Guia de fixação na tela de início via Safari.</p>
              </div>
            </div>
            <button
              onClick={() => setShowIOSModal(true)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Share className="w-4 h-4" />
              <span>Ver Instruções</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowIOSModal(true)}
            title="Instalar no iPad / iPhone (Safari)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 text-[11px] font-bold tracking-tight transition-all select-none cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">Instalar PWA</span>
          </button>
        )}

        {showIOSModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-[#121212] border border-[#27272A] rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
                <div className="flex items-center gap-2">
                  <Tablet className="w-5 h-5 text-[#374151]" />
                  <h3 className="text-base font-bold text-white uppercase tracking-tight">
                    Instalar no iPad / iPhone
                  </h3>
                </div>
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="p-1 rounded-lg text-zinc-600 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-zinc-300">
                <p className="text-zinc-600">
                  Para utilizar o TFIVE PRO em tela cheia como aplicativo no iOS/iPadOS Safari:
                </p>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-black/40 border border-white/5">
                  <div className="p-1 rounded bg-[#F3F4F6] text-[#374151] mt-0.5">
                    <Share className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-white block">1. Toque em Compartilhar</strong>
                    <span>Localizado na barra inferior ou superior do navegador Safari.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-black/40 border border-white/5">
                  <div className="p-1 rounded bg-emerald-500/20 text-emerald-400 mt-0.5">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-white block">2. Adicionar à Tela de Início</strong>
                    <span>Role a lista para baixo e selecione a opção com o ícone "+".</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSModal(false)}
                className="w-full py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
