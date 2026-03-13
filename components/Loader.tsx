
import React from 'react';

interface LoaderProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Loader: React.FC<LoaderProps> = ({ label = 'Caricamento...', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className={`${sizeClasses[size]} border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin`} />
      {label && <p className="text-sm text-slate-400 animate-pulse font-medium">{label}</p>}
    </div>
  );
};
