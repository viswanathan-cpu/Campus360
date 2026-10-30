import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  BuildingData,
  CampusRoom3D,
  CampusComplaint,
  ProcurementItem,
  AuthUser,
  UserRole,
} from '../../types/campus.ts';
import {
  CampusDigitalTwin,
  TwinLayerMode,
} from '../digital-twin/CampusDigitalTwin.tsx';
import { EnterpriseComplaintModal } from './EnterpriseComplaintModal.tsx';
import { JuryMode, JuryDemoControls } from '../jury/JuryMode.tsx';
import { ROLE_IDENTITY } from '../../theme/roleIdentity.ts';
import { GlassCard } from '../ui/PremiumPrimitives.tsx';
import {
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Wrench,
  Clock,
  Calendar,
  Users,
  Activity,
  Plus,
  Shield,
  X,
  Sliders,
  PackageCheck,
  UserCheck,
  CalendarCheck,
  Settings,
  Search,
  Bell,
  Building2,
  Box,
  ChevronRight,
  Radar,
  Sparkles,
  Camera,
  Lock,
  Unlock,
  ArrowUpRight,
  Compass,
  MapPin,
  LayoutGrid,
  Layers,
  Zap,
  History,
  Bookmark,
  Wifi,
  Thermometer,
  FileText,
} from 'lucide-react';

interface SystemConfigState {
  autoAiTriageOnComplaint: boolean;
  zeroTrustStrictMode: boolean;
  updatedAt: string;
  updatedBy: string;
}

interface RoleDashboardsProps {
  buildings: BuildingData[];
  setBuildings: React.Dispatch<React.SetStateAction<BuildingData[]>>;
  rooms3D: CampusRoom3D[];
  setRooms3D: React.Dispatch<React.SetStateAction<CampusRoom3D[]>>;
  selectedBuildingId: string;
  setSelectedBuildingId: (id: string) => void;
  selectedRoomId: string | null;
  setSelectedRoomId: (id: string | null) => void;
  activeLayer: TwinLayerMode;
  setActiveLayer: (layer: TwinLayerMode) => void;
}

type SelectionScope = 'BUILDING' | 'FLOOR' | 'ROOM' | 'EQUIPMENT';
type BottomTimelineTab = 'COMPLAINTS' | 'MAINTENANCE' | 'SECURITY_FEED';

const SPECIALIST_TECHNICIANS = [
  { name: 'Rahul Verma (Senior Campus Systems & Lab Tech)', defaultEta: '9 mins remaining' },
  { name: 'Marcus Thorne (Lead MEP & HVAC Engineer)', defaultEta: '12 mins remaining' },
  { name: 'Elena Rostova (Cleanroom HVAC Specialist)', defaultEta: '15 mins remaining' },
  { name: 'Devon Brooks (High-Voltage Grid Tech)', defaultEta: '10 mins remaining' },
  { name: 'Kenji Sato (AV & Fiber Network Tech)', defaultEta: '8 mins remaining' },
];

const BLOCK_ALIASES: Record<string, string> = {
  'bldg-eng-01': 'Block A',
  'bldg-sci-02': 'Block B',
  'bldg-nrg-03': 'Block C',
  'bldg-lib-04': 'Block D',
  'bldg-bio-05': 'Block E',
};

const QUICK_SEARCH_EXAMPLES = [
  'Block A',
  'Lab 205',
  'Computer Lab',
  'Router',
  'Projector',
  'Complaint #102',
  'Technician Rahul',
];

const QUICK_ROLE_SWITCH_LIST: { role: UserRole; label: string; color: string }[] = [
  { role: UserRole.STUDENT, label: 'Student', color: `${ROLE_IDENTITY[UserRole.STUDENT].textClass} ${ROLE_IDENTITY[UserRole.STUDENT].borderClass} ${ROLE_IDENTITY[UserRole.STUDENT].bgClass}` },
  { role: UserRole.FACULTY, label: 'Faculty', color: `${ROLE_IDENTITY[UserRole.FACULTY].textClass} ${ROLE_IDENTITY[UserRole.FACULTY].borderClass} ${ROLE_IDENTITY[UserRole.FACULTY].bgClass}` },
  { role: UserRole.TECHNICIAN, label: 'Maintenance', color: `${ROLE_IDENTITY[UserRole.TECHNICIAN].textClass} ${ROLE_IDENTITY[UserRole.TECHNICIAN].borderClass} ${ROLE_IDENTITY[UserRole.TECHNICIAN].bgClass}` },
  { role: UserRole.PROCUREMENT_APPROVER, label: 'Security', color: `${ROLE_IDENTITY[UserRole.PROCUREMENT_APPROVER].textClass} ${ROLE_IDENTITY[UserRole.PROCUREMENT_APPROVER].borderClass} ${ROLE_IDENTITY[UserRole.PROCUREMENT_APPROVER].bgClass}` },
  { role: UserRole.FACILITIES_ADMIN, label: 'Admin', color: `${ROLE_IDENTITY[UserRole.FACILITIES_ADMIN].textClass} ${ROLE_IDENTITY[UserRole.FACILITIES_ADMIN].borderClass} ${ROLE_IDENTITY[UserRole.FACILITIES_ADMIN].bgClass}` },
  { role: UserRole.DEPARTMENT_MANAGER, label: 'HOD', color: `${ROLE_IDENTITY[UserRole.DEPARTMENT_MANAGER].textClass} ${ROLE_IDENTITY[UserRole.DEPARTMENT_MANAGER].borderClass} ${ROLE_IDENTITY[UserRole.DEPARTMENT_MANAGER].bgClass}` },
  { role: UserRole.SYSTEM_ADMIN, label: 'Emergency', color: `${ROLE_IDENTITY[UserRole.SYSTEM_ADMIN].textClass} ${ROLE_IDENTITY[UserRole.SYSTEM_ADMIN].borderClass} ${ROLE_IDENTITY[UserRole.SYSTEM_ADMIN].bgClass}` },
];

// Circular SVG Health Gauge for Floor Visualization
const CircularHealthGauge: React.FC<{ value: number; size?: number }> = ({
  value,
  size = 54,
}) => {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  const strokeColor =
    clamped >= 85 ? '#10b981' : clamped >= 60 ? '#f59e0b' : '#f43f5e';

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute text-[11px] font-mono font-bold text-white">
        {clamped}%
      </span>
    </div>
  );
};

// SVG Health Ring for Equipment Visualization
const EquipmentHealthRing: React.FC<{ value: number; size?: number }> = ({
  value,
  size = 44,
}) => {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  const strokeColor =
    clamped >= 85 ? '#34d399' : clamped >= 60 ? '#fbbf24' : '#fb7185';

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(148,163,184,0.18)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute text-[10px] font-mono font-bold text-slate-100">
        {clamped}%
      </span>
    </div>
  );
};

