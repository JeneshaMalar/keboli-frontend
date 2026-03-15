import React from 'react';
import type { WaveBarsProps } from '../types';

export const WaveBars: React.FC<WaveBarsProps> = ({ active, color }) => {
  const anims = ['wave-a', 'wave-c', 'wave-b', 'wave-a', 'wave-c'];
  const delays = [0, .1, .2, .1, 0];
  
  return (
    <div className={`flex items-center gap-[3px] h-5 transition-opacity duration-400 ${active ? 'opacity-100' : 'opacity-0'}`}>
      {anims.map((a, i) => (
        <span key={i} className="w-[3px] rounded-full origin-bottom block" style={{
          height: '18px', backgroundColor: color,
          animation: active ? `${a} .8s ease-in-out ${delays[i]}s infinite` : 'none',
        }} />
      ))}
    </div>
  );
};