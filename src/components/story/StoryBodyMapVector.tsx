import React, { useMemo } from 'react';
import { BODY_REGIONS, BodyRegionId, MuscleIntensity } from '../common/BodyMap/bodyMapTypes';
import { MaleBodySvg } from '../common/BodyMap/MaleBodySvg';
import { FemaleBodySvg } from '../common/BodyMap/FemaleBodySvg';

export interface StoryBodyMapVectorProps {
  intensities?: Partial<Record<BodyRegionId, MuscleIntensity>>;
  session?: unknown;
  exercises?: unknown[];
  sets?: unknown[];
  exerciseBank?: unknown[];
  theme?: 'light' | 'dark' | 'graphite' | 'transparent-light' | 'transparent-dark';
  className?: string;
  showLabels?: boolean;
  view?: 'both' | 'front' | 'back';
  sex?: 'MALE' | 'FEMALE';
}

export const StoryBodyMapVector: React.FC<StoryBodyMapVectorProps> = ({
  intensities = {},
  className = '',
  showLabels = true,
  view = 'both',
  sex = 'MALE'
}) => {
  const completeIntensities = useMemo<Record<BodyRegionId, MuscleIntensity>>(() => {
    const result = {} as Record<BodyRegionId, MuscleIntensity>;
    (Object.keys(BODY_REGIONS) as BodyRegionId[]).forEach(region => {
      result[region] = intensities[region] || 'none';
    });
    return result;
  }, [intensities]);

  const trainedGroups = useMemo(() => {
    const primary: string[] = [];
    const secondary: string[] = [];
    (Object.keys(BODY_REGIONS) as BodyRegionId[]).forEach(region => {
      const intensity = completeIntensities[region];
      if (intensity === 'primary') primary.push(BODY_REGIONS[region].label);
      if (intensity === 'secondary') secondary.push(BODY_REGIONS[region].label);
    });
    return { primary, secondary };
  }, [completeIntensities]);

  const BodySvg = sex === 'FEMALE' ? FemaleBodySvg : MaleBodySvg;

  return (
    <div className={`w-full flex flex-col items-center justify-center gap-6 bg-transparent ${className}`}>
      <div className="w-full flex items-start justify-center gap-3 sm:gap-8 bg-transparent">
        {(view === 'both' || view === 'front') && (
          <div className="flex-1 min-w-0 max-w-[440px] flex justify-center bg-transparent">
            <BodySvg intensities={completeIntensities} view="front" className="w-full" />
          </div>
        )}
        {(view === 'both' || view === 'back') && (
          <div className="flex-1 min-w-0 max-w-[440px] flex justify-center bg-transparent">
            <BodySvg intensities={completeIntensities} view="back" className="w-full" />
          </div>
        )}
      </div>
      {showLabels && (trainedGroups.primary.length > 0 || trainedGroups.secondary.length > 0) && (
        <div className="w-full flex flex-col gap-3 text-center bg-transparent">
          {trainedGroups.primary.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[17px] text-zinc-100">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-white" />
              <span className="font-semibold">Principais:</span>
              <span>{trainedGroups.primary.join(' · ')}</span>
            </div>
          )}
          {trainedGroups.secondary.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[15px] text-zinc-400">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-zinc-500" />
              <span>Secundários:</span>
              <span>{trainedGroups.secondary.join(' · ')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
