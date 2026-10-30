import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext.tsx';
import { UserRole } from '../../types/campus.ts';
import { ROLE_IDENTITY } from '../../theme/roleIdentity.ts';
import { KpiCard } from '../ui/PremiumPrimitives.tsx';
import {
  Lock,
  Mail,
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  GraduationCap,
  BookOpen,
  Wrench,
  Building2,
  Cpu,
  Shield,
  Crown,
  Zap,
  Play,
} from 'lucide-react';

interface PortalThemeConfig {
  role: UserRole;
  shortLabel: string;
  portalName: string;
  dashboardName: string;
  tagline: string;
  subtitle: string;
  defaultEmail: string;
  defaultPassword: string;
  personaName: string;
  personaTitle: string;
  primaryHex: string;
  secondaryHex: string;
  accentText: string;
  accentBorder: string;
  accentBg: string;
  buttonClass: string;
  glowGradient: string;
  particleMode: 'constellation' | 'wave' | 'sparks' | 'grid' | 'orbital' | 'diamonds' | 'shield';
  digitalTwinCapabilities: string[];
  liveMetricLabel: string;
  liveMetricValue: string;
}

const PORTAL_THEMES: Record<UserRole, PortalThemeConfig> = {
  [UserRole.STUDENT]: {
    role: UserRole.STUDENT,
    shortLabel: 'Student',
    portalName: 'Student Portal',
    dashboardName: 'Student Dashboard',
    tagline: 'Smart Study Spaces & Live Room Status',
    subtitle:
      'Enter the shared 3D Campus Digital Twin to inspect live classroom availability, check study commons occupancy, and report room or equipment issues.',
    defaultEmail: 'student@campus360.edu',
    defaultPassword: 'student123',
    personaName: 'Alex Rivera',
    personaTitle: 'Robotics & Autonomous Systems · Class of 2027',
    primaryHex: ROLE_IDENTITY[UserRole.STUDENT].primary,
    secondaryHex: ROLE_IDENTITY[UserRole.STUDENT].secondary,
    accentText: ROLE_IDENTITY[UserRole.STUDENT].textClass,
    accentBorder: ROLE_IDENTITY[UserRole.STUDENT].borderClass,
    accentBg: ROLE_IDENTITY[UserRole.STUDENT].bgClass,
    buttonClass: `${ROLE_IDENTITY[UserRole.STUDENT].buttonClass} hover:brightness-110`,
    glowGradient: 'radial-gradient(circle at 20% 25%, rgba(56, 189, 248, 0.22), transparent 60%)',
    particleMode: 'constellation',
    digitalTwinCapabilities: [
      'Click any 3D room to check live occupancy & Wi-Fi speed',
      'Raise classroom or lab complaints with instant AI triage',
      'Inspect computer lab & library equipment health in 3D',
    ],
    liveMetricLabel: 'Study Commons Availability',
    liveMetricValue: '11 Rooms Active · 9.9 Gbps Wi-Fi',
  },
  [UserRole.FACULTY]: {
    role: UserRole.FACULTY,
    shortLabel: 'Faculty',
    portalName: 'Faculty Portal',
    dashboardName: 'Faculty Dashboard',
    tagline: 'Lecture Hall Booking & Classroom Environment Control',
    subtitle:
      'Access the shared 3D Digital Twin to book lecture halls, verify projector and smart board readiness, tune classroom AC setpoints, and report lab issues.',
    defaultEmail: 'faculty@campus360.edu',
    defaultPassword: 'faculty123',
    personaName: 'Prof. Elena Vance',
    personaTitle: 'Senior Professor · Quantum & Photonics Lab',
    primaryHex: ROLE_IDENTITY[UserRole.FACULTY].primary,
    secondaryHex: ROLE_IDENTITY[UserRole.FACULTY].secondary,
    accentText: ROLE_IDENTITY[UserRole.FACULTY].textClass,
    accentBorder: ROLE_IDENTITY[UserRole.FACULTY].borderClass,
    accentBg: ROLE_IDENTITY[UserRole.FACULTY].bgClass,
    buttonClass: `${ROLE_IDENTITY[UserRole.FACULTY].buttonClass} hover:brightness-110`,
    glowGradient: 'radial-gradient(circle at 80% 20%, rgba(129, 140, 248, 0.24), transparent 60%)',
    particleMode: 'wave',
    digitalTwinCapabilities: [
      'Book & release lecture halls and seminar rooms in 3D',
      'Adjust classroom AC temperature setpoints before class',
      'Verify AV projectors, smart boards & report lab faults',
    ],
    liveMetricLabel: 'Academic Labs & Lecture Halls',
    liveMetricValue: '98.4% AV Ready · 21.0°C Optimal',
  },
  [UserRole.TECHNICIAN]: {
    role: UserRole.TECHNICIAN,
    shortLabel: 'Maintenance',
    portalName: 'Maintenance Portal',
    dashboardName: 'Maintenance Dashboard',
    tagline: '3D Fault Dispatch & Live Repair Execution',
    subtitle:
      'Launch into the shared 3D Digital Twin to locate fault rooms, review AI root-cause diagnostics, accept repair jobs, and update live repair progress.',
    defaultEmail: 'maintenance@campus360.edu',
    defaultPassword: 'maintenance123',
    personaName: 'Marcus Thorne',
    personaTitle: 'Lead Maintenance & MEP Field Engineer',
    primaryHex: ROLE_IDENTITY[UserRole.TECHNICIAN].primary,
    secondaryHex: ROLE_IDENTITY[UserRole.TECHNICIAN].secondary,
    accentText: ROLE_IDENTITY[UserRole.TECHNICIAN].textClass,
    accentBorder: ROLE_IDENTITY[UserRole.TECHNICIAN].borderClass,
    accentBg: ROLE_IDENTITY[UserRole.TECHNICIAN].bgClass,
    buttonClass: `${ROLE_IDENTITY[UserRole.TECHNICIAN].buttonClass} hover:brightness-110`,
    glowGradient: 'radial-gradient(circle at 25% 75%, rgba(245, 158, 11, 0.22), transparent 60%)',
    particleMode: 'sparks',
    digitalTwinCapabilities: [
      'Locate red/amber fault rooms highlighted in the 3D scene',
      'Accept repair jobs and update progress (35% → 75% → 100%)',
      'Complete maintenance to restore rooms to green healthy state',
    ],
    liveMetricLabel: 'Active Maintenance Queue',
    liveMetricValue: '3 Fault Rooms · 12m Mean ETA',
  },
  [UserRole.PROCUREMENT_APPROVER]: {
    role: UserRole.PROCUREMENT_APPROVER,
    shortLabel: 'Security',
    portalName: 'Security Portal',
    dashboardName: 'Security Dashboard',
    tagline: '3D Campus CCTV Surveillance & Access Control',
    subtitle:
      'Step into the shared 3D Digital Twin to monitor room CCTV cameras, manage building perimeter lockdowns, and respond to campus safety alerts.',
    defaultEmail: 'security@campus360.edu',
    defaultPassword: 'security123',
    personaName: 'Capt. Priya Nair',
    personaTitle: 'Chief of Campus Security & Surveillance',
    primaryHex: ROLE_IDENTITY[UserRole.PROCUREMENT_APPROVER].primary,
    secondaryHex: ROLE_IDENTITY[UserRole.PROCUREMENT_APPROVER].secondary,
    accentText: ROLE_IDENTITY[UserRole.PROCUREMENT_APPROVER].textClass,
    accentBorder: ROLE_IDENTITY[UserRole.PROCUREMENT_APPROVER].borderClass,
    accentBg: ROLE_IDENTITY[UserRole.PROCUREMENT_APPROVER].bgClass,
    buttonClass: `${ROLE_IDENTITY[UserRole.PROCUREMENT_APPROVER].buttonClass} hover:brightness-110`,
    glowGradient: 'radial-gradient(circle at 75% 70%, rgba(16, 185, 129, 0.22), transparent 60%)',
    particleMode: 'shield',
    digitalTwinCapabilities: [
      'Monitor 3D room CCTV camera health and live occupancy',
      'Toggle building perimeter lockdown states in real time',
      'Acknowledge and clear room safety & security alerts',
    ],
    liveMetricLabel: 'Campus Perimeter & CCTV Status',
    liveMetricValue: '5 Zones Secure · All Cameras Online',
  },
  [UserRole.FACILITIES_ADMIN]: {
    role: UserRole.FACILITIES_ADMIN,
    shortLabel: 'Admin',
    portalName: 'Admin Portal',
    dashboardName: 'Admin Dashboard',
    tagline: 'Campus Operations & Mission Control Center',
    subtitle:
      'Command the entire 3D Smart Campus with Mission Control telemetry, building HVAC & power load-shedding overrides, and maintenance dispatch.',
    defaultEmail: 'admin@campus360.edu',
    defaultPassword: 'admin123',
    personaName: 'Soren Lindqvist',
    personaTitle: 'Campus Operations Administrator',
    primaryHex: ROLE_IDENTITY[UserRole.FACILITIES_ADMIN].primary,
    secondaryHex: ROLE_IDENTITY[UserRole.FACILITIES_ADMIN].secondary,
    accentText: ROLE_IDENTITY[UserRole.FACILITIES_ADMIN].textClass,
    accentBorder: ROLE_IDENTITY[UserRole.FACILITIES_ADMIN].borderClass,
    accentBg: ROLE_IDENTITY[UserRole.FACILITIES_ADMIN].bgClass,
    buttonClass: `${ROLE_IDENTITY[UserRole.FACILITIES_ADMIN].buttonClass} hover:brightness-110`,
    glowGradient: 'radial-gradient(circle at 50% 25%, rgba(34, 211, 238, 0.25), transparent 62%)',
    particleMode: 'orbital',
    digitalTwinCapabilities: [
      'Open Mission Control overlay across all 5 campus buildings',
      'Override room AC setpoints and electrical load shedding',
      'Assign maintenance engineers and monitor AI diagnostics',
    ],
    liveMetricLabel: 'Campus Microgrid & Thermal Bus',
    liveMetricValue: '3,582.5 kW Load · +1,166.1 kW Solar',
  },
  [UserRole.DEPARTMENT_MANAGER]: {
    role: UserRole.DEPARTMENT_MANAGER,
    shortLabel: 'HOD',
    portalName: 'HOD Portal',
    dashboardName: 'HOD Dashboard',
    tagline: 'Head of Department Academic & Lab Oversight',
    subtitle:
      'Enter the 3D Digital Twin to oversee departmental buildings and floors, approve room bookings, assign maintenance specialists, and escalate critical issues.',
    defaultEmail: 'hod@campus360.edu',
    defaultPassword: 'hod123',
    personaName: 'Dr. Diana Chen',
    personaTitle: 'Head of Department · Engineering & Nano-Systems',
    primaryHex: ROLE_IDENTITY[UserRole.DEPARTMENT_MANAGER].primary,
    secondaryHex: ROLE_IDENTITY[UserRole.DEPARTMENT_MANAGER].secondary,
    accentText: ROLE_IDENTITY[UserRole.DEPARTMENT_MANAGER].textClass,
    accentBorder: ROLE_IDENTITY[UserRole.DEPARTMENT_MANAGER].borderClass,
    accentBg: ROLE_IDENTITY[UserRole.DEPARTMENT_MANAGER].bgClass,
    buttonClass: `${ROLE_IDENTITY[UserRole.DEPARTMENT_MANAGER].buttonClass} hover:brightness-110`,
    glowGradient: 'radial-gradient(circle at 25% 30%, rgba(192, 132, 252, 0.23), transparent 60%)',
    particleMode: 'grid',
    digitalTwinCapabilities: [
      'Approve or release departmental lecture & lab bookings',
      'Escalate unresolved room complaints to Critical priority',
      'Assign specialist technicians and set target repair ETAs',
    ],
    liveMetricLabel: 'Departmental Zone Utilization',
    liveMetricValue: '84.2% Capacity · 96% Lab Health',
  },
  [UserRole.SYSTEM_ADMIN]: {
    role: UserRole.SYSTEM_ADMIN,
    shortLabel: 'Super Admin',
    portalName: 'Super Admin Portal',
    dashboardName: 'Super Admin Dashboard',
    tagline: 'Executive Global Campus & Digital Twin Authority',
    subtitle:
      'Access the shared 3D Digital Twin with unrestricted global authority across all buildings, equipment purchase approvals, AI settings, and role accounts.',
    defaultEmail: 'superadmin@campus360.edu',
    defaultPassword: 'superadmin123',
    personaName: 'Viktor Kane',
    personaTitle: 'Campus360 Super Administrator',
    primaryHex: ROLE_IDENTITY[UserRole.SYSTEM_ADMIN].primary,
    secondaryHex: ROLE_IDENTITY[UserRole.SYSTEM_ADMIN].secondary,
    accentText: ROLE_IDENTITY[UserRole.SYSTEM_ADMIN].textClass,
    accentBorder: ROLE_IDENTITY[UserRole.SYSTEM_ADMIN].borderClass,
    accentBg: ROLE_IDENTITY[UserRole.SYSTEM_ADMIN].bgClass,
    buttonClass: `${ROLE_IDENTITY[UserRole.SYSTEM_ADMIN].buttonClass} hover:brightness-110`,
    glowGradient: 'radial-gradient(circle at 80% 75%, rgba(251, 113, 133, 0.24), transparent 60%)',
    particleMode: 'diamonds',
    digitalTwinCapabilities: [
      'Unrestricted control over all buildings, floors, and rooms',
      'Approve capital equipment replacements & AI triage settings',
      'Instant role switching and campus-wide executive oversight',
    ],
    liveMetricLabel: 'Global Campus Twin Authority',
    liveMetricValue: '7 Roles Active · 100% Twin Coverage',
  },
};

