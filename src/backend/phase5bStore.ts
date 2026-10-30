import crypto from 'crypto';
import {
  UserRole,
  ROLE_RBAC_MATRIX,
  AuthUser,
  DemoAccountCredential,
  PreviewEmailMessage,
  BuildingData,
  CampusRoom3D,
  CampusComplaint,
  CampusWorkOrder,
  ProcurementItem,
  RoomReservation,
  RedisSessionRecord,
  SecurityAuditRecord,
  PermissionModule,
} from '../types/campus.ts';

const JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'campus360_enterprise_jwt_access_secret_2026';
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'campus360_enterprise_jwt_refresh_secret_2026';

export interface StoredUser extends AuthUser {
  passwordHash: string;
  demoPasswordPlain: string;
  verificationToken?: string;
  resetToken?: string;
  resetTokenExpiry?: number;
}

export function hashPassword(password: string): string {
  return crypto.createHmac('sha256', 'campus360_salt_v5b').update(password).digest('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface JwtPayload {
  sub: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: string;
  permissions: PermissionModule[];
  sessionId: string;
  tokenFamily: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input).toString('base64url');
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

export function signJwt(
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
  ttlSeconds: number,
  secret: string
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
  };
  const headerB64 = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadB64 = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');
  return `${headerB64}.${payloadB64}.${signature}`;
}

export function verifyJwt(token: string, expectedType: 'access' | 'refresh'): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signature] = parts;
    const secret = expectedType === 'access' ? JWT_ACCESS_SECRET : JWT_REFRESH_SECRET;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');
    if (signature !== expectedSig) return null;

    const payload = JSON.parse(base64UrlDecode(payloadB64)) as JwtPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now || payload.type !== expectedType) return null;
    return payload;
  } catch {
    return null;
  }
}

export function issueTokenPair(user: StoredUser, sessionId: string, tokenFamily: string) {
  const basePayload = {
    sub: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    department: user.department,
    permissions: user.permissions,
    sessionId,
    tokenFamily,
  };

  const accessToken = signJwt({ ...basePayload, type: 'access' }, 15 * 60, JWT_ACCESS_SECRET);
  const refreshToken = signJwt(
    { ...basePayload, type: 'refresh' },
    7 * 24 * 3600,
    JWT_REFRESH_SECRET
  );
  return { accessToken, refreshToken, expiresIn: 900 };
}

const INITIAL_USERS: StoredUser[] = [
  {
    id: 'usr-student-01',
    email: 'student@campus360.edu',
    fullName: 'Alex Rivera',
    role: UserRole.STUDENT,
    department: 'Robotics & Autonomous Systems',
    title: 'B.S. Student · Class of 2027',
    clearanceLevel: 1,
    emailVerified: true,
    permissions: ROLE_RBAC_MATRIX[UserRole.STUDENT].permissions,
    passwordHash: hashPassword('student123'),
    demoPasswordPlain: 'student123',
  },
  {
    id: 'usr-faculty-02',
    email: 'faculty@campus360.edu',
    fullName: 'Prof. Elena Vance',
    role: UserRole.FACULTY,
    department: 'Quantum & Applied Physics',
    title: 'Senior Professor · Photonics Lab',
    clearanceLevel: 2,
    emailVerified: true,
    permissions: ROLE_RBAC_MATRIX[UserRole.FACULTY].permissions,
    passwordHash: hashPassword('faculty123'),
    demoPasswordPlain: 'faculty123',
  },
  {
    id: 'usr-tech-03',
    email: 'maintenance@campus360.edu',
    fullName: 'Marcus Thorne',
    role: UserRole.TECHNICIAN,
    department: 'Campus Maintenance & MEP Ops',
    title: 'Lead Maintenance Engineer',
    clearanceLevel: 3,
    emailVerified: true,
    permissions: ROLE_RBAC_MATRIX[UserRole.TECHNICIAN].permissions,
    passwordHash: hashPassword('maintenance123'),
    demoPasswordPlain: 'maintenance123',
  },
  {
    id: 'usr-security-06',
    email: 'security@campus360.edu',
    fullName: 'Capt. Priya Nair',
    role: UserRole.PROCUREMENT_APPROVER,
    department: 'Campus Safety & CCTV Operations',
    title: 'Chief of Campus Security',
    clearanceLevel: 3,
    emailVerified: true,
    permissions: ROLE_RBAC_MATRIX[UserRole.PROCUREMENT_APPROVER].permissions,
    passwordHash: hashPassword('security123'),
    demoPasswordPlain: 'security123',
  },
  {
    id: 'usr-facadmin-05',
    email: 'admin@campus360.edu',
    fullName: 'Soren Lindqvist',
    role: UserRole.FACILITIES_ADMIN,
    department: 'Central Campus Operations',
    title: 'Campus Operations Administrator',
    clearanceLevel: 4,
    emailVerified: true,
    permissions: ROLE_RBAC_MATRIX[UserRole.FACILITIES_ADMIN].permissions,
    passwordHash: hashPassword('admin123'),
    demoPasswordPlain: 'admin123',
  },
  {
    id: 'usr-deptmgr-04',
    email: 'hod@campus360.edu',
    fullName: 'Dr. Diana Chen',
    role: UserRole.DEPARTMENT_MANAGER,
    department: 'School of Engineering & Nano-Systems',
    title: 'Head of Department (HOD)',
    clearanceLevel: 4,
    emailVerified: true,
    permissions: ROLE_RBAC_MATRIX[UserRole.DEPARTMENT_MANAGER].permissions,
    passwordHash: hashPassword('hod123'),
    demoPasswordPlain: 'hod123',
  },
  {
    id: 'usr-sysadmin-07',
    email: 'superadmin@campus360.edu',
    fullName: 'Viktor Kane',
    role: UserRole.SYSTEM_ADMIN,
    department: 'Executive Digital Twin Command',
    title: 'Campus360 Super Administrator',
    clearanceLevel: 5,
    emailVerified: true,
    permissions: ROLE_RBAC_MATRIX[UserRole.SYSTEM_ADMIN].permissions,
    passwordHash: hashPassword('superadmin123'),
    demoPasswordPlain: 'superadmin123',
  },
];

