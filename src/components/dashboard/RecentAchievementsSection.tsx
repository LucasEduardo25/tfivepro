import React from 'react';
import { Trophy, TrendingUp, Sparkles } from 'lucide-react';
import { RecentAchievementItem } from '../../utils/dashboardMetrics';

interface RecentAchievementsSectionProps {
  achievements: RecentAchievementItem[];
}

export const RecentAchievementsSection: React.FC<RecentAchievementsSectionProps> = ({
  achievements
}) => {
  if (achievements.length === 0) return null;

  return (
    <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-5 shadow-lg space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#374151]">
          <Trophy className="w-3.5 h-3.5" />
        </div>
        <h2 className="text-xs font-black uppercase tracking-wider text-white">
          Evolução & Recordes Recentes
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {achievements.map((item) => (
          <div
            key={item.id}
            className="p-3.5 rounded-xl bg-[#050505] border border-[#27272a] flex items-center gap-3 relative overflow-hidden"
          >
            <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#374151] shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] uppercase font-bold text-[#374151] tracking-wider truncate">
                {item.studentName}
              </span>
              <span className="block text-xs font-bold text-white truncate">
                {item.exerciseName}
              </span>
              <span className="block text-[11px] font-mono font-bold text-[#4B5563]">
                {item.metricLabel}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