const PortalIllustration: React.FC<{ role: UserRole; primaryHex: string; secondaryHex: string }> = ({
  role,
  primaryHex,
  secondaryHex,
}) => {
  return (
    <div className="relative w-full h-40 rounded-xl bg-slate-950/75 border border-white/10 overflow-hidden flex items-center justify-center p-4">
      <svg
        viewBox="0 0 420 160"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`grad-${role}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={primaryHex} stopOpacity="0.45" />
            <stop offset="100%" stopColor={secondaryHex} stopOpacity="0.08" />
          </linearGradient>
        </defs>

        <path
          d="M20 140 L400 140 M50 115 L370 115 M80 90 L340 90"
          stroke={primaryHex}
          strokeOpacity="0.18"
          strokeDasharray="4 4"
        />
        <path
          d="M110 140 L160 70 M210 140 L210 60 M310 140 L260 70"
          stroke={primaryHex}
          strokeOpacity="0.18"
        />

        {role === UserRole.STUDENT && (
          <g>
            <polygon
              points="210,28 295,68 210,108 125,68"
              fill={`url(#grad-${role})`}
              stroke={primaryHex}
              strokeWidth="1.75"
            />
            <polygon
              points="125,68 210,108 210,138 125,98"
              fill="rgba(15,23,42,0.8)"
              stroke={primaryHex}
              strokeWidth="1.5"
            />
            <polygon
              points="295,68 210,108 210,138 295,98"
              fill="rgba(30,41,59,0.8)"
              stroke={primaryHex}
              strokeWidth="1.5"
            />
            <circle cx="210" cy="68" r="10" fill={primaryHex} />
            <circle cx="145" cy="48" r="5" fill={primaryHex} fillOpacity="0.8" />
            <circle cx="275" cy="48" r="5" fill={primaryHex} fillOpacity="0.8" />
            <path d="M145 48 L210 68 L275 48" stroke={primaryHex} strokeWidth="1.2" strokeDasharray="3 3" />
          </g>
        )}

        {role === UserRole.FACULTY && (
          <g>
            <circle cx="210" cy="80" r="52" stroke={primaryHex} strokeOpacity="0.35" strokeWidth="1.5" />
            <circle cx="210" cy="80" r="34" fill={`url(#grad-${role})`} stroke={primaryHex} strokeWidth="1.75" />
            <path
              d="M70 80 Q 140 20, 210 80 T 350 80"
              stroke={primaryHex}
              strokeWidth="2.2"
              fill="none"
            />
            <path
              d="M70 80 Q 140 140, 210 80 T 350 80"
              stroke={secondaryHex}
              strokeWidth="1.8"
              fill="none"
            />
            <circle cx="210" cy="80" r="7" fill="#fff" />
          </g>
        )}

        {role === UserRole.TECHNICIAN && (
          <g>
            <rect
              x="145"
              y="32"
              width="130"
              height="92"
              rx="10"
              fill={`url(#grad-${role})`}
              stroke={primaryHex}
              strokeWidth="1.75"
            />
            <circle cx="210" cy="78" r="28" stroke={primaryHex} strokeWidth="2" />
            <path
              d="M210 50 L210 106 M182 78 L238 78 M190 58 L230 98 M230 58 L190 98"
              stroke={primaryHex}
              strokeWidth="1.5"
            />
            <polyline
              points="60,85 95,85 108,52 122,112 135,72 145,85"
              stroke={primaryHex}
              strokeWidth="2"
              fill="none"
            />
            <polyline
              points="275,85 292,60 306,105 320,78 360,78"
              stroke={primaryHex}
              strokeWidth="2"
              fill="none"
            />
          </g>
        )}

        {role === UserRole.DEPARTMENT_MANAGER && (
          <g>
            <polygon
              points="210,22 300,52 210,82 120,52"
              fill={`url(#grad-${role})`}
              stroke={primaryHex}
              strokeWidth="1.75"
            />
            <polygon
              points="210,55 300,85 210,115 120,85"
              fill={`url(#grad-${role})`}
              stroke={primaryHex}
              strokeWidth="1.75"
            />
            <polygon
              points="210,88 300,118 210,148 120,118"
              fill={`url(#grad-${role})`}
              stroke={primaryHex}
              strokeWidth="1.75"
            />
            <line x1="120" y1="52" x2="120" y2="118" stroke={primaryHex} strokeDasharray="3 3" />
            <line x1="300" y1="52" x2="300" y2="118" stroke={primaryHex} strokeDasharray="3 3" />
          </g>
        )}

        {role === UserRole.FACILITIES_ADMIN && (
          <g>
            <rect x="125" y="55" width="38" height="80" fill={`url(#grad-${role})`} stroke={primaryHex} strokeWidth="1.6" />
            <rect x="185" y="26" width="50" height="109" fill={`url(#grad-${role})`} stroke={primaryHex} strokeWidth="2" />
            <rect x="255" y="46" width="40" height="89" fill={`url(#grad-${role})`} stroke={primaryHex} strokeWidth="1.6" />
            <ellipse cx="210" cy="135" rx="125" ry="16" stroke={primaryHex} strokeWidth="1.4" strokeDasharray="6 4" />
            <circle cx="210" cy="18" r="5" fill={primaryHex} />
          </g>
        )}

        {role === UserRole.PROCUREMENT_APPROVER && (
          <g>
            <path
              d="M210 22 L272 45 V85 C272 116 210 140 210 140 C210 140 148 116 148 85 V45 L210 22 Z"
              fill={`url(#grad-${role})`}
              stroke={primaryHex}
              strokeWidth="2"
            />
            <circle cx="210" cy="80" r="20" stroke="#fff" strokeWidth="1.6" />
            <circle cx="210" cy="80" r="7" fill={primaryHex} />
          </g>
        )}

        {role === UserRole.SYSTEM_ADMIN && (
          <g>
            <polygon
              points="150,48 195,70 150,92 105,70"
              fill={`url(#grad-${role})`}
              stroke={primaryHex}
              strokeWidth="1.75"
            />
            <polygon
              points="270,48 315,70 270,92 225,70"
              fill={`url(#grad-${role})`}
              stroke={primaryHex}
              strokeWidth="1.75"
            />
            <polygon
              points="210,82 255,104 210,126 165,104"
              fill={`url(#grad-${role})`}
              stroke={primaryHex}
              strokeWidth="2"
            />
            <path d="M150 70 L210 104 L270 70" stroke="#fff" strokeWidth="1.5" strokeDasharray="4 4" />
          </g>
        )}
      </svg>
    </div>
  );
};