const INITIAL_BUILDINGS: BuildingData[] = [
  {
    id: 'bldg-eng-01',
    code: 'ENG-A',
    name: 'Nexus Engineering Spire',
    zone: 'Engineering',
    department: 'School of Engineering & Nano-Systems',
    position: [-15, 0, -7],
    dimensions: [9, 11, 9],
    floorsCount: 3,
    occupancy: 412,
    maxCapacity: 520,
    powerKw: 684.5,
    hvacSetpointC: 21.0,
    currentTempC: 21.2,
    solarOutputKw: 142.0,
    airQualityAqi: 18,
    securityLockdown: false,
    loadSheddingActive: false,
    status: 'NOMINAL',
    assetValueUsd: 4250000,
    activeWorkOrders: 0,
    sensors: [
      {
        id: 'sns-eng-hvac-1',
        buildingId: 'bldg-eng-01',
        type: 'HVAC',
        label: 'Roof Chiller Loop A',
        metric: 'Supply Air Temp',
        value: 14.2,
        unit: '°C',
        status: 'NOMINAL',
        positionOffset: [0, 11.6, 0],
      },
    ],
  },
  {
    id: 'bldg-sci-02',
    code: 'SCI-B',
    name: 'Quantum & Photonics Atrium',
    zone: 'Science',
    department: 'Quantum & Applied Physics',
    position: [0, 0, -12],
    dimensions: [11, 10, 9],
    floorsCount: 3,
    occupancy: 289,
    maxCapacity: 340,
    powerKw: 892.0,
    hvacSetpointC: 19.5,
    currentTempC: 23.4,
    solarOutputKw: 195.4,
    airQualityAqi: 34,
    securityLockdown: false,
    loadSheddingActive: false,
    status: 'WARNING',
    assetValueUsd: 8900000,
    activeWorkOrders: 1,
    sensors: [
      {
        id: 'sns-sci-hvac-1',
        buildingId: 'bldg-sci-02',
        type: 'HVAC',
        label: 'Cleanroom Cryo AHU-02',
        metric: 'Thermal Drift',
        value: 23.4,
        unit: '°C',
        status: 'WARNING',
        positionOffset: [-2, 10.5, 1],
      },
    ],
  },
  {
    id: 'bldg-nrg-03',
    code: 'NRG-C',
    name: 'Central Microgrid & Thermal Hub',
    zone: 'Energy',
    department: 'Central Campus Infrastructure',
    position: [15, 0, -6],
    dimensions: [10, 8.5, 10],
    floorsCount: 2,
    occupancy: 46,
    maxCapacity: 80,
    powerKw: 1240.8,
    hvacSetpointC: 20.0,
    currentTempC: 25.9,
    solarOutputKw: 510.2,
    airQualityAqi: 29,
    securityLockdown: false,
    loadSheddingActive: false,
    status: 'CRITICAL',
    assetValueUsd: 12400000,
    activeWorkOrders: 1,
    sensors: [
      {
        id: 'sns-nrg-pwr-1',
        buildingId: 'bldg-nrg-03',
        type: 'POWER',
        label: 'Turbine Inverter Bank B',
        metric: 'Busbar Temp',
        value: 78.4,
        unit: '°C',
        status: 'CRITICAL',
        positionOffset: [0, 9.0, -2],
      },
    ],
  },
  {
    id: 'bldg-inv-04',
    code: 'INV-D',
    name: 'Vision Spatial Commons & Library',
    zone: 'Innovation',
    department: 'Robotics & Autonomous Systems',
    position: [-10, 0, 10],
    dimensions: [11, 8, 9],
    floorsCount: 2,
    occupancy: 615,
    maxCapacity: 700,
    powerKw: 410.2,
    hvacSetpointC: 21.5,
    currentTempC: 21.6,
    solarOutputKw: 220.0,
    airQualityAqi: 15,
    securityLockdown: false,
    loadSheddingActive: false,
    status: 'WARNING',
    assetValueUsd: 3100000,
    activeWorkOrders: 1,
    sensors: [
      {
        id: 'sns-inv-occ-1',
        buildingId: 'bldg-inv-04',
        type: 'OCCUPANCY',
        label: 'Atrium LiDAR Counter',
        metric: 'Live Density',
        value: 87.8,
        unit: '%',
        status: 'NOMINAL',
        positionOffset: [0, 8.5, 0],
      },
    ],
  },
  {
    id: 'bldg-res-05',
    code: 'RES-E',
    name: 'Horizon Graduate Suites',
    zone: 'Residential',
    department: 'Campus Housing & Life',
    position: [11, 0, 10],
    dimensions: [9, 12, 8],
    floorsCount: 3,
    occupancy: 348,
    maxCapacity: 400,
    powerKw: 355.0,
    hvacSetpointC: 22.0,
    currentTempC: 22.1,
    solarOutputKw: 98.5,
    airQualityAqi: 19,
    securityLockdown: false,
    loadSheddingActive: false,
    status: 'NOMINAL',
    assetValueUsd: 2750000,
    activeWorkOrders: 0,
    sensors: [
      {
        id: 'sns-res-elv-1',
        buildingId: 'bldg-res-05',
        type: 'ELEVATOR',
        label: 'High-Speed Shaft 02',
        metric: 'Regen Drive Load',
        value: 32.0,
        unit: 'kW',
        status: 'NOMINAL',
        positionOffset: [0, 12.4, 0],
      },
    ],
  },
];

