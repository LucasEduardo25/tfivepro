/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TFiveLogo } from './TFiveLogo';

interface StartupLoadingScreenProps {
  currentStepMessage?: string;
  stepNumber?: number;
  totalSteps?: number;
}

export const StartupLoadingScreen: React.FC<StartupLoadingScreenProps> = ({
  currentStepMessage = 'Carregando seus dados...',
  stepNumber = 1,
  totalSteps = 5
}) => {
  return (
    <div className="min-h-screen w-full bg-[#050505] text-white flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
      
      {/* Central Brand Lockup */}
      <div className="flex flex-col items-center justify-center space-y-6 max-w-sm w-full text-center z-10">
        <div className="relative">
          <TFiveLogo size="xl" showProBadge={true} />
          {/* Subtle pulse ring */}
          <div className="absolute -inset-4 rounded-3xl bg-[#374151]/5 animate-pulse -z-10" />
        </div>

        {/* Status Message */}
        <div className="space-y-2 pt-2">
          <p className="text-sm font-black font-display uppercase tracking-widest text-white">
            {currentStepMessage}
          </p>
          <p className="text-xs text-[#71717A] font-mono-nums">
            Etapa {stepNumber} de {totalSteps} • Inicialização segura
          </p>
        </div>

        {/* Discrete High-Precision Progress Bar */}
        <div className="w-48 bg-[#18181B] h-1.5 rounded-full overflow-hidden border border-[#27272A]">
          <div 
            className="bg-[#374151] h-full transition-all duration-300 ease-out"
            style={{ width: `${Math.max(10, Math.min(100, (stepNumber / totalSteps) * 100))}%` }}
          />
        </div>

        {/* Local-First Assurance */}
        <div className="pt-8">
          <span className="text-[11px] text-[#52525B] tracking-wide block">
            Armazenamento 100% local e seguro no seu dispositivo
          </span>
        </div>
      </div>
    </div>
  );
};
