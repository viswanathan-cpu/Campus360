export enum UserRole {
  STUDENT = 'STUDENT',
  FACULTY = 'FACULTY',
  TECHNICIAN = 'TECHNICIAN',
  DEPARTMENT_MANAGER = 'DEPARTMENT_MANAGER',
  FACILITIES_ADMIN = 'FACILITIES_ADMIN',
  PROCUREMENT_APPROVER = 'PROCUREMENT_APPROVER',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
}

export type PermissionModule =
  | 'digital_twin:public'
  | 'digital_twin:academic'
  | 'digital_twin:maintenance'
  | 'digital_twin:department'
  | 'digital_twin:full_control'
  | 'digital_twin:assets'
  | 'digital_twin:security'
  | 'rooms:booking'
  | 'classrooms:av_env'
  | 'complaints:submit'
  | 'complaints:analyze'
  | 'workorders:execute'
  | 'workorders:manage'
  | 'department:analytics'
  | 'facilities:mission_control'
  | 'facilities:grid_override'
  | 'procurement:approve'
  | 'procurement:request'
  | 'system:sessions'
  | 'system:rbac'
  | 'system:audit_logs';

export interface RoleMetadata {
  role: UserRole;
  displayName: string;
  dashboardTitle: string;
  dashboardSubtitle: string;
  badgeColor: string;
  defaultTwinLayer: 'overview' | 'hvac' | 'energy' | 'occupancy' | 'maintenance' | 'assets' | 'security';
  permissions: PermissionModule[];
}

export const ROLE_RBAC_MATRIX: Record<UserRole, RoleMetadata> = {
  [UserRole.STUDENT]: {
    role: UserRole.STUDENT,
    displayName: 'Student',
    dashboardTitle: 'Student Dashboard · 3D Campus Twin',
    dashboardSubtitle: 'Inspect live classroom availability, study commons occupancy, and report room issues in 3D',
    badgeColor: 'text-sky-300',
    defaultTwinLayer: 'overview',
    permissions: [
      'digital_twin:public',
      'complaints:submit',
      'complaints:analyze',
    ],
  },
  [UserRole.FACULTY]: {
    role: UserRole.FACULTY,
    displayName: 'Faculty',
    dashboardTitle: 'Faculty Dashboard · 3D Campus Twin',
    dashboardSubtitle: 'Book lecture halls, tune classroom AC & AV readiness, and report lab equipment issues',
    badgeColor: 'text-violet-300',
    defaultTwinLayer: 'overview',
    permissions: [
      'digital_twin:academic',
      'rooms:booking',
      'classrooms:av_env',
      'complaints:submit',
      'complaints:analyze',
    ],
  },
  [UserRole.TECHNICIAN]: {
    role: UserRole.TECHNICIAN,
    displayName: 'Maintenance',
    dashboardTitle: 'Maintenance Dashboard · 3D Campus Twin',
    dashboardSubtitle: 'Locate fault rooms in 3D, review AI diagnosis, accept repair jobs, and update repair progress',
    badgeColor: 'text-orange-300',
    defaultTwinLayer: 'maintenance',
    permissions: [
      'digital_twin:maintenance',
      'workorders:execute',
      'complaints:analyze',
      'procurement:request',
    ],
  },
  [UserRole.PROCUREMENT_APPROVER]: {
    role: UserRole.PROCUREMENT_APPROVER,
    displayName: 'Security',
    dashboardTitle: 'Security Dashboard · 3D Campus Twin',
    dashboardSubtitle: 'Monitor 3D room CCTV cameras, manage building perimeter lockdowns, and clear safety alerts',
    badgeColor: 'text-rose-300',
    defaultTwinLayer: 'security',
    permissions: [
      'digital_twin:security',
      'complaints:analyze',
    ],
  },
  [UserRole.FACILITIES_ADMIN]: {
    role: UserRole.FACILITIES_ADMIN,
    displayName: 'Admin',
    dashboardTitle: 'Admin Dashboard · Campus Mission Control',
    dashboardSubtitle: 'Full-campus 3D command: manage buildings, floors, rooms, HVAC load shedding, and dispatches',
    badgeColor: 'text-amber-300',
    defaultTwinLayer: 'overview',
    permissions: [
      'digital_twin:full_control',
      'facilities:mission_control',
      'facilities:grid_override',
      'workorders:manage',
      'workorders:execute',
      'complaints:submit',
      'complaints:analyze',
    ],
  },
  [UserRole.DEPARTMENT_MANAGER]: {
    role: UserRole.DEPARTMENT_MANAGER,
    displayName: 'HOD',
    dashboardTitle: 'HOD Dashboard · Departmental 3D Twin',
    dashboardSubtitle: 'Approve departmental room bookings, escalate priority issues, and assign maintenance teams',
    badgeColor: 'text-emerald-300',
    defaultTwinLayer: 'overview',
    permissions: [
      'digital_twin:department',
      'department:analytics',
      'rooms:booking',
      'workorders:manage',
      'complaints:analyze',
      'procurement:request',
    ],
  },
  [UserRole.SYSTEM_ADMIN]: {
    role: UserRole.SYSTEM_ADMIN,
    displayName: 'Super Admin',
    dashboardTitle: 'Super Admin Dashboard · Global 3D Command',
    dashboardSubtitle: 'Global 3D Digital Twin authority: all buildings, equipment approvals, AI settings, and role directory',
    badgeColor: 'text-rose-300',
    defaultTwinLayer: 'overview',
    permissions: [
      'digital_twin:full_control',
      'digital_twin:security',
      'facilities:mission_control',
      'facilities:grid_override',
      'rooms:booking',
      'classrooms:av_env',
      'workorders:manage',
      'workorders:execute',
      'procurement:approve',
      'procurement:request',
      'complaints:submit',
      'complaints:analyze',
      'system:rbac',
    ],
  },
};

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: string;
  title: string;
  clearanceLevel: number;
  emailVerified: boolean;
  permissions: PermissionModule[];
}