// 3D Rooms distributed across buildings & floors (each directly clickable in the 3D scene)
const INITIAL_ROOMS_3D: CampusRoom3D[] = [
  // ENG-A (Nexus Engineering Spire)
  {
    id: 'room-eng-101',
    roomCode: 'ENG-101',
    name: 'Computer Lab & Robotics Fabrication Bay',
    roomType: 'Computer Lab',
    buildingId: 'bldg-eng-01',
    buildingCode: 'ENG-A',
    buildingName: 'Nexus Engineering Spire',
    floor: 1,
    wing: 'West',
    localOffset: [-2.1, 2.2, 1.8],
    size: [3.4, 2.2, 3.4],
    operationalState: 'WORKING',
    statusLevel: 'HEALTHY',
    repairProgress: 100,
    repairStageLabel: 'All Systems Nominal',
    assignedTechnician: 'Standby — No Active Fault',
    jobAccepted: false,
    eta: 'Nominal (0m)',
    lastMaintenance: '2026-10-27 · Preventive Calibration',
    equipmentHealth: 98,
    internet: { status: 'ONLINE', speedMbps: 9850, latencyMs: 1.8, apCode: 'AP-ENG-101W' },
    electricity: { status: 'NOMINAL', loadKw: 48.2, voltageV: 480, panelCode: 'PNL-ENG-1A' },
    ac: { status: 'OPTIMAL', tempC: 21.0, setpointC: 21.0, airflowCfm: 1450 },
    occupancy: { current: 24, capacity: 32, status: 'ACTIVE_CLASS' },
    equipmentList: [
      {
        id: 'eq-1',
        name: 'NVIDIA RTX Workstation Cluster (24 Nodes)',
        type: 'Computer',
        category: 'AV_LAB',
        healthPercent: 99,
        status: 'WORKING',
        warranty: 'Valid until 2029-03 (Dell ProSupport+)',
        lastService: '2026-10-27 · Thermal Paste & Firmware Audit',
        powerConsumptionKw: 18.4,
        complaintHistory: ['2026-04-12: Node #7 GPU fan curve recalibrated'],
      },
      {
        id: 'eq-2',
        name: '85" Interactive 8K Smart Board',
        type: 'Smart Board',
        category: 'AV_LAB',
        healthPercent: 98,
        status: 'WORKING',
        warranty: 'Valid until 2028-11 (Cisco Webex Board)',
        lastService: '2026-10-15 · Touch Digitizer Calibration',
        powerConsumptionKw: 0.65,
        complaintHistory: [],
      },
      {
        id: 'eq-3',
        name: 'VAV Precision Split AC Unit 101',
        type: 'AC',
        category: 'HVAC',
        healthPercent: 97,
        status: 'WORKING',
        warranty: 'Valid until 2030-01 (Daikin Applied)',
        lastService: '2026-10-20 · HEPA Filter Replacement',
        powerConsumptionKw: 6.2,
        complaintHistory: [],
      },
      {
        id: 'eq-4',
        name: 'Enterprise 10GbE Managed Switch',
        type: 'Switch',
        category: 'NETWORK',
        healthPercent: 99,
        status: 'WORKING',
        warranty: 'Valid until 2029-08 (Arista Networks)',
        lastService: '2026-10-05 · VLAN Trunk Diagnostics',
        powerConsumptionKw: 0.42,
        complaintHistory: [],
      },
    ],
    activeComplaintIds: [],
  },
  {
    id: 'room-eng-202',
    roomCode: 'Room 201',
    name: 'Room 201 · Smart Lecture Classroom & CAD Studio',
    roomType: 'Classroom',
    buildingId: 'bldg-eng-01',
    buildingCode: 'ENG-A',
    buildingName: 'Nexus Engineering Spire',
    floor: 2,
    wing: 'East',
    localOffset: [2.1, 5.4, 1.8],
    size: [3.4, 2.2, 3.4],
    operationalState: 'WORKING',
    statusLevel: 'HEALTHY',
    repairProgress: 100,
    repairStageLabel: 'All Systems Nominal',
    assignedTechnician: 'Standby — No Active Fault',
    jobAccepted: false,
    eta: 'Nominal (0m)',
    lastMaintenance: '2026-10-25 · ISO-5 Filter Certification',
    equipmentHealth: 96,
    internet: { status: 'ONLINE', speedMbps: 9420, latencyMs: 2.1, apCode: 'AP-ENG-202E' },
    electricity: { status: 'NOMINAL', loadKw: 62.5, voltageV: 480, panelCode: 'PNL-ENG-2B' },
    ac: { status: 'OPTIMAL', tempC: 20.5, setpointC: 20.5, airflowCfm: 1820 },
    occupancy: { current: 18, capacity: 28, status: 'ACTIVE_CLASS' },
    equipmentList: [
      {
        id: 'eq-5',
        name: '4K Laser Ceiling Projector',
        type: 'Projector',
        category: 'AV_LAB',
        healthPercent: 96,
        status: 'WORKING',
        warranty: 'Valid until 2028-07 (Sony Professional)',
        lastService: '2026-10-25 · Lens Alignment & Lumen Test',
        powerConsumptionKw: 0.85,
        complaintHistory: [],
      },
      {
        id: 'eq-6',
        name: 'DALI Daylight-Adaptive LED Light Array',
        type: 'Light',
        category: 'POWER',
        healthPercent: 99,
        status: 'WORKING',
        warranty: 'Valid until 2031-05 (Signify Philips)',
        lastService: '2026-09-30 · Occupancy Dimmer Sync',
        powerConsumptionKw: 0.48,
        complaintHistory: [],
      },
      {
        id: 'eq-7',
        name: 'High-Volume Brushless Circulation Fan',
        type: 'Fan',
        category: 'HVAC',
        healthPercent: 95,
        status: 'WORKING',
        warranty: 'Valid until 2028-04 (Greenheck)',
        lastService: '2026-10-12 · Bearing Lubrication',
        powerConsumptionKw: 0.35,
        complaintHistory: [],
      },
    ],
    activeComplaintIds: [],
  },
  {
    id: 'room-eng-304',
    roomCode: 'ENG-304',
    name: 'Faculty Room & Senior Research Suite',
    roomType: 'Faculty Office',
    buildingId: 'bldg-eng-01',
    buildingCode: 'ENG-A',
    buildingName: 'Nexus Engineering Spire',
    floor: 3,
    wing: 'North',
    localOffset: [0, 8.6, -1.6],
    size: [5.2, 2.2, 3.4],
    operationalState: 'WORKING',
    statusLevel: 'HEALTHY',
    repairProgress: 100,
    repairStageLabel: 'All Systems Nominal',
    assignedTechnician: 'Standby — No Active Fault',
    jobAccepted: false,
    eta: 'Nominal (0m)',
    lastMaintenance: '2026-10-29 · Turbine Blade Balance Check',
    equipmentHealth: 99,
    internet: { status: 'ONLINE', speedMbps: 9910, latencyMs: 1.4, apCode: 'AP-ENG-304N' },
    electricity: { status: 'NOMINAL', loadKw: 84.0, voltageV: 480, panelCode: 'PNL-ENG-3A' },
    ac: { status: 'OPTIMAL', tempC: 21.1, setpointC: 21.0, airflowCfm: 1600 },
    occupancy: { current: 14, capacity: 40, status: 'AVAILABLE' },
    equipmentList: [
      {
        id: 'eq-8',
        name: 'High-Speed Duplex Departmental Printer',
        type: 'Printer',
        category: 'AV_LAB',
        healthPercent: 97,
        status: 'WORKING',
        warranty: 'Valid until 2028-02 (HP LaserJet Enterprise)',
        lastService: '2026-10-18 · Fuser Roller & Toner Refill',
        powerConsumptionKw: 0.92,
        complaintHistory: ['2026-08-03: Paper tray #2 sensor cleaned'],
      },
      {
        id: 'eq-9',
        name: 'Wi-Fi 7 Tri-Band Enterprise Router',
        type: 'Router',
        category: 'NETWORK',
        healthPercent: 100,
        status: 'WORKING',
        warranty: 'Valid until 2030-06 (Cisco Meraki)',
        lastService: '2026-10-28 · Security Patch v18.2',
        powerConsumptionKw: 0.18,
        complaintHistory: [],
      },
    ],
    activeComplaintIds: [],
  },

  // SCI-B (Quantum & Photonics Atrium) — Floor 3 has an active thermal fault!
  {
    id: 'room-sci-101',
    roomCode: 'SCI-101',
    name: 'Grand Quantum Auditorium & Lecture Hall',
    roomType: 'Auditorium',
    buildingId: 'bldg-sci-02',
    buildingCode: 'SCI-B',
    buildingName: 'Quantum & Photonics Atrium',
    floor: 1,
    wing: 'South',
    localOffset: [-2.4, 2.2, 1.8],
    size: [4.2, 2.2, 3.6],
    operationalState: 'WORKING',
    statusLevel: 'HEALTHY',
    repairProgress: 100,
    repairStageLabel: 'All Systems Nominal',
    assignedTechnician: 'Standby — No Active Fault',
    jobAccepted: false,
    eta: 'Nominal (0m)',
    lastMaintenance: '2026-10-26 · Laser Projector Alignment',
    equipmentHealth: 97,
    internet: { status: 'ONLINE', speedMbps: 9600, latencyMs: 1.9, apCode: 'AP-SCI-101S' },
    electricity: { status: 'NOMINAL', loadKw: 38.4, voltageV: 277, panelCode: 'PNL-SCI-1A' },
    ac: { status: 'OPTIMAL', tempC: 20.8, setpointC: 20.5, airflowCfm: 2200 },
    occupancy: { current: 112, capacity: 140, status: 'ACTIVE_CLASS' },
    equipmentList: [
      {
        id: 'eq-10',
        name: 'Dual 8K Christie Auditorium Projector',
        type: 'Projector',
        category: 'AV_LAB',
        healthPercent: 98,
        status: 'WORKING',
        warranty: 'Valid until 2029-09 (Christie Digital)',
        lastService: '2026-10-26 · Dual Lamp Colorimetry Sync',
        powerConsumptionKw: 2.4,
        complaintHistory: [],
      },
      {
        id: 'eq-11',
        name: 'PTZ Auto-Tracking Lecture Camera',
        type: 'Camera',
        category: 'AV_LAB',
        healthPercent: 97,
        status: 'WORKING',
        warranty: 'Valid until 2028-12 (Sony SRG-A40)',
        lastService: '2026-10-14 · AI Framing Firmware Update',
        powerConsumptionKw: 0.12,
        complaintHistory: [],
      },
    ],
    activeComplaintIds: [],
  },
  {
    id: 'room-sci-205',
    roomCode: 'SCI-205',
    name: 'Core Tier-3 Server Room & Photonics Cluster',
    roomType: 'Server Room',
    buildingId: 'bldg-sci-02',
    buildingCode: 'SCI-B',
    buildingName: 'Quantum & Photonics Atrium',
    floor: 2,
    wing: 'East',
    localOffset: [2.5, 5.1, 1.6],
    size: [3.8, 2.2, 3.6],
    operationalState: 'WORKING',
    statusLevel: 'HEALTHY',
    repairProgress: 100,
    repairStageLabel: 'All Systems Nominal',
    assignedTechnician: 'Standby — No Active Fault',
    jobAccepted: false,
    eta: 'Nominal (0m)',
    lastMaintenance: '2026-10-24 · Optical Table Pneumatic Audit',
    equipmentHealth: 95,
    internet: { status: 'ONLINE', speedMbps: 9300, latencyMs: 2.2, apCode: 'AP-SCI-205E' },
    electricity: { status: 'NOMINAL', loadKw: 54.0, voltageV: 480, panelCode: 'PNL-SCI-2A' },
    ac: { status: 'OPTIMAL', tempC: 19.6, setpointC: 19.5, airflowCfm: 1750 },
    occupancy: { current: 9, capacity: 16, status: 'ACTIVE_CLASS' },
    equipmentList: [
      {
        id: 'eq-12',
        name: '100G Spine Optical Core Switch',
        type: 'Switch',
        category: 'NETWORK',
        healthPercent: 96,
        status: 'WORKING',
        warranty: 'Valid until 2030-02 (Cisco Nexus 9300)',
        lastService: '2026-10-24 · SFP28 Optical Transceiver Check',
        powerConsumptionKw: 3.8,
        complaintHistory: [],
      },
      {
        id: 'eq-13',
        name: 'In-Row Cold Aisle Server AC Unit',
        type: 'AC',
        category: 'HVAC',
        healthPercent: 95,
        status: 'WORKING',
        warranty: 'Valid until 2029-05 (Schneider APC)',
        lastService: '2026-10-11 · Condensate Pump Verification',
        powerConsumptionKw: 9.4,
        complaintHistory: [],
      },
    ],
    activeComplaintIds: [],
  },
  {
    id: 'room-sci-302',
    roomCode: 'SCI-302',
    name: 'Cryo Optics Cleanroom B',
    roomType: 'Research Lab',
    buildingId: 'bldg-sci-02',
    buildingCode: 'SCI-B',
    buildingName: 'Quantum & Photonics Atrium',
    floor: 3,
    wing: 'North',
    localOffset: [0, 8.0, -1.5],
    size: [5.6, 2.2, 3.8],
    operationalState: 'NOT_WORKING',
    statusLevel: 'WARNING',
    repairProgress: 45,
    repairStageLabel: 'Technician On-Site · Recalibrating Valve CV-204',
    assignedTechnician: 'Marcus Thorne (Lead Chiller & Grid Specialist)',
    jobAccepted: true,
    eta: '18 mins remaining',
    lastMaintenance: '2026-09-14 · Chilled Water Loop Inspection',
    equipmentHealth: 62,
    internet: { status: 'ONLINE', speedMbps: 9480, latencyMs: 2.0, apCode: 'AP-SCI-302N' },
    electricity: { status: 'NOMINAL', loadKw: 112.4, voltageV: 480, panelCode: 'PNL-SCI-3C' },
    ac: { status: 'DRIFT_WARNING', tempC: 23.4, setpointC: 19.5, airflowCfm: 920 },
    occupancy: { current: 4, capacity: 12, status: 'ACTIVE_CLASS' },
    equipmentList: [
      {
        id: 'eq-14',
        name: 'Cleanroom Cryo AC Actuator CV-204',
        type: 'AC',
        category: 'HVAC',
        healthPercent: 38,
        status: 'NOT_WORKING',
        warranty: 'Valid until 2028-08 (Siemens Building Tech)',
        lastService: '2026-09-14 · Chilled Water Loop Inspection',
        powerConsumptionKw: 14.2,
        complaintHistory: [
          'CMP-2026-089: Cleanroom AHU-02 thermal drift exceeding +3.9°C threshold',
          '2026-07-19: Actuator valve positioner hysteresis warning',
        ],
      },
      {
        id: 'eq-15',
        name: 'Cleanroom Optical Telemetry Computer',
        type: 'Computer',
        category: 'AV_LAB',
        healthPercent: 92,
        status: 'WORKING',
        warranty: 'Valid until 2029-01 (HP Z8 Fury)',
        lastService: '2026-10-10 · DAQ Card Calibration',
        powerConsumptionKw: 1.4,
        complaintHistory: [],
      },
    ],
    activeComplaintIds: ['cmp-501'],
  },

  // NRG-C (Central Microgrid & Thermal Hub) — Electrical Room has a Critical Harmonic Fault!
  {
    id: 'room-nrg-101',
    roomCode: 'NRG-101',
    name: 'Main Campus Corridor & Chilled Water Gallery',
    roomType: 'Corridor',
    buildingId: 'bldg-nrg-03',
    buildingCode: 'NRG-C',
    buildingName: 'Central Microgrid & Thermal Hub',
    floor: 1,
    wing: 'West',
    localOffset: [-2.2, 2.4, 1.8],
    size: [3.8, 2.4, 4.0],
    operationalState: 'WORKING',
    statusLevel: 'HEALTHY',
    repairProgress: 100,
    repairStageLabel: 'All Systems Nominal',
    assignedTechnician: 'Standby — No Active Fault',
    jobAccepted: false,
    eta: 'Nominal (0m)',
    lastMaintenance: '2026-10-28 · MagLev Bearing Vibration Check',
    equipmentHealth: 97,
    internet: { status: 'ONLINE', speedMbps: 8900, latencyMs: 1.5, apCode: 'AP-NRG-101' },
    electricity: { status: 'NOMINAL', loadKw: 420.0, voltageV: 4160, panelCode: 'SWG-NRG-1' },
    ac: { status: 'OPTIMAL', tempC: 19.8, setpointC: 20.0, airflowCfm: 3400 },
    occupancy: { current: 6, capacity: 20, status: 'AVAILABLE' },
    equipmentList: [
      {
        id: 'eq-16',
        name: 'Primary Centrifugal Chiller AC #1',
        type: 'AC',
        category: 'HVAC',
        healthPercent: 97,
        status: 'WORKING',
        warranty: 'Valid until 2031-04 (Trane CenTraVac)',
        lastService: '2026-10-28 · MagLev Bearing Vibration Check',
        powerConsumptionKw: 185.0,
        complaintHistory: [],
      },
      {
        id: 'eq-17',
        name: 'AI Thermal Security Camera #4',
        type: 'Camera',
        category: 'AV_LAB',
        healthPercent: 99,
        status: 'WORKING',
        warranty: 'Valid until 2029-10 (Axis Q19 Thermal)',
        lastService: '2026-10-19 · IR Sensor Calibration',
        powerConsumptionKw: 0.08,
        complaintHistory: [],
      },
    ],
    activeComplaintIds: [],
  },
  {
    id: 'room-nrg-202',
    roomCode: 'NRG-202',
    name: 'Electrical Room · Substation Bay 2 & Inverter Bank',
    roomType: 'Electrical Room',
    buildingId: 'bldg-nrg-03',
    buildingCode: 'NRG-C',
    buildingName: 'Central Microgrid & Thermal Hub',
    floor: 2,
    wing: 'East',
    localOffset: [2.0, 5.8, -1.2],
    size: [4.4, 2.4, 4.2],
    operationalState: 'NOT_WORKING',
    statusLevel: 'CRITICAL',
    repairProgress: 25,
    repairStageLabel: 'Dispatched · Engaging Active Harmonic Filter',
    assignedTechnician: 'Marcus Thorne (Lead Chiller & Grid Specialist)',
    jobAccepted: true,
    eta: '12 mins (Emergency Priority)',
    lastMaintenance: '2026-08-19 · Infrared Busbar Thermography',
    equipmentHealth: 48,
    internet: { status: 'ONLINE', speedMbps: 9100, latencyMs: 1.6, apCode: 'AP-NRG-202' },
    electricity: { status: 'HARMONIC_FAULT', loadKw: 820.8, voltageV: 480, panelCode: 'BUS-INV-B2' },
    ac: { status: 'FAULT', tempC: 28.4, setpointC: 20.0, airflowCfm: 680 },
    occupancy: { current: 3, capacity: 10, status: 'AVAILABLE' },
    equipmentList: [
      {
        id: 'eq-18',
        name: 'ABB 500kVA Solar Tie Switchgear & Inverter',
        type: 'Switch',
        category: 'POWER',
        healthPercent: 42,
        status: 'NOT_WORKING',
        warranty: 'Valid until 2029-12 (ABB Electrification)',
        lastService: '2026-08-19 · Infrared Busbar Thermography',
        powerConsumptionKw: 410.4,
        complaintHistory: [
          'CMP-2026-090: Inverter Bank B harmonic distortion & busbar temp spike (78.4°C)',
          '2026-05-11: Harmonic capacitor bank relay trip',
        ],
      },
      {
        id: 'eq-19',
        name: 'Substation Forced-Air Exhaust Fan Plenum',
        type: 'Fan',
        category: 'HVAC',
        healthPercent: 54,
        status: 'NOT_WORKING',
        warranty: 'Valid until 2028-06 (ebm-papst)',
        lastService: '2026-08-19 · Airflow & Damper Check',
        powerConsumptionKw: 12.6,
        complaintHistory: ['CMP-2026-090: Reduced CFM under peak solar load'],
      },
    ],
    activeComplaintIds: ['cmp-502'],
  },

  // INV-D (Vision Spatial Commons & Library) — Library & Seminar Hall
  {
    id: 'room-inv-102',
    roomCode: 'INV-102',
    name: 'Central Digital Library & Autonomous Study Commons',
    roomType: 'Library',
    buildingId: 'bldg-inv-04',
    buildingCode: 'INV-D',
    buildingName: 'Vision Spatial Commons & Library',
    floor: 1,
    wing: 'South',
    localOffset: [-2.4, 2.1, 1.6],
    size: [4.4, 2.2, 3.8],
    operationalState: 'WORKING',
    statusLevel: 'HEALTHY',
    repairProgress: 100,
    repairStageLabel: 'All Systems Nominal',
    assignedTechnician: 'Standby — No Active Fault',
    jobAccepted: false,
    eta: 'Nominal (0m)',
    lastMaintenance: '2026-10-29 · Wi-Fi 7 Access Point Sweep',
    equipmentHealth: 99,
    internet: { status: 'ONLINE', speedMbps: 9980, latencyMs: 1.1, apCode: 'AP-INV-102' },
    electricity: { status: 'NOMINAL', loadKw: 34.2, voltageV: 208, panelCode: 'PNL-INV-1A' },
    ac: { status: 'OPTIMAL', tempC: 21.5, setpointC: 21.5, airflowCfm: 1950 },
    occupancy: { current: 84, capacity: 110, status: 'ACTIVE_CLASS' },
    equipmentList: [
      {
        id: 'eq-20',
        name: 'Cisco Catalyst Wi-Fi 7 Tri-Band Router Mesh',
        type: 'Router',
        category: 'NETWORK',
        healthPercent: 100,
        status: 'WORKING',
        warranty: 'Valid until 2030-09 (Cisco Enterprise)',
        lastService: '2026-10-29 · RF Channel Optimization',
        powerConsumptionKw: 0.45,
        complaintHistory: [],
      },
      {
        id: 'eq-21',
        name: 'Library Self-Service Kiosk & Printer Station',
        type: 'Printer',
        category: 'AV_LAB',
        healthPercent: 98,
        status: 'WORKING',
        warranty: 'Valid until 2028-10 (Canon imageRUNNER)',
        lastService: '2026-10-22 · Drum & Feed Roller Service',
        powerConsumptionKw: 0.78,
        complaintHistory: [],
      },
    ],
    activeComplaintIds: [],
  },
  {
    id: 'room-inv-208',
    roomCode: 'INV-208',
    name: 'Executive Seminar Hall 208',
    roomType: 'Seminar Hall',
    buildingId: 'bldg-inv-04',
    buildingCode: 'INV-D',
    buildingName: 'Vision Spatial Commons & Library',
    floor: 2,
    wing: 'North',
    localOffset: [2.2, 5.2, -1.4],
    size: [4.2, 2.2, 3.6],
    operationalState: 'NOT_WORKING',
    statusLevel: 'ATTENTION',
    repairProgress: 60,
    repairStageLabel: 'Firmware Sync & Dante Clock Resetting',
    assignedTechnician: 'Kenji Sato (AV & Fiber Network Tech)',
    jobAccepted: true,
    eta: '9 mins remaining',
    lastMaintenance: '2026-10-02 · Crestron AV-over-IP Check',
    equipmentHealth: 71,
    internet: { status: 'DEGRADED', speedMbps: 420, latencyMs: 18.4, apCode: 'AP-INV-208' },
    electricity: { status: 'NOMINAL', loadKw: 14.8, voltageV: 208, panelCode: 'PNL-INV-2B' },
    ac: { status: 'OPTIMAL', tempC: 21.6, setpointC: 21.5, airflowCfm: 880 },
    occupancy: { current: 8, capacity: 16, status: 'ACTIVE_CLASS' },
    equipmentList: [
      {
        id: 'eq-22',
        name: '98" Interactive Seminar Smart Board',
        type: 'Smart Board',
        category: 'AV_LAB',
        healthPercent: 52,
        status: 'NOT_WORKING',
        warranty: 'Valid until 2028-05 (Crestron AirMedia)',
        lastService: '2026-10-02 · HDMI-over-IP Receiver Check',
        powerConsumptionKw: 1.15,
        complaintHistory: [
          'CMP-2026-091: Spatial projection array HDMI-over-IP transceiver sync drop',
        ],
      },
      {
        id: 'eq-23',
        name: 'PoE++ Multicast Network Switch Port 14',
        type: 'Switch',
        category: 'NETWORK',
        healthPercent: 89,
        status: 'WORKING',
        warranty: 'Valid until 2029-11 (Ubiquiti Pro Max)',
        lastService: '2026-10-02 · IGMP Snooping Audit',
        powerConsumptionKw: 0.55,
        complaintHistory: [],
      },
    ],
    activeComplaintIds: ['cmp-503'],
  },

  // RES-E (Horizon Graduate Suites) — Washroom & Smart Study Deck
  {
    id: 'room-res-105',
    roomCode: 'RES-105',
    name: 'Smart Hygiene Washrooms & Water Recovery Core',
    roomType: 'Washroom',
    buildingId: 'bldg-res-05',
    buildingCode: 'RES-E',
    buildingName: 'Horizon Graduate Suites',
    floor: 1,
    wing: 'West',
    localOffset: [-1.8, 2.4, 1.4],
    size: [3.6, 2.2, 3.4],
    operationalState: 'WORKING',
    statusLevel: 'HEALTHY',
    repairProgress: 100,
    repairStageLabel: 'All Systems Nominal',
    assignedTechnician: 'Standby — No Active Fault',
    jobAccepted: false,
    eta: 'Nominal (0m)',
    lastMaintenance: '2026-10-28 · Heat Recovery Ventilator Check',
    equipmentHealth: 98,
    internet: { status: 'ONLINE', speedMbps: 9200, latencyMs: 2.0, apCode: 'AP-RES-105' },
    electricity: { status: 'NOMINAL', loadKw: 22.0, voltageV: 208, panelCode: 'PNL-RES-1A' },
    ac: { status: 'OPTIMAL', tempC: 22.0, setpointC: 22.0, airflowCfm: 1120 },
    occupancy: { current: 6, capacity: 20, status: 'AVAILABLE' },
    equipmentList: [
      {
        id: 'eq-24',
        name: 'ERV Fresh-Air Exhaust Fan & IAQ Sensor',
        type: 'Fan',
        category: 'HVAC',
        healthPercent: 98,
        status: 'WORKING',
        warranty: 'Valid until 2029-07 (Mitsubishi Lossnay)',
        lastService: '2026-10-28 · Heat Recovery Core Cleaning',
        powerConsumptionKw: 1.8,
        complaintHistory: [],
      },
      {
        id: 'eq-25',
        name: 'UV-C Sanitization & Motion LED Light Array',
        type: 'Light',
        category: 'POWER',
        healthPercent: 99,
        status: 'WORKING',
        warranty: 'Valid until 2030-03 (Acuity Brands)',
        lastService: '2026-10-15 · Motion Sensor Check',
        powerConsumptionKw: 0.32,
        complaintHistory: [],
      },
    ],
    activeComplaintIds: [],
  },
  {
    id: 'room-res-202',
    roomCode: 'RES-202',
    name: 'Graduate Research Lounge & Collaborative Commons',
    roomType: 'Seminar Hall',
    buildingId: 'bldg-res-05',
    buildingCode: 'RES-E',
    buildingName: 'Horizon Graduate Suites',
    floor: 2,
    wing: 'South',
    localOffset: [0, 5.5, 1.2],
    size: [4.2, 2.2, 3.4],
    operationalState: 'WORKING',
    statusLevel: 'HEALTHY',
    repairProgress: 100,
    repairStageLabel: 'All Systems Nominal',
    assignedTechnician: 'Standby — No Active Fault',
    jobAccepted: false,
    eta: 'Nominal (0m)',
    lastMaintenance: '2026-10-28 · HVAC & Smart Board Calibration',
    equipmentHealth: 97,
    internet: { status: 'ONLINE', speedMbps: 9380, latencyMs: 1.9, apCode: 'AP-RES-202' },
    electricity: { status: 'NOMINAL', loadKw: 19.6, voltageV: 208, panelCode: 'PNL-RES-2A' },
    ac: { status: 'OPTIMAL', tempC: 21.8, setpointC: 22.0, airflowCfm: 1040 },
    occupancy: { current: 16, capacity: 28, status: 'AVAILABLE' },
    equipmentList: [
      {
        id: 'eq-27',
        name: '75" Collaborative Touch Smart Board',
        type: 'Smart Board',
        category: 'AV_LAB',
        healthPercent: 98,
        status: 'WORKING',
        warranty: 'Valid until 2029-06 (Samsung Flip Pro)',
        lastService: '2026-10-28 · Firmware & Touch Check',
        powerConsumptionKw: 0.55,
        complaintHistory: [],
      },
    ],
    activeComplaintIds: [],
  },
  {
    id: 'room-res-301',
    roomCode: 'RES-301',
    name: 'Penthouse Solar Telemetry & Study Deck',
    roomType: 'Classroom',
    buildingId: 'bldg-res-05',
    buildingCode: 'RES-E',
    buildingName: 'Horizon Graduate Suites',
    floor: 3,
    wing: 'East',
    localOffset: [1.8, 8.8, -1.2],
    size: [3.8, 2.2, 3.4],
    operationalState: 'WORKING',
    statusLevel: 'HEALTHY',
    repairProgress: 100,
    repairStageLabel: 'All Systems Nominal',
    assignedTechnician: 'Standby — No Active Fault',
    jobAccepted: false,
    eta: 'Nominal (0m)',
    lastMaintenance: '2026-10-29 · Regenerative Elevator & Roof Inspection',
    equipmentHealth: 99,
    internet: { status: 'ONLINE', speedMbps: 9540, latencyMs: 1.7, apCode: 'AP-RES-301' },
    electricity: { status: 'NOMINAL', loadKw: 18.4, voltageV: 208, panelCode: 'PNL-RES-3B' },
    ac: { status: 'OPTIMAL', tempC: 22.1, setpointC: 22.0, airflowCfm: 980 },
    occupancy: { current: 11, capacity: 24, status: 'AVAILABLE' },
    equipmentList: [
      {
        id: 'eq-26',
        name: 'Solar Microgrid Telemetry Computer',
        type: 'Computer',
        category: 'POWER',
        healthPercent: 99,
        status: 'WORKING',
        warranty: 'Valid until 2029-12 (Advantech Industrial)',
        lastService: '2026-10-29 · Inverter Modbus Poll Check',
        powerConsumptionKw: 0.45,
        complaintHistory: [],
      },
    ],
    activeComplaintIds: [],
  },
];

