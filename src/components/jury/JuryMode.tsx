import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Sparkles } from 'lucide-react';
import { TwinLayerMode } from '../digital-twin/CampusDigitalTwin.tsx';
import { BuildingData, CampusRoom3D } from '../../types/campus.ts';

export interface JuryDemoControls {
  setActiveLayer: (layer: TwinLayerMode) => void;
  setSelectedBuildingId: (id: string) => void;
  setSelectedRoomId: (id: string | null) => void;
  setSelectedFloor: (floor: number | 'ALL') => void;
  setSelectionScope: (scope: 'BUILDING' | 'FLOOR' | 'ROOM' | 'EQUIPMENT') => void;
  setFocusTrigger: (fn: (n: number) => number) => void;
  setMissionControlOpen: (open: boolean) => void;
  setLightingMode?: (mode: 'day' | 'dusk' | 'night') => void;
  setWeatherMode?: (mode: 'clear' | 'rain') => void;
  setCinematicTour?: (active: boolean) => void;
  showToast: (msg: string) => void;
  buildings: BuildingData[];
  rooms3D: CampusRoom3D[];
}

const STEPS: {
  title: string;
  body: string;
  durationMs: number;
  run: (c: JuryDemoControls) => void;
}[] = [
  {
    title: 'Campus360 Enterprise',
    body: 'AI-powered campus operations and a live digital twin of the entire university.',
    durationMs: 3200,
    run: (c) => {
      c.setCinematicTour?.(true);
      c.setLightingMode?.('dusk');
      c.setActiveLayer('overview');
    },
  },
  {
    title: 'Cinematic Digital Twin',
    body: 'Drone orbit of five smart buildings, roads, people, and live vehicles.',
    durationMs: 3800,
    run: (c) => c.setCinematicTour?.(true),
  },
  {
    title: 'Day Operations',
    body: 'HDR daylight, occupancy, and microgrid solar production come online.',
    durationMs: 2800,
    run: (c) => c.setLightingMode?.('day'),
  },
  {
    title: 'Night Mode',
    body: 'Street lights, glass reflections, and security beacons take over the campus.',
    durationMs: 2800,
    run: (c) => c.setLightingMode?.('night'),
  },
  {
    title: 'Engineering Spire',
    body: 'Camera flies to the Nexus Engineering building. Double-click any structure to focus.',
    durationMs: 3400,
    run: (c) => {
      c.setCinematicTour?.(false);
      const b = c.buildings[0];
      if (b) {
        c.setSelectedBuildingId(b.id);
        c.setSelectionScope('BUILDING');
        c.setFocusTrigger((n) => n + 1);
      }
    },
  },
  {
    title: 'Exploded Floors',
    body: 'Floors separate so operators can inspect labs, classrooms, and corridors in 3D.',
    durationMs: 3200,
    run: (c) => {
      c.setSelectedFloor(2);
      c.setSelectionScope('FLOOR');
      c.setFocusTrigger((n) => n + 1);
    },
  },
  {
    title: 'Occupancy Heatmap',
    body: 'Live student density across lecture halls and study commons.',
    durationMs: 2800,
    run: (c) => c.setActiveLayer('occupancy'),
  },
  {
    title: 'Energy & Microgrid',
    body: 'Power load, solar harvest, and load-shedding overlays on the twin.',
    durationMs: 2800,
    run: (c) => c.setActiveLayer('energy'),
  },
  {
    title: 'HVAC Thermal Layer',
    body: 'Room-level temperature drift and chiller health in real time.',
    durationMs: 2800,
    run: (c) => c.setActiveLayer('hvac'),
  },
  {
    title: 'Fault Detection',
    body: 'AI flags a critical lab. The camera flies to the affected room.',
    durationMs: 3400,
    run: (c) => {
      c.setActiveLayer('maintenance');
      const fault = c.rooms3D.find((r) => r.operationalState === 'NOT_WORKING') || c.rooms3D[0];
      if (fault) {
        c.setSelectedBuildingId(fault.buildingId);
        c.setSelectedRoomId(fault.id);
        c.setSelectionScope('ROOM');
        c.setFocusTrigger((n) => n + 1);
      }
      c.showToast('AI Inspector: harmonic fault detected in lab power bus');
    },
  },
  {
    title: 'Security Perimeter',
    body: 'Zero-trust cameras and access gates light up around the campus ring.',
    durationMs: 2800,
    run: (c) => c.setActiveLayer('security'),
  },
  {
    title: 'Live Mobility',
    body: 'Shuttles, emergency routing, bicycles, and walking students animate on the map.',
    durationMs: 2800,
    run: (c) => {
      c.setActiveLayer('overview');
      c.setCinematicTour?.(true);
    },
  },
  {
    title: 'IoT Mesh',
    body: 'Thousands of sensors stream occupancy, AQI, power, and door events.',
    durationMs: 2600,
    run: (c) => c.setMissionControlOpen(true),
  },
  {
    title: 'Incident Generated',
    body: 'A weather-driven HVAC alert is raised automatically for the jury.',
    durationMs: 3000,
    run: (c) => {
      c.setWeatherMode?.('rain');
      c.showToast('Alert: thermal drift + rain load on Science Atrium roof');
    },
  },
  {
    title: 'Dispatch',
    body: 'Maintenance is auto-assigned. ETA 9 minutes. Work order accepted.',
    durationMs: 2800,
    run: (c) => {
      c.setActiveLayer('maintenance');
      c.setMissionControlOpen(false);
      c.showToast('Dispatched: Rahul Verma · Lab systems · 9 min ETA');
    },
  },
  {
    title: 'Repair in Progress',
    body: 'Progress 35% → 75%. Subsystems recalibrate inside the twin.',
    durationMs: 3000,
    run: (c) => c.showToast('Repair progress 75% · calibrating chilled-water loop'),
  },
  {
    title: 'Problem Solved',
    body: 'Room returns to healthy green. Occupancy and classes resume.',
    durationMs: 2800,
    run: (c) => {
      c.setWeatherMode?.('clear');
      c.setLightingMode?.('dusk');
      c.showToast('Room restored · Green LED · classes resumed');
    },
  },
  {
    title: 'Campus Health 99.2%',
    body: 'Mission Control confirms the entire estate is within SLA.',
    durationMs: 2800,
    run: (c) => {
      c.setCinematicTour?.(false);
      c.setActiveLayer('overview');
      c.setSelectedFloor('ALL');
      c.setSelectionScope('BUILDING');
    },
  },
  {
    title: 'Campus360 Successfully Managed Entire Campus',
    body: 'One platform. Seven roles. A living digital twin judged at enterprise grade.',
    durationMs: 5200,
    run: () => undefined,
  },
];

