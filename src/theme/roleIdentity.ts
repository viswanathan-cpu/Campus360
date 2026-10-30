import { UserRole } from '../types/campus.ts';

export interface RoleIdentity {
  label: string;
  identity: string;
  primary: string;
  secondary: string;
  glow: string;
  textClass: string;
  borderClass: string;
  bgClass: string;
  buttonClass: string;
  ringClass: string;
}

/** Visual identity only — does not change RBAC or APIs. */
export const ROLE_IDENTITY: Record<UserRole, RoleIdentity> = {
  [UserRole.STUDENT]: {
    label: 'Student',
    identity: 'Blue',
    primary: '#38BDF8',
    secondary: '#0EA5E9',
    glow: 'rgba(56,189,248,0.35)',
    textClass: 'text-sky-300',
    borderClass: 'border-sky-400/40',
    bgClass: 'bg-sky-500/15',
    buttonClass:
      'bg-gradient-to-r from-sky-400 to-cyan-300 text-slate-950 shadow-[0_0_28px_rgba(56,189,248,0.35)]',
    ringClass: 'ring-sky-400/40',
  },
  [UserRole.FACULTY]: {
    label: 'Faculty',
    identity: 'Purple',
    primary: '#A78BFA',
    secondary: '#7C3AED',
    glow: 'rgba(167,139,250,0.35)',
    textClass: 'text-violet-300',
    borderClass: 'border-violet-400/40',
    bgClass: 'bg-violet-500/15',
    buttonClass:
      'bg-gradient-to-r from-violet-400 to-fuchsia-400 text-slate-950 shadow-[0_0_28px_rgba(167,139,250,0.35)]',
    ringClass: 'ring-violet-400/40',
  },
  [UserRole.TECHNICIAN]: {
    label: 'Maintenance',
    identity: 'Orange',
    primary: '#FB923C',
    secondary: '#EA580C',
    glow: 'rgba(251,146,60,0.38)',
    textClass: 'text-orange-300',
    borderClass: 'border-orange-400/40',
    bgClass: 'bg-orange-500/15',
    buttonClass:
      'bg-gradient-to-r from-orange-400 to-amber-300 text-slate-950 shadow-[0_0_28px_rgba(251,146,60,0.38)]',
    ringClass: 'ring-orange-400/40',
  },
  [UserRole.PROCUREMENT_APPROVER]: {
    label: 'Security',
    identity: 'Red',
    primary: '#F43F5E',
    secondary: '#BE123C',
    glow: 'rgba(244,63,94,0.38)',
    textClass: 'text-rose-300',
    borderClass: 'border-rose-400/45',
    bgClass: 'bg-rose-500/15',
    buttonClass:
      'bg-gradient-to-r from-rose-500 to-red-400 text-white shadow-[0_0_28px_rgba(244,63,94,0.38)]',
    ringClass: 'ring-rose-400/40',
  },
  [UserRole.FACILITIES_ADMIN]: {
    label: 'Admin',
    identity: 'Gold',
    primary: '#FBBF24',
    secondary: '#D97706',
    glow: 'rgba(251,191,36,0.38)',
    textClass: 'text-amber-300',
    borderClass: 'border-amber-400/45',
    bgClass: 'bg-amber-500/15',
    buttonClass:
      'bg-gradient-to-r from-amber-300 to-yellow-200 text-slate-950 shadow-[0_0_28px_rgba(251,191,36,0.4)]',
    ringClass: 'ring-amber-400/40',
  },
  [UserRole.DEPARTMENT_MANAGER]: {
    label: 'HOD',
    identity: 'Green',
    primary: '#34D399',
    secondary: '#059669',
    glow: 'rgba(52,211,153,0.35)',
    textClass: 'text-emerald-300',
    borderClass: 'border-emerald-400/40',
    bgClass: 'bg-emerald-500/15',
    buttonClass:
      'bg-gradient-to-r from-emerald-400 to-teal-300 text-slate-950 shadow-[0_0_28px_rgba(52,211,153,0.35)]',
    ringClass: 'ring-emerald-400/40',
  },
  [UserRole.SYSTEM_ADMIN]: {
    label: 'Emergency',
    identity: 'Crimson',
    primary: '#E11D48',
    secondary: '#9F1239',
    glow: 'rgba(225,29,72,0.42)',
    textClass: 'text-rose-300',
    borderClass: 'border-rose-500/50',
    bgClass: 'bg-rose-600/20',
    buttonClass:
      'bg-gradient-to-r from-rose-600 to-red-500 text-white shadow-[0_0_32px_rgba(225,29,72,0.45)]',
    ringClass: 'ring-rose-500/50',
  },
};