const INITIAL_COMPLAINTS: CampusComplaint[] = [
  {
    id: 'cmp-501',
    code: 'CMP-2026-089',
    buildingId: 'bldg-sci-02',
    buildingName: 'Quantum & Photonics Atrium',
    roomId: 'room-sci-302',
    locationDetail: 'Floor 3 · SCI-302 Cryo Optics Cleanroom B',
    category: 'HVAC_THERMAL',
    title: 'Cleanroom AHU-02 thermal drift exceeding +3.9°C threshold',
    description:
      'Optical interferometer table experiencing thermal expansion due to chilled water actuator valve sticking at 35% flow.',
    reportedBy: 'Prof. Elena Vance',
    reporterRole: UserRole.FACULTY,
    status: 'AI_TRIAGED',
    priority: 'HIGH',
    aiAnalyzed: true,
    aiDiagnosis: {
      rootCause:
        'Pneumatic chilled-water modulating valve (CV-204) positioner hysteresis causing under-cooling in Cleanroom AHU-02.',
      severityScore: 84,
      recommendedAction:
        'Recalibrate CV-204 actuator linkage, flush bypass strainer, and engage backup loop chiller B.',
      assignedSpecialty: 'Cryogenic & Cleanroom HVAC Specialist',
      estimatedRepairMinutes: 45,
      safetyHazard: false,
      analyzedAt: '2026-10-30T11:40:00Z',
      modelUsed: 'gemini-3.8-flash',
    },
    createdAt: '2026-10-30T11:35:00Z',
  },
  {
    id: 'cmp-502',
    code: 'CMP-2026-090',
    buildingId: 'bldg-nrg-03',
    buildingName: 'Central Microgrid & Thermal Hub',
    roomId: 'room-nrg-202',
    locationDetail: 'Floor 2 · NRG-202 Substation Bay 2',
    category: 'ELECTRICAL_GRID',
    title: 'Inverter Bank B harmonic distortion & busbar temperature spike (78.4°C)',
    description:
      'Solar microgrid tie-in showing 6.8% THD and elevated busbar infrared telemetry during peak campus load transition.',
    reportedBy: 'Marcus Thorne',
    reporterRole: UserRole.TECHNICIAN,
    status: 'AI_TRIAGED',
    priority: 'CRITICAL',
    aiAnalyzed: true,
    aiDiagnosis: {
      rootCause:
        'Harmonic resonance on Inverter Bank B 480V busbar due to capacitor bank detuning under peak solar backfeed.',
      severityScore: 93,
      recommendedAction:
        'Engage ABB active harmonic filter module, shed 15% non-essential load, and torque-verify busbar lugs.',
      assignedSpecialty: 'High-Voltage Microgrid Engineer',
      estimatedRepairMinutes: 35,
      safetyHazard: true,
      analyzedAt: '2026-10-30T12:06:00Z',
      modelUsed: 'gemini-3.8-flash',
    },
    createdAt: '2026-10-30T12:05:00Z',
  },
  {
    id: 'cmp-503',
    code: 'CMP-2026-091',
    buildingId: 'bldg-inv-04',
    buildingName: 'Vision Spatial Commons & Library',
    roomId: 'room-inv-208',
    locationDetail: 'Floor 2 · INV-208 Collaborative Seminar Pod',
    category: 'AV_CLASSROOM',
    title: 'Spatial projection array HDMI-over-IP transceiver sync drop',
    description:
      'Dual 8K laser wall in study seminar pod 208 intermittently loses Dante audio clock lock during wireless screen casting.',
    reportedBy: 'Alex Rivera',
    reporterRole: UserRole.STUDENT,
    status: 'AI_TRIAGED',
    priority: 'MEDIUM',
    aiAnalyzed: true,
    aiDiagnosis: {
      rootCause:
        'IGMP snooping querier timeout on VLAN 40 switch port 14 causing multicast clock jitter on 8K transceiver.',
      severityScore: 61,
      recommendedAction:
        'Enable fast-leave IGMP on PoE++ switch port 14 and push firmware patch v4.12 to HDMI-over-IP receiver.',
      assignedSpecialty: 'AV-over-IP & Network Specialist',
      estimatedRepairMinutes: 20,
      safetyHazard: false,
      analyzedAt: '2026-10-30T12:15:00Z',
      modelUsed: 'gemini-3.8-flash',
    },
    createdAt: '2026-10-30T12:14:00Z',
  },
];