export const JuryMode: React.FC<{
  controls: JuryDemoControls;
  autoStart?: boolean;
}> = ({ controls, autoStart = false }) => {
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);

  const stop = useCallback(() => {
    setRunning(false);
    setFinished(false);
    controls.setCinematicTour?.(false);
    controls.setWeatherMode?.('clear');
  }, [controls]);

  const start = useCallback(() => {
    setFinished(false);
    setStep(0);
    setRunning(true);
    STEPS[0].run(controls);
  }, [controls]);

  useEffect(() => {
    if (autoStart) {
      const t = window.setTimeout(start, 600);
      return () => window.clearTimeout(t);
    }
  }, [autoStart, start]);

  useEffect(() => {
    if (!running) return;
    const current = STEPS[step];
    const timer = window.setTimeout(() => {
      if (step >= STEPS.length - 1) {
        setRunning(false);
        setFinished(true);
        return;
      }
      const next = step + 1;
      setStep(next);
      STEPS[next].run(controls);
    }, current.durationMs);
    return () => window.clearTimeout(timer);
  }, [running, step, controls]);

  const current = STEPS[step];

  return (
    <>
      <button
        type="button"
        onClick={running ? stop : start}
        className="premium-btn px-5 py-2.5 rounded-[22px] text-[18px] font-semibold bg-gradient-to-r from-cyan-300 via-sky-400 to-amber-300 text-slate-950 shadow-[0_0_32px_rgba(56,189,248,0.4)] whitespace-nowrap"
      >
        {running ? (
          <span className="inline-flex items-center gap-2">
            <Square className="w-4 h-4" /> Stop Demo
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <Play className="w-4 h-4" /> Start Demo
          </span>
        )}
      </button>

      <AnimatePresence>
        {running && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[80] w-[min(720px,92vw)] glass-panel rounded-[22px] p-6 pointer-events-none"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm tracking-[0.2em] uppercase text-cyan-300">
                Jury Mode · Step {step + 1} / {STEPS.length}
              </span>
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <h3 className="mt-2 font-display text-[28px] leading-tight text-white">{current.title}</h3>
            <p className="mt-2 text-[20px] text-slate-300 leading-relaxed">{current.body}</p>
            <div className="mt-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                key={step}
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: current.durationMs / 1000, ease: 'linear' }}
                className="h-full bg-gradient-to-r from-cyan-400 to-amber-300"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {finished && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-[#081120]/70 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-panel rounded-[22px] p-10 max-w-2xl mx-6 text-center"
            >
              <p className="text-sm tracking-[0.28em] uppercase text-amber-300">Enterprise Outcome</p>
              <h2 className="mt-3 font-display text-[40px] leading-tight text-white">
                Campus360 Successfully Managed Entire Campus
              </h2>
              <p className="mt-4 text-[20px] text-slate-300">
                Digital twin, AI triage, security, energy, and people — one cinematic operating system.
              </p>
              <button
                type="button"
                onClick={() => setFinished(false)}
                className="mt-8 premium-btn px-8 py-3 rounded-[22px] text-[18px] font-semibold bg-cyan-400 text-slate-950"
              >
                Continue Exploring
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