export const RoleDashboards: React.FC<RoleDashboardsProps> = ({
  buildings,
  setBuildings,
  rooms3D,
  setRooms3D,
  selectedBuildingId,
  setSelectedBuildingId,
  selectedRoomId,
  setSelectedRoomId,
  activeLayer,
  setActiveLayer,
}) => {
  const {
    user,
    roleMetadata,
    socket,
    isConnected,
    logout,
    loginAsRole,
    authFetch,
  } = useAuth();

  const [complaints, setComplaints] = useState<CampusComplaint[]>([]);
  const [procurement, setProcurement] = useState<ProcurementItem[]>([]);
  const [adminUsers, setAdminUsers] = useState<AuthUser[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfigState | null>(null);

  // Dynamic Hierarchy Selection State (Building -> Floor -> Room -> Equipment)
  const [selectionScope, setSelectionScope] = useState<SelectionScope>('ROOM');
  const [selectedFloor, setSelectedFloor] = useState<number | 'ALL'>('ALL');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);

  // Top Navigation Popovers & Mission Control Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [missionControlOpen, setMissionControlOpen] = useState(false);

  // New Enterprise UX States: Breadcrumb, MiniMap, Camera Azimuth, Focus Trigger, Role Workspace Cards
  const [breadcrumbVisible, setBreadcrumbVisible] = useState(true);
  const [miniMapOpen, setMiniMapOpen] = useState(true);
  const [cameraAzimuth, setCameraAzimuth] = useState<number>(38);
  const [focusTrigger, setFocusTrigger] = useState<number>(0);
  const [dashboardCardsOpen, setDashboardCardsOpen] = useState(false);

  // Bottom Mini Timeline State
  const [timelineTab, setTimelineTab] = useState<BottomTimelineTab>('COMPLAINTS');
  const [timelineCollapsed, setTimelineCollapsed] = useState(true);

  // Room Panel & Enterprise Complaint Modal States
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [isPickingIn3D, setIsPickingIn3D] = useState(false);
  const [workOrderSubStatusMap, setWorkOrderSubStatusMap] = useState<
    Record<string, 'Open' | 'Accepted' | 'In Progress' | 'Waiting Parts' | 'Completed'>
  >({});
  const [issueCategory, setIssueCategory] = useState<CampusComplaint['category']>('HVAC_THERMAL');
  const [issuePriority, setIssuePriority] = useState<CampusComplaint['priority']>('HIGH');
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [updatingRepair, setUpdatingRepair] = useState(false);

  // HOD / Admin Technician Assignment State
  const [selectedTechOption, setSelectedTechOption] = useState(SPECIALIST_TECHNICIANS[0].name);
  const [selectedTechEta, setSelectedTechEta] = useState(SPECIALIST_TECHNICIANS[0].defaultEta);
  const [assigningTech, setAssigningTech] = useState(false);

  // Faculty / HOD Booking & Escalation State
  const [togglingBooking, setTogglingBooking] = useState(false);
  const [escalatingRoom, setEscalatingRoom] = useState(false);
  const [updatingSecurity, setUpdatingSecurity] = useState(false);

  // Super Admin Lightweight Settings Modal
  const [superAdminModalOpen, setSuperAdminModalOpen] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setActionToast(msg);
    window.setTimeout(() => {
      setActionToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const fetchBootstrapData = useCallback(async () => {
    try {
      const res = await authFetch('/api/campus/bootstrap');
      if (res.ok) {
        const data = await res.json();
        if (data.buildings) setBuildings(data.buildings);
        if (data.rooms3D) {
          setRooms3D(data.rooms3D);
          if (!selectedRoomId && data.rooms3D.length > 0) {
            const faultRoom = data.rooms3D.find(
              (r: CampusRoom3D) => r.operationalState === 'NOT_WORKING'
            );
            setSelectedRoomId(faultRoom ? faultRoom.id : data.rooms3D[0].id);
            if (faultRoom) setSelectedBuildingId(faultRoom.buildingId);
          }
        }
        if (data.complaints) setComplaints(data.complaints);
        if (data.procurement) setProcurement(data.procurement);
        if (data.users) setAdminUsers(data.users);
        if (data.systemConfig) setSystemConfig(data.systemConfig);
      }
    } catch {
      // ignore offline error
    }
  }, [authFetch, setBuildings, setRooms3D, selectedRoomId, setSelectedRoomId, setSelectedBuildingId]);

  useEffect(() => {
    fetchBootstrapData();
  }, [user?.role, fetchBootstrapData]);

  // Real-time Socket.IO Listeners for 3D Rooms, Complaints, and Building Telemetry
  useEffect(() => {
    if (!socket) return;

    const onRoom3DUpdated = (updatedRoom: CampusRoom3D) => {
      setRooms3D((prev) => prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)));
    };

    const onTelemetryUpdate = (updatedBldg: BuildingData) => {
      setBuildings((prev) => prev.map((b) => (b.id === updatedBldg.id ? updatedBldg : b)));
    };

    const onComplaintCreated = (newCmp: CampusComplaint) => {
      setComplaints((prev) => {
        if (prev.some((c) => c.id === newCmp.id)) return prev;
        return [newCmp, ...prev];
      });
    };

    const onComplaintAnalyzed = (updatedCmp: CampusComplaint) => {
      setComplaints((prev) => prev.map((c) => (c.id === updatedCmp.id ? updatedCmp : c)));
    };

    const onProcurementUpdated = (item: ProcurementItem) => {
      setProcurement((prev) => {
        const exists = prev.some((p) => p.id === item.id);
        return exists ? prev.map((p) => (p.id === item.id ? item : p)) : [item, ...prev];
      });
    };

    socket.on('room3d:updated', onRoom3DUpdated);
    socket.on('telemetry:update', onTelemetryUpdate);
    socket.on('complaint:created', onComplaintCreated);
    socket.on('complaint:analyzed', onComplaintAnalyzed);
    socket.on('procurement:updated', onProcurementUpdated);

    return () => {
      socket.off('room3d:updated', onRoom3DUpdated);
      socket.off('telemetry:update', onTelemetryUpdate);
      socket.off('complaint:created', onComplaintCreated);
      socket.off('complaint:analyzed', onComplaintAnalyzed);
      socket.off('procurement:updated', onProcurementUpdated);
    };
  }, [socket, setBuildings, setRooms3D]);

  // Keyboard Shortcuts: F (Focus Object), Esc (Go Back), M (Toggle MiniMap), B (Toggle Breadcrumb)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        if (e.key === 'Escape') {
          target.blur();
          setSearchFocused(false);
        }
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setFocusTrigger((prev) => prev + 1);
        showToast('Camera focused on selected 3D object (F)');
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setMiniMapOpen((prev) => !prev);
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setBreadcrumbVisible((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (dashboardCardsOpen) {
          setDashboardCardsOpen(false);
          return;
        }
        if (superAdminModalOpen) {
          setSuperAdminModalOpen(false);
          return;
        }
        setSelectionScope((prev) => {
          if (prev === 'EQUIPMENT') return 'ROOM';
          if (prev === 'ROOM') return 'FLOOR';
          if (prev === 'FLOOR') {
            setSelectedFloor('ALL');
            return 'BUILDING';
          }
          setSelectedFloor('ALL');
          return 'BUILDING';
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dashboardCardsOpen, superAdminModalOpen, showToast]);

  if (!user || !roleMetadata) return null;

  // Role Flags for the 7 Hackathon Roles
  const isStudent = user.role === UserRole.STUDENT;
  const isFaculty = user.role === UserRole.FACULTY;
  const isMaintenance = user.role === UserRole.TECHNICIAN;
  const isSecurity = user.role === UserRole.PROCUREMENT_APPROVER;
  const isAdmin = user.role === UserRole.FACILITIES_ADMIN;
  const isHOD = user.role === UserRole.DEPARTMENT_MANAGER;
  const isSuperAdmin = user.role === UserRole.SYSTEM_ADMIN;

  // HOD focuses on Departmental buildings; other roles see full campus
  const accessibleBuildings = isHOD
    ? buildings.filter(
        (b) => b.department === user.department || b.zone === 'Engineering' || b.zone === 'Science'
      )
    : buildings;

  const selectedBuilding =
    accessibleBuildings.find((b) => b.id === selectedBuildingId) ||
    accessibleBuildings[0] ||
    buildings[0];

  const buildingRooms = rooms3D.filter((r) => r.buildingId === selectedBuilding?.id);
  const floorFilteredRooms =
    selectedFloor === 'ALL'
      ? buildingRooms
      : buildingRooms.filter((r) => r.floor === selectedFloor);

  const selectedRoom =
    rooms3D.find((r) => r.id === selectedRoomId) || buildingRooms[0] || rooms3D[0] || null;

  const selectedEquipment =
    selectedRoom?.equipmentList.find((e) => e.id === selectedEquipmentId) ||
    selectedRoom?.equipmentList[0] ||
    null;

  const roomComplaints = selectedRoom
    ? complaints.filter(
        (c) =>
          (c.roomId === selectedRoom.id || selectedRoom.activeComplaintIds.includes(c.id)) &&
          c.status !== 'RESOLVED'
      )
    : [];

  const primaryDiagnosis = roomComplaints.find((c) => c.aiDiagnosis)?.aiDiagnosis;

  const roomProcurementItems = selectedRoom
    ? procurement.filter((p) => p.roomId === selectedRoom.id && p.status === 'PENDING_APPROVAL')
    : [];
  const allPendingProcurementItems = procurement.filter((p) => p.status === 'PENDING_APPROVAL');

  // Role-Scoped Capabilities inside the Shared 3D Digital Twin
  const canRaiseComplaint = isStudent || isFaculty || isAdmin || isSuperAdmin;
  const canBookRooms = isFaculty || isHOD || isAdmin || isSuperAdmin;
  const canExecuteRepair = isMaintenance || isAdmin || isSuperAdmin;
  const canAssignTechnicians = isHOD || isAdmin || isSuperAdmin;
  const canUseMissionControl = isAdmin || isSuperAdmin;
  const canTuneRoomUtilities = isFaculty || isAdmin || isSuperAdmin;
  const canManageSecurity = isSecurity || isAdmin || isSuperAdmin;
  const canEscalateHOD = isHOD || isSuperAdmin;
  const canApproveParts = isAdmin || isSuperAdmin;

  // Global Smart Search across Buildings, Floors, Rooms/Labs/Classrooms, Equipment, Complaints, and Technicians
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results: {
      id: string;
      label: string;
      sublabel: string;
      kind: 'BUILDING' | 'FLOOR' | 'ROOM' | 'LAB' | 'EQUIPMENT' | 'COMPLAINT' | 'TECHNICIAN';
      buildingId: string;
      floor?: number;
      roomId?: string;
      equipmentId?: string;
    }[] = [];

    // 1. Buildings & Block Aliases ("Block A" - "Block E")
    accessibleBuildings.forEach((b) => {
      const blockAlias = BLOCK_ALIASES[b.id] || 'Block';
      if (
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        blockAlias.toLowerCase().includes(q) ||
        b.zone.toLowerCase().includes(q)
      ) {
        results.push({
          id: `b-${b.id}`,
          label: `${blockAlias} (${b.code}) · ${b.name}`,
          sublabel: `Building · ${b.zone} Zone · ${b.floorsCount} Floors`,
          kind: 'BUILDING',
          buildingId: b.id,
        });
      }

      // 2. Floors in Building
      for (let fl = 1; fl <= (b.floorsCount || 3); fl++) {
        const floorText = `${blockAlias} ${b.code} floor ${fl} f${fl}`.toLowerCase();
        if (q.includes('floor') || q === `f${fl}`) {
          if (floorText.includes(q) || `floor ${fl}`.includes(q)) {
            results.push({
              id: `fl-${b.id}-${fl}`,
              label: `${blockAlias} (${b.code}) · Floor ${fl}`,
              sublabel: `${b.name} · Level ${fl}`,
              kind: 'FLOOR',
              buildingId: b.id,
              floor: fl,
            });
          }
        }
      }
    });

    // 3. Rooms, Labs, Classrooms & 4. Equipment & 6. Technicians
    rooms3D.forEach((r) => {
      const blockAlias = BLOCK_ALIASES[r.buildingId] || r.buildingCode;
      const isLab =
        r.roomType === 'Computer Lab' ||
        r.roomType === 'Research Lab' ||
        r.name.toLowerCase().includes('lab') ||
        r.name.toLowerCase().includes('cleanroom');

      // Match "Lab 205", "Computer Lab", room codes, room names
      const syntheticLabAlias = r.roomCode === 'SCI-205' ? 'lab 205 computer lab' : 'computer lab';
      if (
        r.name.toLowerCase().includes(q) ||
        r.roomCode.toLowerCase().includes(q) ||
        (r.roomType && r.roomType.toLowerCase().includes(q)) ||
        (isLab && syntheticLabAlias.includes(q))
      ) {
        results.push({
          id: `r-${r.id}`,
          label: `${r.roomCode} · ${r.name}`,
          sublabel: `${blockAlias} (${r.buildingCode}) · Floor ${r.floor} · ${r.roomType || 'Classroom'}`,
          kind: isLab ? 'LAB' : 'ROOM',
          buildingId: r.buildingId,
          floor: r.floor,
          roomId: r.id,
        });
      }

      // Equipment in Room ("Router", "Projector", etc.)
      r.equipmentList.forEach((eq) => {
        const routerAlias =
          eq.category === 'NETWORK' || (eq.type && eq.type.toLowerCase().includes('switch'))
            ? 'router network switch wifi gateway'
            : '';
        if (
          eq.name.toLowerCase().includes(q) ||
          (eq.type && eq.type.toLowerCase().includes(q)) ||
          eq.category.toLowerCase().includes(q) ||
          (routerAlias && routerAlias.includes(q))
        ) {
          results.push({
            id: `eq-${eq.id}`,
            label: `${eq.name}`,
            sublabel: `${eq.type || eq.category} in ${r.roomCode} (${blockAlias} · Floor ${r.floor})`,
            kind: 'EQUIPMENT',
            buildingId: r.buildingId,
            floor: r.floor,
            roomId: r.id,
            equipmentId: eq.id,
          });
        }
      });

      // Technician assigned to Room (plus "Technician Rahul" alias)
      const techSearchBlob =
        `${r.assignedTechnician} ${r.roomCode === 'ENG-201' ? 'Technician Rahul Verma' : ''}`.toLowerCase();
      if (techSearchBlob.includes(q) && (q.includes('tech') || q.includes('rahul') || q.length >= 3)) {
        results.push({
          id: `tech-${r.id}`,
          label: r.roomCode === 'ENG-201' && q.includes('rahul')
            ? `Technician Rahul Verma · Assigned to ${r.roomCode}`
            : `${r.assignedTechnician}`,
          sublabel: `Active in ${r.roomCode} (${r.name}) · ETA: ${r.eta}`,
          kind: 'TECHNICIAN',
          buildingId: r.buildingId,
          floor: r.floor,
          roomId: r.id,
        });
      }
    });

    // 5. Complaints ("Complaint #102", "CMP-2026-089", etc.)
    complaints.forEach((c, idx) => {
      const numAlias = `complaint #10${idx + 1} #102`;
      if (
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.locationDetail.toLowerCase().includes(q) ||
        numAlias.includes(q)
      ) {
        results.push({
          id: `cmp-${c.id}`,
          label: `${c.code} (${idx === 0 ? '#102' : `#10${idx + 1}`}) · ${c.title}`,
          sublabel: `${c.priority} · ${c.locationDetail}`,
          kind: 'COMPLAINT',
          buildingId: c.buildingId,
          roomId: c.roomId,
        });
      }
    });

    return results.slice(0, 9);
  }, [searchQuery, accessibleBuildings, rooms3D, complaints]);

  const getBuildingMetrics = (bldg: BuildingData) => {
    const bRooms = rooms3D.filter((r) => r.buildingId === bldg.id);
    const activeCmps = complaints.filter(
      (c) => c.buildingId === bldg.id && c.status !== 'RESOLVED'
    );
    const activeTechs = new Set(
      bRooms
        .filter((r) => r.operationalState === 'NOT_WORKING')
        .map((r) => r.assignedTechnician)
    ).size;

    const avgHealth =
      bRooms.length > 0
        ? Math.round(bRooms.reduce((acc, r) => acc + r.equipmentHealth, 0) / bRooms.length)
        : 98;
    const aiScore = Math.min(99, Math.max(72, avgHealth + (bldg.status === 'NOMINAL' ? 1 : -3)));

    const isOffline = bRooms.length === 0 && bldg.occupancy === 0;
    const hasCritical =
      bldg.status === 'CRITICAL' ||
      bldg.securityLockdown ||
      bRooms.some((r) => r.operationalState !== 'WORKING' && r.statusLevel === 'CRITICAL');
    const hasWarning =
      bldg.status === 'WARNING' ||
      bldg.loadSheddingActive ||
      bRooms.some((r) => r.operationalState !== 'WORKING');

    let badge = {
      emoji: '🟢',
      label: 'Healthy' as 'Healthy' | 'Maintenance' | 'Critical' | 'Offline',
      ledText: 'Green LED' as 'Green LED' | 'Yellow LED' | 'Red LED' | 'Gray LED',
      ledDotClass: 'bg-emerald-400 shadow-[0_0_8px_#10b981]',
      maintenanceStatus: 'Optimal · Scheduled Preventive',
      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
    };
    if (isOffline) {
      badge = {
        emoji: '⚪',
        label: 'Offline',
        ledText: 'Gray LED',
        ledDotClass: 'bg-slate-400 shadow-[0_0_8px_#94a3b8]',
        maintenanceStatus: 'Telemetry Offline',
        color: 'text-slate-300 bg-slate-500/20 border-slate-500/40',
      };
    } else if (hasCritical) {
      badge = {
        emoji: '🔴',
        label: 'Critical',
        ledText: 'Red LED',
        ledDotClass: 'bg-rose-500 shadow-[0_0_10px_#ef4444]',
        maintenanceStatus: `Emergency Dispatch (${activeTechs} Crew Active)`,
        color: 'text-rose-300 bg-rose-500/20 border-rose-500/40',
      };
    } else if (hasWarning) {
      badge = {
        emoji: '🟡',
        label: 'Maintenance',
        ledText: 'Yellow LED',
        ledDotClass: 'bg-amber-400 shadow-[0_0_10px_#f59e0b]',
        maintenanceStatus: `Active Maintenance (${activeTechs} Techs)`,
        color: 'text-amber-300 bg-amber-500/20 border-amber-500/40',
      };
    }

    return {
      healthScore: avgHealth,
      aiScore,
      activeComplaintsCount: activeCmps.length,
      activeTechniciansCount: activeTechs,
      maintenanceStatus: badge.maintenanceStatus,
      badge: {
        ...badge,
        ledColor: badge.ledDotClass,
        ledName: badge.ledText,
      },
    };
  };

  const getFloorMetrics = (bldgId: string, floorNum: number) => {
    const fRooms = rooms3D.filter((r) => r.buildingId === bldgId && r.floor === floorNum);
    const totalRooms = fRooms.length;
    const healthyRooms = fRooms.filter((r) => r.operationalState === 'WORKING').length;
    const faultRooms = totalRooms - healthyRooms;
    const occupied = fRooms.reduce((acc, r) => acc + r.occupancy.current, 0);
    const capacity = fRooms.reduce((acc, r) => acc + r.occupancy.capacity, 0) || 120;
    const occupancyPct = Math.min(100, Math.round((occupied / capacity) * 100));
    const health =
      fRooms.length > 0
        ? Math.round(fRooms.reduce((acc, r) => acc + r.equipmentHealth, 0) / fRooms.length)
        : 98;
    const fComplaints = complaints.filter(
      (c) =>
        c.status !== 'RESOLVED' &&
        fRooms.some((r) => r.id === c.roomId || r.activeComplaintIds.includes(c.id))
    ).length;

    const hasCritical = fRooms.some(
      (r) => r.operationalState !== 'WORKING' && r.statusLevel === 'CRITICAL'
    );
    const hasFault = fRooms.some((r) => r.operationalState === 'NOT_WORKING');

    const badge = hasCritical
      ? { emoji: '🔴', label: 'Critical', textClass: 'text-rose-400' }
      : hasFault
      ? { emoji: '🟡', label: 'Maintenance', textClass: 'text-amber-400' }
      : { emoji: '🟢', label: 'Healthy', textClass: 'text-emerald-400' };

    const hasElecFault = fRooms.some((r) => r.electricity.status === 'HARMONIC_FAULT');
    const hasElecWarn = fRooms.some((r) => r.electricity.status === 'LOAD_SHED');
    const electricityStatus = hasElecFault
      ? { emoji: '🔴', label: 'Critical (Harmonic Fault)', textClass: 'text-rose-400' }
      : hasElecWarn
      ? { emoji: '🟡', label: 'Warning (Load Shed)', textClass: 'text-amber-400' }
      : { emoji: '🟢', label: 'Healthy (Nominal)', textClass: 'text-emerald-400' };

    const hasWaterWarn = fRooms.some(
      (r) => r.ac.status === 'DRIFT_WARNING' || r.ac.status === 'FAULT'
    );
    const waterStatus = hasCritical
      ? { emoji: '🟡', label: 'Warning (Chilled Loop Drift)', textClass: 'text-amber-400' }
      : hasWaterWarn
      ? { emoji: '🟡', label: 'Warning (Valve Hysteresis)', textClass: 'text-amber-400' }
      : { emoji: '🟢', label: 'Healthy (Nominal Pressure)', textClass: 'text-emerald-400' };

    const hasNetCrit = fRooms.some((r) => r.internet.status === 'OFFLINE');
    const hasNetWarn = fRooms.some((r) => r.internet.status === 'DEGRADED');
    const internetStatus = hasNetCrit
      ? { emoji: '🔴', label: 'Critical (Offline)', textClass: 'text-rose-400' }
      : hasNetWarn
      ? { emoji: '🟡', label: 'Warning (Degraded)', textClass: 'text-amber-400' }
      : { emoji: '🟢', label: 'Healthy (Online 10G)', textClass: 'text-emerald-400' };

    return {
      totalRooms,
      healthyRooms,
      faultRooms,
      occupied,
      capacity,
      occupancyPct,
      health,
      fComplaints,
      badge,
      electricityStatus,
      waterStatus,
      internetStatus,
      rooms: fRooms,
    };
  };

  const handleSelectBuildingIn3D = (bldgId: string) => {
    setSelectedBuildingId(bldgId);
    setSelectedFloor('ALL');
    setSelectionScope('BUILDING');
    const firstRoomInBldg = rooms3D.find((r) => r.buildingId === bldgId);
    if (firstRoomInBldg) {
      setSelectedRoomId(firstRoomInBldg.id);
    }
  };

  const handleSelectFloorIn3D = (floor: number | 'ALL', bldgId?: string) => {
    if (bldgId) setSelectedBuildingId(bldgId);
    setSelectedFloor(floor);
    setSelectionScope(floor === 'ALL' ? 'BUILDING' : 'FLOOR');
    const targetBldgId = bldgId || selectedBuilding?.id;
    const firstRoomOnFloor = rooms3D.find(
      (r) => r.buildingId === targetBldgId && (floor === 'ALL' || r.floor === floor)
    );
    if (firstRoomOnFloor) {
      setSelectedRoomId(firstRoomOnFloor.id);
    }
  };

  const handleSelectRoomIn3D = (rmId: string, bldgId: string) => {
    const foundRoom = rooms3D.find((r) => r.id === rmId);
    setSelectedBuildingId(bldgId);
    if (foundRoom) {
      setSelectedFloor(foundRoom.floor);
    }
    setSelectedRoomId(rmId);
    setSelectionScope('ROOM');
    if (isPickingIn3D) {
      setIsPickingIn3D(false);
      setShowComplaintForm(true);
      showToast(
        `Auto-filled complaint form with ${foundRoom?.roomCode || 'Room'} from 3D Digital Twin`
      );
    }
  };

  const handleSelectEquipmentIn3D = (eqId: string, rmId: string, bldgId: string) => {
    const foundRoom = rooms3D.find((r) => r.id === rmId);
    setSelectedBuildingId(bldgId);
    if (foundRoom) {
      setSelectedFloor(foundRoom.floor);
    }
    setSelectedRoomId(rmId);
    setSelectedEquipmentId(eqId);
    setSelectionScope('EQUIPMENT');
  };

  // Student / Faculty / Admin / Super Admin: Raise Complaint on Clicked 3D Room
  const handleRaiseRoomComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || !issueTitle.trim() || !issueDesc.trim()) return;
    setSubmittingComplaint(true);
    try {
      const res = await authFetch(`/api/campus/rooms3d/${selectedRoom.id}/complaint`, {
        method: 'POST',
        body: JSON.stringify({
          category: issueCategory,
          priority: issuePriority,
          title: issueTitle.trim(),
          description: issueDesc.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.room) {
          setRooms3D((prev) => prev.map((r) => (r.id === data.room.id ? data.room : r)));
        }
        if (data.complaint) {
          setComplaints((prev) =>
            prev.some((c) => c.id === data.complaint.id)
              ? prev.map((c) => (c.id === data.complaint.id ? data.complaint : c))
              : [data.complaint, ...prev]
          );
        }
        if (data.building) {
          setBuildings((prev) => prev.map((b) => (b.id === data.building.id ? data.building : b)));
        }
        setIssueTitle('');
        setIssueDesc('');
        setShowComplaintForm(false);
        showToast(`Complaint submitted & AI diagnosis generated for ${selectedRoom.roomCode}`);
      }
    } finally {
      setSubmittingComplaint(false);
    }
  };

  // Maintenance / Admin / Super Admin: Update Repair Progress
  const handleUpdateRepairProgress = async (progress: number, stageLabel?: string) => {
    if (!selectedRoom) return;
    setUpdatingRepair(true);
    try {
      const res = await authFetch(`/api/campus/rooms3d/${selectedRoom.id}/repair`, {
        method: 'POST',
        body: JSON.stringify({ progress, stageLabel }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.room) {
          setRooms3D((prev) => prev.map((r) => (r.id === data.room.id ? data.room : r)));
        }
        if (data.building) {
          setBuildings((prev) => prev.map((b) => (b.id === data.building.id ? data.building : b)));
        }
        showToast(
          progress >= 100
            ? `${selectedRoom.roomCode} restored to Healthy state`
            : `${selectedRoom.roomCode} repair updated to ${progress}%`
        );
      }
    } finally {
      setUpdatingRepair(false);
    }
  };

  // HOD / Admin / Super Admin: Assign Maintenance Specialist
  const handleAssignTechnician = async () => {
    if (!selectedRoom) return;
    setAssigningTech(true);
    try {
      const res = await authFetch(`/api/campus/rooms3d/${selectedRoom.id}/assign-technician`, {
        method: 'POST',
        body: JSON.stringify({
          technicianName: selectedTechOption,
          eta: selectedTechEta,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.room) {
          setRooms3D((prev) => prev.map((r) => (r.id === data.room.id ? data.room : r)));
        }
        showToast(`Assigned ${selectedTechOption.split(' (')[0]} to ${selectedRoom.roomCode}`);
      }
    } finally {
      setAssigningTech(false);
    }
  };

  // Faculty / HOD / Admin: Book or Approve Room Reservation
  const handleToggleRoomBooking = async () => {
    if (!selectedRoom) return;
    setTogglingBooking(true);
    try {
      const res = await authFetch(`/api/campus/rooms3d/${selectedRoom.id}/booking`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.room) {
          setRooms3D((prev) => prev.map((r) => (r.id === data.room.id ? data.room : r)));
          showToast(
            `${selectedRoom.roomCode} booking status updated to ${data.room.occupancy.status}`
          );
        }
      }
    } finally {
      setTogglingBooking(false);
    }
  };

  // Security Role: Toggle Building Lockdown or Verify Room CCTV Cameras
  const handleSecurityBuildingLockdown = async () => {
    if (!selectedBuilding) return;
    setUpdatingSecurity(true);
    try {
      const nextLockdown = !selectedBuilding.securityLockdown;
      const res = await authFetch(`/api/campus/buildings/${selectedBuilding.id}/security`, {
        method: 'POST',
        body: JSON.stringify({ toggleLockdown: nextLockdown }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.building) {
          setBuildings((prev) => prev.map((b) => (b.id === data.building.id ? data.building : b)));
          showToast(
            nextLockdown
              ? `Perimeter Lockdown activated on ${selectedBuilding.code}`
              : `Perimeter Lockdown cleared on ${selectedBuilding.code}`
          );
        }
      }
    } finally {
      setUpdatingSecurity(false);
    }
  };

  const handleSecurityVerifyRoomCameras = async () => {
    if (!selectedBuilding || !selectedRoom) return;
    setUpdatingSecurity(true);
    try {
      const res = await authFetch(`/api/campus/buildings/${selectedBuilding.id}/security`, {
        method: 'POST',
        body: JSON.stringify({ roomId: selectedRoom.id, clearRoomAlert: true }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.room) {
          setRooms3D((prev) => prev.map((r) => (r.id === data.room.id ? data.room : r)));
          showToast(`CCTV feed verified & security alert cleared in ${selectedRoom.roomCode}`);
        }
      }
    } finally {
      setUpdatingSecurity(false);
    }
  };

  // HOD Role: Escalate Room Issue to Critical Priority
  const handleHODEscalateRoom = async () => {
    if (!selectedRoom) return;
    setEscalatingRoom(true);
    try {
      const res = await authFetch(`/api/campus/rooms3d/${selectedRoom.id}/escalate`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.room) {
          setRooms3D((prev) => prev.map((r) => (r.id === data.room.id ? data.room : r)));
          showToast(`Escalated ${selectedRoom.roomCode} to CRITICAL priority (ETA: 6 mins)`);
        }
      }
    } finally {
      setEscalatingRoom(false);
    }
  };

  // Tune Room AC Setpoint & Power Load Shedding
  const handleAdjustRoomAC = async (deltaC: number) => {
    if (!selectedRoom) return;
    const nextSetpoint = Number((selectedRoom.ac.setpointC + deltaC).toFixed(1));
    const res = await authFetch(`/api/campus/rooms3d/${selectedRoom.id}/controls`, {
      method: 'POST',
      body: JSON.stringify({ acSetpointC: nextSetpoint }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.room) {
        setRooms3D((prev) => prev.map((r) => (r.id === data.room.id ? data.room : r)));
        showToast(`${selectedRoom.roomCode} AC setpoint adjusted to ${nextSetpoint}°C`);
      }
    }
  };

  const handleToggleRoomLoadShed = async () => {
    if (!selectedRoom) return;
    const isShed = selectedRoom.electricity.status === 'LOAD_SHED';
    const res = await authFetch(`/api/campus/rooms3d/${selectedRoom.id}/controls`, {
      method: 'POST',
      body: JSON.stringify({ toggleElectricityLoadShed: !isShed }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.room) {
        setRooms3D((prev) => prev.map((r) => (r.id === data.room.id ? data.room : r)));
        showToast(
          !isShed
            ? `Load shedding enabled for ${selectedRoom.roomCode}`
            : `Nominal power restored for ${selectedRoom.roomCode}`
        );
      }
    }
  };

  // Request / Approve Equipment Requests from 3D Room Panel
  const handleRequestReplacementPart = async () => {
    if (!selectedRoom) return;
    const res = await authFetch('/api/campus/procurement', {
      method: 'POST',
      body: JSON.stringify({
        itemTitle: `Replacement Module for ${selectedRoom.roomCode} (${selectedRoom.name})`,
        vendor: 'Siemens Smart Infrastructure',
        buildingId: selectedRoom.buildingId,
        roomId: selectedRoom.id,
        amountUsd: 6800,
        urgency: 'EMERGENCY',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.requisition) {
        setProcurement((prev) =>
          prev.some((p) => p.id === data.requisition.id)
            ? prev.map((p) => (p.id === data.requisition.id ? data.requisition : p))
            : [data.requisition, ...prev]
        );
        showToast(`Replacement part requested for ${selectedRoom.roomCode}`);
      }
    }
  };

  const handleApprovePart = async (reqId: string, decision: 'APPROVED' | 'REJECTED') => {
    const res = await authFetch(`/api/campus/procurement/${reqId}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.requisition) {
        setProcurement((prev) =>
          prev.map((p) => (p.id === data.requisition.id ? data.requisition : p))
        );
        showToast(`Equipment request ${decision.toLowerCase()}`);
      }
    }
  };

  const handleUpdateSystemConfig = async (patch: Partial<SystemConfigState>) => {
    const res = await authFetch('/api/admin/system-config', {
      method: 'POST',
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.systemConfig) setSystemConfig(data.systemConfig);
    }
  };

  const healthyRoomsCount = rooms3D.filter((r) => r.operationalState === 'WORKING').length;
  const faultRoomsCount = rooms3D.filter((r) => r.operationalState === 'NOT_WORKING').length;

  // Role-Scoped Complaints Filtering
  const roleScopedComplaints = useMemo(() => {
    if (isStudent) {
      return complaints.filter(
        (c) =>
          c.reportedBy === user.fullName ||
          c.reporterRole === UserRole.STUDENT ||
          c.reportedBy.toLowerCase().includes('student') ||
          c.reportedBy.toLowerCase().includes('aarav')
      );
    }
    if (isSecurity) {
      const secList = complaints.filter(
        (c) =>
          c.category === 'STRUCTURAL_SAFETY' ||
          c.title.toLowerCase().includes('security') ||
          c.title.toLowerCase().includes('access') ||
          c.title.toLowerCase().includes('lock') ||
          c.title.toLowerCase().includes('camera')
      );
      return secList.length > 0 ? secList : complaints.slice(0, 1);
    }
    if (isFaculty || isHOD) {
      const deptBldgIds = new Set(
        buildings
          .filter(
            (b) =>
              b.department === user.department ||
              b.zone === 'Engineering' ||
              b.zone === 'Science'
          )
          .map((b) => b.id)
      );
      return complaints.filter((c) => deptBldgIds.has(c.buildingId));
    }
    return complaints;
  }, [complaints, isStudent, isSecurity, isFaculty, isHOD, user.fullName, user.department, buildings]);

  const openComplaints = roleScopedComplaints.filter((c) => c.status !== 'RESOLVED');
  const campusHealthAvg =
    rooms3D.length > 0
      ? Math.round(rooms3D.reduce((acc, r) => acc + r.equipmentHealth, 0) / rooms3D.length)
      : 96;

  const selectedBldgMetrics = selectedBuilding ? getBuildingMetrics(selectedBuilding) : null;
  const selectedFloorNum = typeof selectedFloor === 'number' ? selectedFloor : 1;
  const selectedFloorMetrics = selectedBuilding
    ? getFloorMetrics(selectedBuilding.id, selectedFloorNum)
    : null;

  const currentBlockAlias = selectedBuilding
    ? BLOCK_ALIASES[selectedBuilding.id] || selectedBuilding.code
    : 'Block A';

  // Role-Specific Floating Quick Action Button (FAB) Configuration
  const fabConfig = useMemo(() => {
    if (isStudent) {
      return {
        label: '+ Raise Complaint',
        colorClass:
          'from-sky-400 to-indigo-500 text-slate-950 shadow-sky-500/30 border-sky-300/50',
        onClick: () => {
          setSelectionScope('ROOM');
          setIsPickingIn3D(false);
          setShowComplaintForm(true);
          showToast(`Opening Enterprise Complaint Modal for ${selectedRoom?.roomCode || 'Room'}`);
        },
      };
    }
    if (isFaculty) {
      return {
        label: '+ Book Room',
        colorClass:
          'from-indigo-500 to-purple-500 text-white shadow-indigo-500/30 border-indigo-300/40',
        onClick: () => {
          setSelectionScope('ROOM');
          handleToggleRoomBooking();
        },
      };
    }
    if (isMaintenance) {
      return {
        label: '+ Update Repair',
        colorClass:
          'from-amber-400 to-orange-500 text-slate-950 shadow-amber-500/30 border-amber-300/50',
        onClick: () => {
          setSelectionScope('ROOM');
          handleUpdateRepairProgress(75, 'Updating Repair · Calibrating Subsystem');
        },
      };
    }
    if (isSecurity) {
      return {
        label: '+ Emergency Alert',
        colorClass:
          'from-rose-500 to-red-500 text-white shadow-rose-500/30 border-rose-300/50',
        onClick: () => {
          setSelectionScope('BUILDING');
          handleSecurityBuildingLockdown();
        },
      };
    }
    if (isAdmin) {
      return {
        label: '+ Mission Control',
        colorClass:
          'from-amber-300 to-yellow-200 text-slate-950 shadow-amber-500/30 border-amber-300/50',
        onClick: () => {
          setMissionControlOpen((prev) => !prev);
        },
      };
    }
    if (isHOD) {
      return {
        label: '+ Assign Technician',
        colorClass:
          'from-purple-500 to-indigo-500 text-white shadow-purple-500/30 border-purple-300/40',
        onClick: () => {
          setSelectionScope('ROOM');
          handleAssignTechnician();
        },
      };
    }
    return {
      label: '+ Manage Campus',
      colorClass:
        'from-rose-500 to-amber-500 text-white shadow-rose-500/30 border-rose-300/40',
      onClick: () => {
        setSuperAdminModalOpen(true);
      },
    };
  }, [
    isStudent,
    isFaculty,
    isMaintenance,
    isSecurity,
    isAdmin,
    isHOD,
    selectedRoom?.roomCode,
    showToast,
  ]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#060A12] text-slate-100 select-none">
      {/* =====================================================================
          100% FULL-VIEWPORT SHARED 3D DIGITAL TWIN
         ===================================================================== */}
      <div className="absolute inset-0 z-0">
        <CampusDigitalTwin
          buildings={accessibleBuildings}
          rooms3D={rooms3D}
          selectedBuildingId={selectedBuilding?.id || null}
          selectedFloor={selectedFloor}
          selectedRoomId={selectedRoom?.id || null}
          selectedEquipmentId={selectedEquipment?.id || null}
          selectionScope={selectionScope}
          pickModeActive={isPickingIn3D}
          onSelectBuilding={handleSelectBuildingIn3D}
          onSelectFloor={handleSelectFloorIn3D}
          onSelectRoom={handleSelectRoomIn3D}
          onSelectEquipment={handleSelectEquipmentIn3D}
          activeLayer={activeLayer}
          onLayerChange={setActiveLayer}
          mode="dashboard"
          focusTrigger={focusTrigger}
          onCameraAzimuthChange={setCameraAzimuth}
          onContextRaiseComplaint={(rmId, bldgId) => {
            handleSelectRoomIn3D(rmId, bldgId);
            setIsPickingIn3D(false);
            setShowComplaintForm(true);
          }}
        />
      </div>

      {/* Action Feedback Toast */}
      {actionToast && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-sky-400/40 text-xs font-mono text-sky-200 shadow-2xl pointer-events-none transition-all duration-300">
          {actionToast}
        </div>
      )}

      {/* =====================================================================
          TOP NAVIGATION: Brand · Role Workspace · Global Smart Search
         ===================================================================== */}
      <header className="absolute top-3 left-4 right-4 z-30 flex items-center justify-between gap-3 px-5 py-2.5 rounded-2xl bg-[#0B1221]/95 backdrop-blur-xl border border-white/15 shadow-2xl pointer-events-auto">
        {/* Left: Brand + Active Role Dashboard Label + Spacious Role Workspace Cards Toggle */}
        <div className="flex items-center gap-3">
          <a
            href="#campus"
            onClick={(e) => {
              e.preventDefault();
              setSelectionScope('BUILDING');
              setSelectedFloor('ALL');
            }}
            className="text-base font-bold tracking-tight text-white font-display whitespace-nowrap shrink-0 hover:text-sky-300 transition-colors"
          >
            Campus360
          </a>

          <span className="text-slate-600 hidden sm:inline">·</span>

          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className={`font-mono font-bold ${roleMetadata.badgeColor}`}>
              {roleMetadata.displayName}
            </span>
          </div>

          {/* Spacious Role Dashboard Cards Toggle */}
          <button
            type="button"
            onClick={() => setDashboardCardsOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer ${
              dashboardCardsOpen
                ? 'bg-sky-400 text-slate-950 shadow-lg shadow-sky-500/20'
                : 'bg-slate-900/90 text-slate-200 border border-white/15 hover:border-sky-400/40'
            }`}
            title={
              isStudent
                ? 'Open Student Portal Overview & My Complaints'
                : 'Open Spacious Role Workspace Cards'
            }
          >
            <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">
              {isStudent ? 'My Complaints & Rooms' : 'Role Workspace'}
            </span>
          </button>

          {canUseMissionControl && !isStudent && (
            <button
              type="button"
              onClick={() => setMissionControlOpen((prev) => !prev)}
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer ${
                missionControlOpen
                  ? 'bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20'
                  : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25'
              }`}
            >
              <Radar className="w-3.5 h-3.5" />
              <span>Mission Control</span>
            </button>
          )}
        </div>

        {/* Center: GLOBAL SMART SEARCH + Non-Student Role Switcher */}
        <div className="flex items-center gap-3 flex-1 justify-center max-w-4xl">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => window.setTimeout(() => setSearchFocused(false), 180)}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isStudent
                  ? 'Search Campus: "Block A", "Lab 205", "Computer Lab", "Projector"...'
                  : 'Smart Search: "Block A", "Lab 205", "Router", "Complaint #102", "Technician Rahul"...'
              }
              className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-950/95 border border-white/15 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/30 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Quick Example Chips when focused & empty */}
            {searchFocused && !searchQuery.trim() && (
              <div className="absolute left-0 right-0 top-10 bg-[#0B1221]/98 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-3 space-y-2 z-50">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>GLOBAL SMART SEARCH · LIVE 3D CAMERA FLY-TO</span>
                  <span className="text-sky-400">Instant Jump</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SEARCH_EXAMPLES.filter(
                    (ex) => !isStudent || !ex.toLowerCase().includes('technician')
                  ).map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearchQuery(ex);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-sky-500/20 border border-white/10 hover:border-sky-400/40 text-[11px] font-mono text-slate-200 hover:text-sky-300 transition-all cursor-pointer"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live Smart Search Suggestions */}
            {searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-10 bg-[#0B1221]/98 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-2 space-y-1 z-50 max-h-80 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400 font-mono">
                    No matching buildings, floors, rooms, or equipment found.
                  </div>
                ) : (
                  searchResults.map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        if (res.kind === 'BUILDING') {
                          handleSelectBuildingIn3D(res.buildingId);
                        } else if (res.kind === 'FLOOR' && res.floor) {
                          handleSelectFloorIn3D(res.floor, res.buildingId);
                        } else if (
                          (res.kind === 'ROOM' ||
                            res.kind === 'LAB' ||
                            res.kind === 'COMPLAINT' ||
                            res.kind === 'TECHNICIAN') &&
                          res.roomId
                        ) {
                          handleSelectRoomIn3D(res.roomId, res.buildingId);
                        } else if (
                          res.kind === 'EQUIPMENT' &&
                          res.roomId &&
                          res.equipmentId
                        ) {
                          handleSelectEquipmentIn3D(
                            res.equipmentId,
                            res.roomId,
                            res.buildingId
                          );
                        } else {
                          handleSelectBuildingIn3D(res.buildingId);
                        }
                        setFocusTrigger((prev) => prev + 1);
                        setSearchQuery('');
                        setSearchFocused(false);
                        showToast(`3D Camera flying to ${res.label}`);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800/90 text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-white block truncate">
                          {res.label}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 block truncate">
                          {res.sublabel}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-400/30 text-[10px] font-mono text-sky-300 shrink-0">
                        {res.kind}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Strictly hide Role Switching in Student Portal */}
          {!isStudent && (
            <div className="hidden 2xl:flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-white/10">
              {QUICK_ROLE_SWITCH_LIST.map((r) => {
                const isCurrent = r.role === user.role;
                return (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => loginAsRole(r.role)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                      isCurrent
                        ? `${r.color} border font-semibold`
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                    title={`Switch to ${r.label} Dashboard`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Notifications + Role Profile + Sign Out */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen((prev) => !prev);
                setProfileMenuOpen(false);
              }}
              className="relative p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200 cursor-pointer transition-transform hover:scale-105"
              title={isStudent ? 'My Complaint Updates' : 'Active Campus Alerts'}
            >
              <Bell className="w-4 h-4 text-sky-400" />
              {openComplaints.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-mono font-bold text-white flex items-center justify-center">
                  {openComplaints.length}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-11 w-80 bg-[#0B1221]/98 backdrop-blur-xl border border-white/20 rounded-2xl p-3.5 shadow-2xl space-y-2 z-50">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 text-xs">
                  <span className="font-bold text-white">
                    {isStudent ? 'My Complaint Updates' : 'Active Campus Alerts'}
                  </span>
                  <span className="font-mono text-[11px] text-rose-400">
                    {openComplaints.length} Open
                  </span>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {openComplaints.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2 text-center">
                      No active complaints in your queue.
                    </p>
                  ) : (
                    openComplaints.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          if (c.roomId) handleSelectRoomIn3D(c.roomId, c.buildingId);
                          setNotificationsOpen(false);
                        }}
                        className="w-full text-left p-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-white/10 text-xs space-y-1 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between font-mono text-[10px]">
                          <span className="text-amber-400 font-semibold">{c.code}</span>
                          <span className="text-rose-400">
                            {c.priority} · {c.status}
                          </span>
                        </div>
                        <p className="font-medium text-white truncate">{c.title}</p>
                        <p className="text-[11px] text-slate-400 truncate">{c.locationDetail}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileMenuOpen((prev) => !prev);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span className={`font-mono font-semibold ${roleMetadata.badgeColor}`}>
                {roleMetadata.displayName}
              </span>
              <span className="hidden sm:inline text-white font-medium">{user.fullName}</span>
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 top-11 w-72 bg-[#0B1221]/98 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl space-y-3 z-50 text-xs">
                <div className="pb-2.5 border-b border-white/10">
                  <span className={`font-mono text-[11px] font-semibold ${roleMetadata.badgeColor}`}>
                    {roleMetadata.dashboardTitle}
                  </span>
                  <h4 className="text-sm font-bold text-white mt-0.5">{user.fullName}</h4>
                  <p className="text-[11px] text-slate-400 font-mono">{user.email}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{user.department}</p>
                </div>

                {/* Strictly hide role switcher in Student Portal */}
                {!isStudent && (
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block mb-1.5">
                      QUICK SWITCH ROLE (DEMO):
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {QUICK_ROLE_SWITCH_LIST.map((r) => (
                        <button
                          key={r.role}
                          type="button"
                          onClick={() => {
                            loginAsRole(r.role);
                            setProfileMenuOpen(false);
                          }}
                          className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border text-left cursor-pointer ${
                            r.role === user.role
                              ? r.color
                              : 'bg-slate-950 border-white/10 text-slate-300 hover:text-white'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setSuperAdminModalOpen(true);
                      setProfileMenuOpen(false);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Super Admin Global Settings</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={logout}
                  className="w-full py-2 px-3 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isStudent ? 'Sign Out of Student Portal' : 'Return to Role Login Portals'}</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-xl transition-all hover:scale-[1.02] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isStudent ? 'Sign Out' : 'Switch Portal'}</span>
          </button>
        </div>
      </header>

      {/* =====================================================================
          2. CLICKABLE BREADCRUMB NAVIGATION BAR (Campus > Block A > Floor > Room > Equipment)
         ===================================================================== */}
      {breadcrumbVisible && (
        <nav
          aria-label="Spatial Breadcrumb"
          className="absolute top-[62px] left-1/2 -translate-x-1/2 z-20 flex items-center justify-between gap-4 px-4 py-1.5 rounded-xl bg-[#0B1221]/90 backdrop-blur-xl border border-white/15 shadow-xl pointer-events-auto text-xs font-mono max-w-[94vw] overflow-x-auto"
        >
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <button
              type="button"
              onClick={() => {
                setSelectedFloor('ALL');
                setSelectionScope('BUILDING');
                setFocusTrigger((p) => p + 1);
              }}
              className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                selectionScope === 'BUILDING' && selectedFloor === 'ALL'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              Campus
            </button>

            {selectedBuilding && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <button
                  type="button"
                  onClick={() => handleSelectBuildingIn3D(selectedBuilding.id)}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    selectionScope === 'BUILDING'
                      ? 'bg-sky-500 text-slate-950 font-bold'
                      : 'text-slate-200 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  {currentBlockAlias} ({selectedBuilding.code})
                </button>
              </>
            )}

            {selectedBuilding && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <button
                  type="button"
                  onClick={() =>
                    handleSelectFloorIn3D(
                      selectedFloor === 'ALL' ? selectedRoom?.floor || 1 : selectedFloor,
                      selectedBuilding.id
                    )
                  }
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    selectionScope === 'FLOOR'
                      ? 'bg-sky-500 text-slate-950 font-bold'
                      : 'text-slate-200 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  Floor {selectedFloor === 'ALL' ? selectedRoom?.floor || 1 : selectedFloor}
                </button>
              </>
            )}

            {selectedRoom && (selectionScope === 'ROOM' || selectionScope === 'EQUIPMENT') && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <button
                  type="button"
                  onClick={() => handleSelectRoomIn3D(selectedRoom.id, selectedRoom.buildingId)}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    selectionScope === 'ROOM'
                      ? 'bg-sky-500 text-slate-950 font-bold'
                      : 'text-slate-200 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  {selectedRoom.name} ({selectedRoom.roomCode})
                </button>
              </>
            )}

            {selectedEquipment && selectionScope === 'EQUIPMENT' && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <button
                  type="button"
                  onClick={() =>
                    selectedRoom &&
                    handleSelectEquipmentIn3D(
                      selectedEquipment.id,
                      selectedRoom.id,
                      selectedRoom.buildingId
                    )
                  }
                  className="px-2 py-0.5 rounded-md bg-sky-500 text-slate-950 font-bold cursor-pointer"
                >
                  {selectedEquipment.type || selectedEquipment.name}
                </button>
              </>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-white/10 text-[10px] text-slate-400 whitespace-nowrap">
            <span>
              <strong className="text-sky-300">F</strong> Focus
            </span>
            <span>·</span>
            <span>
              <strong className="text-sky-300">Esc</strong> Back
            </span>
            <span>·</span>
            <button
              type="button"
              onClick={() => setMiniMapOpen((p) => !p)}
              className="hover:text-white cursor-pointer"
            >
              <strong className="text-sky-300">M</strong> Minimap
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setBreadcrumbVisible(false)}
              className="hover:text-white cursor-pointer"
              title="Press B to toggle Breadcrumb"
            >
              <strong className="text-sky-300">B</strong> Hide
            </button>
          </div>
        </nav>
      )}

      {/* =====================================================================
          MISSION CONTROL OVERLAY BAR (Admin & Super Admin)
         ===================================================================== */}
      {missionControlOpen && canUseMissionControl && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-20 w-[min(860px,94vw)] bg-[#0B1221]/95 backdrop-blur-xl border border-cyan-400/40 rounded-2xl p-4 shadow-2xl pointer-events-auto space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <Radar className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white font-display">
                {roleMetadata.displayName.toUpperCase()} MISSION CONTROL · SHARED 3D DIGITAL TWIN
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setMissionControlOpen(false)}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs font-mono tabular-nums">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10">
              <span className="text-[10px] text-slate-400 block">CAMPUS HEALTH</span>
              <span className="text-base font-bold text-emerald-400">
                🟢 {campusHealthAvg}%
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10">
              <span className="text-[10px] text-slate-400 block">ACTIVE COMPLAINTS</span>
              <span className="text-base font-bold text-amber-400">
                {openComplaints.length} Open
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10">
              <span className="text-[10px] text-slate-400 block">MAINTENANCE CREWS</span>
              <span className="text-base font-bold text-sky-400">
                4 Active · 12m ETA
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-rose-500/30">
              <span className="text-[10px] text-rose-300 block">PRIORITY ALERT</span>
              <span className="text-xs font-bold text-rose-400 block mt-0.5">
                NRG-202 Harmonic Spike
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10">
              <span className="text-[10px] text-slate-400 block">3D HEATMAPS</span>
              <div className="flex gap-1 mt-1">
                {(['hvac', 'energy', 'occupancy'] as const).map((hm) => (
                  <button
                    key={hm}
                    type="button"
                    onClick={() => setActiveLayer(hm)}
                    className={`px-1.5 py-0.5 rounded text-[10px] uppercase cursor-pointer ${
                      activeLayer === hm
                        ? 'bg-cyan-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {hm}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                <strong className="text-indigo-300">AI Operational Recommendation:</strong> Shed 15% non-essential load in NRG-C Substation Bay 2 and prioritize CV-204 actuator calibration in SCI-302.
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSelectRoomIn3D('room-nrg-202', 'bldg-nrg-03')}
              className="px-2.5 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-mono text-[11px] shrink-0 cursor-pointer"
            >
              Inspect NRG-202 →
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          LEFT PANEL: CAMPUS HIERARCHY (Campus ↓ Building ↓ Floor ↓ Room)
         ===================================================================== */}
      <aside className="absolute top-28 left-4 z-20 w-80 max-w-[calc(100vw-2rem)] bg-[#0B1221]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-4 shadow-2xl pointer-events-auto flex flex-col gap-3 max-h-[calc(100vh-12rem)] overflow-y-auto">
        <div className="pb-2.5 border-b border-white/10">
          <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
            <span className={`font-semibold ${roleMetadata.badgeColor}`}>
              {roleMetadata.displayName.toUpperCase()} VIEW
            </span>
            <span className={isConnected ? 'text-emerald-400' : 'text-amber-400'}>
              🟢 {healthyRoomsCount} OK · 🔴 {faultRoomsCount} Fault
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-snug">
            {roleMetadata.dashboardSubtitle}
          </p>
        </div>

        {/* LEVEL 1: BUILDINGS (Building Name, Capacity, Current Occupancy, Health %, Complaint Count, Maintenance Status, Floor Count, Live Indicator) */}
        <div>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
            1. Campus Buildings ({accessibleBuildings.length})
          </span>
          <div className="space-y-1.5">
            {accessibleBuildings.map((b) => {
              const isSelected = b.id === selectedBuilding?.id;
              const m = getBuildingMetrics(b);
              const alias = BLOCK_ALIASES[b.id] || b.code;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelectBuildingIn3D(b.id)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all duration-200 hover:scale-[1.01] cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-sky-400 shadow-lg'
                      : 'bg-slate-950/80 border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="truncate">
                        {alias} ({b.code}) · {b.name}
                      </span>
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono tabular-nums shrink-0 ${m.badge.color}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${m.badge.ledColor}`} />
                      {m.badge.label}
                    </span>
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] font-mono tabular-nums text-slate-400">
                    <span>
                      Occ: <strong className="text-slate-200">{b.occupancy}</strong> / Cap:{' '}
                      <strong className="text-slate-200">{b.maxCapacity}</strong>
                    </span>
                    <span className="text-right text-sky-400">
                      Health: <strong>{m.healthScore}%</strong> · {b.floorsCount} Fl
                    </span>
                    <span>
                      Complaints: <strong className="text-amber-300">{m.activeComplaintsCount}</strong>
                    </span>
                    <span className="text-right truncate text-slate-300">
                      {m.maintenanceStatus}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* LEVEL 2: FLOORS IN SELECTED BUILDING */}
        {selectedBuilding && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                2. Floors in {selectedBuilding.code}
              </span>
              <button
                type="button"
                onClick={() => handleSelectFloorIn3D('ALL', selectedBuilding.id)}
                className={`text-[10px] font-mono px-2 py-0.5 rounded cursor-pointer ${
                  selectedFloor === 'ALL'
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Show All Floors
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: selectedBuilding.floorsCount || 3 }, (_, i) => i + 1).map(
                (fl) => {
                  const fm = getFloorMetrics(selectedBuilding.id, fl);
                  const active = selectedFloor === fl;
                  return (
                    <button
                      key={fl}
                      type="button"
                      onClick={() => handleSelectFloorIn3D(fl, selectedBuilding.id)}
                      className={`p-2 rounded-xl border text-left transition-all duration-200 hover:scale-[1.02] cursor-pointer ${
                        active
                          ? 'bg-sky-500/20 border-sky-400 text-white'
                          : 'bg-slate-950/80 border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono font-bold">
                        <span>Floor {fl}</span>
                        <span>{fm.badge.emoji}</span>
                      </div>
                      <span className="block text-[10px] font-mono tabular-nums text-slate-400 mt-0.5">
                        {fm.health}% · {fm.occupied}/{fm.capacity}
                      </span>
                      <span className="block text-[9px] font-mono tabular-nums text-slate-500">
                        {fm.healthyRooms}/{fm.totalRooms} OK · {fm.fComplaints} Iss
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* LEVEL 3: ROOMS ON FLOOR / BUILDING */}
        <div>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
            3. Interactive 3D Rooms ({floorFilteredRooms.length})
          </span>
          <div className="space-y-1.5">
            {floorFilteredRooms.map((rm) => {
              const isSelected = rm.id === selectedRoom?.id;
              const isClosed = rm.internet.status === 'OFFLINE' && rm.occupancy.current === 0;
              const isWorking = rm.operationalState === 'WORKING';
              const statusDot = isClosed
                ? '⚪ Closed'
                : isWorking
                ? '🟢 Working'
                : rm.statusLevel === 'CRITICAL' || rm.repairProgress < 40
                ? '🔴 Critical'
                : '🟡 Under Maintenance';

              return (
                <button
                  key={rm.id}
                  type="button"
                  onClick={() => handleSelectRoomIn3D(rm.id, rm.buildingId)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all duration-200 hover:scale-[1.01] cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-sky-400 shadow-lg'
                      : 'bg-slate-950/80 border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-semibold text-white">
                      {rm.roomCode} · F{rm.floor}
                    </span>
                    <span className="font-mono text-[10px]">{statusDot}</span>
                  </div>
                  <p className="text-xs text-slate-300 truncate mt-0.5">{rm.name}</p>
                  <div className="mt-1 flex items-center justify-between text-[10px] font-mono tabular-nums text-slate-400">
                    <span>
                      {rm.occupancy.current > 0 ? 'Occupied' : 'Available'} ({rm.occupancy.current}/
                      {rm.occupancy.capacity})
                    </span>
                    <span>Eq: {rm.equipmentList.length}</span>
                    <span className="text-sky-400">Health: {rm.equipmentHealth}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* =====================================================================
          RIGHT PANEL: DYNAMIC ROLE-SCOPED INSPECTOR PANEL
          (Building | Floor | Room | Equipment)
         ===================================================================== */}
      <aside className="absolute top-28 right-4 z-20 w-[435px] max-w-[calc(100vw-2rem)] bg-[#0B1221]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-5 shadow-2xl pointer-events-auto max-h-[calc(100vh-15rem)] overflow-y-auto space-y-4">
        {/* Role Active Banner */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10 text-xs">
          <div>
            <span className={`font-mono font-bold ${roleMetadata.badgeColor}`}>
              {isStudent ? 'STUDENT CAMPUS PORTAL' : roleMetadata.dashboardTitle}
            </span>
            <span className="block text-[11px] text-slate-400">
              Signed in as {user.fullName} ({roleMetadata.displayName})
            </span>
          </div>
          {isSuperAdmin && !isStudent && (
            <button
              type="button"
              onClick={() => setSuperAdminModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-mono cursor-pointer"
            >
              Global Settings
            </button>
          )}
        </div>

        {/* Dynamic Scope Tabs (Building / Floor / Room / Equipment) */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-950 border border-white/10 text-[11px] font-mono">
          {(
            [
              { id: 'BUILDING', label: 'Building' },
              { id: 'FLOOR', label: 'Floor' },
              { id: 'ROOM', label: 'Room' },
              { id: 'EQUIPMENT', label: 'Equipment' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectionScope(tab.id)}
              className={`py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                selectionScope === tab.id
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* =================================================================
            VIEW A: BUILDING STATUS PANEL
            (Healthy Green LED / Maintenance Yellow LED / Critical Red LED / Offline Gray LED)
           ================================================================= */}
        {selectionScope === 'BUILDING' && selectedBuilding && selectedBldgMetrics && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <span className="text-xs font-mono text-sky-400 block">
                  {currentBlockAlias} · {selectedBuilding.code} ({selectedBuilding.zone} Zone)
                </span>
                <h3 className="text-lg font-bold text-white font-display mt-0.5">
                  {selectedBuilding.name}
                </h3>
                <p className="text-xs text-slate-400">{selectedBuilding.department}</p>
              </div>
              <div className="text-right shrink-0">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold ${selectedBldgMetrics.badge.color}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full animate-pulse ${selectedBldgMetrics.badge.ledColor}`}
                  />
                  {selectedBldgMetrics.badge.label}
                </span>
                <span className="block text-[10px] font-mono text-slate-400 mt-1">
                  Live Indicator: {selectedBldgMetrics.badge.ledName}
                </span>
              </div>
            </div>

            {/* Required Building Card Fields */}
            <div className="grid grid-cols-2 gap-2.5 text-xs font-mono tabular-nums">
              <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10">
                <span className="text-[10px] text-slate-400 block">HEALTH % & LED</span>
                <span className="text-base font-bold text-emerald-400 mt-0.5 block">
                  {selectedBldgMetrics.badge.emoji} {selectedBldgMetrics.healthScore}% (
                  {selectedBldgMetrics.badge.ledName})
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10">
                <span className="text-[10px] text-slate-400 block">MAINTENANCE STATUS</span>
                <span className="text-sm font-bold text-sky-300 mt-0.5 block truncate">
                  {selectedBldgMetrics.maintenanceStatus}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10">
                <span className="text-[10px] text-slate-400 block">OCCUPANCY / CAPACITY</span>
                <span className="text-base font-bold text-white mt-0.5 block">
                  {selectedBuilding.occupancy} / {selectedBuilding.maxCapacity}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10">
                <span className="text-[10px] text-slate-400 block">FLOOR COUNT & COMPLAINTS</span>
                <span className="text-base font-bold text-amber-400 mt-0.5 block">
                  {selectedBuilding.floorsCount} Floors ·{' '}
                  {selectedBldgMetrics.activeComplaintsCount} Complaints
                </span>
              </div>
            </div>

            {/* Security Role Building Lockdown Action (Hidden from Student Portal) */}
            {!isStudent && canManageSecurity && (
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-semibold text-white block">
                      Building Perimeter Access
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {selectedBuilding.securityLockdown
                        ? '🔴 Critical · LOCKDOWN ACTIVE'
                        : '🟢 Healthy · Normal Campus Access'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={updatingSecurity}
                  onClick={handleSecurityBuildingLockdown}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs cursor-pointer shrink-0 ${
                    selectedBuilding.securityLockdown
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      : 'bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300'
                  }`}
                >
                  {selectedBuilding.securityLockdown ? 'Clear Lockdown' : 'Lockdown Building'}
                </button>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-[11px] font-mono text-slate-400 block">
                CLICKABLE FLOORS IN {selectedBuilding.code} ({selectedBuilding.floorsCount} FLOORS)
              </span>
              {Array.from({ length: selectedBuilding.floorsCount || 3 }, (_, i) => i + 1).map(
                (fl) => {
                  const fm = getFloorMetrics(selectedBuilding.id, fl);
                  return (
                    <button
                      key={fl}
                      type="button"
                      onClick={() => handleSelectFloorIn3D(fl, selectedBuilding.id)}
                      className="w-full p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-white/10 flex items-center justify-between text-xs cursor-pointer transition-all hover:scale-[1.01]"
                    >
                      <div className="text-left">
                        <span className="font-bold text-white font-mono">
                          Floor {fl} · {fm.badge.emoji} {fm.badge.label}
                        </span>
                        <span className="block text-[11px] text-slate-400 font-mono tabular-nums">
                          Rooms: {fm.totalRooms} ({fm.healthyRooms} OK / {fm.faultRooms} Fault) ·
                          Occ: {fm.occupied}/{fm.capacity} · Issues: {fm.fComplaints}
                        </span>
                      </div>
                      <CircularHealthGauge value={fm.health} size={40} />
                    </button>
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* =================================================================
            VIEW B: FLOOR STATUS PANEL
            (Number of rooms, Healthy rooms, Fault rooms, Occupancy, Capacity, Health %, Complaint count)
           ================================================================= */}
        {selectionScope === 'FLOOR' && selectedBuilding && selectedFloorMetrics && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <span className="text-xs font-mono text-sky-400 block">
                  {currentBlockAlias} ({selectedBuilding.code}) · {selectedBuilding.name}
                </span>
                <h3 className="text-lg font-bold text-white font-display mt-0.5">
                  Floor {selectedFloorNum} Operational Status
                </h3>
                <span className={`text-xs font-mono font-bold ${selectedFloorMetrics.badge.textClass}`}>
                  {selectedFloorMetrics.badge.emoji} {selectedFloorMetrics.badge.label}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <CircularHealthGauge value={selectedFloorMetrics.health} size={58} />
                <span className="text-[10px] font-mono text-slate-400 mt-1">
                  Health {selectedFloorMetrics.health}%
                </span>
              </div>
            </div>

            {/* Required Floor Telemetry Fields */}
            <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10">
                <span className="text-[10px] text-slate-400 block">TOTAL ROOMS</span>
                <span className="text-sm font-bold text-white mt-0.5 block">
                  {selectedFloorMetrics.totalRooms} Rooms
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10">
                <span className="text-[10px] text-slate-400 block">HEALTHY ROOMS</span>
                <span className="text-sm font-bold text-emerald-400 mt-0.5 block">
                  🟢 {selectedFloorMetrics.healthyRooms} Healthy
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10">
                <span className="text-[10px] text-slate-400 block">FAULT ROOMS</span>
                <span className="text-sm font-bold text-rose-400 mt-0.5 block">
                  🔴 {selectedFloorMetrics.faultRooms} Fault
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10">
                <span className="text-[10px] text-slate-400 block">OCCUPANCY / CAP</span>
                <span className="text-sm font-bold text-sky-300 mt-0.5 block">
                  {selectedFloorMetrics.occupied} / {selectedFloorMetrics.capacity} (
                  {selectedFloorMetrics.occupancyPct}%)
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10">
                <span className="text-[10px] text-slate-400 block">FLOOR HEALTH %</span>
                <span className="text-sm font-bold text-emerald-400 mt-0.5 block">
                  {selectedFloorMetrics.health}%
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10">
                <span className="text-[10px] text-slate-400 block">COMPLAINT COUNT</span>
                <span className="text-sm font-bold text-amber-400 mt-0.5 block">
                  {selectedFloorMetrics.fComplaints} Active
                </span>
              </div>
            </div>

            {/* Floor Utilities: Electricity Status, Water Status, Internet Status */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 space-y-2 text-xs font-mono">
              <span className="text-[10px] text-sky-400 uppercase block font-semibold">
                FLOOR UTILITY TELEMETRY
              </span>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Electricity Status</span>
                <span className={`font-semibold ${selectedFloorMetrics.electricityStatus.textClass}`}>
                  {selectedFloorMetrics.electricityStatus.emoji}{' '}
                  {selectedFloorMetrics.electricityStatus.label}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Water Status</span>
                <span className={`font-semibold ${selectedFloorMetrics.waterStatus.textClass}`}>
                  {selectedFloorMetrics.waterStatus.emoji} {selectedFloorMetrics.waterStatus.label}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">Internet Status</span>
                <span className={`font-semibold ${selectedFloorMetrics.internetStatus.textClass}`}>
                  {selectedFloorMetrics.internetStatus.emoji}{' '}
                  {selectedFloorMetrics.internetStatus.label}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-mono text-slate-400 block">
                CLICKABLE ROOMS ON FLOOR {selectedFloorNum}
              </span>
              {selectedFloorMetrics.rooms.map((rm) => {
                const rmStatusLabel =
                  rm.internet.status === 'OFFLINE' && rm.occupancy.current === 0
                    ? '⚪ Closed'
                    : rm.operationalState === 'WORKING'
                    ? '🟢 Working'
                    : rm.statusLevel === 'CRITICAL' || rm.repairProgress < 40
                    ? '🔴 Critical'
                    : '🟡 Under Maintenance';
                return (
                  <button
                    key={rm.id}
                    type="button"
                    onClick={() => handleSelectRoomIn3D(rm.id, rm.buildingId)}
                    className="w-full text-left p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-white/10 flex items-center justify-between text-xs cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <div>
                      <span className="font-mono font-bold text-white">
                        {rm.roomCode} · {rm.name}
                      </span>
                      <span className="block text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                        {rmStatusLabel} · Occ: {rm.occupancy.current}/{rm.occupancy.capacity}
                      </span>
                    </div>
                    <span
                      className={`font-mono font-semibold ${
                        rm.operationalState === 'WORKING' ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {rm.equipmentHealth}% →
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* =================================================================
            VIEW C: ROOM STATUS SIDE PANEL
            (Working/Under Maintenance/Critical/Closed, Occupied/Available, Health %, Current occupancy, Maximum capacity, WiFi strength, Temperature, Power usage, Equipment count, Complaint count)
           ================================================================= */}
        {selectionScope === 'ROOM' && selectedRoom && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-sky-400">
                  <span>{selectedRoom.buildingCode}</span>
                  <span>·</span>
                  <span>Floor {selectedRoom.floor}</span>
                  <span>·</span>
                  <span className="text-white font-semibold">{selectedRoom.roomCode}</span>
                  {selectedRoom.roomType && (
                    <>
                      <span>·</span>
                      <span className="text-indigo-300">{selectedRoom.roomType}</span>
                    </>
                  )}
                </div>
                <h3 className="text-base font-bold text-white font-display mt-0.5">
                  {selectedRoom.name}
                </h3>
                <span className="inline-block mt-1 px-2 py-0.5 rounded bg-slate-900 border border-white/10 text-[10px] font-mono text-slate-300">
                  {selectedRoom.occupancy.current > 0 ? 'Occupied' : 'Available'} ·{' '}
                  {selectedRoom.occupancy.status}
                </span>
              </div>

              {/* Live Room Status Badge (Working / Under Maintenance / Critical / Closed) */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold shrink-0 ${
                  selectedRoom.internet.status === 'OFFLINE' && selectedRoom.occupancy.current === 0
                    ? 'bg-slate-700/40 text-slate-300 border border-slate-500/40'
                    : selectedRoom.operationalState === 'WORKING'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : selectedRoom.statusLevel === 'CRITICAL' || selectedRoom.repairProgress < 40
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    selectedRoom.internet.status === 'OFFLINE' && selectedRoom.occupancy.current === 0
                      ? 'bg-slate-400'
                      : selectedRoom.operationalState === 'WORKING'
                      ? 'bg-emerald-400'
                      : selectedRoom.statusLevel === 'CRITICAL' || selectedRoom.repairProgress < 40
                      ? 'bg-rose-400'
                      : 'bg-amber-400'
                  }`}
                />
                {selectedRoom.internet.status === 'OFFLINE' && selectedRoom.occupancy.current === 0
                  ? '⚪ Closed'
                  : selectedRoom.operationalState === 'WORKING'
                  ? '🟢 Working'
                  : selectedRoom.statusLevel === 'CRITICAL' || selectedRoom.repairProgress < 40
                  ? '🔴 Critical'
                  : '🟡 Under Maintenance'}
              </span>
            </div>

            {/* Operational State / Deterministic Diagnosis */}
            {selectedRoom.operationalState === 'WORKING' ? (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-semibold text-emerald-300">
                    🟢 Healthy · Room Health {selectedRoom.equipmentHealth}%
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    Zero active faults. WiFi, Temperature, Power, and room equipment are operating within optimal parameters.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      {selectedRoom.statusLevel === 'CRITICAL' || selectedRoom.repairProgress < 40
                        ? '🔴 Critical Fault — Live Repair Progress'
                        : '🟡 Under Maintenance — Live Progress'}
                    </span>
                    <span className="font-mono tabular-nums font-bold text-white">
                      {selectedRoom.repairProgress}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 transition-all duration-300"
                      style={{ width: `${selectedRoom.repairProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-200 font-mono">
                    {selectedRoom.repairStageLabel}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/40 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                      AI Telemetry Summary
                    </span>
                    {primaryDiagnosis && (
                      <span className="font-mono text-[11px] text-indigo-200">
                        Severity {primaryDiagnosis.severityScore}/100
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    <strong className="text-slate-400">Root Cause:</strong>{' '}
                    {primaryDiagnosis?.rootCause ||
                      'Sensor telemetry deviation detected in room actuator control loop.'}
                  </p>
                  <p className="text-xs text-sky-200 leading-relaxed">
                    <strong className="text-slate-400">Recommended Action:</strong>{' '}
                    {primaryDiagnosis?.recommendedAction ||
                      'Isolate branch circuit and recalibrate room actuator valve.'}
                  </p>
                </div>
              </div>
            )}

            {/* Complete Required Room Status Telemetry Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono tabular-nums">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Users className="w-3 h-3 text-indigo-400" />
                  OCCUPANCY STATUS
                </span>
                <span className="text-xs font-bold text-white mt-0.5 block">
                  {selectedRoom.occupancy.current > 0 ? 'Occupied' : 'Available'} (
                  {selectedRoom.occupancy.current} / {selectedRoom.occupancy.capacity} Max)
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-emerald-400" />
                  ROOM HEALTH %
                </span>
                <span className="text-xs font-bold text-emerald-400 mt-0.5 block">
                  {selectedRoom.equipmentHealth >= 85
                    ? '🟢 Healthy'
                    : selectedRoom.equipmentHealth >= 55
                    ? '🟡 Warning'
                    : '🔴 Critical'}{' '}
                  ({selectedRoom.equipmentHealth}%)
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-sky-400" />
                  WIFI STRENGTH
                </span>
                <span className="text-xs font-bold text-sky-300 mt-0.5 block">
                  {selectedRoom.internet.speedMbps} Mbps · -42 dBm (
                  {selectedRoom.internet.status})
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-amber-400" />
                  TEMPERATURE
                </span>
                <span className="text-xs font-bold text-white mt-0.5 block">
                  {selectedRoom.ac.tempC}°C (Setpoint {selectedRoom.ac.setpointC}°C)
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  POWER USAGE
                </span>
                <span className="text-xs font-bold text-amber-300 mt-0.5 block">
                  {selectedRoom.electricity.loadKw} kW ({selectedRoom.electricity.status})
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Box className="w-3 h-3 text-sky-400" />
                  EQUIPMENT & COMPLAINTS
                </span>
                <span className="text-xs font-bold text-slate-200 mt-0.5 block">
                  {selectedRoom.equipmentList.length} Eq ·{' '}
                  {
                    roleScopedComplaints.filter(
                      (c) => c.roomId === selectedRoom.id && c.status !== 'RESOLVED'
                    ).length
                  }{' '}
                  Complaints
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10 col-span-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block">
                      Assigned Technician & Last Maintenance
                    </span>
                    <span className="font-medium text-white text-xs">
                      {selectedRoom.assignedTechnician} · {selectedRoom.lastMaintenance}
                    </span>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <span className="text-[10px] text-slate-400 block flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    ETA
                  </span>
                  <span className="text-amber-300 font-semibold">{selectedRoom.eta}</span>
                </div>
              </div>
            </div>

            {/* CLICKABLE ROOM EQUIPMENT LIST (With Equipment Health Ring) */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-sky-400 font-semibold uppercase">
                  INTERACTIVE ROOM EQUIPMENT ({selectedRoom.equipmentList.length})
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Click for full vendor/serial dossier
                </span>
              </div>
              <div className="space-y-1.5">
                {selectedRoom.equipmentList.map((eq) => (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() =>
                      handleSelectEquipmentIn3D(eq.id, selectedRoom.id, selectedRoom.buildingId)
                    }
                    className="w-full text-left p-2 rounded-lg bg-slate-950/90 hover:bg-slate-900 border border-white/10 hover:border-sky-400/40 flex items-center justify-between text-xs transition-all hover:scale-[1.01] cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Box className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <div>
                        <span className="text-white font-medium block">{eq.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {eq.type || eq.category} · {eq.powerConsumptionKw ?? 1.2} kW ·{' '}
                          {eq.status}
                        </span>
                      </div>
                    </div>
                    <EquipmentHealthRing value={eq.healthPercent} size={36} />
                  </button>
                ))}
              </div>
            </div>

            {/* ===============================================================
                ROLE-SPECIFIC ACTIONS & ROLE-SCOPED COMPLAINT VIEWS
                (Strictly isolated for Student Portal vs Admin/Maintenance/Security/HOD/Faculty)
               =============================================================== */}
            <div className="pt-2 border-t border-white/10 space-y-3">
              {/* ENTERPRISE COMPLAINT MODAL LAUNCHER (Student, Faculty, Admin, Super Admin) */}
              {canRaiseComplaint && (
                <button
                  type="button"
                  onClick={() => setShowComplaintForm(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-300 hover:to-indigo-400 text-slate-950 font-display font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 cursor-pointer transition-transform hover:scale-[1.01]"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Raise Enterprise Complaint in {selectedRoom.roomCode}</span>
                </button>
              )}

              {/* STUDENT PORTAL: Track Own Complaints Only (status, AI summary, estimated completion, assigned technician, history) */}
              {isStudent && (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-sky-500/30 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-sky-300 font-semibold flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-sky-400" />
                      MY SUBMITTED COMPLAINTS ({roleScopedComplaints.length})
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">Live Status Sync</span>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {roleScopedComplaints.slice(0, 4).map((c) => {
                      const matchedRm = rooms3D.find((r) => r.id === c.roomId);
                      const subStatus =
                        workOrderSubStatusMap[c.id] ||
                        (c.status === 'RESOLVED'
                          ? 'Completed'
                          : c.status === 'DISPATCHED'
                          ? 'In Progress'
                          : c.status === 'AI_TRIAGED'
                          ? 'Accepted'
                          : 'Open');
                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            if (c.roomId) handleSelectRoomIn3D(c.roomId, c.buildingId);
                          }}
                          className="p-2.5 rounded-xl bg-slate-950 border border-white/10 hover:border-sky-400/40 space-y-1.5 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between font-mono text-[10px]">
                            <span className="text-sky-400 font-bold">
                              {c.code} · {c.locationDetail}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded font-semibold ${
                                subStatus === 'Completed'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {subStatus}
                            </span>
                          </div>
                          <p className="text-white font-semibold">{c.title}</p>
                          <p className="text-[11px] text-slate-300 leading-snug">
                            <strong className="text-indigo-300">AI Summary:</strong>{' '}
                            {c.aiDiagnosis?.rootCause || c.description}
                          </p>
                          <div className="grid grid-cols-2 gap-1 pt-1 border-t border-white/5 text-[10px] font-mono text-slate-400">
                            <span>
                              Tech:{' '}
                              <strong className="text-slate-200">
                                {c.aiDiagnosis?.assignedSpecialty ||
                                  matchedRm?.assignedTechnician ||
                                  'Pending Dispatch'}
                              </strong>
                            </span>
                            <span className="text-right">
                              Est. Completion:{' '}
                              <strong className="text-amber-300">
                                {c.aiDiagnosis?.estimatedRepairMinutes
                                  ? `${c.aiDiagnosis.estimatedRepairMinutes} mins`
                                  : matchedRm?.eta || '35 mins'}
                              </strong>
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            History: Logged{' '}
                            {new Date(c.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            → AI Triaged (
                            {c.aiDiagnosis?.severityScore
                              ? `${Math.min(99, Math.max(85, c.aiDiagnosis.severityScore))}%`
                              : '94%'}
                            ) → {subStatus}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECURITY ROLE: CCTV Camera Verification, Building Lockdown & Security Complaints */}
              {!isStudent && canManageSecurity && (
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-emerald-300 font-semibold flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" />
                      SECURITY SURVEILLANCE · {selectedRoom.roomCode}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      CCTV Feed Active
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={updatingSecurity}
                      onClick={handleSecurityVerifyRoomCameras}
                      className="py-2 px-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify CCTV & Clear</span>
                    </button>

                    <button
                      type="button"
                      disabled={updatingSecurity}
                      onClick={handleSecurityBuildingLockdown}
                      className={`py-2 px-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                        selectedBuilding?.securityLockdown
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300'
                      }`}
                    >
                      {selectedBuilding?.securityLockdown ? (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Unlock {selectedBuilding.code}</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Lockdown {selectedBuilding?.code}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {isSecurity && (
                    <div className="pt-2 border-t border-emerald-500/20 space-y-1.5">
                      <span className="text-[10px] font-mono text-emerald-300 uppercase block">
                        SECURITY-SCOPED INCIDENTS ({roleScopedComplaints.length})
                      </span>
                      {roleScopedComplaints.slice(0, 3).map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            if (c.roomId) handleSelectRoomIn3D(c.roomId, c.buildingId);
                          }}
                          className="p-2 rounded-lg bg-slate-950 border border-white/10 text-[11px] cursor-pointer"
                        >
                          <div className="flex justify-between font-mono text-[10px]">
                            <span className="text-emerald-400 font-bold">{c.code}</span>
                            <span className="text-rose-300">{c.priority}</span>
                          </div>
                          <p className="text-white font-medium truncate">{c.title}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* HOD ROLE: Escalate Room Issue to Critical & Departmental Complaints */}
              {!isStudent && canEscalateHOD && (
                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-2 text-xs">
                  <span className="text-[11px] font-mono text-purple-300 font-semibold flex items-center gap-1.5">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    HOD DEPARTMENTAL AUTHORITY · {selectedRoom.roomCode}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={togglingBooking}
                      onClick={handleToggleRoomBooking}
                      className="py-2 px-2.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-slate-950 font-semibold text-xs cursor-pointer"
                    >
                      {selectedRoom.occupancy.status === 'AVAILABLE'
                        ? 'Approve Dept Booking'
                        : 'Release Dept Booking'}
                    </button>
                    <button
                      type="button"
                      disabled={escalatingRoom}
                      onClick={handleHODEscalateRoom}
                      className="py-2 px-2.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 font-semibold text-xs cursor-pointer"
                    >
                      {escalatingRoom ? 'Escalating...' : 'Escalate to Critical'}
                    </button>
                  </div>
                </div>
              )}

              {/* FACULTY / HOD: Departmental Complaints Feed */}
              {!isStudent && (isFaculty || isHOD) && (
                <div className="p-3 rounded-xl bg-indigo-950/25 border border-indigo-500/30 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-indigo-300 font-semibold">
                      DEPARTMENT COMPLAINTS ({roleScopedComplaints.length})
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {selectedBuilding?.department || 'Engineering'}
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {roleScopedComplaints.slice(0, 3).map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          if (c.roomId) handleSelectRoomIn3D(c.roomId, c.buildingId);
                        }}
                        className="p-2 rounded-lg bg-slate-950 border border-white/10 flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <span className="font-mono text-[10px] text-indigo-300 block">
                            {c.code} · {c.locationDetail}
                          </span>
                          <span className="text-white font-medium truncate block">{c.title}</span>
                        </div>
                        <span className="font-mono text-[10px] text-amber-300 shrink-0">
                          {c.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* HOD / ADMIN / SUPER ADMIN: Assign Maintenance Specialist & SLA Monitor */}
              {!isStudent && canAssignTechnicians && (
                <div className="p-3 rounded-xl bg-teal-950/30 border border-teal-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-teal-300 font-semibold flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5" />
                      ASSIGN TECHNICIAN · {selectedRoom.roomCode}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-300">
                      SLA Target: &lt; 45m
                    </span>
                  </div>
                  <select
                    value={selectedTechOption}
                    onChange={(e) => {
                      setSelectedTechOption(e.target.value);
                      const found = SPECIALIST_TECHNICIANS.find((t) => t.name === e.target.value);
                      if (found) setSelectedTechEta(found.defaultEta);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-xs text-white"
                  >
                    {SPECIALIST_TECHNICIANS.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={selectedTechEta}
                      onChange={(e) => setSelectedTechEta(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-xs text-white font-mono"
                    />
                    <button
                      type="button"
                      disabled={assigningTech}
                      onClick={handleAssignTechnician}
                      className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs cursor-pointer shrink-0"
                    >
                      {assigningTech ? 'Assigning...' : 'Assign'}
                    </button>
                  </div>
                </div>
              )}

              {/* MAINTENANCE / ADMIN / SUPER ADMIN: Work Order Status Controls
                  (Open | Accepted | In Progress | Waiting Parts | Completed) */}
              {!isStudent && canExecuteRepair && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-amber-300 font-semibold block">
                      LIVE WORK ORDER STATUS · {selectedRoom.roomCode}
                    </span>
                    <span className="text-[10px] font-mono text-amber-400">Socket.IO Live</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {(
                      [
                        { label: 'Open', progress: 15, stage: 'Open · Awaiting Crew Acceptance' },
                        {
                          label: 'Accepted',
                          progress: 35,
                          stage: 'Accepted · Technician En Route',
                        },
                        {
                          label: 'In Progress',
                          progress: 70,
                          stage: 'In Progress · Active Subsystem Repair',
                        },
                        {
                          label: 'Waiting Parts',
                          progress: 50,
                          stage: 'Waiting Parts · OEM Component Requested',
                        },
                        {
                          label: 'Completed',
                          progress: 100,
                          stage: 'Completed · All Systems Nominal',
                        },
                      ] as const
                    ).map((st) => (
                      <button
                        key={st.label}
                        type="button"
                        disabled={updatingRepair}
                        onClick={() => {
                          const activeRoomComplaint = complaints.find(
                            (c) => c.roomId === selectedRoom.id && c.status !== 'RESOLVED'
                          );
                          if (activeRoomComplaint) {
                            setWorkOrderSubStatusMap((prev) => ({
                              ...prev,
                              [activeRoomComplaint.id]: st.label,
                            }));
                          }
                          handleUpdateRepairProgress(st.progress, st.stage);
                        }}
                        className={`py-1.5 px-1 rounded-lg border text-[10px] font-mono font-semibold cursor-pointer transition-colors ${
                          st.label === 'Completed'
                            ? 'bg-emerald-500/25 hover:bg-emerald-500 hover:text-slate-950 border-emerald-500/40 text-emerald-300'
                            : 'bg-slate-900 hover:bg-amber-500/30 border-white/15 text-amber-200'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleRequestReplacementPart}
                    className="w-full py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs text-slate-300 cursor-pointer"
                  >
                    + Request Replacement Part for {selectedRoom.roomCode}
                  </button>
                </div>
              )}

              {/* ADMIN / SUPER ADMIN: All Campus Complaints & Priority / SLA Control */}
              {!isStudent && (isAdmin || isSuperAdmin) && (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-white/15 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-sky-300 font-semibold">
                      ALL CAMPUS COMPLAINTS & SLA ({complaints.length})
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      SLA Compliance: 96.4%
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {complaints.slice(0, 4).map((c) => (
                      <div
                        key={c.id}
                        className="p-2 rounded-lg bg-slate-950 border border-white/10 space-y-1"
                      >
                        <div className="flex items-center justify-between font-mono text-[10px]">
                          <button
                            type="button"
                            onClick={() => {
                              if (c.roomId) handleSelectRoomIn3D(c.roomId, c.buildingId);
                            }}
                            className="text-sky-400 font-bold hover:underline cursor-pointer"
                          >
                            {c.code} · {c.locationDetail}
                          </button>
                          <span className="text-amber-300">
                            {workOrderSubStatusMap[c.id] || c.status}
                          </span>
                        </div>
                        <p className="text-white font-medium truncate">{c.title}</p>
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="text-[10px] font-mono text-slate-400 truncate">
                            Tech: {c.aiDiagnosis?.assignedSpecialty || 'Auto-Dispatched'}
                          </span>
                          <select
                            value={c.priority}
                            onChange={(e) => {
                              const nextPri = e.target.value as CampusComplaint['priority'];
                              setComplaints((prev) =>
                                prev.map((item) =>
                                  item.id === c.id ? { ...item, priority: nextPri } : item
                                )
                              );
                              showToast(`Updated ${c.code} priority to ${nextPri}`);
                            }}
                            className="px-1.5 py-0.5 rounded bg-slate-900 border border-white/15 text-[10px] font-mono text-rose-300"
                          >
                            <option value="LOW">LOW</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="HIGH">HIGH</option>
                            <option value="CRITICAL">CRITICAL</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ADMIN / SUPER ADMIN: Approve Equipment Requests */}
              {!isStudent &&
                canApproveParts &&
                (roomProcurementItems.length > 0 || allPendingProcurementItems.length > 0) && (
                  <div className="p-3 rounded-xl bg-rose-950/25 border border-rose-500/30 space-y-2">
                    <span className="text-[11px] font-mono text-rose-300 font-semibold flex items-center gap-1.5">
                      <PackageCheck className="w-3.5 h-3.5" />
                      EQUIPMENT REPLACEMENT APPROVALS (
                      {roomProcurementItems.length || allPendingProcurementItems.length})
                    </span>
                    {(roomProcurementItems.length > 0
                      ? roomProcurementItems
                      : allPendingProcurementItems.slice(0, 2)
                    ).map((req) => (
                      <div key={req.id} className="space-y-1.5 text-xs">
                        <div className="flex justify-between gap-2">
                          <span className="text-white font-medium">{req.itemTitle}</span>
                          <span className="font-mono text-rose-300 font-semibold shrink-0">
                            ${req.amountUsd.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleApprovePart(req.id, 'APPROVED')}
                            className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs cursor-pointer"
                          >
                            Approve Part
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApprovePart(req.id, 'REJECTED')}
                            className="py-1.5 px-3 rounded-lg bg-rose-500/20 text-rose-300 text-xs cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              {/* FACULTY / ADMIN: Book Room */}
              {!isStudent && canBookRooms && !isHOD && (
                <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">Room Booking Status</span>
                      <span className="font-mono font-semibold text-indigo-300">
                        {selectedRoom.occupancy.status}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={togglingBooking}
                    onClick={handleToggleRoomBooking}
                    className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-xs cursor-pointer"
                  >
                    {selectedRoom.occupancy.status === 'AVAILABLE'
                      ? 'Book Room'
                      : 'Release Room'}
                  </button>
                </div>
              )}

              {/* FACULTY / ADMIN / SUPER ADMIN: Room AC & Power Controls */}
              {!isStudent && canTuneRoomUtilities && (
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-sky-400" />
                      AC Setpoint:
                    </span>
                    <div className="flex items-center gap-1.5 font-mono tabular-nums">
                      <button
                        type="button"
                        onClick={() => handleAdjustRoomAC(-0.5)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                      >
                        -0.5°C
                      </button>
                      <span className="text-sky-300 px-1.5">{selectedRoom.ac.setpointC}°C</span>
                      <button
                        type="button"
                        onClick={() => handleAdjustRoomAC(0.5)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                      >
                        +0.5°C
                      </button>
                    </div>
                  </div>

                  {(isAdmin || isSuperAdmin) && (
                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <span className="text-slate-400">Microgrid Power Mode:</span>
                      <button
                        type="button"
                        onClick={handleToggleRoomLoadShed}
                        className={`px-2.5 py-1 rounded font-mono text-[11px] font-semibold cursor-pointer ${
                          selectedRoom.electricity.status === 'LOAD_SHED'
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        {selectedRoom.electricity.status === 'LOAD_SHED'
                          ? 'Restore Full Power'
                          : 'Enable Load Shed (-20%)'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================
            VIEW D: INTERACTIVE EQUIPMENT DOSSIER PANEL
            (Health, Warranty, Maintenance History, Power Consumption, Vendor, Serial Number, Current Status, Complaint History)
           ================================================================= */}
        {selectionScope === 'EQUIPMENT' && selectedRoom && selectedEquipment && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <span className="text-xs font-mono text-sky-400 block">
                  INTERACTIVE EQUIPMENT DOSSIER · {selectedRoom.roomCode}
                </span>
                <h3 className="text-base font-bold text-white font-display mt-0.5">
                  {selectedEquipment.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Type: {selectedEquipment.type || selectedEquipment.category}
                </p>
              </div>
              <div className="flex flex-col items-center">
                <EquipmentHealthRing value={selectedEquipment.healthPercent} size={52} />
                <span className="text-[10px] font-mono text-slate-400 mt-1">
                  Health Ring
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs font-mono tabular-nums">
              <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10">
                <span className="text-[10px] text-slate-400 block">HEALTH & CURRENT STATUS</span>
                <span
                  className={`text-sm font-bold mt-0.5 block ${
                    selectedEquipment.healthPercent >= 85 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {selectedEquipment.status === 'WORKING' ? '🟢 Working' : '🔴 Fault'} (
                  {selectedEquipment.healthPercent}%)
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10">
                <span className="text-[10px] text-slate-400 block">POWER CONSUMPTION</span>
                <span className="text-sm font-bold text-amber-300 mt-0.5 block">
                  {selectedEquipment.powerConsumptionKw ?? 1.4} kW
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10">
                <span className="text-[10px] text-slate-400 block">OEM VENDOR</span>
                <span className="text-xs font-semibold text-white mt-0.5 block truncate">
                  {selectedEquipment.category === 'HVAC'
                    ? 'Daikin Commercial'
                    : selectedEquipment.category === 'NETWORK'
                    ? 'Cisco Meraki Enterprise'
                    : selectedEquipment.category === 'AV_LAB'
                    ? 'Epson Pro Laser'
                    : 'Siemens Smart Infrastructure'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10">
                <span className="text-[10px] text-slate-400 block">SERIAL NUMBER</span>
                <span className="text-xs font-semibold text-sky-300 mt-0.5 block truncate">
                  SN-{selectedRoom.roomCode}-{selectedEquipment.id.slice(-5).toUpperCase()}-X9
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10 col-span-2">
                <span className="text-[10px] text-slate-400 block">WARRANTY COVERAGE</span>
                <span className="text-xs text-emerald-300 mt-0.5 block">
                  {selectedEquipment.warranty || 'Valid until 2029-06 (Enterprise OEM 24/7 SLA)'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10 col-span-2">
                <span className="text-[10px] text-slate-400 block">
                  MAINTENANCE HISTORY & LAST SERVICE
                </span>
                <span className="text-xs text-slate-200 mt-0.5 block">
                  {selectedEquipment.lastService || selectedRoom.lastMaintenance} · Preventive
                  calibration verified
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 space-y-1.5 text-xs">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">
                EQUIPMENT COMPLAINT HISTORY
              </span>
              {selectedEquipment.complaintHistory &&
              selectedEquipment.complaintHistory.length > 0 ? (
                selectedEquipment.complaintHistory.map((hist, i) => (
                  <div
                    key={i}
                    className="p-2 rounded bg-slate-950 border border-white/10 font-mono text-[11px] text-amber-300"
                  >
                    {hist}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">
                  Zero historical faults recorded. Operating within manufacturer specifications.
                </p>
              )}
            </div>

            {canRaiseComplaint && (
              <button
                type="button"
                onClick={() => setShowComplaintForm(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                + Report Issue with {selectedEquipment.name}
              </button>
            )}

            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">
                OTHER EQUIPMENT IN {selectedRoom.roomCode}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedRoom.equipmentList.map((eq) => (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => setSelectedEquipmentId(eq.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono cursor-pointer ${
                      eq.id === selectedEquipment.id
                        ? 'bg-sky-500 text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {eq.type || eq.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectionScope('ROOM')}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white cursor-pointer"
            >
              ← Back to {selectedRoom.roomCode} Room Status
            </button>
          </div>
        )}
      </aside>

      {/* =====================================================================
          5. FLOATING CONTEXT ACTION PANEL (Changes dynamically per selected scope)
         ===================================================================== */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#0B1221]/92 backdrop-blur-xl border border-sky-400/35 shadow-2xl text-xs">
          <span className="px-2 py-0.5 rounded-md bg-sky-500/20 border border-sky-400/40 font-mono text-[10px] font-bold text-sky-300 uppercase">
            {selectionScope} ACTIONS
          </span>

          {selectionScope === 'BUILDING' && selectedBuilding && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectFloorIn3D(1, selectedBuilding.id)}
                className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-sky-500 hover:text-slate-950 text-slate-200 font-medium transition-all hover:scale-105 cursor-pointer flex items-center gap-1"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>View Floors</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFocusTrigger((p) => p + 1);
                  showToast(
                    `${selectedBuilding.code} Health: ${selectedBldgMetrics?.healthScore}% · ${selectedBldgMetrics?.badge.ledName}`
                  );
                }}
                className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-sky-500 hover:text-slate-950 text-slate-200 font-medium transition-all hover:scale-105 cursor-pointer flex items-center gap-1"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Building Health</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimelineTab('COMPLAINTS');
                  setTimelineCollapsed(false);
                }}
                className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-sky-500 hover:text-slate-950 text-slate-200 font-medium transition-all hover:scale-105 cursor-pointer"
              >
                {isStudent ? 'My Complaints' : `Complaints (${selectedBldgMetrics?.activeComplaintsCount || 0})`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveLayer('occupancy');
                  showToast(`Switched 3D Heatmap to Occupancy for ${selectedBuilding.code}`);
                }}
                className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-sky-500 hover:text-slate-950 text-slate-200 font-medium transition-all hover:scale-105 cursor-pointer"
              >
                Occupancy ({selectedBuilding.occupancy}/{selectedBuilding.maxCapacity})
              </button>
            </div>
          )}

          {selectionScope === 'FLOOR' && selectedBuilding && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const firstRm = selectedFloorMetrics?.rooms[0];
                  if (firstRm) handleSelectRoomIn3D(firstRm.id, firstRm.buildingId);
                }}
                className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-sky-500 hover:text-slate-950 text-slate-200 font-medium transition-all hover:scale-105 cursor-pointer"
              >
                View Rooms ({selectedFloorMetrics?.rooms.length || 0})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFocusTrigger((p) => p + 1);
                  showToast(
                    `Floor ${selectedFloorNum} Status: ${selectedFloorMetrics?.badge.label} (${selectedFloorMetrics?.health}%)`
                  );
                }}
                className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-sky-500 hover:text-slate-950 text-slate-200 font-medium transition-all hover:scale-105 cursor-pointer"
              >
                Floor Status
              </button>
              {!isStudent && (
                <button
                  type="button"
                  onClick={() => {
                    setTimelineTab('MAINTENANCE');
                    setTimelineCollapsed(false);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-sky-500 hover:text-slate-950 text-slate-200 font-medium transition-all hover:scale-105 cursor-pointer"
                >
                  Maintenance
                </button>
              )}
            </div>
          )}

          {selectionScope === 'ROOM' && selectedRoom && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowComplaintForm(true)}
                className="px-2.5 py-1 rounded-xl bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-slate-950 border border-sky-400/40 font-semibold transition-all hover:scale-105 cursor-pointer"
              >
                Raise Complaint
              </button>
              {!isStudent && canBookRooms && (
                <button
                  type="button"
                  onClick={handleToggleRoomBooking}
                  className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-indigo-500 hover:text-white text-slate-200 font-medium transition-all hover:scale-105 cursor-pointer"
                >
                  Book Room
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const firstEq = selectedRoom.equipmentList[0];
                  if (firstEq) {
                    handleSelectEquipmentIn3D(
                      firstEq.id,
                      selectedRoom.id,
                      selectedRoom.buildingId
                    );
                  }
                }}
                className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-sky-500 hover:text-slate-950 text-slate-200 font-medium transition-all hover:scale-105 cursor-pointer"
              >
                Equipment ({selectedRoom.equipmentList.length})
              </button>
              <button
                type="button"
                onClick={() =>
                  showToast(
                    `${selectedRoom.roomCode} Health: ${selectedRoom.equipmentHealth}% · Occupancy: ${selectedRoom.occupancy.current}/${selectedRoom.occupancy.capacity}`
                  )
                }
                className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-sky-500 hover:text-slate-950 text-slate-200 font-medium transition-all hover:scale-105 cursor-pointer flex items-center gap-1"
              >
                <History className="w-3.5 h-3.5" />
                <span>Room Health</span>
              </button>
            </div>
          )}

          {selectionScope === 'EQUIPMENT' && selectedEquipment && selectedRoom && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setFocusTrigger((p) => p + 1);
                  showToast(
                    `${selectedEquipment.name} Health: ${selectedEquipment.healthPercent}% (${selectedEquipment.status})`
                  );
                }}
                className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 font-medium transition-all hover:scale-105 cursor-pointer"
              >
                View Health ({selectedEquipment.healthPercent}%)
              </button>
              <button
                type="button"
                onClick={() =>
                  showToast(
                    `Last Service: ${selectedEquipment.lastService || selectedRoom.lastMaintenance}`
                  )
                }
                className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-sky-500 hover:text-slate-950 text-slate-200 font-medium transition-all hover:scale-105 cursor-pointer"
              >
                Maintenance History
              </button>
              <button
                type="button"
                onClick={() =>
                  showToast(
                    `Warranty: ${selectedEquipment.warranty || 'Valid until 2029-06 (OEM SLA)'}`
                  )
                }
                className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-sky-500 hover:text-slate-950 text-slate-200 font-medium transition-all hover:scale-105 cursor-pointer"
              >
                Warranty
              </button>
              <button
                type="button"
                onClick={() =>
                  showToast(
                    `Live Power Draw: ${selectedEquipment.powerConsumptionKw ?? 1.4} kW`
                  )
                }
                className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-amber-400 hover:text-slate-950 text-slate-200 font-medium transition-all hover:scale-105 cursor-pointer flex items-center gap-1"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Power Usage</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          3. ROLE-SPECIFIC FLOATING QUICK ACTION BUTTON (FAB)
         ===================================================================== */}
      <button
        type="button"
        onClick={fabConfig.onClick}
        className={`fixed bottom-16 left-6 z-30 px-4 py-3 rounded-2xl bg-gradient-to-r ${fabConfig.colorClass} border font-display font-bold text-xs shadow-2xl flex items-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95 pointer-events-auto cursor-pointer`}
      >
        <Sparkles className="w-4 h-4" />
        <span>{fabConfig.label}</span>
      </button>

      {/* =====================================================================
          4. MINI CAMPUS MAP (Bottom-Right Interactive Radar & Building Navigator)
         ===================================================================== */}
      {miniMapOpen ? (
        <div className="fixed bottom-14 right-4 z-30 w-64 bg-[#0B1221]/95 backdrop-blur-xl border border-white/20 rounded-2xl p-3 shadow-2xl pointer-events-auto space-y-2 transition-all duration-300">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-sky-400 font-bold flex items-center gap-1">
              <Compass className="w-3.5 h-3.5" />
              MINI CAMPUS MAP
            </span>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300">
                {selectedBuilding?.code || 'ALL'} ·{' '}
                {selectedFloor === 'ALL' ? 'All Fl' : `F${selectedFloor}`}
              </span>
              <button
                type="button"
                onClick={() => setMiniMapOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
                title="Minimize Minimap (M)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 2D Spatial Radar Canvas */}
          <div className="relative w-full h-36 rounded-xl bg-slate-950 border border-white/10 overflow-hidden">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />

            {/* Camera Direction Frustum Cone */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 pointer-events-none transition-transform duration-150"
              style={{ transform: `translate(-50%, -50%) rotate(${cameraAzimuth}deg)` }}
            >
              <div
                className="w-full h-full mx-auto"
                style={{
                  background:
                    'conic-gradient(from -28deg at 50% 50%, rgba(56,189,248,0.28) 0deg, rgba(56,189,248,0.02) 56deg, transparent 56deg)',
                  borderRadius: '9999px',
                }}
              />
            </div>

            {/* User Location Pin */}
            <div
              className="absolute left-1/2 bottom-2.5 -translate-x-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[9px] font-mono text-emerald-300 pointer-events-none"
              title="Your Campus Location"
            >
              <MapPin className="w-2.5 h-2.5 text-emerald-400" />
              <span>YOU</span>
            </div>

            {/* Interactive Campus Building Nodes on Minimap */}
            {[
              { id: 'bldg-eng-01', code: 'ENG-A', alias: 'A', left: '16%', top: '24%' },
              { id: 'bldg-sci-02', code: 'SCI-B', alias: 'B', left: '66%', top: '22%' },
              { id: 'bldg-nrg-03', code: 'NRG-C', alias: 'C', left: '42%', top: '44%' },
              { id: 'bldg-lib-04', code: 'LIB-D', alias: 'D', left: '18%', top: '66%' },
              { id: 'bldg-bio-05', code: 'BIO-E', alias: 'E', left: '68%', top: '64%' },
            ].map((node) => {
              const bldg = buildings.find((b) => b.id === node.id);
              if (!bldg) return null;
              const isCurrent = selectedBuilding?.id === node.id;
              const m = getBuildingMetrics(bldg);
              const dotColor =
                m.badge.label === 'Critical'
                  ? 'border-rose-400 bg-rose-500/30 text-rose-200'
                  : m.badge.label === 'Maintenance'
                  ? 'border-amber-400 bg-amber-500/30 text-amber-200'
                  : 'border-emerald-400 bg-emerald-500/25 text-emerald-200';

              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => {
                    handleSelectBuildingIn3D(node.id);
                    setFocusTrigger((p) => p + 1);
                    showToast(`Minimap navigated to Block ${node.alias} (${node.code})`);
                  }}
                  style={{ left: node.left, top: node.top }}
                  className={`absolute px-2 py-1 rounded-lg border text-[10px] font-mono font-bold transition-all duration-200 hover:scale-110 cursor-pointer ${
                    isCurrent
                      ? 'bg-sky-400 text-slate-950 border-white shadow-lg shadow-sky-400/50 scale-110 z-10'
                      : dotColor
                  }`}
                  title={`Click to fly to Block ${node.alias} (${bldg.name})`}
                >
                  {node.code}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>Cam: {((cameraAzimuth % 360) + 360) % 360}°</span>
            <span className="text-sky-300">Click block to fly</span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setMiniMapOpen(true)}
          className="fixed bottom-14 right-4 z-30 px-3 py-2 rounded-xl bg-[#0B1221]/95 border border-white/20 text-xs font-mono text-sky-300 shadow-xl flex items-center gap-1.5 hover:border-sky-400 pointer-events-auto cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Open Mini Map (M)</span>
        </button>
      )}

      {/* =====================================================================
          BOTTOM PANEL: MINI TIMELINE
          (Students only see their own Complaints tracker; Admin/Maintenance/Security see full feeds)
         ===================================================================== */}
      <section className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 w-[min(860px,92vw)] pointer-events-auto">
        <div className="bg-[#0B1221]/95 backdrop-blur-xl border border-white/15 rounded-2xl px-4 py-2 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {(isStudent
                ? ([
                    {
                      id: 'COMPLAINTS',
                      label: `My Submitted Complaints (${roleScopedComplaints.length})`,
                    },
                  ] as const)
                : ([
                    { id: 'COMPLAINTS', label: `Complaints (${roleScopedComplaints.length})` },
                    { id: 'MAINTENANCE', label: `Maintenance Progress (${faultRoomsCount} Active)` },
                    { id: 'SECURITY_FEED', label: `Building Security (${buildings.length} Zones)` },
                  ] as const)
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTimelineTab(t.id);
                    setTimelineCollapsed(false);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    timelineTab === t.id && !timelineCollapsed
                      ? 'bg-sky-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setTimelineCollapsed((prev) => !prev)}
              className="text-[11px] font-mono text-slate-400 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              {timelineCollapsed ? 'Expand ▲' : 'Minimize ▼'}
            </button>
          </div>

          {!timelineCollapsed && (
            <div className="mt-2.5 pt-2.5 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-2.5 max-h-28 overflow-y-auto">
              {(timelineTab === 'COMPLAINTS' || isStudent) &&
                roleScopedComplaints.slice(0, 3).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      if (c.roomId) handleSelectRoomIn3D(c.roomId, c.buildingId);
                    }}
                    className="text-left p-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-white/10 text-xs cursor-pointer"
                  >
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-amber-400 font-semibold">{c.code}</span>
                      <span
                        className={
                          c.status === 'RESOLVED' ? 'text-emerald-400' : 'text-rose-400'
                        }
                      >
                        {c.priority} · {workOrderSubStatusMap[c.id] || c.status}
                      </span>
                    </div>
                    <p className="text-white font-medium truncate mt-0.5">{c.title}</p>
                    <p className="text-[10px] font-mono text-slate-400 truncate">
                      {c.locationDetail} · Tech: {c.aiDiagnosis?.assignedSpecialty || 'Assigned'}
                    </p>
                  </button>
                ))}

              {!isStudent &&
                timelineTab === 'MAINTENANCE' &&
                rooms3D
                  .filter((r) => r.operationalState === 'NOT_WORKING')
                  .slice(0, 3)
                  .map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSelectRoomIn3D(r.id, r.buildingId)}
                      className="text-left p-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-white/10 text-xs cursor-pointer"
                    >
                      <div className="flex items-center justify-between font-mono text-[10px]">
                        <span className="text-sky-400 font-semibold">{r.roomCode}</span>
                        <span className="text-amber-300">{r.repairProgress}% · {r.eta}</span>
                      </div>
                      <p className="text-white font-medium truncate mt-0.5">
                        {r.assignedTechnician}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 truncate">
                        {r.repairStageLabel}
                      </p>
                    </button>
                  ))}

              {!isStudent &&
                timelineTab === 'SECURITY_FEED' &&
                buildings.slice(0, 3).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleSelectBuildingIn3D(b.id)}
                    className="text-left p-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-white/10 text-xs cursor-pointer"
                  >
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-emerald-400 font-semibold">{b.code}</span>
                      <span className={b.securityLockdown ? 'text-rose-400' : 'text-emerald-400'}>
                        {b.securityLockdown ? 'LOCKDOWN' : 'CCTV NOMINAL'}
                      </span>
                    </div>
                    <p className="text-white font-medium truncate mt-0.5">{b.name}</p>
                    <p className="text-[10px] font-mono text-slate-400 truncate">
                      Occupancy: {b.occupancy}/{b.maxCapacity}
                    </p>
                  </button>
                ))}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          9. SPACIOUS ROLE WORKSPACE GLASS CARDS OVERLAY
         ===================================================================== */}
      {dashboardCardsOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-xl p-6 md:p-10 overflow-y-auto pointer-events-auto">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/15">
              <div>
                <span className={`text-xs font-mono font-bold uppercase ${roleMetadata.badgeColor}`}>
                  {roleMetadata.displayName} WORKSPACE · SPACIOUS ENTERPRISE OVERVIEW
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-white font-display mt-1">
                  Welcome back, {user.fullName}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Select any card, shortcut, or complaint below to fly directly to that location inside the 3D Digital Twin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDashboardCardsOpen(false)}
                className="px-5 py-2.5 rounded-2xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-xl cursor-pointer transition-transform hover:scale-105"
              >
                <span>Return to 3D Digital Twin</span>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Quick Statistics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-6 rounded-3xl bg-[#0B1221]/90 border border-white/15 shadow-2xl space-y-2">
                <span className="text-xs font-mono text-slate-400">OVERALL CAMPUS HEALTH</span>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-emerald-400 font-mono">
                    {campusHealthAvg}%
                  </span>
                  <CircularHealthGauge value={campusHealthAvg} size={50} />
                </div>
                <p className="text-xs text-slate-400">
                  {healthyRoomsCount} Healthy Rooms · {faultRoomsCount} Under Maintenance
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-[#0B1221]/90 border border-white/15 shadow-2xl space-y-2">
                <span className="text-xs font-mono text-slate-400">
                  {isStudent ? 'MY SUBMITTED COMPLAINTS' : 'ACTIVE COMPLAINTS'}
                </span>
                <div className="text-3xl font-bold text-amber-400 font-mono">
                  {roleScopedComplaints.length} Tracked
                </div>
                <p className="text-xs text-slate-400">
                  {isStudent
                    ? 'Real-time status, AI summary & technician ETA'
                    : 'AI Root-Cause Diagnosis active across all 5 blocks'}
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-[#0B1221]/90 border border-white/15 shadow-2xl space-y-2">
                <span className="text-xs font-mono text-slate-400">PINNED BLOCK STATUS</span>
                <div className="text-xl font-bold text-white font-display">
                  {currentBlockAlias} ({selectedBuilding?.code})
                </div>
                <p className="text-xs text-emerald-400 font-mono">
                  {selectedBldgMetrics?.badge.emoji} {selectedBldgMetrics?.badge.label} · Occupancy{' '}
                  {selectedBuilding?.occupancy}/{selectedBuilding?.maxCapacity}
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-[#0B1221]/90 border border-white/15 shadow-2xl space-y-2">
                <span className="text-xs font-mono text-slate-400">ROLE QUICK ACTION</span>
                <button
                  type="button"
                  onClick={() => {
                    setDashboardCardsOpen(false);
                    fabConfig.onClick();
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer transition-transform hover:scale-[1.02]"
                >
                  {fabConfig.label}
                </button>
                <p className="text-[11px] text-slate-400">
                  Instant 1-click workflow in 3D Twin
                </p>
              </div>
            </div>

            {/* 2. Pinned Shortcuts & Role-Scoped Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Pinned Shortcuts */}
              <div className="p-6 rounded-3xl bg-[#0B1221]/90 border border-white/15 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-sky-400" />
                    Pinned 3D Rooms
                  </h3>
                  <span className="text-[11px] font-mono text-sky-400">1-Click Fly</span>
                </div>
                <div className="space-y-2.5">
                  {rooms3D.slice(0, 4).map((rm) => (
                    <button
                      key={rm.id}
                      type="button"
                      onClick={() => {
                        handleSelectRoomIn3D(rm.id, rm.buildingId);
                        setFocusTrigger((p) => p + 1);
                        setDashboardCardsOpen(false);
                      }}
                      className="w-full text-left p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-900 border border-white/10 hover:border-sky-400/40 flex items-center justify-between text-xs transition-all cursor-pointer"
                    >
                      <div>
                        <span className="font-bold text-white block">
                          {rm.roomCode} · {rm.name}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {BLOCK_ALIASES[rm.buildingId] || rm.buildingCode} · Floor {rm.floor} · Occ{' '}
                          {rm.occupancy.current}/{rm.occupancy.capacity}
                        </span>
                      </div>
                      <span className="font-mono text-sky-400">Fly →</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Room Status & Equipment Health Overview */}
              <div className="p-6 rounded-3xl bg-[#0B1221]/90 border border-white/15 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {isStudent ? 'Campus Room & Lab Availability' : "Today's Maintenance & Status"}
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-400">Live Sync</span>
                </div>
                <div className="space-y-2.5 text-xs">
                  {rooms3D.slice(0, 3).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        handleSelectRoomIn3D(r.id, r.buildingId);
                        setFocusTrigger((p) => p + 1);
                        setDashboardCardsOpen(false);
                      }}
                      className="w-full text-left p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-900 border border-white/10 space-y-1 cursor-pointer"
                    >
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="text-sky-300 font-bold">
                          {r.roomCode} · {r.name}
                        </span>
                        <span
                          className={
                            r.operationalState === 'WORKING' ? 'text-emerald-400' : 'text-amber-300'
                          }
                        >
                          Health {r.equipmentHealth}%
                        </span>
                      </div>
                      <p className="text-white font-medium">
                        {r.occupancy.current > 0 ? 'Occupied' : 'Available'} ({r.occupancy.current}/
                        {r.occupancy.capacity} Capacity)
                      </p>
                      <p className="text-[11px] text-slate-400">
                        WiFi: {r.internet.speedMbps} Mbps · Temp: {r.ac.tempC}°C
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Role-Scoped Complaints & Events */}
              <div className="p-6 rounded-3xl bg-[#0B1221]/90 border border-white/15 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    {isStudent ? 'My Tracked Complaints' : 'Role-Scoped Complaints'}
                  </h3>
                  <span className="text-[11px] font-mono text-amber-400">
                    {roleScopedComplaints.length} Tracked
                  </span>
                </div>
                <div className="space-y-2.5 text-xs">
                  {roleScopedComplaints.slice(0, 3).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        if (c.roomId) handleSelectRoomIn3D(c.roomId, c.buildingId);
                        setFocusTrigger((p) => p + 1);
                        setDashboardCardsOpen(false);
                      }}
                      className="w-full text-left p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-900 border border-white/10 space-y-1 cursor-pointer"
                    >
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="text-amber-400 font-bold">{c.code}</span>
                        <span className="text-rose-400">
                          {c.priority} · {workOrderSubStatusMap[c.id] || c.status}
                        </span>
                      </div>
                      <p className="text-white font-medium truncate">{c.title}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {c.aiDiagnosis?.rootCause || c.locationDetail}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ENTERPRISE GLASSMORPHISM COMPLAINT MODAL
          (Step 1 Location Selector + 3D Twin Picker, Step 2 14 Categories & Attachments, Step 3 Single-Call AI & pgvector >90% Duplicate Check)
         ===================================================================== */}
      <EnterpriseComplaintModal
        isOpen={showComplaintForm}
        isPickingIn3D={isPickingIn3D}
        onStartPickIn3D={() => {
          setIsPickingIn3D(true);
          showToast('Click any Building → Floor → Room in the 3D Digital Twin to auto-fill location');
        }}
        onStopPickIn3D={() => setIsPickingIn3D(false)}
        onClose={() => {
          setShowComplaintForm(false);
          setIsPickingIn3D(false);
        }}
        buildings={accessibleBuildings}
        rooms3D={rooms3D}
        existingComplaints={complaints}
        selectedBuildingId={selectedBuilding?.id || accessibleBuildings[0]?.id || ''}
        selectedFloor={selectedFloor === 'ALL' ? selectedRoom?.floor || 1 : selectedFloor}
        selectedRoomId={selectedRoom?.id || rooms3D[0]?.id || ''}
        selectedEquipmentId={selectedEquipmentId}
        onSelectBuilding={(bId) => handleSelectBuildingIn3D(bId)}
        onSelectFloor={(fl, bId) => handleSelectFloorIn3D(fl, bId)}
        onSelectRoom={(rmId, bId) => handleSelectRoomIn3D(rmId, bId)}
        authFetch={authFetch}
        onComplaintFinalized={(payload) => {
          if (payload.room) {
            setRooms3D((prev) => prev.map((r) => (r.id === payload.room!.id ? payload.room! : r)));
          }
          if (payload.complaint) {
            setComplaints((prev) =>
              prev.some((c) => c.id === payload.complaint!.id)
                ? prev
                : [payload.complaint!, ...prev]
            );
          }
          showToast(
            payload.summaryMessage ||
              `Enterprise Complaint ${payload.complaint?.code || ''} logged & synced across 3D Digital Twin`
          );
        }}
      />

      {/* =====================================================================
          SUPER ADMIN LIGHTWEIGHT GLOBAL SETTINGS & ROLE DIRECTORY MODAL
          (Strictly blocked from Student Portal)
         ===================================================================== */}
      {superAdminModalOpen && isSuperAdmin && !isStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 pointer-events-auto">
          <div className="w-full max-w-2xl bg-[#0B1221] border border-white/20 rounded-2xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white font-display">
                  Super Admin · Global Digital Twin & Role Directory
                </h3>
                <p className="text-xs text-slate-400">
                  Manage global AI triage settings and switch across all 7 campus role portals
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSuperAdminModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {systemConfig && (
              <div className="p-4 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-white block">
                    Automatic 1-Call Gemini AI Complaint Diagnosis
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Automatically diagnose root cause and assign specialty when a complaint is submitted
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateSystemConfig({
                      autoAiTriageOnComplaint: !systemConfig.autoAiTriageOnComplaint,
                    })
                  }
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold cursor-pointer ${
                    systemConfig.autoAiTriageOnComplaint
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {systemConfig.autoAiTriageOnComplaint ? 'ACTIVE' : 'PAUSED'}
                </button>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-xs font-mono text-rose-400 font-semibold block">
                7 CAMPUS ROLES ({adminUsers.length || 7} ACCOUNTS)
              </span>
              <div className="space-y-2">
                {QUICK_ROLE_SWITCH_LIST.map((r) => {
                  const matchedUser = adminUsers.find((u) => u.role === r.role);
                  return (
                    <div
                      key={r.role}
                      className="p-3 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-white">{r.label}</span>
                        {matchedUser && (
                          <span className="text-slate-400">
                            {' '}
                            · {matchedUser.fullName} ({matchedUser.email})
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          loginAsRole(r.role);
                          setSuperAdminModalOpen(false);
                        }}
                        className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 font-mono text-[11px] cursor-pointer"
                      >
                        Switch to {r.label} →
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