const INITIAL_WORK_ORDERS: CampusWorkOrder[] = [
  {
    id: 'wo-801',
    code: 'WO-8841',
    buildingId: 'bldg-nrg-03',
    buildingName: 'Central Microgrid & Thermal Hub',
    roomId: 'room-nrg-202',
    nodeId: 'sns-nrg-pwr-1',
    system: 'Inverter Bank B · Active Harmonic Filter',
    title: 'Inspect busbar torque & engage auxiliary forced-air cooling plenum',
    assignedTo: 'Marcus Thorne',
    priority: 'CRITICAL',
    status: 'IN_PROGRESS',
    slaHoursLeft: 1.5,
    createdAt: '2026-10-30T10:30:00Z',
  },
  {
    id: 'wo-802',
    code: 'WO-8842',
    buildingId: 'bldg-sci-02',
    buildingName: 'Quantum & Photonics Atrium',
    roomId: 'room-sci-302',
    nodeId: 'sns-sci-hvac-1',
    system: 'Cleanroom Cryo AHU-02',
    title: 'Replace modulating chilled-water actuator valve CV-204',
    assignedTo: 'Marcus Thorne',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    slaHoursLeft: 3.2,
    createdAt: '2026-10-30T11:42:00Z',
  },
];

const INITIAL_PROCUREMENT: ProcurementItem[] = [
  {
    id: 'prc-301',
    reqCode: 'REQ-2026-410',
    itemTitle: 'Siemens MagLev Chiller Actuator Assembly CV-204 (for SCI-302)',
    vendor: 'Siemens Smart Infrastructure',
    department: 'Central Campus Infrastructure',
    buildingId: 'bldg-sci-02',
    buildingName: 'Quantum & Photonics Atrium',
    roomId: 'room-sci-302',
    amountUsd: 18450,
    urgency: 'EMERGENCY',
    status: 'PENDING_APPROVAL',
    requestedBy: 'Marcus Thorne',
    slaCompliance: 99.4,
    createdAt: '2026-10-30T11:50:00Z',
  },
  {
    id: 'prc-302',
    reqCode: 'REQ-2026-411',
    itemTitle: 'ABB 500kVA Active Harmonic Filter Module (for NRG-202)',
    vendor: 'ABB Electrification Grid',
    department: 'Central Campus Infrastructure',
    buildingId: 'bldg-nrg-03',
    buildingName: 'Central Microgrid & Thermal Hub',
    roomId: 'room-nrg-202',
    amountUsd: 42800,
    urgency: 'EXPEDITED',
    status: 'PENDING_APPROVAL',
    requestedBy: 'Soren Lindqvist',
    slaCompliance: 98.7,
    createdAt: '2026-10-30T12:08:00Z',
  },
];