export const LoginPage: React.FC = () => {
  const { login, loginAsRole, demoAccounts } = useAuth();

  const [pageStep, setPageStep] = useState<'LANDING' | 'PORTAL_SELECTION' | 'ROLE_LOGIN'>('LANDING');
  const [activePortalRole, setActivePortalRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('campus360_selected_portal') as UserRole | null;
    return saved && PORTAL_THEMES[saved] ? saved : UserRole.STUDENT;
  });

  const currentPortal = PORTAL_THEMES[activePortalRole];

  const [email, setEmail] = useState(currentPortal.defaultEmail);
  const [password, setPassword] = useState(currentPortal.defaultPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [liveCampusSummary, setLiveCampusSummary] = useState({
    buildingsOnline: 5,
    totalRooms: 11,
    healthyRooms: 8,
    activeIssues: 3,
    totalPowerKw: 3582.5,
    totalSolarKw: 1166.1,
    totalOccupancy: 1710,
  });

  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    fetch('/api/auth/demo-accounts')
      .then((r) => r.json())
      .then((d) => {
        if (d.liveCampusSummary) {
          setLiveCampusSummary(d.liveCampusSummary);
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectPortal = (role: UserRole, openLogin = true) => {
    setActivePortalRole(role);
    localStorage.setItem('campus360_selected_portal', role);
    setErrorMsg(null);
    const theme = PORTAL_THEMES[role];
    const matchingDemo = demoAccounts.find((a) => a.role === role);
    setEmail(matchingDemo ? matchingDemo.email : theme.defaultEmail);
    setPassword(matchingDemo ? matchingDemo.password : theme.defaultPassword);
    if (openLogin) {
      setPageStep('ROLE_LOGIN');
    }
  };

  useEffect(() => {
    const theme = PORTAL_THEMES[activePortalRole];
    const matchingDemo = demoAccounts.find((a) => a.role === activePortalRole);
    setEmail(matchingDemo ? matchingDemo.email : theme.defaultEmail);
    setPassword(matchingDemo ? matchingDemo.password : theme.defaultPassword);
  }, [demoAccounts, activePortalRole]);

  // Animated Particles Canvas per Role Portal
  useEffect(() => {
    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const particleCount = 42;
    const particles = Array.from({ length: particleCount }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.55,
      vy: (Math.random() - 0.5) * 0.55,
      r: 1.5 + (i % 3) * 1.1,
      phase: Math.random() * Math.PI * 2,
    }));

    const renderParticles = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = currentPortal.primaryHex;
      ctx.strokeStyle = currentPortal.primaryHex;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const alpha = 0.22 + 0.3 * Math.sin(time * 0.002 + p.phase);
        ctx.globalAlpha = alpha;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 120) {
            ctx.globalAlpha = (1 - dist / 120) * 0.12;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(renderParticles);
    };

    animId = requestAnimationFrame(renderParticles);

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, [currentPortal.primaryHex]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.ok) {
        setErrorMsg(result.error || 'Invalid credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInstantDemoLogin = async (roleToLogin: UserRole, startJury = false) => {
    setErrorMsg(null);
    setLoading(true);
    try {
      if (startJury) {
        localStorage.setItem('campus360_jury_autostart', '1');
      }
      const res = await loginAsRole(roleToLogin);
      if (!res.ok) {
        setErrorMsg(res.error || 'Demo login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const portalList: {
    role: UserRole;
    shortLabel: string;
    icon: React.ReactNode;
  }[] = [
    {
      role: UserRole.STUDENT,
      shortLabel: 'Student',
      icon: <GraduationCap className="w-5 h-5" />,
    },
    {
      role: UserRole.FACULTY,
      shortLabel: 'Faculty',
      icon: <BookOpen className="w-5 h-5" />,
    },
    {
      role: UserRole.TECHNICIAN,
      shortLabel: 'Maintenance',
      icon: <Wrench className="w-5 h-5" />,
    },
    {
      role: UserRole.PROCUREMENT_APPROVER,
      shortLabel: 'Security',
      icon: <Shield className="w-5 h-5" />,
    },
    {
      role: UserRole.FACILITIES_ADMIN,
      shortLabel: 'Admin',
      icon: <Cpu className="w-5 h-5" />,
    },
    {
      role: UserRole.DEPARTMENT_MANAGER,
      shortLabel: 'HOD',
      icon: <Building2 className="w-5 h-5" />,
    },
    {
      role: UserRole.SYSTEM_ADMIN,
      shortLabel: 'Super Admin',
      icon: <Crown className="w-5 h-5" />,
    },
  ];

  return (
    <div
      className="relative z-10 min-h-screen w-full flex flex-col justify-between p-4 md:p-8 pointer-events-none transition-all duration-300 page-fade"
      style={{ backgroundImage: currentPortal.glowGradient }}
    >
      {/* Animated Role-Themed Particle Layer */}
      <canvas ref={particleCanvasRef} className="fixed inset-0 z-0 pointer-events-none" />

      {/* Top Navigation Bar (Strict 3-Zone Contract) */}
      <header className="relative z-10 w-full max-w-[1440px] mx-auto flex items-center justify-between gap-8 px-6 py-4 rounded-[22px] glass-panel pointer-events-auto">
        <a
          href="#landing"
          onClick={(e) => {
            e.preventDefault();
            setPageStep('LANDING');
          }}
          className="text-[28px] font-bold tracking-tight text-white font-display whitespace-nowrap shrink-0 cursor-pointer"
        >
          Campus360
        </a>

        <nav className="hidden md:flex items-center gap-6 text-[18px] font-medium text-slate-300">
          <button
            type="button"
            onClick={() => setPageStep('LANDING')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              pageStep === 'LANDING' ? 'text-sky-400 font-semibold' : 'hover:text-white'
            }`}
          >
            1. Overview
          </button>
          <button
            type="button"
            onClick={() => setPageStep('PORTAL_SELECTION')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              pageStep === 'PORTAL_SELECTION' ? 'text-sky-400 font-semibold' : 'hover:text-white'
            }`}
          >
            2. Role Portals (7)
          </button>
          <button
            type="button"
            onClick={() => setPageStep('ROLE_LOGIN')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              pageStep === 'ROLE_LOGIN' ? `${currentPortal.accentText} font-semibold` : 'hover:text-white'
            }`}
          >
            3. {currentPortal.shortLabel} Login
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setPageStep('PORTAL_SELECTION')}
            className="premium-btn px-5 py-2.5 rounded-[22px] bg-gradient-to-r from-cyan-300 to-sky-400 text-slate-950 text-[18px] font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            Choose Role Portal
          </button>
        </div>
      </header>

      {/* =======================================================================
          PAGE 1: ANIMATED LANDING PAGE
         ======================================================================= */}
      {pageStep === 'LANDING' && (
        <main className="relative z-10 w-full max-w-[1280px] mx-auto my-auto py-10 flex flex-col items-center text-center pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-medium tracking-[0.28em] uppercase text-cyan-300 mb-5"
          >
            Enterprise Smart Campus · Digital Twin OS
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="font-display font-bold tracking-tight text-white max-w-5xl leading-[1.05]"
            style={{ fontSize: 'var(--text-hero)', textWrap: 'balance' }}
          >
            Campus360 Enterprise Smart Campus
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="mt-6 max-w-3xl leading-relaxed text-slate-200"
            style={{ fontSize: 'var(--text-h2)' }}
          >
            AI Powered Campus Operations &
            <br />
            Digital Twin Platform
          </motion.p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setPageStep('PORTAL_SELECTION')}
              className="premium-btn group px-10 py-4 rounded-[22px] glass-panel text-white font-semibold flex items-center gap-3 glow-cyan"
              style={{ fontSize: 'var(--text-btn)' }}
            >
              <span>Start</span>
              <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
            </button>

            <button
              type="button"
              onClick={() => handleInstantDemoLogin(UserRole.FACILITIES_ADMIN, true)}
              className="premium-btn px-8 py-4 rounded-[22px] bg-gradient-to-r from-amber-300 via-cyan-300 to-sky-400 text-slate-950 font-semibold flex items-center gap-2 glow-gold"
              style={{ fontSize: 'var(--text-btn)' }}
            >
              <Play className="w-5 h-5" />
              Start Demo
            </button>
          </div>

          <div className="mt-10 scroll-indicator flex flex-col items-center text-slate-400">
            <span className="text-sm tracking-[0.2em] uppercase">Scroll the twin</span>
            <span className="mt-1 h-8 w-px bg-gradient-to-b from-cyan-300 to-transparent" />
          </div>

          <div className="mt-12 w-full grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <KpiCard
              label="Campus Health"
              value={96.4}
              decimals={1}
              suffix="%"
              hint={`${liveCampusSummary.buildingsOnline} smart buildings online`}
              accent="text-emerald-300"
            />
            <KpiCard
              label="3D Rooms"
              value={liveCampusSummary.totalRooms}
              hint={`${liveCampusSummary.healthyRooms} healthy · ${liveCampusSummary.activeIssues} alerts`}
              accent="text-cyan-300"
            />
            <KpiCard
              label="Live Occupancy"
              value={liveCampusSummary.totalOccupancy}
              hint="Presence across lecture halls & labs"
              accent="text-white"
            />
            <KpiCard
              label="Role Portals"
              value={7}
              hint="Student · Faculty · Security · Admin"
              accent="text-amber-300"
            />
          </div>
        </main>
      )}

      {/* =======================================================================
          PAGE 2: PORTAL SELECTION (7 Attractive Role Cards)
         ======================================================================= */}
      {pageStep === 'PORTAL_SELECTION' && (
        <main className="relative z-10 w-full max-w-[1380px] mx-auto my-auto py-6 pointer-events-auto">
          <div className="text-center max-w-2xl mx-auto mb-6">
            <span className="text-xs font-mono text-sky-400">
              SELECT YOUR CAMPUS ROLE PORTAL
            </span>
            <h1
              className="text-3xl md:text-4xl font-bold text-white font-display mt-1"
              style={{ textWrap: 'balance' }}
            >
              7 Role Login Portals · 1 Shared 3D Digital Twin
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5">
              Choose any role below to open its themed login page or launch directly into its
              dashboard inside the 3D Digital Twin.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {portalList.map((item) => {
              const theme = PORTAL_THEMES[item.role];
              return (
                <div
                  key={item.role}
                  className={`group text-left p-5 rounded-2xl bg-[#0C1425]/92 border ${theme.accentBorder} shadow-2xl transition-transform duration-200 hover:-translate-y-1 flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={`w-11 h-11 rounded-xl ${theme.accentBg} border ${theme.accentBorder} flex items-center justify-center ${theme.accentText}`}
                      >
                        {item.icon}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {theme.dashboardName}
                      </span>
                    </div>

                    <h2 className="text-base font-bold text-white font-display mt-4">
                      {theme.portalName}
                    </h2>

                    <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                      {theme.tagline}
                    </p>

                    <div className="mt-3 pt-3 border-t border-white/10 space-y-1">
                      {theme.digitalTwinCapabilities.slice(0, 2).map((cap) => (
                        <div
                          key={cap}
                          className="flex items-center gap-1.5 text-[11px] text-slate-300 truncate"
                        >
                          <Check className={`w-3 h-3 shrink-0 ${theme.accentText}`} />
                          <span className="truncate">{cap}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectPortal(item.role, true)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${theme.buttonClass}`}
                    >
                      Open {item.shortLabel} Login
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInstantDemoLogin(item.role)}
                      className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-mono text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
                      title="Instant 1-Click Demo Sign In"
                    >
                      1-Click
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* =======================================================================
          PAGE 3: ATTRACTIVE ROLE LOGIN PAGE (Simple Email/Password + 1-Click Demo)
         ======================================================================= */}
      {pageStep === 'ROLE_LOGIN' && (
        <>
          {/* Quick Role Switcher Bar */}
          <div className="relative z-10 w-full max-w-[1380px] mx-auto mt-3 pointer-events-auto">
            <div className="bg-[#0B1221]/95 border border-white/15 rounded-2xl p-2 flex flex-wrap items-center justify-between gap-2 shadow-xl">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                <button
                  type="button"
                  onClick={() => setPageStep('PORTAL_SELECTION')}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-medium text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  ← All 7 Portals
                </button>
                {portalList.map((item) => {
                  const active = item.role === activePortalRole;
                  const t = PORTAL_THEMES[item.role];
                  return (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => handleSelectPortal(item.role, true)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? `${t.buttonClass} font-semibold`
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      {item.shortLabel}
                    </button>
                  );
                })}
              </div>

              <div className="hidden xl:flex items-center gap-3 px-3 py-1 text-xs font-mono tabular-nums text-slate-300">
                <span>
                  Rooms: <strong className="text-emerald-400">{liveCampusSummary.healthyRooms} OK</strong>
                  {' · '}
                  <strong className="text-rose-400">{liveCampusSummary.activeIssues} Alert</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Occupancy: <strong className="text-white">{liveCampusSummary.totalOccupancy}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Split Role Login Card */}
          <main className="relative z-10 w-full max-w-[1380px] mx-auto my-auto py-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Column: Role Theme, Illustration & Capabilities */}
            <div
              className={`lg:col-span-6 bg-[#0C1425]/92 border ${currentPortal.accentBorder} rounded-2xl p-6 md:p-7 shadow-2xl pointer-events-auto flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs font-mono">
                  <span className={`font-semibold ${currentPortal.accentText}`}>
                    {currentPortal.portalName}
                  </span>
                  <span className="text-slate-400">→ {currentPortal.dashboardName}</span>
                </div>

                <h1
                  className="text-2xl md:text-3xl font-bold text-white font-display mt-2"
                  style={{ textWrap: 'balance' }}
                >
                  {currentPortal.tagline}
                </h1>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  {currentPortal.subtitle}
                </p>

                <div className="mt-4">
                  <PortalIllustration
                    role={activePortalRole}
                    primaryHex={currentPortal.primaryHex}
                    secondaryHex={currentPortal.secondaryHex}
                  />
                </div>

                <div className="mt-4 space-y-2">
                  <span className="text-[11px] font-mono text-slate-400 block">
                    Role Permissions Inside the Shared 3D Digital Twin:
                  </span>
                  {currentPortal.digitalTwinCapabilities.map((cap) => (
                    <div
                      key={cap}
                      className="flex items-center gap-2 text-xs text-slate-200 bg-slate-900/75 border border-white/10 rounded-lg px-3 py-2"
                    >
                      <Check className={`w-3.5 h-3.5 shrink-0 ${currentPortal.accentText}`} />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {currentPortal.liveMetricLabel}
                  </span>
                  <span className={`font-mono font-semibold ${currentPortal.accentText}`}>
                    {currentPortal.liveMetricValue}
                  </span>
                </div>
                <div className="text-right font-mono text-[11px] text-slate-400">
                  <span>5 Buildings · 11 Interactive 3D Rooms</span>
                  <span className="block text-emerald-400">Shared 3D Digital Twin Ready</span>
                </div>
              </div>
            </div>

            {/* Right Column: Simple, Modern Hackathon Login + Instant 1-Click Demo Button */}
            <div
              className={`lg:col-span-6 bg-[#0C1425]/95 border ${currentPortal.accentBorder} rounded-2xl p-6 md:p-7 shadow-2xl pointer-events-auto flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs font-mono">
                  <span className={currentPortal.accentText}>LIGHTWEIGHT ROLE SIGN-IN</span>
                  <span className="text-slate-400">HACKATHON DEMO READY</span>
                </div>

                <h2 className="text-xl md:text-2xl font-bold text-white font-display mt-1.5">
                  Sign in to {currentPortal.dashboardName}
                </h2>

                {/* Pre-loaded Demo Persona Box */}
                <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Demo Account Pre-Filled:</span>
                    <span className="text-white font-semibold">{currentPortal.personaName}</span>
                    <span className="text-slate-400"> · {currentPortal.personaTitle}</span>
                  </div>
                  <span className={`font-mono text-[11px] ${currentPortal.accentText} shrink-0`}>
                    {currentPortal.shortLabel}
                  </span>
                </div>

                {/* Instant 1-Click Demo Login CTA */}
                <div className="mt-4">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleInstantDemoLogin(activePortalRole)}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${currentPortal.buttonClass}`}
                  >
                    <Zap className="w-4 h-4" />
                    <span>
                      Instant 1-Click Demo Login as {currentPortal.shortLabel}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="my-4 flex items-center gap-3 text-[11px] font-mono text-slate-500">
                  <div className="h-px flex-1 bg-white/10" />
                  <span>OR SIGN IN WITH EMAIL & PASSWORD</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                {errorMsg && (
                  <div className="mb-3 p-3 rounded-xl bg-rose-950/90 border border-rose-500/40 text-xs text-rose-200">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      {currentPortal.shortLabel} Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={currentPortal.defaultEmail}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white focus:outline-none focus:border-sky-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white focus:outline-none focus:border-sky-400 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Opening {currentPortal.dashboardName}...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In with Credentials</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className="mt-5 pt-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>Credentials: {currentPortal.defaultEmail} / {currentPortal.defaultPassword}</span>
                <span className="font-mono text-emerald-400">Direct 3D Digital Twin Entry</span>
              </div>
            </div>
          </main>
        </>
      )}

      {/* Minimal Footer */}
      <footer className="relative z-10 w-full max-w-[1380px] mx-auto flex items-center justify-between text-xs text-slate-400 px-2 pointer-events-auto">
        <span>Campus360 Digital Twin OS · Student · Faculty · Maintenance · Security · Admin · HOD · Super Admin</span>
        <span>Active Portal: {currentPortal.portalName}</span>
      </footer>
    </div>
  );
};
