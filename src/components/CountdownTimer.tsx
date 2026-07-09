'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  endDate: string;
  label?: string;
  endedLabel?: string;
  compact?: boolean;
  className?: string;
}

export default function CountdownTimer({ endDate, label = 'Voting ends in', endedLabel = 'Election ended', compact = false, className = '' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = new Date(endDate).getTime() - Date.now();

      if (diff <= 0) {
        setEnded(true);
        setTimeLeft(null);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
      setEnded(false);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  if (ended) {
    return (
      <div className={`atc-badge bg-red-100 text-red-700 ${className}`}>
        {endedLabel}
      </div>
    );
  }

  if (!timeLeft) return null;

  if (compact) {
    return (
      <span className={`font-mono font-bold ${className || 'text-atc-primary'}`}>
        {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
        {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm text-slate-600">{label}</span>
      <div className="flex items-center gap-1 font-mono font-bold">
        {timeLeft.days > 0 && (
          <>
            <span className="text-atc-primary text-lg">{timeLeft.days}</span>
            <span className="text-slate-400 text-xs">d</span>
            <span className="text-slate-300 mx-0.5">:</span>
          </>
        )}
        <span className="text-atc-primary text-lg">{String(timeLeft.hours).padStart(2, '0')}</span>
        <span className="text-slate-400 text-xs">h</span>
        <span className="text-slate-300 mx-0.5">:</span>
        <span className="text-atc-primary text-lg">{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className="text-slate-400 text-xs">m</span>
        <span className="text-slate-300 mx-0.5">:</span>
        <span className="text-atc-primary text-lg">{String(timeLeft.seconds).padStart(2, '0')}</span>
        <span className="text-slate-400 text-xs">s</span>
      </div>
    </div>
  );
}
