import React, { useMemo } from 'react';
import { MuscleMap } from '@musclemap/react';
import type { MuscleMapValues, MuscleGroup } from '@musclemap/core';
import maleFront from '@musclemap/assets/bodies/male-front.webp?inline';
import maleBack from '@musclemap/assets/bodies/male-back.webp?inline';
import { BodyRegionId, MuscleIntensity } from '../common/BodyMap/bodyMapTypes';

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
}

const REGION_TO_GROUPS: Partial<Record<BodyRegionId, MuscleGroup[]>> = {
  chest: ['CHEST'],
  frontShoulders: ['SHOULDERS_FRONT'],
  sideShoulders: ['SHOULDERS_SIDE'],
  rearShoulders: ['SHOULDERS_REAR'],
  biceps: ['BICEPS'],
  triceps: ['TRICEPS'],
  forearms: ['FOREARMS'],
  abs: ['CORE'],
  obliques: ['OBLIQUES'],
  traps: ['TRAPEZIUS'],
  upperBack: ['BACK_UPPER', 'RHOMBOIDS'],
  lats: ['LATS'],
  lowerBack: ['BACK_LOWER'],
  glutes: ['GLUTES'],
  quadriceps: ['QUADS'],
  hamstrings: ['HAMSTRINGS'],
  adductors: ['ADDUCTORS'],
  calves: ['CALVES']
};

const GROUP_LABELS: Partial<Record<MuscleGroup, string>> = {
  CHEST: 'Peitoral',
  BACK_UPPER: 'Costas superiores',
  BACK_LOWER: 'Lombar',
  TRAPEZIUS: 'Trapézio',
  RHOMBOIDS: 'Romboides',
  LATS: 'Grande dorsal',
  SHOULDERS_FRONT: 'Deltoide anterior',
  SHOULDERS_SIDE: 'Deltoide lateral',
  SHOULDERS_REAR: 'Deltoide posterior',
  BICEPS: 'Bíceps',
  TRICEPS: 'Tríceps',
  FOREARMS: 'Antebraços',
  CORE: 'Abdômen',
  OBLIQUES: 'Oblíquos',
  GLUTES: 'Glúteos',
  QUADS: 'Quadríceps',
  HAMSTRINGS: 'Posterior de coxa',
  CALVES: 'Panturrilhas',
  HIP_FLEXORS: 'Flexores do quadril',
  ADDUCTORS: 'Adutores',
  ABDUCTORS: 'Abdutores'
};

export const StoryBodyMapVector: React.FC<StoryBodyMapVectorProps> = ({
  intensities = {},
  className = '',
  showLabels = true,
  view = 'both'
}) => {
  const values = useMemo<MuscleMapValues>(() => {
    // Give every anatomical group an explicit score of 0 so untrained
    // muscles use the neutral monochrome base instead of exposing the
    // original colored body photo beneath the SVG muscle paths.
    const result: MuscleMapValues = {};
    (Object.keys(GROUP_LABELS) as MuscleGroup[]).forEach(group => {
      result[group] = { score: 0 };
    });
    (Object.entries(intensities) as [BodyRegionId, MuscleIntensity][]).forEach(([region, intensity]) => {
      const groups = REGION_TO_GROUPS[region] || [];
      groups.forEach(group => {
        if (intensity === 'primary') result[group] = { score: 100 };
        if (intensity === 'secondary') result[group] = { score: 45 };
      });
    });
    return result;
  }, [intensities]);

  const trainedGroups = useMemo(() => {
    const primary: string[] = [];
    const secondary: string[] = [];
    (Object.entries(intensities) as [BodyRegionId, MuscleIntensity][]).forEach(([region, intensity]) => {
      const names = (REGION_TO_GROUPS[region] || []).map(group => GROUP_LABELS[group]).filter(Boolean) as string[];
      if (intensity === 'primary') primary.push(...names);
      if (intensity === 'secondary') secondary.push(...names);
    });
    return {
      primary: [...new Set(primary)],
      secondary: [...new Set(secondary)]
    };
  }, [intensities]);

  const selectedView = view === 'front' ? 'FRONT' : view === 'back' ? 'BACK' : 'BOTH';

  return (
    <div className={`w-full flex flex-col items-center ${className}`}>
      {showLabels && (
        <div className="w-full flex justify-center gap-12 mb-4 text-[15px] font-semibold tracking-[0.18em] text-zinc-500">
          {view !== 'back' && <span>FRENTE</span>}
          {view !== 'front' && <span>COSTAS</span>}
        </div>
      )}
      <MuscleMap
        values={values}
        view={selectedView}
        sex="MALE"
        colorModel="LOAD"
        monochromeColor="#3185E8"
        monochromeBaseColor="#D1D5DB"
        backgroundImageFront={maleFront}
        backgroundImageBack={maleBack}
        backgroundGrayscale
        backgroundBrightness={1.08}
        backgroundOpacity={0.72}
        figureWidth={view === 'both' ? 380 : 520}
        glow={false}
        showLegend={false}
        tooltipFields={[]}
        className="w-full"
        style={{ gap: 0, color: '#252A31' }}
        labels={GROUP_LABELS}
      />
      {(trainedGroups.primary.length > 0 || trainedGroups.secondary.length > 0) && (
        <div className="w-full mt-5 flex flex-col gap-3 text-center">
          {trainedGroups.primary.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[17px] text-zinc-800">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#3185E8]" />
              <span className="font-semibold">Principais:</span>
              <span>{trainedGroups.primary.join(' · ')}</span>
            </div>
          )}
          {trainedGroups.secondary.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[15px] text-zinc-500">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-zinc-300" />
              <span>Secundários:</span>
              <span>{trainedGroups.secondary.join(' · ')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
