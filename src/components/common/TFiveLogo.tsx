import React from 'react';

interface TFiveLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'compact' | 'badge';
  className?: string;
  theme?: 'light' | 'dark'; // 'light' means on light background (#1F2937 text), 'dark' means on dark/graphite (#FFFFFF text)
  showProBadge?: boolean;
}

export const TFiveLogo: React.FC<TFiveLogoProps> = ({
  size = 'md',
  className = '',
  theme = 'light',
  showProBadge = true
}) => {
  const sizeClasses = {
    sm: {
      container: 'text-sm tracking-tight',
      tfive: 'font-black text-sm',
      pro: 'font-normal text-xs ml-1.5'
    },
    md: {
      container: 'text-lg tracking-tight',
      tfive: 'font-black text-lg',
      pro: 'font-normal text-sm ml-2'
    },
    lg: {
      container: 'text-2xl tracking-tight',
      tfive: 'font-black text-2xl',
      pro: 'font-light text-lg ml-2.5'
    },
    xl: {
      container: 'text-3xl sm:text-4xl tracking-tight',
      tfive: 'font-black text-3xl sm:text-4xl',
      pro: 'font-light text-2xl sm:text-3xl ml-3'
    }
  }[size];

  const colorClasses = theme === 'dark'
    ? { tfive: 'text-white', pro: 'text-[#4B5563]' }
    : { tfive: 'text-[#1F2937]', pro: 'text-[#4B5563]' };

  return (
    <div className={`tfive-logo inline-flex items-baseline select-none ${sizeClasses.container} ${className}`}>
      <span className={`${sizeClasses.tfive} ${colorClasses.tfive} uppercase tracking-wider`}>
        TFIVE
      </span>
      <span className={`${sizeClasses.pro} ${colorClasses.pro} uppercase tracking-widest`}>
        PRO
      </span>
    </div>
  );
};