const INITIAL_ROOMS_RESERVATIONS: RoomReservation[] = [];

class Phase5BCampusStore {
  public users: StoredUser[] = [...INITIAL_USERS];
  public buildings: BuildingData[] = structuredClone(INITIAL_BUILDINGS);
  public rooms3D: CampusRoom3D[] = structuredClone(INITIAL_ROOMS_3D);
  public complaints: CampusComplaint[] = structuredClone(INITIAL_COMPLAINTS);
  public workOrders: CampusWorkOrder[] = structuredClone(INITIAL_WORK_ORDERS);
  public procurement: ProcurementItem[] = structuredClone(INITIAL_PROCUREMENT);
  public rooms: RoomReservation[] = structuredClone(INITIAL_ROOMS_RESERVATIONS);
  public redisSessions: Map<string, RedisSessionRecord & { refreshTokenHash: string }> = new Map();
  public auditLogs: SecurityAuditRecord[] = [];
  public previewInbox: PreviewEmailMessage[] = [];

  constructor() {
    this.logAudit({
      userEmail: 'viktor.kane@campus360.edu',
      userRole: UserRole.SYSTEM_ADMIN,
      action: 'DIGITAL_TWIN_FIRST_ENGINE_READY',
      module: 'digital_twin:full_control',
      ipAddress: '10.24.0.1',
      status: 'SUCCESS',
      metadata: '11 interactive 3D rooms across 5 buildings online with real-time AI diagnostics',
    });

    this.previewInbox.push({
      id: 'eml-seed-01',
      to: 'alex.rivera@campus360.edu',
      recipientName: 'Alex Rivera',
      subject: 'Campus360 Identity Verification — Security Notice',
      type: 'SECURITY_ALERT',
      token: 'VERIFIED-ACCOUNT-READY',
      actionLabel: 'Inspect Security Status',
      bodyPreview:
        'Your Campus360 Enterprise SSO & RBAC profile is active. Use Forgot Password or Email Verification on the login portal to test live cryptographic token links.',
      createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      read: false,
    });
  }

