import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

export const GlassCard: React.FC<{
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
}> = ({ className = '', children, hover = true }) => (
  <motion.div
    whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
    transition={{ type: 'spring', stiffness: 260, damping: 22 }}
    className={`glass-panel rounded-[22px] ${className}`}
  >
    {children}
  </motion.div>
);

export const AnimatedCounter: React.FC<{
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}> = ({ value, decimals = 0, suffix = '', className = '' }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = display;
    const diff = value - start;
    const t0 = performance.now();
    const duration = 900;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(start + diff * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span className={`font-display tabular-nums ${className}`}>
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
};

export const KpiCard: React.FC<{
  label: string;
  value: number;
  suffix?: string;
  hint?: string;
  accent?: string;
  decimals?: number;
}> = ({ label, value, suffix = '', hint, accent = 'text-cyan-300', decimals = 0 }) => (
  <GlassCard className="p-5 text-left">
    <span className="text-sm font-medium tracking-[0.18em] uppercase text-slate-400">{label}</span>
    <div className={`mt-2 text-[32px] leading-none font-semibold ${accent}`}>
      <AnimatedCounter value={value} decimals={decimals} suffix={suffix} />
    </div>
    {hint && <p className="mt-2 text-base text-slate-400">{hint}</p>}
  </GlassCard>
);