export interface DemoAccountCredential {
  role: UserRole;
  displayName: string;
  dashboardName: string;
  email: string;
  password: string;
  fullName: string;
  department: string;
  title: string;
}

export interface PreviewEmailMessage {
  id: string;
  to: string;
  recipientName: string;
  subject: string;
  type: 'VERIFY_EMAIL' | 'RESET_PASSWORD' | 'SECURITY_ALERT';
  token: string;
  actionLabel: string;
  bodyPreview: string;
  createdAt: string;
  read: boolean;
}

export interface AIComplaintDiagnosis {
  rootCause: string;
  severityScore: number;
  recommendedAction: string;
  assignedSpecialty: string;
  estimatedRepairMinutes: number;
  safetyHazard: boolean;
  analyzedAt: string;
  modelUsed: string;
}

export interface CampusComplaint {
  id: string;
  code: string;
  buildingId: string;
  buildingName: string;
  roomId?: string;
  locationDetail: string;
  category: 'HVAC_THERMAL' | 'ELECTRICAL_GRID' | 'AV_CLASSROOM' | 'STRUCTURAL_SAFETY' | 'LAB_EQUIPMENT';
  title: string;
  description: string;
  reportedBy: string;
  reporterRole: UserRole;
  status: 'OPEN' | 'AI_TRIAGED' | 'DISPATCHED' | 'RESOLVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  aiAnalyzed: boolean;
  aiDiagnosis?: AIComplaintDiagnosis;
  createdAt: string;
}

export type OperationalStatusLevel =
  | 'HEALTHY'
  | 'WARNING'
  | 'ATTENTION'
  | 'CRITICAL'
  | 'OFFLINE'
  | 'MAINTENANCE';

export interface RoomEquipmentUnit {
  id: string;
  name: string;
  type?:
    | 'Projector'
    | 'Computer'
    | 'Router'
    | 'Switch'
    | 'Smart Board'
    | 'Printer'
    | 'Camera'
    | 'AC'
    | 'Fan'
    | 'Light'
    | 'Lab System';
  category: 'HVAC' | 'POWER' | 'NETWORK' | 'AV_LAB';
  healthPercent: number;
  status: 'WORKING' | 'NOT_WORKING' | 'MAINTENANCE' | 'OFFLINE';
  warranty?: string;
  lastService?: string;
  powerConsumptionKw?: number;
  complaintHistory?: string[];
}

