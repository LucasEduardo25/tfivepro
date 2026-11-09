import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { Student } from '../../types';

interface StudentAvatarProps {
  name?: string;
  photo?: string;
  student?: Student | { name?: string; photo?: string } | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const StudentAvatar: React.FC<StudentAvatarProps> = ({
  name: directName,
  photo: directPhoto,
  student,
  size = 'md',
  className = ''
}) => {
  const name = directName || student?.name || 'Aluno';
  const photo = directPhoto || student?.photo;
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [photo]);

  // Extract initials (up to 2 letters)
  const getInitials = (fullName: string) => {
    if (!fullName) return 'A';
    const parts = fullName.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const sizeClasses = {
    xs: 'w-7 h-7 text-[10px] rounded-lg',
    sm: 'w-9 h-9 text-xs rounded-xl',
    md: 'w-11 h-11 text-sm rounded-xl',
    lg: 'w-14 h-14 text-base rounded-2xl',
    xl: 'w-20 h-20 text-xl rounded-2xl'
  };

  const iconSizes = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  const hasValidPhoto = Boolean(photo && photo.trim().length > 0 && !imgError && !photo.includes('unsplash.com'));

  if (hasValidPhoto) {
    return (
      <img
        src={photo}
        alt={name || 'Aluno'}
        onError={() => setImgError(true)}
        className={`${sizeClasses[size]} object-cover border border-white/10 shrink-0 ${className}`}
      />
    );
  }

  // Fallback Monogram Avatar
  return (
    <div
      className={`${sizeClasses[size]} bg-[#121212] border border-[#E5E7EB] text-white font-bold font-display flex items-center justify-center shrink-0 select-none shadow-[0_2px_8px_rgba(0,0,0,0.4)] ${className}`}
      title={name}
    >
      {name ? (
        <span className="tracking-tighter text-[#374151]">{getInitials(name)}</span>
      ) : (
        <User className={`${iconSizes[size]} text-[#4B5563]`} />
      )}
    </div>
  );
};

