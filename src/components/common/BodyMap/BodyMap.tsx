import React from 'react';
import { BodyRegionId, MuscleIntensity, BodyViewMode } from './bodyMapTypes';
import { MaleBodySvg } from './MaleBodySvg';
import { FemaleBodySvg } from './FemaleBodySvg';

export interface BodyMapProps {
  gender?: 'male' | 'female';
  intensities?: Partial<Record<BodyRegionId, MuscleIntensity>>;
  viewMode?: BodyViewMode;
  className?: string;
  accentColor?: string;
  showLegend?: boolean;
}

export const BodyMap: React.FC<BodyMapProps> = ({
  gender = 'male',
  intensities = {},
  viewMode = 'both',
  className = '',
  accentColor = '#374151',
  showLegend = true
}) => {
  // Normalize intensities record
  const fullIntensities: Record<BodyRegionId, MuscleIntensity> = {
    chest: intensities.chest || 'none',
    frontShoulders: intensities.frontShoulders || 'none',
    sideShoulders: intensities.sideShoulders || 'none',
    rearShoulders: intensities.rearShoulders || 'none',
    biceps: intensities.biceps || 'none',
    triceps: intensities.triceps || 'none',
    forearms: intensities.forearms || 'none',
    abs: intensities.abs || 'none',
    obliques: intensities.obliques || 'none',
    traps: intensities.traps || 'none',
    upperBack: intensities.upperBack || 'none',
    lats: intensities.lats || 'none',
    lowerBack: intensities.lowerBack || 'none',
    glutes: intensities.glutes || 'none',
    quadriceps: intensities.quadriceps || 'none',
    hamstrings: intensities.hamstrings || 'none',
    adductors: intensities.adductors || 'none',
    calves: intensities.calves || 'none'
  };

  const currentView: 'both' | 'front' | 'back' =
    viewMode === 'front' ? 'front' : viewMode === 'back' ? 'back' : 'both';

  return (
    <div className={`flex flex-col items-center select-none w-full ${className}`}>
      {/* Body Container with Transparent Background */}
      <div className="relative flex items-center justify-center p-2 sm:p-3 w-full">
        {gender === 'female' ? (
          <FemaleBodySvg
            intensities={fullIntensities}
            view={currentView}
            accentColor={accentColor}
          />
        ) : (
          <MaleBodySvg
            intensities={fullIntensities}
            view={currentView}
            accentColor={accentColor}
          />
        )}
      </div>

      {/* Muscle Intensity Legend */}
      {showLegend && (
        <div className="flex items-center justify-center gap-4 sm:gap-6 mt-2 pt-2 border-t border-[#27272A]/70 text-[10px] font-bold uppercase tracking-wider text-[#71717A]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-white shadow-xs inline-block border border-zinc-200" />
            <span className="text-white">Principal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#71717A] border border-[#52525B] inline-block" />
            <span className="text-zinc-300">Secundário</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#202026] border border-[#3B3B48] inline-block" />
            <span className="text-zinc-500">Em repouso</span>
          </div>
        </div>
      )}
    </div>
  );
};