  public syncBuildingStatusFromRooms(buildingId: string) {
    const bldg = this.buildings.find((b) => b.id === buildingId);
    if (!bldg) return;
    const bldgRooms = this.rooms3D.filter((r) => r.buildingId === buildingId);
    const brokenRooms = bldgRooms.filter((r) => r.operationalState === 'NOT_WORKING');
    bldg.activeWorkOrders = brokenRooms.length;
    if (brokenRooms.length === 0) {
      bldg.status = 'NOMINAL';
    } else if (brokenRooms.some((r) => r.equipmentHealth < 55)) {
      bldg.status = 'CRITICAL';
    } else {
      bldg.status = 'WARNING';
    }
  }

  public getDemoCredentials(): DemoAccountCredential[] {
    return this.users.map((u) => ({
      role: u.role,
      displayName: ROLE_RBAC_MATRIX[u.role].displayName,
      dashboardName: ROLE_RBAC_MATRIX[u.role].dashboardTitle,
      email: u.email,
      password: u.demoPasswordPlain,
      fullName: u.fullName,
      department: u.department,
      title: u.title,
    }));
  }

  public toPublicUser(u: StoredUser): AuthUser {
    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      department: u.department,
      title: u.title,
      clearanceLevel: u.clearanceLevel,
      emailVerified: u.emailVerified,
      permissions: u.permissions,
    };
  }

  public logAudit(entry: Omit<SecurityAuditRecord, 'id' | 'createdAt'>): SecurityAuditRecord {
    const record: SecurityAuditRecord = {
      ...entry,
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.unshift(record);
    if (this.auditLogs.length > 120) {
      this.auditLogs.pop();
    }
    return record;
  }

  public createSession(user: StoredUser, ipAddress: string, userAgent: string) {
    const sessionId = `sess-${crypto.randomUUID().slice(0, 8)}`;
    const tokenFamily = `fam-${crypto.randomUUID().slice(0, 8)}`;
    const { accessToken, refreshToken, expiresIn } = issueTokenPair(user, sessionId, tokenFamily);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

    this.redisSessions.set(sessionId, {
      id: sessionId,
      userId: user.id,
      userEmail: user.email,
      userName: user.fullName,
      userRole: user.role,
      tokenFamily,
      rotationCount: 0,
      ipAddress,
      userAgent,
      revoked: false,
      refreshTokenHash: hashToken(refreshToken),
      createdAt: now.toISOString(),
      lastRotatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });

    return { sessionId, tokenFamily, accessToken, refreshToken, expiresIn };
  }

  public rotateRefreshToken(refreshToken: string, ipAddress: string) {
    const payload = verifyJwt(refreshToken, 'refresh');
    if (!payload) {
      return { error: 'Invalid or expired refresh token' };
    }

    const session = this.redisSessions.get(payload.sessionId);
    if (!session) {
      return { error: 'Session not found in Redis cluster' };
    }

    if (session.revoked) {
      this.logAudit({
        userId: session.userId,
        userEmail: session.userEmail,
        userRole: session.userRole,
        action: 'REFRESH_TOKEN_REUSE_BLOCKED',
        module: 'system:sessions',
        ipAddress,
        status: 'DENIED',
        metadata: `Revoked session ${session.id} replay blocked`,
      });
      return { error: 'Session has been revoked' };
    }

    const incomingHash = hashToken(refreshToken);
    if (session.refreshTokenHash !== incomingHash) {
      session.revoked = true;
      this.logAudit({
        userId: session.userId,
        userEmail: session.userEmail,
        userRole: session.userRole,
        action: 'TOKEN_THEFT_REUSE_DETECTED',
        module: 'system:sessions',
        ipAddress,
        status: 'WARNING',
        metadata: `Refresh token family ${session.tokenFamily} automatically revoked on replay attempt`,
      });
      return { error: 'Refresh token reuse detected; session family revoked for security' };
    }

    const user = this.users.find((u) => u.id === session.userId);
    if (!user) {
      return { error: 'User account not found' };
    }

    const nextPair = issueTokenPair(user, session.id, session.tokenFamily);
    session.refreshTokenHash = hashToken(nextPair.refreshToken);
    session.rotationCount += 1;
    session.lastRotatedAt = new Date().toISOString();

    this.logAudit({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'REFRESH_TOKEN_ROTATED',
      module: 'system:sessions',
      ipAddress,
      status: 'SUCCESS',
      metadata: `Session ${session.id} rotated (rotation #${session.rotationCount})`,
    });

    return {
      user: this.toPublicUser(user),
      accessToken: nextPair.accessToken,
      refreshToken: nextPair.refreshToken,
      expiresIn: nextPair.expiresIn,
      session: this.getPublicSession(session.id),
    };
  }

  public getPublicSession(sessionId: string): RedisSessionRecord | undefined {
    const s = this.redisSessions.get(sessionId);
    if (!s) return undefined;
    const { refreshTokenHash: _, ...rest } = s;
    return rest;
  }

  public getAllSessions(): RedisSessionRecord[] {
    return Array.from(this.redisSessions.values()).map(({ refreshTokenHash: _, ...rest }) => rest);
  }
}

export const campusStore = new Phase5BCampusStore();
