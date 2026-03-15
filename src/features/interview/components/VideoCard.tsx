import React from 'react';
import type { VideoCardProps } from '../types';

export const VideoCard: React.FC<VideoCardProps> = ({
  children, isActive, activeColor, ringClass,
}) => (
  <div className={`relative rounded-3xl overflow-hidden bg-white card-hover ${isActive ? ringClass : ''}`}
    style={{
      aspectRatio: '4/3',
      border: `2px solid ${isActive ? activeColor : 'var(--border)'}`,
      boxShadow: isActive
        ? `0 0 0 4px ${activeColor}22, var(--shadow-lg)`
        : 'var(--shadow)',
      transition: 'border-color .4s ease, box-shadow .4s ease',
    }}>
    {children}
  </div>
);