export interface CampusRoom3D {
  id: string;
  roomCode: string;
  name: string;
  roomType?:
    | 'Computer Lab'
    | 'Classroom'
    | 'Library'
    | 'Seminar Hall'
    | 'Faculty Office'
    | 'Auditorium'
    | 'Server Room'
    | 'Electrical Room'
    | 'Washroom'
    | 'Corridor'
    | 'Research Lab';
  buildingId: string;
  buildingCode: string;
  buildingName: string;
  floor: number;
  wing: 'North' | 'South' | 'East' | 'West' | 'Core';
  localOffset: [number, number, number]; // Relative to building center
  size: [number, number, number];
  operationalState: 'WORKING' | 'NOT_WORKING';
  statusLevel?: OperationalStatusLevel;
  repairProgress: number; // 0 to 100 (100 = fully working)
  repairStageLabel: string;
  assignedTechnician: string;
  jobAccepted?: boolean;
  eta: string;
  lastMaintenance: string;
  equipmentHealth: number; // 0 - 100%
  internet: {
    status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
    speedMbps: number;
    latencyMs: number;
    apCode: string;
  };
  electricity: {
    status: 'NOMINAL' | 'HARMONIC_FAULT' | 'LOAD_SHED';
    loadKw: number;
    voltageV: number;
    panelCode: string;
  };
  ac: {
    status: 'OPTIMAL' | 'DRIFT_WARNING' | 'FAULT';
    tempC: number;
    setpointC: number;
    airflowCfm: number;
  };
  occupancy: {
    current: number;
    capacity: number;
    status: 'AVAILABLE' | 'ACTIVE_CLASS' | 'AT_CAPACITY';
  };
  equipmentList: RoomEquipmentUnit[];
  activeComplaintIds: string[];
}

export interface SensorNodeData {
  id: string;
  buildingId: string;
  type: 'HVAC' | 'POWER' | 'OCCUPANCY' | 'SOLAR' | 'SECURITY' | 'ELEVATOR';
  label: string;
  metric: string;
  value: number;
  unit: string;
  status: 'NOMINAL' | 'WARNING' | 'CRITICAL';
  positionOffset: [number, number, number];
}

export interface BuildingData {
  id: string;
  code: string;
  name: string;
  zone: 'Engineering' | 'Science' | 'Energy' | 'Residential' | 'Innovation';
  department: string;
  position: [number, number, number];
  dimensions: [number, number, number];
  floorsCount: number;
  occupancy: number;
  maxCapacity: number;
  powerKw: number;
  hvacSetpointC: number;
  currentTempC: number;
  solarOutputKw: number;
  airQualityAqi: number;
  securityLockdown: boolean;
  loadSheddingActive: boolean;
  status: 'NOMINAL' | 'WARNING' | 'CRITICAL';
  assetValueUsd: number;
  activeWorkOrders: number;
  sensors: SensorNodeData[];
}

export interface CampusWorkOrder {
  id: string;
  code: string;
  buildingId: string;
  buildingName: string;
  roomId?: string;
  nodeId: string;
  system: string;
  title: string;
  assignedTo: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'QUEUED' | 'IN_PROGRESS' | 'AWAITING_PARTS' | 'COMPLETED';
  slaHoursLeft: number;
  createdAt: string;
}

export interface ProcurementItem {
  id: string;
  reqCode: string;
  itemTitle: string;
  vendor: string;
  department: string;
  buildingId: string;
  buildingName: string;
  roomId?: string;
  amountUsd: number;
  urgency: 'STANDARD' | 'EXPEDITED' | 'EMERGENCY';
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ORDERED';
  requestedBy: string;
  approvedBy?: string;
  slaCompliance: number;
  createdAt: string;
}

export interface RoomReservation {
  id: string;
  roomCode: string;
  buildingId: string;
  buildingName: string;
  purpose: string;
  capacity: number;
  currentBookedBy: string;
  roleType: 'STUDENT' | 'FACULTY';
  timeSlot: string;
  avReady: boolean;
  envTempC: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
}

export interface RedisSessionRecord {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userRole: UserRole;
  tokenFamily: string;
  rotationCount: number;
  ipAddress: string;
  userAgent: string;
  revoked: boolean;
  createdAt: string;
  lastRotatedAt: string;
  expiresAt: string;
}

export interface SecurityAuditRecord {
  id: string;
  userId?: string;
  userEmail: string;
  userRole: string;
  action: string;
  module: string;
  ipAddress: string;
  status: 'SUCCESS' | 'DENIED' | 'WARNING';
  metadata: string;
  createdAt: string;
}
