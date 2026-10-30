import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BuildingData, CampusRoom3D } from '../../types/campus.ts';
import {
  ChevronDown,
  ChevronUp,
  Compass,
  Sun,
  Layers,
  Activity,
  Zap,
  Shield,
  Thermometer,
  Users,
  Box,
  Crosshair,
} from 'lucide-react';

export type TwinLayerMode =
  | 'overview'
  | 'hvac'
  | 'energy'
  | 'occupancy'
  | 'maintenance'
  | 'assets'
  | 'security';

export type TwinSelectionScope = 'BUILDING' | 'FLOOR' | 'ROOM' | 'EQUIPMENT';

interface CampusDigitalTwinProps {
  buildings: BuildingData[];
  rooms3D?: CampusRoom3D[];
  selectedBuildingId: string | null;
  selectedFloor?: number | 'ALL';
  selectedRoomId?: string | null;
  selectedEquipmentId?: string | null;
  selectionScope?: TwinSelectionScope;
  focusTrigger?: number;
  pickModeActive?: boolean;
  onSelectBuilding?: (buildingId: string) => void;
  onSelectFloor?: (floor: number | 'ALL', buildingId?: string) => void;
  onSelectRoom?: (roomId: string, buildingId: string) => void;
  onSelectEquipment?: (equipmentId: string, roomId: string, buildingId: string) => void;
  onContextRaiseComplaint?: (roomId: string, buildingId: string) => void;
  onCameraAzimuthChange?: (azimuthDeg: number) => void;
  activeLayer: TwinLayerMode;
  onLayerChange?: (layer: TwinLayerMode) => void;
  mode: 'login-background' | 'dashboard';
  className?: string;
  weatherMode?: 'clear' | 'rain';
  cinematicTour?: boolean;
  forcedLighting?: 'day' | 'dusk' | 'night';
}

interface HoveredEntityInfo {
  kind: 'BUILDING' | 'FLOOR' | 'ROOM';
  buildingId: string;
  floor?: number;
  roomId?: string;
  screenX: number;
  screenY: number;
}

interface ContextMenuState {
  x: number;
  y: number;
  kind: 'BUILDING' | 'FLOOR' | 'ROOM' | 'EQUIPMENT';
  buildingId: string;
  floor?: number;
  roomId?: string;
  equipmentId?: string;
  label: string;
}

const _targetCameraPos = new THREE.Vector3(28, 22, 30);
const _targetLookAt = new THREE.Vector3(0, 3, 0);
const _raycaster = new THREE.Raycaster();
const _pointer = new THREE.Vector2();
const _projVec = new THREE.Vector3();

export function getRoomOperationalBadge(rm: CampusRoom3D): {
  emoji: '🟢' | '🟡' | '🔴' | '⚪';
  statusText: 'Working' | 'Under Maintenance' | 'Critical' | 'Closed';
  occupancyText: 'Occupied' | 'Available';
  signalText: 'Healthy' | 'Warning' | 'Critical' | 'Offline';
  hex: number;
  badgeClass: string;
} {
  const occupancyText: 'Occupied' | 'Available' =
    rm.occupancy.current > 0 || rm.occupancy.status !== 'AVAILABLE' ? 'Occupied' : 'Available';

  if (rm.internet.status === 'OFFLINE' && rm.occupancy.current === 0 && rm.repairProgress === 0) {
    return {
      emoji: '⚪',
      statusText: 'Closed',
      occupancyText,
      signalText: 'Offline',
      hex: 0x94a3b8,
      badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    };
  }
  if (rm.operationalState === 'WORKING') {
    return {
      emoji: '🟢',
      statusText: 'Working',
      occupancyText,
      signalText: 'Healthy',
      hex: 0x10b981,
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    };
  }
  if (rm.statusLevel === 'CRITICAL' || rm.repairProgress < 40) {
    return {
      emoji: '🔴',
      statusText: 'Critical',
      occupancyText,
      signalText: 'Critical',
      hex: 0xef4444,
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    };
  }
  return {
    emoji: '🟡',
    statusText: 'Under Maintenance',
    occupancyText,
    signalText: 'Warning',
    hex: 0xf59e0b,
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  };
}

export function getBuildingHealthBadge(
  bldg: BuildingData,
  rooms: CampusRoom3D[]
): {
  emoji: '🟢' | '🟡' | '🔴' | '⚪';
  label: 'Healthy' | 'Maintenance' | 'Critical' | 'Offline';
  ledText: 'Green LED' | 'Yellow LED' | 'Red LED' | 'Gray LED';
  ledDotClass: string;
  healthScore: number;
  hex: number;
  badgeClass: string;
} {
  const bRooms = rooms.filter((r) => r.buildingId === bldg.id);
  if (bRooms.length === 0 && bldg.occupancy === 0) {
    return {
      emoji: '⚪',
      label: 'Offline',
      ledText: 'Gray LED',
      ledDotClass: 'bg-slate-400 shadow-[0_0_10px_#94a3b8]',
      healthScore: 0,
      hex: 0x94a3b8,
      badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    };
  }

  const avgHealth =
    bRooms.length > 0
      ? Math.round(bRooms.reduce((acc, r) => acc + r.equipmentHealth, 0) / bRooms.length)
      : 98;
  const hasCritical =
    bldg.status === 'CRITICAL' ||
    bldg.securityLockdown ||
    bRooms.some((r) => r.operationalState !== 'WORKING' && r.statusLevel === 'CRITICAL');
  const hasWarning =
    bldg.status === 'WARNING' ||
    bldg.loadSheddingActive ||
    bRooms.some((r) => r.operationalState !== 'WORKING');

  if (hasCritical) {
    return {
      emoji: '🔴',
      label: 'Critical',
      ledText: 'Red LED',
      ledDotClass: 'bg-rose-500 shadow-[0_0_12px_#ef4444]',
      healthScore: avgHealth,
      hex: 0xef4444,
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    };
  }
  if (hasWarning) {
    return {
      emoji: '🟡',
      label: 'Maintenance',
      ledText: 'Yellow LED',
      ledDotClass: 'bg-amber-400 shadow-[0_0_12px_#f59e0b]',
      healthScore: avgHealth,
      hex: 0xf59e0b,
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    };
  }
  return {
    emoji: '🟢',
    label: 'Healthy',
    ledText: 'Green LED',
    ledDotClass: 'bg-emerald-400 shadow-[0_0_12px_#10b981]',
    healthScore: avgHealth,
    hex: 0x10b981,
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  };
}

export function getFloorHealthSummary(
  bldgId: string,
  floorNum: number,
  rooms: CampusRoom3D[]
) {
  const fRooms = rooms.filter((r) => r.buildingId === bldgId && r.floor === floorNum);
  const totalRooms = fRooms.length;
  const healthyRooms = fRooms.filter((r) => r.operationalState === 'WORKING').length;
  const faultRooms = totalRooms - healthyRooms;
  const occupied = fRooms.reduce((acc, r) => acc + r.occupancy.current, 0);
  const capacity = fRooms.reduce((acc, r) => acc + r.occupancy.capacity, 0) || 100;
  const occupancyPct = Math.min(100, Math.round((occupied / capacity) * 100));
  const health =
    fRooms.length > 0
      ? Math.round(fRooms.reduce((acc, r) => acc + r.equipmentHealth, 0) / fRooms.length)
      : 98;
  const activeComplaints = fRooms.reduce((acc, r) => acc + r.activeComplaintIds.length, 0);

  const hasCritical = fRooms.some(
    (r) => r.operationalState !== 'WORKING' && r.statusLevel === 'CRITICAL'
  );
  const hasWarning = fRooms.some((r) => r.operationalState !== 'WORKING');

  const floorSignal: { emoji: '🟢' | '🟡' | '🔴'; label: 'Healthy' | 'Warning' | 'Critical'; hex: number } =
    hasCritical
      ? { emoji: '🔴', label: 'Critical', hex: 0xef4444 }
      : hasWarning
      ? { emoji: '🟡', label: 'Warning', hex: 0xf59e0b }
      : { emoji: '🟢', label: 'Healthy', hex: 0x10b981 };

  const hasElecFault = fRooms.some((r) => r.electricity.status === 'HARMONIC_FAULT');
  const hasElecWarn = fRooms.some((r) => r.electricity.status === 'LOAD_SHED');
  const electricitySignal = hasElecFault
    ? { emoji: '🔴' as const, label: 'Critical (Harmonic Fault)' }
    : hasElecWarn
    ? { emoji: '🟡' as const, label: 'Warning (Load Shed)' }
    : { emoji: '🟢' as const, label: 'Healthy (Nominal)' };

  const hasWaterWarn = fRooms.some(
    (r) => r.ac.status === 'DRIFT_WARNING' || r.ac.status === 'FAULT'
  );
  const waterSignal = hasCritical
    ? { emoji: '🟡' as const, label: 'Warning (Chilled Loop Drift)' }
    : hasWaterWarn
    ? { emoji: '🟡' as const, label: 'Warning (Valve Hysteresis)' }
    : { emoji: '🟢' as const, label: 'Healthy (Nominal Pressure)' };

  const hasNetCrit = fRooms.some((r) => r.internet.status === 'OFFLINE');
  const hasNetWarn = fRooms.some((r) => r.internet.status === 'DEGRADED');
  const internetSignal = hasNetCrit
    ? { emoji: '🔴' as const, label: 'Critical (Offline)' }
    : hasNetWarn
    ? { emoji: '🟡' as const, label: 'Warning (Degraded)' }
    : { emoji: '🟢' as const, label: 'Healthy (Online 10G)' };

  return {
    totalRooms,
    healthyRooms,
    faultRooms,
    health,
    occupied,
    capacity,
    occupancyPct,
    activeComplaints,
    floorSignal,
    electricitySignal,
    waterSignal,
    internetSignal,
    rooms: fRooms,
  };
}

export const CampusDigitalTwin: React.FC<CampusDigitalTwinProps> = ({
  buildings,
  rooms3D = [],
  selectedBuildingId,
  selectedFloor = 'ALL',
  selectedRoomId = null,
  selectedEquipmentId = null,
  selectionScope = 'ROOM',
  focusTrigger = 0,
  pickModeActive = false,
  onSelectBuilding,
  onSelectFloor,
  onSelectRoom,
  onSelectEquipment,
  onContextRaiseComplaint,
  onCameraAzimuthChange,
  activeLayer,
  onLayerChange,
  mode,
  className = '',
  weatherMode = 'clear',
  cinematicTour = false,
  forcedLighting,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const buildingsRef = useRef<BuildingData[]>(buildings);
  const rooms3DRef = useRef<CampusRoom3D[]>(rooms3D);
  const selectedBldgIdRef = useRef<string | null>(selectedBuildingId);
  const selectedFloorRef = useRef<number | 'ALL'>(selectedFloor);
  const selectedRoomIdRef = useRef<string | null>(selectedRoomId);
  const selectedEquipmentIdRef = useRef<string | null>(selectedEquipmentId);
  const selectionScopeRef = useRef<TwinSelectionScope>(selectionScope);
  const activeLayerRef = useRef<TwinLayerMode>(activeLayer);
  const modeRef = useRef<'login-background' | 'dashboard'>(mode);
  const onSelectBldgRef = useRef(onSelectBuilding);
  const onSelectFloorRef = useRef(onSelectFloor);
  const onSelectRoomRef = useRef(onSelectRoom);
  const onSelectEquipmentRef = useRef(onSelectEquipment);
  const onCameraAzimuthRef = useRef(onCameraAzimuthChange);

  buildingsRef.current = buildings;
  rooms3DRef.current = rooms3D;
  selectedBldgIdRef.current = selectedBuildingId;
  selectedFloorRef.current = selectedFloor;
  selectedRoomIdRef.current = selectedRoomId;
  selectedEquipmentIdRef.current = selectedEquipmentId;
  selectionScopeRef.current = selectionScope;
  activeLayerRef.current = activeLayer;
  modeRef.current = mode;
  onSelectBldgRef.current = onSelectBuilding;
  onSelectFloorRef.current = onSelectFloor;
  onSelectRoomRef.current = onSelectRoom;
  onSelectEquipmentRef.current = onSelectEquipment;
  onCameraAzimuthRef.current = onCameraAzimuthChange;

  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<'room-focus' | 'campus' | 'top' | 'orbit'>('room-focus');
  const [lightingMode, setLightingMode] = useState<'day' | 'dusk' | 'night'>('dusk');
  const [localWeather, setLocalWeather] = useState<'clear' | 'rain'>(weatherMode);
  const [explodedAmount, setExplodedAmount] = useState<number>(0.78);
  const [hoveredEntity, setHoveredEntity] = useState<HoveredEntityInfo | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const presetRef = useRef(cameraPreset);
  const lightingRef = useRef(lightingMode);
  const explodedRef = useRef(explodedAmount);
  const hoveredEntityRef = useRef<HoveredEntityInfo | null>(null);
  const userInteractingRef = useRef<boolean>(false);

  const cinematicRef = useRef(cinematicTour);
  const weatherRef = useRef<'clear' | 'rain'>(weatherMode);
  presetRef.current = cameraPreset;
  lightingRef.current = forcedLighting || lightingMode;
  explodedRef.current = explodedAmount;
  cinematicRef.current = cinematicTour;
  weatherRef.current = weatherMode === 'rain' || localWeather === 'rain' ? 'rain' : 'clear';

  useEffect(() => {
    if (forcedLighting) setLightingMode(forcedLighting);
  }, [forcedLighting]);

  useEffect(() => {
    setLocalWeather(weatherMode);
  }, [weatherMode]);

  useEffect(() => {
    if (mode === 'dashboard') {
      userInteractingRef.current = false;
      setCameraPreset('room-focus');
      presetRef.current = 'room-focus';
      if (selectedBuildingId) {
        setExplodedAmount((prev) => (prev < 0.7 ? 0.85 : prev));
      }
    }
  }, [selectedBuildingId, selectedFloor, selectedRoomId, selectionScope, focusTrigger, mode]);

  const buildingGroupsMapRef = useRef<
    Map<
      string,
      {
        root: THREE.Group;
        glassShell: THREE.Mesh;
        shellEdges: THREE.LineSegments;
        beaconMesh: THREE.Mesh;
        ledStripMesh: THREE.Mesh;
        ringMesh: THREE.Mesh;
        floorSlabs: {
          floor: number;
          mesh: THREE.Mesh;
          edgeLines: THREE.LineSegments;
          baseY: number;
        }[];
      }
    >
  >(new Map());

  const roomMeshesMapRef = useRef<
    Map<
      string,
      {
        group: THREE.Group;
        boxMesh: THREE.Mesh;
        edgeLines: THREE.LineSegments;
        statusOrb: THREE.Mesh;
        equipmentMeshes: { id: string; mesh: THREE.Mesh; ring: THREE.Mesh }[];
        baseOffset: [number, number, number];
        floor: number;
        buildingPos: [number, number, number];
      }
    >
  >(new Map());

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060a14);
    scene.fog = new THREE.FogExp2(0x060a14, 0.0068);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 320);
    camera.position.set(26, 19, 28);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.28;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio PMREM reflections for architectural curtain-wall glass and metallic surfaces
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.032).texture;
    pmremGenerator.dispose();

    // =========================================================================
    // 0. ATMOSPHERIC SKYBOX DOME (Twilight Horizon + Subtle Zenith Stars)
    // =========================================================================
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 512;
    skyCanvas.height = 512;
    const sCtx = skyCanvas.getContext('2d')!;
    const skyGrad = sCtx.createLinearGradient(0, 0, 0, 512);
    skyGrad.addColorStop(0, '#020617');
    skyGrad.addColorStop(0.45, '#071126');
    skyGrad.addColorStop(0.76, '#0c2342');
    skyGrad.addColorStop(1, '#1e293b');
    sCtx.fillStyle = skyGrad;
    sCtx.fillRect(0, 0, 512, 512);

    // Deterministic star specks in upper sky dome
    for (let i = 0; i < 90; i++) {
      const sx = ((i * 73) % 500) + 6;
      const sy = ((i * 41) % 240) + 4;
      sCtx.fillStyle = i % 3 === 0 ? 'rgba(125,211,252,0.55)' : 'rgba(248,250,252,0.35)';
      sCtx.fillRect(sx, sy, 1.5, 1.5);
    }

    const skyTex = new THREE.CanvasTexture(skyCanvas);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(185, 32, 20),
      new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false })
    );
    scene.add(skyDome);

    // Calibrated 3-Point Studio Lighting + Hemisphere Fill
    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x0f172a, 1.12);
    hemiLight.position.set(0, 55, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.65);
    keyLight.position.set(34, 52, 30);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(isSoftwareGl ? 1024 : 2048, isSoftwareGl ? 1024 : 2048);
    keyLight.shadow.camera.near = 5;
    keyLight.shadow.camera.far = 140;
    const d = 46;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.normalBias = 0.015;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.65);
    rimLight.position.set(-34, 28, -28);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0x818cf8, 0.85);
    fillLight.position.set(-18, 22, 34);
    scene.add(fillLight);

    // =========================================================================
    // 1. REALISTIC CAMPUS TERRAIN, ROADS, CROSSWALKS, FOOTPATHS, BENCHES & PARKING
    // =========================================================================
    const groundGeo = new THREE.CylinderGeometry(78, 80, 0.8, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x07101e,
      roughness: 0.84,
      metalness: 0.14,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.y = -0.4;
    groundMesh.receiveShadow = !isSoftwareGl;
    scene.add(groundMesh);

    const gridCanvas = document.createElement('canvas');
    gridCanvas.width = 2048;
    gridCanvas.height = 2048;
    const gCtx = gridCanvas.getContext('2d')!;
    gCtx.fillStyle = '#081120';
    gCtx.fillRect(0, 0, 2048, 2048);

    // Landscaped Emerald Lawn Quadrants
    gCtx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    gCtx.beginPath();
    gCtx.arc(1024, 1024, 720, 0, Math.PI * 2);
    gCtx.fill();

    // Central Architectural Plaza Circle
    gCtx.fillStyle = 'rgba(30, 41, 59, 0.72)';
    gCtx.beginPath();
    gCtx.arc(1024, 1024, 220, 0, Math.PI * 2);
    gCtx.fill();

    gCtx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    gCtx.lineWidth = 3;
    gCtx.beginPath();
    gCtx.arc(1024, 1024, 218, 0, Math.PI * 2);
    gCtx.stroke();

    // Subtle Architectural Survey Grid
    gCtx.strokeStyle = 'rgba(56, 189, 248, 0.10)';
    gCtx.lineWidth = 2;
    for (let i = 0; i <= 2048; i += 128) {
      gCtx.beginPath();
      gCtx.moveTo(i, 0);
      gCtx.lineTo(i, 2048);
      gCtx.stroke();
      gCtx.beginPath();
      gCtx.moveTo(0, i);
      gCtx.lineTo(2048, i);
      gCtx.stroke();
    }

    // Main Campus Ring Road (Asphalt)
    gCtx.strokeStyle = '#1e293b';
    gCtx.lineWidth = 118;
    gCtx.beginPath();
    gCtx.arc(1024, 1024, 620, 0, Math.PI * 2);
    gCtx.stroke();

    // Outer & Inner Road Curbs
    gCtx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
    gCtx.lineWidth = 4;
    gCtx.beginPath();
    gCtx.arc(1024, 1024, 679, 0, Math.PI * 2);
    gCtx.stroke();
    gCtx.beginPath();
    gCtx.arc(1024, 1024, 561, 0, Math.PI * 2);
    gCtx.stroke();

    // Dashed Center Highway Divider
    gCtx.save();
    gCtx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
    gCtx.lineWidth = 4;
    gCtx.setLineDash([28, 28]);
    gCtx.beginPath();
    gCtx.arc(1024, 1024, 620, 0, Math.PI * 2);
    gCtx.stroke();
    gCtx.restore();

    // Pedestrian Crosswalk Stripes across the Ring Road at 4 Cardinal Points
    for (let c = 0; c < 4; c++) {
      const ang = (c * Math.PI) / 2;
      gCtx.save();
      gCtx.translate(1024 + Math.cos(ang) * 620, 1024 + Math.sin(ang) * 620);
      gCtx.rotate(ang);
      gCtx.fillStyle = 'rgba(248, 250, 252, 0.55)';
      for (let s = -40; s <= 40; s += 16) {
        gCtx.fillRect(s, -24, 8, 48);
      }
      gCtx.restore();
    }

    const gridTexture = new THREE.CanvasTexture(gridCanvas);
    gridTexture.colorSpace = THREE.SRGBColorSpace;
    gridTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const plazaGeo = new THREE.PlaneGeometry(92, 92);
    const plazaMat = new THREE.MeshStandardMaterial({
      map: gridTexture,
      roughness: 0.72,
      metalness: 0.22,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const plazaMesh = new THREE.Mesh(plazaGeo, plazaMat);
    plazaMesh.rotation.x = -Math.PI / 2;
    plazaMesh.position.y = 0.02;
    plazaMesh.receiveShadow = !isSoftwareGl;
    scene.add(plazaMesh);

    // Stone-Paved Pedestrian Footpaths & Curb Borders
    const walkwayMat = new THREE.MeshStandardMaterial({
      color: 0x263449,
      roughness: 0.52,
      metalness: 0.28,
    });
    const curbMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.45,
      metalness: 0.4,
    });

    buildingsRef.current.forEach((b) => {
      const [bx, , bz] = b.position;
      const len = Math.hypot(bx, bz);
      const angle = Math.atan2(bx, bz);
      const walkGroup = new THREE.Group();
      walkGroup.position.set(bx / 2, 0.04, bz / 2);
      walkGroup.rotation.y = angle;

      const walkMesh = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.06, len), walkwayMat);
      walkMesh.receiveShadow = !isSoftwareGl;
      walkGroup.add(walkMesh);

      const leftCurb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, len), curbMat);
      leftCurb.position.x = -1.2;
      walkGroup.add(leftCurb);

      const rightCurb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, len), curbMat);
      rightCurb.position.x = 1.2;
      walkGroup.add(rightCurb);

      scene.add(walkGroup);
    });

    // Campus Benches along Central Plaza & Footpaths
    const benchWoodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.65 });
    const benchFrameMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.3,
    });
    for (let bIdx = 0; bIdx < 10; bIdx++) {
      const bAngle = (bIdx / 10) * Math.PI * 2 + 0.2;
      const bRadius = bIdx % 2 === 0 ? 8.2 : 14.8;
      const benchGroup = new THREE.Group();
      benchGroup.position.set(Math.cos(bAngle) * bRadius, 0.06, Math.sin(bAngle) * bRadius);
      benchGroup.rotation.y = -bAngle + Math.PI / 2;

      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.45), benchWoodMat);
      seat.position.y = 0.32;
      benchGroup.add(seat);

      const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.32, 0.07), benchWoodMat);
      backrest.position.set(0, 0.5, -0.2);
      backrest.rotation.x = -0.15;
      benchGroup.add(backrest);

      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.45), benchFrameMat);
      legL.position.set(-0.54, 0.16, 0);
      benchGroup.add(legL);

      const legR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.45), benchFrameMat);
      legR.position.set(0.54, 0.16, 0);
      benchGroup.add(legR);

      scene.add(benchGroup);
    }

    // Helper to build a multi-part 3D Vehicle (Chassis + Cabin + Wheels + Headlights + Taillights)
    const createCompositeVehicle = (bodyHex: number, isShuttle = false) => {
      const vGroup = new THREE.Group();
      const length = isShuttle ? 3.2 : 2.55;
      const widthV = isShuttle ? 1.48 : 1.32;
      const chassisH = isShuttle ? 0.55 : 0.42;

      const bodyMat = new THREE.MeshStandardMaterial({
        color: bodyHex,
        roughness: 0.2,
        metalness: 0.72,
      });
      const cabinMat = new THREE.MeshPhysicalMaterial({
        color: 0x0f172a,
        roughness: 0.1,
        metalness: 0.25,
        clearcoat: 0.8,
      });
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.85 });
      const headLightMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });
      const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });

      const chassis = new THREE.Mesh(
        new THREE.BoxGeometry(widthV, chassisH, length),
        bodyMat
      );
      chassis.position.y = chassisH / 2 + 0.18;
      chassis.castShadow = !isSoftwareGl;
      vGroup.add(chassis);

      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(widthV * 0.88, isShuttle ? 0.52 : 0.36, length * 0.62),
        cabinMat
      );
      cabin.position.set(0, chassisH + (isShuttle ? 0.38 : 0.32), -0.08);
      cabin.castShadow = !isSoftwareGl;
      vGroup.add(cabin);

      const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.16, 12);
      wheelGeo.rotateZ(Math.PI / 2);
      const wheelOffsets: [number, number][] = [
        [-widthV * 0.48, length * 0.32],
        [widthV * 0.48, length * 0.32],
        [-widthV * 0.48, -length * 0.32],
        [widthV * 0.48, -length * 0.32],
      ];
      wheelOffsets.forEach(([wx, wz]) => {
        const wMesh = new THREE.Mesh(wheelGeo, wheelMat);
        wMesh.position.set(wx, 0.22, wz);
        vGroup.add(wMesh);
      });

      const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.06), headLightMat);
      hlL.position.set(-widthV * 0.34, 0.42, length / 2 + 0.01);
      vGroup.add(hlL);

      const hlR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.06), headLightMat);
      hlR.position.set(widthV * 0.34, 0.42, length / 2 + 0.01);
      vGroup.add(hlR);

      const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.06), tailLightMat);
      tlL.position.set(-widthV * 0.34, 0.42, -length / 2 - 0.01);
      vGroup.add(tlL);

      const tlR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.06), tailLightMat);
      tlR.position.set(widthV * 0.34, 0.42, -length / 2 - 0.01);
      vGroup.add(tlR);

      return vGroup;
    };

    // Smart EV Parking Zone (West & East Bays)
    const createParkingZone = (px: number, pz: number, rotY: number) => {
      const parkingGroup = new THREE.Group();
      parkingGroup.position.set(px, 0.04, pz);
      parkingGroup.rotation.y = rotY;

      const lotPad = new THREE.Mesh(
        new THREE.BoxGeometry(11.5, 0.08, 7.4),
        new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.75 })
      );
      lotPad.receiveShadow = !isSoftwareGl;
      parkingGroup.add(lotPad);

      // Painted Parking Stall Lines
      for (let s = 0; s <= 4; s++) {
        const line = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.09, 3.2),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
        );
        line.position.set(-4.4 + s * 2.2, 0.01, -1.2);
        parkingGroup.add(line);
      }

      const canopyRoof = new THREE.Mesh(
        new THREE.BoxGeometry(10.2, 0.15, 3.6),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.22, metalness: 0.78 })
      );
      canopyRoof.position.set(0, 2.35, -1.2);
      canopyRoof.rotation.x = 0.12;
      canopyRoof.castShadow = !isSoftwareGl;
      parkingGroup.add(canopyRoof);

      const carColors = [0x38bdf8, 0xe2e8f0, 0x6366f1, 0x10b981];
      for (let c = 0; c < 4; c++) {
        const parkedCar = createCompositeVehicle(carColors[c], false);
        parkedCar.position.set(-3.3 + c * 2.2, 0.04, -1.2);
        parkingGroup.add(parkedCar);
      }

      scene.add(parkingGroup);
    };

    createParkingZone(-23, 15, 0.25);
    createParkingZone(23, -15, Math.PI + 0.25);

    // =========================================================================
    // 2. MULTI-LAYERED INSTANCED TREES & STREET LIGHTS WITH GROUND POOLS
    // =========================================================================
    const treeCount = 64;
    const lowerCanopyGeo = new THREE.ConeGeometry(0.98, 2.2, 8);
    const upperCanopyGeo = new THREE.ConeGeometry(0.72, 1.8, 8);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x0f5132,
      roughness: 0.65,
      metalness: 0.08,
    });
    const upperCanopyMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.6,
      metalness: 0.08,
    });
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.22, 1.0, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });

    const instancedLowerCanopies = new THREE.InstancedMesh(lowerCanopyGeo, canopyMat, treeCount);
    const instancedUpperCanopies = new THREE.InstancedMesh(upperCanopyGeo, upperCanopyMat, treeCount);
    const instancedTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    instancedLowerCanopies.castShadow = !isSoftwareGl;
    instancedUpperCanopies.castShadow = !isSoftwareGl;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2;
      const radius =
        i % 3 === 0 ? 31.8 + (i % 4) * 2.2 : i % 2 === 0 ? 22.8 + (i % 3) * 1.4 : 11.2;
      const tx = Math.cos(angle) * radius;
      const tz = Math.sin(angle) * radius;
      const scale = 0.82 + (i % 4) * 0.14;

      dummy.position.set(tx, 1.35 * scale, tz);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      instancedLowerCanopies.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tx, 2.25 * scale, tz);
      dummy.scale.set(scale * 0.9, scale * 0.9, scale * 0.9);
      dummy.updateMatrix();
      instancedUpperCanopies.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tx, 0.45 * scale, tz);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      instancedTrunks.setMatrixAt(i, dummy.matrix);
    }
    instancedLowerCanopies.instanceMatrix.needsUpdate = true;
    instancedUpperCanopies.instanceMatrix.needsUpdate = true;
    instancedTrunks.instanceMatrix.needsUpdate = true;
    scene.add(instancedLowerCanopies);
    scene.add(instancedUpperCanopies);
    scene.add(instancedTrunks);

    // Architectural Street Lights with Ground Light Pools
    const streetLightCount = 20;
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.85,
      roughness: 0.25,
    });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xbae6fd });
    const poolMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    });

    for (let i = 0; i < streetLightCount; i++) {
      const angle = (i / streetLightCount) * Math.PI * 2;
      const r = 24.4;
      const lx = Math.cos(angle) * r;
      const lz = Math.sin(angle) * r;

      const poleGroup = new THREE.Group();
      poleGroup.position.set(lx, 0, lz);
      poleGroup.rotation.y = -angle;

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 3.5, 6), poleMat);
      pole.position.y = 1.75;
      poleGroup.add(pole);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.06, 0.08), poleMat);
      arm.position.set(0.28, 3.48, 0);
      poleGroup.add(arm);

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), bulbMat);
      bulb.position.set(0.55, 3.42, 0);
      poleGroup.add(bulb);

      const lightPool = new THREE.Mesh(new THREE.CircleGeometry(1.85, 16), poolMat);
      lightPool.rotation.x = -Math.PI / 2;
      lightPool.position.set(0.55, 0.03, 0);
      poleGroup.add(lightPool);

      scene.add(poleGroup);
    }

    // =========================================================================
    // 2A. CAMPUS AMENITIES — fountain, sports, cafeteria, medical, garage, gates
    // =========================================================================
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.45, metalness: 0.35 });
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x22d3ee,
      roughness: 0.05,
      metalness: 0.15,
      transmission: 0.55,
      transparent: true,
      opacity: 0.72,
      thickness: 0.6,
    });
    const fountain = new THREE.Group();
    fountain.position.set(0, 0.04, 0);
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.35, 32), stoneMat);
    basin.position.y = 0.18;
    fountain.add(basin);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 0.12, 32), waterMat);
    water.position.y = 0.38;
    fountain.add(water);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 1.4, 10), stoneMat);
    spout.position.y = 1.0;
    fountain.add(spout);
    scene.add(fountain);

    const sports = new THREE.Group();
    sports.position.set(-32, 0.05, 8);
    const field = new THREE.Mesh(
      new THREE.BoxGeometry(16, 0.08, 10),
      new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.85 })
    );
    sports.add(field);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    for (let s = -4; s <= 4; s++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 9.2), stripeMat);
      stripe.position.set(s * 1.7, 0.02, 0);
      sports.add(stripe);
    }
    scene.add(sports);

    const cafe = new THREE.Group();
    cafe.position.set(28, 0, 18);
    const cafeBody = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 3.2, 5.4),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, metalness: 0.2 })
    );
    cafeBody.position.y = 1.7;
    cafe.add(cafeBody);
    const cafeRoof = new THREE.Mesh(
      new THREE.ConeGeometry(5.2, 1.4, 4),
      new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.6 })
    );
    cafeRoof.position.y = 4.0;
    cafeRoof.rotation.y = Math.PI / 4;
    cafe.add(cafeRoof);
    scene.add(cafe);

    const medical = new THREE.Group();
    medical.position.set(30, 0, -22);
    const medBody = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 3.6, 5),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.2 })
    );
    medBody.position.y = 1.9;
    medical.add(medBody);
    const crossV = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 1.6, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.6 })
    );
    crossV.position.set(0, 4.1, 2.52);
    medical.add(crossV);
    const crossH = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.35, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.6 })
    );
    crossH.position.set(0, 4.1, 2.52);
    medical.add(crossH);
    scene.add(medical);

    const garage = new THREE.Group();
    garage.position.set(-28, 0, -20);
    for (let lvl = 0; lvl < 3; lvl++) {
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(10, 0.28, 8),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.4 })
      );
      slab.position.y = 0.3 + lvl * 2.2;
      garage.add(slab);
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(10.2, 0.12, 8.2),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.25 })
      );
      rail.position.y = 1.1 + lvl * 2.2;
      garage.add(rail);
    }
    scene.add(garage);

    const busStop = new THREE.Group();
    busStop.position.set(0, 0, 26);
    const shelter = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 0.12, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.7, roughness: 0.2 })
    );
    shelter.position.y = 3.1;
    busStop.add(shelter);
    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.1, 8), poleMat);
    postL.position.set(-1.9, 1.55, 0.7);
    busStop.add(postL);
    const postR = postL.clone();
    postR.position.x = 1.9;
    busStop.add(postR);
    scene.add(busStop);

    const gateMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.7, roughness: 0.3 });
    for (const gx of [-8, 8]) {
      const gate = new THREE.Group();
      gate.position.set(gx, 0, 32);
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.4, 0.5), gateMat);
      pillar.position.y = 1.7;
      gate.add(pillar);
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
      );
      lamp.position.y = 3.5;
      gate.add(lamp);
      scene.add(gate);
    }

    const bikeMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, metalness: 0.6, roughness: 0.3 });
    for (let bi = 0; bi < 8; bi++) {
      const bike = new THREE.Group();
      bike.position.set(-6 + bi * 0.85, 0.22, 12);
      const wheel1 = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 12), bikeMat);
      wheel1.rotation.y = Math.PI / 2;
      const wheel2 = wheel1.clone();
      wheel2.position.z = 0.55;
      bike.add(wheel1, wheel2);
      scene.add(bike);
    }

    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.38,
      roughness: 1,
      depthWrite: false,
    });
    const clouds: THREE.Mesh[] = [];
    for (let c = 0; c < 7; c++) {
      const cloud = new THREE.Mesh(new THREE.SphereGeometry(3.2 + (c % 3), 10, 8), cloudMat);
      cloud.scale.set(1.8, 0.45, 1.1);
      cloud.position.set(-28 + c * 9, 22 + (c % 2) * 3, -18 + (c % 4) * 6);
      scene.add(cloud);
      clouds.push(cloud);
    }

    const birdMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const birds: { mesh: THREE.Mesh; speed: number; radius: number; height: number; phase: number }[] = [];
    for (let b = 0; b < 10; b++) {
      const bird = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 4), birdMat);
      scene.add(bird);
      birds.push({
        mesh: bird,
        speed: 0.35 + (b % 3) * 0.12,
        radius: 14 + (b % 4) * 3,
        height: 9 + (b % 5),
        phase: b * 0.7,
      });
    }

    const rainGeo = new THREE.BufferGeometry();
    const rainCount = 420;
    const rainPos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPos[i * 3] = (Math.random() - 0.5) * 70;
      rainPos[i * 3 + 1] = Math.random() * 28;
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 70;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainPoints = new THREE.Points(
      rainGeo,
      new THREE.PointsMaterial({ color: 0x7dd3fc, size: 0.08, transparent: true, opacity: 0.55 })
    );
    rainPoints.visible = false;
    scene.add(rainPoints);

    // =========================================================================
    // 2B. SMOOTH 60 FPS AMBIENT CAMPUS SHUTTLES/VEHICLES & WALKING PEDESTRIANS
    // =========================================================================
    const movingVehicles: {
      group: THREE.Group;
      angle: number;
      speed: number;
      radius: number;
      direction: 1 | -1;
    }[] = [];

    const shuttleColors = [0x38bdf8, 0x10b981, 0xf59e0b, 0x818cf8];
    for (let v = 0; v < 4; v++) {
      const direction: 1 | -1 = v % 2 === 0 ? 1 : -1;
      const radius = direction === 1 ? 26.8 : 29.1;
      const vMesh = createCompositeVehicle(shuttleColors[v], v % 2 === 0);
      scene.add(vMesh);
      movingVehicles.push({
        group: vMesh,
        angle: (v * Math.PI) / 2,
        speed: 0.14 + (v % 2) * 0.03,
        radius,
        direction,
      });
    }

    const walkingPedestrians: {
      group: THREE.Group;
      leftLeg: THREE.Mesh;
      rightLeg: THREE.Mesh;
      pathType: 'PLAZA_RING' | 'RADIAL';
      angle: number;
      radialDist: number;
      radialDir: 1 | -1;
      speed: number;
      phase: number;
    }[] = [];

    const pedClothes = [0x38bdf8, 0x818cf8, 0x34d399, 0xfbbf24, 0xf472b6, 0xe2e8f0];
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.6 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

    for (let p = 0; p < 14; p++) {
      const pGroup = new THREE.Group();
      const torsoMat = new THREE.MeshStandardMaterial({
        color: pedClothes[p % pedClothes.length],
        roughness: 0.5,
      });

      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.42, 8), torsoMat);
      torso.position.y = 0.52;
      pGroup.add(torso);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), headMat);
      head.position.y = 0.84;
      pGroup.add(head);

      const legGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.32, 6);
      const leftLeg = new THREE.Mesh(legGeo, legMat);
      leftLeg.position.set(-0.055, 0.18, 0);
      pGroup.add(leftLeg);

      const rightLeg = new THREE.Mesh(legGeo, legMat);
      rightLeg.position.set(0.055, 0.18, 0);
      pGroup.add(rightLeg);

      scene.add(pGroup);
      walkingPedestrians.push({
        group: pGroup,
        leftLeg,
        rightLeg,
        pathType: p < 8 ? 'PLAZA_RING' : 'RADIAL',
        angle: (p / 14) * Math.PI * 2,
        radialDist: 4 + (p % 5) * 2.2,
        radialDir: p % 2 === 0 ? 1 : -1,
        speed: 0.22 + (p % 3) * 0.05,
        phase: p * 1.3,
      });
    }

    // Procedural Curtain-Wall Mullion Window Texture for Realistic Building Facades
    const windowCanvas = document.createElement('canvas');
    windowCanvas.width = 512;
    windowCanvas.height = 512;
    const wCtx = windowCanvas.getContext('2d')!;
    wCtx.fillStyle = '#0c192c';
    wCtx.fillRect(0, 0, 512, 512);

    const cols = 8;
    const rows = 12;
    const cellW = 512 / cols;
    const cellH = 512 / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lit = (r * 7 + c * 13) % 5 !== 0;
        wCtx.fillStyle = lit ? 'rgba(56, 189, 248, 0.28)' : 'rgba(15, 23, 42, 0.65)';
        wCtx.fillRect(c * cellW + 4, r * cellH + 4, cellW - 8, cellH - 8);
      }
    }
    const windowFacadeTex = new THREE.CanvasTexture(windowCanvas);
    windowFacadeTex.colorSpace = THREE.SRGBColorSpace;
    windowFacadeTex.wrapS = THREE.RepeatWrapping;
    windowFacadeTex.wrapT = THREE.RepeatWrapping;

    // =========================================================================
    // 3. CLICKABLE BUILDINGS, CLICKABLE FLOORS, AND CLICKABLE ROOMS
    // =========================================================================
    const interactableObjects: THREE.Object3D[] = [];
    buildingGroupsMapRef.current.clear();
    roomMeshesMapRef.current.clear();

    buildingsRef.current.forEach((bldg) => {
      const [w, h, d] = bldg.dimensions;
      const [px, py, pz] = bldg.position;
      const floorsCount = bldg.floorsCount || 3;

      const group = new THREE.Group();
      group.position.set(px, py, pz);
      group.userData = { buildingId: bldg.id };

      // Soft Contact Shadow Pad
      const shadowMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 1.55, d * 1.55),
        new THREE.MeshBasicMaterial({
          color: 0x020617,
          transparent: true,
          opacity: 0.65,
          depthWrite: false,
        })
      );
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = 0.03;
      group.add(shadowMesh);

      // Podium Base (Clickable Building Target)
      const podiumH = 0.95;
      const podiumMesh = new THREE.Mesh(
        new THREE.BoxGeometry(w * 1.12, podiumH, d * 1.12),
        new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          roughness: 0.55,
          metalness: 0.48,
        })
      );
      podiumMesh.position.y = podiumH / 2;
      podiumMesh.castShadow = !isSoftwareGl;
      podiumMesh.receiveShadow = !isSoftwareGl;
      podiumMesh.layers.enable(1);
      podiumMesh.userData = { buildingId: bldg.id };
      group.add(podiumMesh);
      interactableObjects.push(podiumMesh);

      // Architectural Entrance Canopy & Warm Lobby Spill Pad
      const entranceCanopy = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.42, 0.14, 1.35),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.75, roughness: 0.2 })
      );
      entranceCanopy.position.set(0, podiumH + 0.35, d * 0.58);
      entranceCanopy.layers.enable(1);
      entranceCanopy.userData = { buildingId: bldg.id };
      group.add(entranceCanopy);
      interactableObjects.push(entranceCanopy);

      const lobbySpill = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.4, 1.5),
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.25,
          depthWrite: false,
        })
      );
      lobbySpill.rotation.x = -Math.PI / 2;
      lobbySpill.position.set(0, 0.05, d * 0.64);
      group.add(lobbySpill);

      // Multi-Story Clickable Floor Slabs with Glowing Rim Edges
      const floorSlabs: {
        floor: number;
        mesh: THREE.Mesh;
        edgeLines: THREE.LineSegments;
        baseY: number;
      }[] = [];
      for (let f = 1; f <= floorsCount; f++) {
        const baseY = podiumH + (f - 1) * 3.1;
        const slabGeo = new THREE.BoxGeometry(w * 1.03, 0.34, d * 1.03);
        const slabMat = new THREE.MeshStandardMaterial({
          color: 0x334155,
          emissive: 0x0f172a,
          emissiveIntensity: 0.25,
          roughness: 0.36,
          metalness: 0.68,
        });
        const slabMesh = new THREE.Mesh(slabGeo, slabMat);
        slabMesh.position.y = baseY;
        slabMesh.castShadow = !isSoftwareGl;
        slabMesh.receiveShadow = !isSoftwareGl;
        slabMesh.layers.enable(1);
        slabMesh.userData = { buildingId: bldg.id, floor: f };

        const slabEdgesGeo = new THREE.EdgesGeometry(slabGeo);
        const slabEdgesMat = new THREE.LineBasicMaterial({
          color: 0x475569,
          transparent: true,
          opacity: 0.88,
        });
        const slabEdgeLines = new THREE.LineSegments(slabEdgesGeo, slabEdgesMat);
        slabMesh.add(slabEdgeLines);

        group.add(slabMesh);
        interactableObjects.push(slabMesh);
        floorSlabs.push({ floor: f, mesh: slabMesh, edgeLines: slabEdgeLines, baseY });
      }

      // Translucent Reflective Curtain-Wall Glass Shell with Mullions
      const glassGeo = new THREE.BoxGeometry(w, h, d);
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        map: windowFacadeTex,
        roughness: 0.08,
        metalness: 0.18,
        clearcoat: 0.65,
        clearcoatRoughness: 0.08,
        reflectivity: 0.95,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      });
      const glassShell = new THREE.Mesh(glassGeo, glassMat);
      glassShell.position.y = podiumH + h / 2;
      glassShell.renderOrder = 3;
      glassShell.layers.enable(1);
      glassShell.userData = { buildingId: bldg.id, isBuildingShell: true };
      group.add(glassShell);
      interactableObjects.push(glassShell);

      // Architectural Outline around Building Shell
      const shellEdgesGeo = new THREE.EdgesGeometry(glassGeo);
      const shellEdgesMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.42,
      });
      const shellEdges = new THREE.LineSegments(shellEdgesGeo, shellEdgesMat);
      shellEdges.position.y = podiumH + h / 2;
      group.add(shellEdges);

      // Structural Corner Columns
      const colOffsets: [number, number][] = [
        [-w * 0.48, -d * 0.48],
        [w * 0.48, -d * 0.48],
        [-w * 0.48, d * 0.48],
        [w * 0.48, d * 0.48],
      ];
      colOffsets.forEach(([cx, cz]) => {
        const col = new THREE.Mesh(
          new THREE.BoxGeometry(0.34, h, 0.34),
          new THREE.MeshStandardMaterial({
            color: 0x475569,
            roughness: 0.32,
            metalness: 0.85,
          })
        );
        col.position.set(cx, podiumH + h / 2, cz);
        col.castShadow = !isSoftwareGl;
        col.layers.enable(1);
        col.userData = { buildingId: bldg.id };
        group.add(col);
        interactableObjects.push(col);
      });

      // Rooftop Solar PV Panel Array & Chiller Units
      const solarRoof = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.68, 0.18, d * 0.48),
        new THREE.MeshStandardMaterial({
          color: 0x0369a1,
          roughness: 0.2,
          metalness: 0.86,
        })
      );
      solarRoof.position.set(0, podiumH + h + 0.15, -d * 0.15);
      solarRoof.layers.enable(1);
      solarRoof.userData = { buildingId: bldg.id };
      group.add(solarRoof);
      interactableObjects.push(solarRoof);

      const windowMat = new THREE.MeshPhysicalMaterial({
        color: 0x7dd3fc,
        emissive: 0x0369a1,
        emissiveIntensity: 0.35,
        roughness: 0.08,
        metalness: 0.2,
        transparent: true,
        opacity: 0.72,
      });
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.7, roughness: 0.25 });
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.1, 0.12), doorMat);
      door.position.set(0, 1.15, d * 0.56 + 0.08);
      group.add(door);

      const balconyMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.55, roughness: 0.3 });
      for (let fl = 1; fl <= floorsCount; fl++) {
        const by = podiumH + fl * 2.6;
        const balcony = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, 0.08, 0.7), balconyMat);
        balcony.position.set(0, by, d * 0.55);
        group.add(balcony);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, 0.32, 0.05), balconyMat);
        rail.position.set(0, by + 0.2, d * 0.55 + 0.32);
        group.add(rail);

        for (let wx = -2; wx <= 2; wx++) {
          const pane = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 0.05), windowMat);
          pane.position.set(wx * 1.15, podiumH + 1.2 + (fl - 1) * 2.7, d / 2 + 0.04);
          group.add(pane);
          const paneB = pane.clone();
          paneB.position.z = -d / 2 - 0.04;
          group.add(paneB);
        }
      }

      const acMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.35 });
      for (let a = 0; a < 3; a++) {
        const ac = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.32, 0.55), acMat);
        ac.position.set(-w * 0.28 + a * 1.1, podiumH + h + 0.42, d * 0.22);
        group.add(ac);
      }
      const panelMat = new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        metalness: 0.9,
        roughness: 0.15,
        emissive: 0x0369a1,
        emissiveIntensity: 0.2,
      });
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
          const panel = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.05, 0.7), panelMat);
          panel.position.set(-1.8 + c * 1.15, podiumH + h + 0.28, -d * 0.22 + r * 0.85);
          panel.rotation.x = -0.18;
          group.add(panel);
        }
      }

      // Rooftop Crown LED Status Strip (Green / Yellow / Red / Gray LED)
      const ledStripGeo = new THREE.BoxGeometry(w * 1.04, 0.22, d * 1.04);
      const ledStripMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 0.95,
        roughness: 0.2,
      });
      const ledStripMesh = new THREE.Mesh(ledStripGeo, ledStripMat);
      ledStripMesh.position.y = podiumH + h + 0.05;
      ledStripMesh.layers.enable(1);
      ledStripMesh.userData = { buildingId: bldg.id };
      group.add(ledStripMesh);
      interactableObjects.push(ledStripMesh);

      // Deterministic Building Health Spire Beacon & Selection Ring
      const beaconGeo = new THREE.OctahedronGeometry(0.65, 0);
      const beaconMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 1.05,
        roughness: 0.18,
        metalness: 0.5,
      });
      const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      beaconMesh.position.y = h + 2.8;
      beaconMesh.layers.enable(1);
      beaconMesh.userData = { buildingId: bldg.id };
      group.add(beaconMesh);
      interactableObjects.push(beaconMesh);

      const ringGeo = new THREE.RingGeometry(Math.max(w, d) * 0.68, Math.max(w, d) * 0.8, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = 0.08;
      ringMesh.visible = false;
      group.add(ringMesh);

      scene.add(group);
      buildingGroupsMapRef.current.set(bldg.id, {
        root: group,
        glassShell,
        shellEdges,
        beaconMesh,
        ledStripMesh,
        ringMesh,
        floorSlabs,
      });
    });

    // Populate Interactive 3D Rooms & Interior Equipment Inside Each Building
    rooms3DRef.current.forEach((rm) => {
      const bldg = buildingsRef.current.find((b) => b.id === rm.buildingId);
      if (!bldg) return;
      const bldgEntry = buildingGroupsMapRef.current.get(bldg.id);
      if (!bldgEntry) return;

      const [rw, rh, rd] = rm.size;
      const roomGroup = new THREE.Group();
      roomGroup.position.set(rm.localOffset[0], rm.localOffset[1], rm.localOffset[2]);

      const boxGeo = new THREE.BoxGeometry(rw, rh, rd);
      const badge = getRoomOperationalBadge(rm);
      const boxMat = new THREE.MeshStandardMaterial({
        color: badge.hex,
        emissive: badge.hex,
        emissiveIntensity: 0.45,
        roughness: 0.22,
        metalness: 0.48,
        transparent: true,
        opacity: 0.84,
      });

      const boxMesh = new THREE.Mesh(boxGeo, boxMat);
      boxMesh.castShadow = !isSoftwareGl;
      boxMesh.receiveShadow = !isSoftwareGl;
      boxMesh.layers.enable(1);
      boxMesh.userData = { roomId: rm.id, buildingId: rm.buildingId, floor: rm.floor };
      roomGroup.add(boxMesh);
      interactableObjects.push(boxMesh);

      // Wireframe Outline on Each 3D Room Block
      const edgesGeo = new THREE.EdgesGeometry(boxGeo);
      const edgesMat = new THREE.LineBasicMaterial({
        color: badge.hex,
        transparent: true,
        opacity: 0.95,
      });
      const edgeLines = new THREE.LineSegments(edgesGeo, edgesMat);
      roomGroup.add(edgeLines);

      // Room Status Indicator Orb Above Room
      const orbGeo = new THREE.SphereGeometry(0.28, 16, 16);
      const orbMat = new THREE.MeshStandardMaterial({
        color: badge.hex,
        emissive: badge.hex,
        emissiveIntensity: 1.05,
        roughness: 0.18,
      });
      const statusOrb = new THREE.Mesh(orbGeo, orbMat);
      statusOrb.position.y = rh / 2 + 0.42;
      statusOrb.layers.enable(1);
      statusOrb.userData = { roomId: rm.id, buildingId: rm.buildingId, floor: rm.floor };
      roomGroup.add(statusOrb);
      interactableObjects.push(statusOrb);

      // Clickable 3D Equipment Units inside the Room with Selection Glow Ring
      const equipmentMeshes: { id: string; mesh: THREE.Mesh; ring: THREE.Mesh }[] = [];
      rm.equipmentList.forEach((eq, idx) => {
        const eqWorking = eq.status === 'WORKING';
        const eqGeo = new THREE.BoxGeometry(0.54, 0.54, 0.54);
        const eqMat = new THREE.MeshStandardMaterial({
          color: eqWorking ? 0x38bdf8 : 0xef4444,
          emissive: eqWorking ? 0x0284c7 : 0xb91c1c,
          emissiveIntensity: 0.8,
          roughness: 0.2,
          metalness: 0.75,
        });
        const eqMesh = new THREE.Mesh(eqGeo, eqMat);
        const spread = (idx - (rm.equipmentList.length - 1) / 2) * 0.92;
        eqMesh.position.set(spread, -rh * 0.16, 0);
        eqMesh.layers.enable(1);
        eqMesh.userData = {
          equipmentId: eq.id,
          roomId: rm.id,
          buildingId: rm.buildingId,
        };

        const eqRing = new THREE.Mesh(
          new THREE.RingGeometry(0.38, 0.48, 24),
          new THREE.MeshBasicMaterial({
            color: eqWorking ? 0x7dd3fc : 0xfda4af,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
          })
        );
        eqRing.rotation.x = -Math.PI / 2;
        eqRing.position.y = -0.26;
        eqMesh.add(eqRing);

        roomGroup.add(eqMesh);
        interactableObjects.push(eqMesh);
        equipmentMeshes.push({ id: eq.id, mesh: eqMesh, ring: eqRing });
      });

      bldgEntry.root.add(roomGroup);
      roomMeshesMapRef.current.set(rm.id, {
        group: roomGroup,
        boxMesh,
        edgeLines,
        statusOrb,
        equipmentMeshes,
        baseOffset: rm.localOffset,
        floor: rm.floor,
        buildingPos: bldg.position,
      });
    });

    // OrbitControls Setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.065;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 6.5;
    controls.maxDistance = 88;
    controls.target.set(0, 4, 0);

    controls.addEventListener('start', () => {
      userInteractingRef.current = true;
    });

    _raycaster.layers.set(1);
    let pointerDownPos = { x: 0, y: 0 };
    let lastHoverCheck = 0;

    const resolveRaycastTarget = (hits: THREE.Intersection[]) => {
      const eqHit = hits.find((h) => h.object.userData?.equipmentId && h.object.visible);
      if (eqHit) {
        return {
          kind: 'EQUIPMENT' as const,
          equipmentId: eqHit.object.userData.equipmentId as string,
          roomId: eqHit.object.userData.roomId as string,
          buildingId: eqHit.object.userData.buildingId as string,
        };
      }

      const roomHit = hits.find((h) => h.object.userData?.roomId && h.object.visible);
      if (roomHit) {
        return {
          kind: 'ROOM' as const,
          roomId: roomHit.object.userData.roomId as string,
          buildingId: roomHit.object.userData.buildingId as string,
          floor: roomHit.object.userData.floor as number,
        };
      }

      const floorHit = hits.find(
        (h) => h.object.userData?.floor && !h.object.userData?.roomId && h.object.visible
      );
      if (floorHit) {
        return {
          kind: 'FLOOR' as const,
          floor: floorHit.object.userData.floor as number,
          buildingId: floorHit.object.userData.buildingId as string,
        };
      }

      const bldgHit = hits.find((h) => h.object.userData?.buildingId);
      if (bldgHit) {
        return {
          kind: 'BUILDING' as const,
          buildingId: bldgHit.object.userData.buildingId as string,
        };
      }

      return null;
    };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
      if (e.button === 0) {
        setContextMenu(null);
      }
    };

    const handleDoubleClick = (e: MouseEvent) => {
      if (modeRef.current === 'login-background') return;
      const rect = renderer.domElement.getBoundingClientRect();
      _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      _raycaster.setFromCamera(_pointer, camera);
      const hits = _raycaster.intersectObjects(interactableObjects, false);
      const resolved = resolveRaycastTarget(hits);
      if (!resolved) return;

      userInteractingRef.current = false;
      presetRef.current = 'room-focus';
      setCameraPreset('room-focus');
      setExplodedAmount(0.95);

      if (resolved.kind === 'EQUIPMENT' && onSelectEquipmentRef.current) {
        onSelectEquipmentRef.current(resolved.equipmentId, resolved.roomId, resolved.buildingId);
      } else if (resolved.kind === 'ROOM' && onSelectRoomRef.current) {
        onSelectRoomRef.current(resolved.roomId, resolved.buildingId);
      } else if (resolved.kind === 'FLOOR' && onSelectFloorRef.current) {
        onSelectFloorRef.current(resolved.floor, resolved.buildingId);
      } else if (resolved.kind === 'BUILDING' && onSelectBldgRef.current) {
        onSelectBldgRef.current(resolved.buildingId);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (modeRef.current === 'login-background') return;
      e.preventDefault();
      const rect = renderer.domElement.getBoundingClientRect();
      _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      _raycaster.setFromCamera(_pointer, camera);
      const hits = _raycaster.intersectObjects(interactableObjects, false);
      const resolved = resolveRaycastTarget(hits);
      if (!resolved) {
        setContextMenu(null);
        return;
      }

      const bldg = buildingsRef.current.find((b) => b.id === resolved.buildingId);
      const rm =
        resolved.kind === 'ROOM' || resolved.kind === 'EQUIPMENT'
          ? rooms3DRef.current.find((r) => r.id === resolved.roomId)
          : undefined;
      const eq =
        resolved.kind === 'EQUIPMENT' && rm
          ? rm.equipmentList.find((item) => item.id === resolved.equipmentId)
          : undefined;

      const label =
        resolved.kind === 'EQUIPMENT' && eq
          ? `${eq.name} (${rm?.roomCode || ''})`
          : resolved.kind === 'ROOM' && rm
          ? `${rm.roomCode} · ${rm.name}`
          : resolved.kind === 'FLOOR'
          ? `${bldg?.code || 'Bldg'} · Floor ${resolved.floor}`
          : `${bldg?.code || ''} · ${bldg?.name || 'Building'}`;

      const menuX = Math.max(20, Math.min(rect.width - 240, e.clientX - rect.left));
      const menuY = Math.max(20, Math.min(rect.height - 220, e.clientY - rect.top));

      setContextMenu({
        x: menuX,
        y: menuY,
        kind: resolved.kind,
        buildingId: resolved.buildingId,
        floor:
          resolved.kind === 'FLOOR' || resolved.kind === 'ROOM'
            ? resolved.floor
            : rm?.floor,
        roomId:
          resolved.kind === 'ROOM' || resolved.kind === 'EQUIPMENT'
            ? resolved.roomId
            : undefined,
        equipmentId: resolved.kind === 'EQUIPMENT' ? resolved.equipmentId : undefined,
        label,
      });
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (modeRef.current === 'login-background') return;
      const now = performance.now();
      if (now - lastHoverCheck < 28) return;
      lastHoverCheck = now;

      const rect = renderer.domElement.getBoundingClientRect();
      _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      _raycaster.setFromCamera(_pointer, camera);
      const hits = _raycaster.intersectObjects(interactableObjects, false);
      const resolved = resolveRaycastTarget(hits);

      if (!resolved) {
        renderer.domElement.style.cursor = 'grab';
        if (hoveredEntityRef.current !== null) {
          hoveredEntityRef.current = null;
          setHoveredEntity(null);
        }
        return;
      }

      renderer.domElement.style.cursor = 'pointer';

      const bldg = buildingsRef.current.find((b) => b.id === resolved.buildingId);
      if (!bldg) return;
      const explodeFactor = explodedRef.current;
      const isSelectedBldg = bldg.id === selectedBldgIdRef.current;
      const bldgExplode = isSelectedBldg ? explodeFactor * 2.4 : explodeFactor * 0.55;

      if (resolved.kind === 'ROOM' || resolved.kind === 'EQUIPMENT') {
        const rm = rooms3DRef.current.find((r) => r.id === resolved.roomId);
        if (rm) {
          _projVec.set(
            bldg.position[0] + rm.localOffset[0],
            bldg.position[1] + rm.localOffset[1] + (rm.floor - 1) * bldgExplode + rm.size[1] * 0.65,
            bldg.position[2] + rm.localOffset[2]
          );
        }
      } else if (resolved.kind === 'FLOOR' && resolved.floor) {
        _projVec.set(
          bldg.position[0],
          0.95 + (resolved.floor - 1) * (3.1 + bldgExplode) + 1.2,
          bldg.position[2]
        );
      } else {
        _projVec.set(
          bldg.position[0],
          bldg.dimensions[1] + 2.8 + bldgExplode * 2,
          bldg.position[2]
        );
      }

      _projVec.project(camera);
      const screenX = Math.max(
        160,
        Math.min(rect.width - 160, ((_projVec.x + 1) * rect.width) / 2)
      );
      const screenY = Math.max(
        95,
        Math.min(rect.height - 95, ((-_projVec.y + 1) * rect.height) / 2)
      );

      const nextHover: HoveredEntityInfo = {
        kind: resolved.kind === 'EQUIPMENT' ? 'ROOM' : resolved.kind,
        buildingId: resolved.buildingId,
        floor:
          resolved.kind === 'FLOOR'
            ? resolved.floor
            : resolved.kind === 'ROOM'
            ? resolved.floor
            : undefined,
        roomId:
          resolved.kind === 'ROOM' || resolved.kind === 'EQUIPMENT'
            ? resolved.roomId
            : undefined,
        screenX,
        screenY,
      };

      hoveredEntityRef.current = nextHover;
      setHoveredEntity(nextHover);
    };

    const handlePointerLeave = () => {
      renderer.domElement.style.cursor = 'grab';
      hoveredEntityRef.current = null;
      setHoveredEntity(null);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (modeRef.current === 'login-background') return;
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 6) return;

      const rect = renderer.domElement.getBoundingClientRect();
      _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      _raycaster.setFromCamera(_pointer, camera);
      const hits = _raycaster.intersectObjects(interactableObjects, false);
      const resolved = resolveRaycastTarget(hits);
      if (!resolved) return;

      userInteractingRef.current = false;
      presetRef.current = 'room-focus';
      setCameraPreset('room-focus');
      setExplodedAmount(0.85);

      if (resolved.kind === 'EQUIPMENT' && onSelectEquipmentRef.current) {
        onSelectEquipmentRef.current(resolved.equipmentId, resolved.roomId, resolved.buildingId);
        return;
      }

      if (resolved.kind === 'ROOM' && onSelectRoomRef.current) {
        onSelectRoomRef.current(resolved.roomId, resolved.buildingId);
        return;
      }

      if (resolved.kind === 'FLOOR' && onSelectFloorRef.current) {
        onSelectFloorRef.current(resolved.floor, resolved.buildingId);
        return;
      }

      if (resolved.kind === 'BUILDING' && onSelectBldgRef.current) {
        onSelectBldgRef.current(resolved.buildingId);
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('dblclick', handleDoubleClick);
    renderer.domElement.addEventListener('contextmenu', handleContextMenu);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;
    let lastAzimuthReport = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const poll = () => {
        if (disposed) return;
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      if (lightingRef.current === 'day') {
        keyLight.intensity = THREE.MathUtils.damp(keyLight.intensity, 2.95, 4, delta);
        hemiLight.intensity = THREE.MathUtils.damp(hemiLight.intensity, 1.4, 4, delta);
        (scene.fog as THREE.FogExp2).density = THREE.MathUtils.damp(
          (scene.fog as THREE.FogExp2).density,
          0.0048,
          4,
          delta
        );
      } else if (lightingRef.current === 'dusk') {
        keyLight.intensity = THREE.MathUtils.damp(keyLight.intensity, 2.4, 4, delta);
        hemiLight.intensity = THREE.MathUtils.damp(hemiLight.intensity, 1.05, 4, delta);
        (scene.fog as THREE.FogExp2).density = THREE.MathUtils.damp(
          (scene.fog as THREE.FogExp2).density,
          0.0068,
          4,
          delta
        );
      } else {
        keyLight.intensity = THREE.MathUtils.damp(keyLight.intensity, 1.35, 4, delta);
        hemiLight.intensity = THREE.MathUtils.damp(hemiLight.intensity, 0.58, 4, delta);
        (scene.fog as THREE.FogExp2).density = THREE.MathUtils.damp(
          (scene.fog as THREE.FogExp2).density,
          0.0095,
          4,
          delta
        );
      }

      clouds.forEach((cloud, idx) => {
        cloud.position.x += 0.35 * delta * (idx % 2 === 0 ? 1 : -0.6);
        if (cloud.position.x > 42) cloud.position.x = -42;
        if (cloud.position.x < -42) cloud.position.x = 42;
        cloud.position.y += Math.sin(elapsed * 0.4 + idx) * 0.01;
      });

      birds.forEach((bird) => {
        const a = elapsed * bird.speed + bird.phase;
        bird.mesh.position.set(
          Math.cos(a) * bird.radius,
          bird.height + Math.sin(a * 2) * 0.4,
          Math.sin(a) * bird.radius
        );
        bird.mesh.rotation.y = -a;
        bird.mesh.rotation.z = Math.sin(elapsed * 12 + bird.phase) * 0.4;
      });

      water.position.y = 0.38 + Math.sin(elapsed * 2.2) * 0.04;
      (water.material as THREE.MeshPhysicalMaterial).opacity = 0.62 + Math.sin(elapsed * 1.4) * 0.08;

      const raining = weatherRef.current === 'rain';
      rainPoints.visible = raining;
      if (raining) {
        const attr = rainGeo.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < rainCount; i++) {
          attr.array[i * 3 + 1] -= 18 * delta;
          if (attr.array[i * 3 + 1] < 0) attr.array[i * 3 + 1] = 26;
        }
        attr.needsUpdate = true;
      }

      instancedLowerCanopies.rotation.z = Math.sin(elapsed * 0.7) * 0.015;
      instancedUpperCanopies.rotation.z = Math.sin(elapsed * 0.9) * 0.02;

      // Smooth 60 FPS Ambient Campus Vehicles along Ring Road
      movingVehicles.forEach((veh) => {
        veh.angle += veh.speed * delta * veh.direction;
        const vx = Math.cos(veh.angle) * veh.radius;
        const vz = Math.sin(veh.angle) * veh.radius;
        veh.group.position.set(vx, 0.04, vz);
        const tangentAngle = -veh.angle + (veh.direction === 1 ? 0 : Math.PI);
        veh.group.rotation.y = tangentAngle;
      });

      // Smooth 60 FPS Walking Pedestrians along Plaza & Radial Walkways
      walkingPedestrians.forEach((ped) => {
        const stride = Math.sin(elapsed * 5.2 + ped.phase) * 0.45;
        ped.leftLeg.rotation.x = stride;
        ped.rightLeg.rotation.x = -stride;

        if (ped.pathType === 'PLAZA_RING') {
          ped.angle += ped.speed * 0.18 * delta * ped.radialDir;
          const r = 9.4;
          ped.group.position.set(Math.cos(ped.angle) * r, 0.04, Math.sin(ped.angle) * r);
          ped.group.rotation.y = -ped.angle + (ped.radialDir === 1 ? 0 : Math.PI);
        } else {
          ped.radialDist += ped.speed * 1.4 * delta * ped.radialDir;
          if (ped.radialDist > 16.5) ped.radialDir = -1;
          if (ped.radialDist < 4.5) ped.radialDir = 1;
          const px = Math.cos(ped.angle) * ped.radialDist;
          const pz = Math.sin(ped.angle) * ped.radialDist;
          ped.group.position.set(px, 0.04, pz);
          ped.group.rotation.y =
            Math.atan2(Math.cos(ped.angle) * ped.radialDir, Math.sin(ped.angle) * ped.radialDir);
        }
      });

      const explodeFactor = modeRef.current === 'login-background' ? 0.25 : explodedRef.current;
      const hovered = hoveredEntityRef.current;

      // Update Buildings & Clickable Floor Slabs
      buildingsRef.current.forEach((bldg) => {
        const entry = buildingGroupsMapRef.current.get(bldg.id);
        if (!entry) return;

        const isSelectedBldg = bldg.id === selectedBldgIdRef.current;
        const isHoveredBldg =
          hovered?.buildingId === bldg.id && hovered?.kind === 'BUILDING';
        const bldgExplode = isSelectedBldg ? explodeFactor * 2.4 : explodeFactor * 0.55;
        const bldgHealth = getBuildingHealthBadge(bldg, rooms3DRef.current);

        // Building Shell Outline & Glass Opacity on Hover/Select
        const shellMat = entry.glassShell.material as THREE.MeshPhysicalMaterial;
        const shellEdgeMat = entry.shellEdges.material as THREE.LineBasicMaterial;
        const targetGlassOpacity = isHoveredBldg ? 0.26 : isSelectedBldg ? 0.2 : 0.14;
        shellMat.opacity = THREE.MathUtils.damp(shellMat.opacity, targetGlassOpacity, 8, delta);
        shellEdgeMat.color.setHex(
          isHoveredBldg ? 0x7dd3fc : isSelectedBldg ? 0x38bdf8 : bldgHealth.hex
        );
        shellEdgeMat.opacity = isHoveredBldg ? 0.98 : isSelectedBldg ? 0.82 : 0.42;

        entry.floorSlabs.forEach((slab) => {
          const targetY = slab.baseY + (slab.floor - 1) * bldgExplode;
          slab.mesh.position.y = THREE.MathUtils.damp(slab.mesh.position.y, targetY, 6, delta);
          slab.mesh.visible = true;

          const isSelectedFloor =
            isSelectedBldg &&
            selectionScopeRef.current === 'FLOOR' &&
            selectedFloorRef.current === slab.floor;
          const isHoveredFloor =
            hovered?.kind === 'FLOOR' &&
            hovered.buildingId === bldg.id &&
            hovered.floor === slab.floor;

          const floorSummary = getFloorHealthSummary(
            bldg.id,
            slab.floor,
            rooms3DRef.current
          );
          const slabMat = slab.mesh.material as THREE.MeshStandardMaterial;
          const slabEdgeMat = slab.edgeLines.material as THREE.LineBasicMaterial;

          if (isHoveredFloor || isSelectedFloor) {
            slabMat.color.setHex(0x0284c7);
            slabMat.emissive.setHex(0x38bdf8);
            slabMat.emissiveIntensity = THREE.MathUtils.damp(
              slabMat.emissiveIntensity,
              isHoveredFloor ? 0.9 : 0.7,
              8,
              delta
            );
            slabEdgeMat.color.setHex(0x7dd3fc);
          } else {
            slabMat.color.setHex(0x1e293b);
            slabMat.emissive.setHex(floorSummary.floorSignal.hex);
            slabMat.emissiveIntensity = THREE.MathUtils.damp(
              slabMat.emissiveIntensity,
              0.24,
              8,
              delta
            );
            slabEdgeMat.color.setHex(floorSummary.floorSignal.hex);
          }

          const targetSlabScale = isHoveredFloor ? 1.045 : isSelectedFloor ? 1.025 : 1.0;
          slab.mesh.scale.setScalar(
            THREE.MathUtils.damp(slab.mesh.scale.x, targetSlabScale, 8, delta)
          );
        });

        // Rooftop LED Status Strip & Beacon
        const targetBeaconY = bldg.dimensions[1] + 2.8 + bldgExplode * 2;
        entry.beaconMesh.position.y = THREE.MathUtils.damp(
          entry.beaconMesh.position.y,
          targetBeaconY,
          6,
          delta
        );
        entry.beaconMesh.rotation.y = elapsed * 0.85;
        entry.ringMesh.visible = isSelectedBldg || isHoveredBldg;
        const ringMat = entry.ringMesh.material as THREE.MeshBasicMaterial;
        ringMat.color.setHex(isHoveredBldg ? 0x7dd3fc : bldgHealth.hex);

        const beaconMat = entry.beaconMesh.material as THREE.MeshStandardMaterial;
        beaconMat.color.setHex(bldgHealth.hex);
        beaconMat.emissive.setHex(bldgHealth.hex);
        beaconMat.emissiveIntensity = isHoveredBldg || isSelectedBldg ? 1.3 : 0.9;

        const ledStripMat = entry.ledStripMesh.material as THREE.MeshStandardMaterial;
        ledStripMat.color.setHex(bldgHealth.hex);
        ledStripMat.emissive.setHex(bldgHealth.hex);
        ledStripMat.emissiveIntensity = isHoveredBldg || isSelectedBldg ? 1.25 : 0.85;
      });

      // Update Interactive 3D Rooms & Clickable Equipment
      rooms3DRef.current.forEach((rm) => {
        const rmEntry = roomMeshesMapRef.current.get(rm.id);
        if (!rmEntry) return;

        const isSelectedBldg = rm.buildingId === selectedBldgIdRef.current;
        const isSelectedRoom =
          rm.id === selectedRoomIdRef.current &&
          (selectionScopeRef.current === 'ROOM' || selectionScopeRef.current === 'EQUIPMENT');
        const isHoveredRoom = hovered?.kind === 'ROOM' && hovered.roomId === rm.id;
        const isFloorHighlighted =
          isSelectedBldg &&
          selectedFloorRef.current !== 'ALL' &&
          selectedFloorRef.current === rm.floor;
        const bldgExplode = isSelectedBldg ? explodeFactor * 2.4 : explodeFactor * 0.55;

        const targetY = rmEntry.baseOffset[1] + (rm.floor - 1) * bldgExplode;
        rmEntry.group.position.y = THREE.MathUtils.damp(rmEntry.group.position.y, targetY, 6, delta);

        const visibleByFloor =
          !isSelectedBldg ||
          selectedFloorRef.current === 'ALL' ||
          selectedFloorRef.current === rm.floor;
        rmEntry.group.visible = visibleByFloor;
        rmEntry.boxMesh.visible = visibleByFloor;
        rmEntry.statusOrb.visible = visibleByFloor;

        const boxMat = rmEntry.boxMesh.material as THREE.MeshStandardMaterial;
        const edgeMat = rmEntry.edgeLines.material as THREE.LineBasicMaterial;
        const orbMat = rmEntry.statusOrb.material as THREE.MeshStandardMaterial;

        const badge = getRoomOperationalBadge(rm);
        boxMat.color.setHex(badge.hex);
        orbMat.color.setHex(badge.hex);
        orbMat.emissive.setHex(badge.hex);

        if (isHoveredRoom || isSelectedRoom) {
          boxMat.emissive.setHex(0x38bdf8);
          boxMat.emissiveIntensity = THREE.MathUtils.damp(
            boxMat.emissiveIntensity,
            isHoveredRoom ? 0.98 : 0.82,
            8,
            delta
          );
          edgeMat.color.setHex(0x7dd3fc);
        } else if (isFloorHighlighted) {
          boxMat.emissive.setHex(badge.hex);
          boxMat.emissiveIntensity = THREE.MathUtils.damp(boxMat.emissiveIntensity, 0.62, 8, delta);
          edgeMat.color.setHex(0x38bdf8);
        } else {
          boxMat.emissive.setHex(badge.hex);
          boxMat.emissiveIntensity = THREE.MathUtils.damp(boxMat.emissiveIntensity, 0.36, 8, delta);
          edgeMat.color.setHex(badge.hex);
        }

        const targetScale = isHoveredRoom
          ? 1.09
          : isSelectedRoom
          ? 1.06
          : isFloorHighlighted
          ? 1.03
          : 1.0;
        rmEntry.group.scale.setScalar(
          THREE.MathUtils.damp(rmEntry.group.scale.x, targetScale, 8, delta)
        );

        rmEntry.equipmentMeshes.forEach((eqNode) => {
          const isSelectedEq = eqNode.id === selectedEquipmentIdRef.current;
          eqNode.mesh.visible = visibleByFloor;
          eqNode.ring.visible = visibleByFloor;
          const eqScale = isSelectedEq ? 1.38 : 1.0;
          eqNode.mesh.scale.setScalar(
            THREE.MathUtils.damp(eqNode.mesh.scale.x, eqScale, 8, delta)
          );
        });
      });

      // Smooth Deterministic Camera Fly Choreography (Building -> Floor -> Room)
      if (modeRef.current === 'login-background' || presetRef.current === 'orbit' || cinematicRef.current) {
        const orbitAngle = elapsed * 0.12;
        camera.position.x = Math.cos(orbitAngle) * 35;
        camera.position.z = Math.sin(orbitAngle) * 35;
        camera.position.y = THREE.MathUtils.damp(camera.position.y, 20, 3, delta);
        controls.target.set(0, 4, 0);
      } else if (!userInteractingRef.current) {
        const activeRoom = rooms3DRef.current.find((r) => r.id === selectedRoomIdRef.current);
        const activeBldg = buildingsRef.current.find((b) => b.id === selectedBldgIdRef.current);
        const scope = selectionScopeRef.current;
        const activeFloor = selectedFloorRef.current;

        if (presetRef.current === 'top') {
          _targetCameraPos.set(0, 56, 4);
          _targetLookAt.set(0, 0, 0);
        } else if (presetRef.current === 'campus' || !activeBldg) {
          _targetCameraPos.set(28, 22, 30);
          _targetLookAt.set(0, 4, 0);
        } else if (scope === 'BUILDING') {
          _targetCameraPos.set(
            activeBldg.position[0] + 15.5,
            activeBldg.dimensions[1] + 9.5,
            activeBldg.position[2] + 15.5
          );
          _targetLookAt.set(
            activeBldg.position[0],
            activeBldg.dimensions[1] * 0.55 + explodeFactor * 1.6,
            activeBldg.position[2]
          );
        } else if (scope === 'FLOOR' && typeof activeFloor === 'number') {
          const floorY = 0.95 + (activeFloor - 1) * (3.1 + explodeFactor * 2.4);
          _targetCameraPos.set(
            activeBldg.position[0] + 12.5,
            floorY + 5.2,
            activeBldg.position[2] + 12.5
          );
          _targetLookAt.set(activeBldg.position[0], floorY + 0.8, activeBldg.position[2]);
        } else if (activeRoom && activeBldg) {
          const wx = activeBldg.position[0] + activeRoom.localOffset[0];
          const wy =
            activeBldg.position[1] +
            activeRoom.localOffset[1] +
            (activeRoom.floor - 1) * explodeFactor * 2.4;
          const wz = activeBldg.position[2] + activeRoom.localOffset[2];

          _targetCameraPos.set(wx + 9.5, wy + 5.0, wz + 10.5);
          _targetLookAt.set(wx, wy, wz);
        }

        camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCameraPos.x, 3.8, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCameraPos.y, 3.8, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCameraPos.z, 3.8, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetLookAt.x, 4.5, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetLookAt.y, 4.5, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetLookAt.z, 4.5, delta);
      }

      controls.update();

      if (onCameraAzimuthRef.current && elapsed - lastAzimuthReport > 0.12) {
        lastAzimuthReport = elapsed;
        const dx = camera.position.x - controls.target.x;
        const dz = camera.position.z - controls.target.z;
        const deg = Math.round((Math.atan2(dx, dz) * 180) / Math.PI);
        onCameraAzimuthRef.current(deg);
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('dblclick', handleDoubleClick);
      renderer.domElement.removeEventListener('contextmenu', handleContextMenu);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  const layerOptions: { id: TwinLayerMode; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'All Systems', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'hvac', label: 'Thermal Heatmap', icon: <Thermometer className="w-3.5 h-3.5" /> },
    { id: 'energy', label: 'Grid & Power', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'occupancy', label: 'Occupancy', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'maintenance', label: 'Repairs & AI', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'assets', label: 'Equipment', icon: <Box className="w-3.5 h-3.5" /> },
    { id: 'security', label: 'Zero-Trust', icon: <Shield className="w-3.5 h-3.5" /> },
  ];

  // Resolve Hovered Entity Telemetry for Floating 3D Tooltip Card
  const hoveredBldg = hoveredEntity
    ? buildings.find((b) => b.id === hoveredEntity.buildingId) || null
    : null;
  const hoveredRoom =
    hoveredEntity?.kind === 'ROOM' && hoveredEntity.roomId
      ? rooms3D.find((r) => r.id === hoveredEntity.roomId) || null
      : null;
  const hoveredFloorSummary =
    hoveredEntity?.kind === 'FLOOR' && hoveredBldg && hoveredEntity.floor
      ? getFloorHealthSummary(hoveredBldg.id, hoveredEntity.floor, rooms3D)
      : null;
  const hoveredBldgBadge = hoveredBldg ? getBuildingHealthBadge(hoveredBldg, rooms3D) : null;
  const hoveredRoomBadge = hoveredRoom ? getRoomOperationalBadge(hoveredRoom) : null;

  return (
    <div className={`relative w-full h-full overflow-hidden select-none bg-[#060A12] ${className}`}>
      {/* Isolated WebGL Mount Container */}
      <div ref={canvasMountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* 3D PICKER MODE RING INDICATOR */}
      {mode === 'dashboard' && pickModeActive && (
        <div className="pointer-events-none absolute inset-0 border-4 border-sky-400/50 rounded-none z-20 flex items-end justify-center pb-28">
          <div className="px-4 py-2 rounded-2xl bg-sky-500/95 text-slate-950 font-mono font-bold text-xs shadow-2xl flex items-center gap-2">
            <Crosshair className="w-4 h-4 animate-spin" />
            <span>3D PICKER MODE ACTIVE: Click any Building → Floor → Room in 3D to auto-fill</span>
          </div>
        </div>
      )}

      {/* FLOATING 3D HOVER TOOLTIP CARD (Tracks Hovered Building, Floor, or Room in 3D) */}
      {mode === 'dashboard' && hoveredEntity && hoveredBldg && (
        <div
          style={{
            left: `${hoveredEntity.screenX}px`,
            top: `${hoveredEntity.screenY}px`,
          }}
          className="absolute z-30 -translate-x-1/2 -translate-y-full -mt-3 pointer-events-none w-76 rounded-2xl bg-[#0B1221]/95 border border-sky-400/50 p-3 shadow-2xl backdrop-blur-md transition-all duration-75"
        >
          {hoveredEntity.kind === 'BUILDING' && hoveredBldgBadge && (
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-sky-400 font-semibold uppercase">
                  BUILDING · {hoveredBldg.code}
                </span>
                <span
                  className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold flex items-center gap-1.5 ${hoveredBldgBadge.badgeClass}`}
                >
                  <span className={`w-2 h-2 rounded-full ${hoveredBldgBadge.ledDotClass}`} />
                  {hoveredBldgBadge.label} ({hoveredBldgBadge.ledText})
                </span>
              </div>
              <p className="font-bold text-white text-sm leading-tight">{hoveredBldg.name}</p>
              <p className="text-[11px] text-slate-400">{hoveredBldg.department}</p>
              <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-white/10 font-mono text-[10px]">
                <div>
                  <span className="text-slate-400 block">FLOORS</span>
                  <span className="text-white font-bold">{hoveredBldg.floorsCount} Fl</span>
                </div>
                <div>
                  <span className="text-slate-400 block">OCCUPANCY</span>
                  <span className="text-white font-bold">
                    {hoveredBldg.occupancy}/{hoveredBldg.maxCapacity}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">HEALTH</span>
                  <span className="text-emerald-300 font-bold">{hoveredBldgBadge.healthScore}%</span>
                </div>
              </div>
              <span className="block text-[10px] font-mono text-sky-300 pt-0.5">
                Click to fly camera & expand floors →
              </span>
            </div>
          )}

          {hoveredEntity.kind === 'FLOOR' && hoveredFloorSummary && hoveredEntity.floor && (
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-sky-400 font-semibold uppercase">
                  {hoveredBldg.code} · FLOOR {hoveredEntity.floor}
                </span>
                <span className="font-mono text-[11px] font-bold text-white">
                  {hoveredFloorSummary.floorSignal.emoji} {hoveredFloorSummary.floorSignal.label} (
                  {hoveredFloorSummary.health}%)
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-white/10 font-mono text-[10px]">
                <div>
                  <span className="text-slate-400 block">ROOMS</span>
                  <span className="text-white font-bold">
                    {hoveredFloorSummary.healthyRooms}/{hoveredFloorSummary.totalRooms} OK
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">OCCUPANCY</span>
                  <span className="text-white font-bold">
                    {hoveredFloorSummary.occupied}/{hoveredFloorSummary.capacity}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">COMPLAINTS</span>
                  <span className="text-amber-300 font-bold">
                    {hoveredFloorSummary.activeComplaints} Active
                  </span>
                </div>
              </div>
              <span className="block text-[10px] font-mono text-sky-300 pt-0.5">
                Click to fly to Floor {hoveredEntity.floor} →
              </span>
            </div>
          )}

          {hoveredEntity.kind === 'ROOM' && hoveredRoom && hoveredRoomBadge && (
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-sky-400 font-semibold uppercase">
                  {hoveredRoom.roomCode} · FLOOR {hoveredRoom.floor}
                </span>
                <span
                  className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold ${hoveredRoomBadge.badgeClass}`}
                >
                  {hoveredRoomBadge.emoji} {hoveredRoomBadge.statusText} · {hoveredRoomBadge.occupancyText}
                </span>
              </div>
              <p className="font-bold text-white text-sm leading-tight">{hoveredRoom.name}</p>
              <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-white/10 font-mono text-[10px]">
                <div>
                  <span className="text-slate-400 block">OCCUPANCY</span>
                  <span className="text-white font-bold">
                    {hoveredRoom.occupancy.current}/{hoveredRoom.occupancy.capacity}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">HEALTH</span>
                  <span className="text-emerald-300 font-bold">{hoveredRoom.equipmentHealth}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block">TEMP / WIFI</span>
                  <span className="text-sky-300 font-bold">
                    {hoveredRoom.ac.tempC}°C · {hoveredRoom.internet.speedMbps}M
                  </span>
                </div>
              </div>
              <span className="block text-[10px] font-mono text-sky-300">
                Click to inspect room & equipment →
              </span>
            </div>
          )}
        </div>
      )}

      {/* RIGHT-CLICK 3D SPATIAL CONTEXT MENU */}
      {mode === 'dashboard' && contextMenu && (
        <div
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          className="absolute z-40 w-60 rounded-2xl bg-[#0B1221]/95 border border-sky-400/50 p-2 shadow-2xl backdrop-blur-xl text-xs space-y-1 pointer-events-auto"
        >
          <div className="px-2.5 py-1.5 border-b border-white/10">
            <span className="text-[10px] font-mono text-sky-400 uppercase block">
              3D {contextMenu.kind} ACTIONS
            </span>
            <p className="font-semibold text-white truncate">{contextMenu.label}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              userInteractingRef.current = false;
              presetRef.current = 'room-focus';
              setCameraPreset('room-focus');
              setExplodedAmount(0.9);
              if (contextMenu.kind === 'EQUIPMENT' && contextMenu.equipmentId && contextMenu.roomId) {
                onSelectEquipment?.(contextMenu.equipmentId, contextMenu.roomId, contextMenu.buildingId);
              } else if (contextMenu.kind === 'ROOM' && contextMenu.roomId) {
                onSelectRoom?.(contextMenu.roomId, contextMenu.buildingId);
              } else if (contextMenu.kind === 'FLOOR' && contextMenu.floor) {
                onSelectFloor?.(contextMenu.floor, contextMenu.buildingId);
              } else {
                onSelectBuilding?.(contextMenu.buildingId);
              }
              setContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-sky-500/20 text-slate-200 hover:text-sky-300 font-medium cursor-pointer flex items-center justify-between"
          >
            <span>Zoom & Focus Object</span>
            <span className="font-mono text-[10px] text-slate-400">Dbl-Click / F</span>
          </button>

          {contextMenu.buildingId && (
            <button
              type="button"
              onClick={() => {
                setExplodedAmount(0.9);
                onSelectFloor?.(contextMenu.floor || 1, contextMenu.buildingId);
                setContextMenu(null);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 cursor-pointer"
            >
              Inspect Floor {contextMenu.floor || 1} Rooms
            </button>
          )}

          {contextMenu.roomId && onContextRaiseComplaint && (
            <button
              type="button"
              onClick={() => {
                onContextRaiseComplaint(contextMenu.roomId!, contextMenu.buildingId);
                setContextMenu(null);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-500/20 text-amber-300 font-medium cursor-pointer"
            >
              + Raise Complaint in Room
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              userInteractingRef.current = false;
              presetRef.current = 'campus';
              setCameraPreset('campus');
              setContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer border-t border-white/10"
          >
            Reset Full Campus View
          </button>
        </div>
      )}

      {/* Compact Floating 3D Controls Pill (Top-Center Below Navbar) */}
      {mode === 'dashboard' && (
        <div className="absolute left-1/2 -translate-x-1/2 top-24 z-10 pointer-events-auto flex flex-col items-center">
          <button
            type="button"
            onClick={() => setDockCollapsed((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B1221]/95 border border-white/15 text-[11px] font-mono text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg"
          >
            {dockCollapsed ? (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-sky-400" />
                3D Scene & Heatmap Controls
              </>
            ) : (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
                Hide 3D Scene Bar
              </>
            )}
          </button>

          {!dockCollapsed && (
            <div className="mt-1.5 bg-[#0B1221]/95 border border-white/15 rounded-2xl px-3.5 py-2 shadow-2xl flex flex-wrap items-center justify-center gap-2.5">
              {/* Explode Floors Slider */}
              <div className="flex items-center gap-2 pr-2 border-r border-white/10">
                <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                  Expand Floors
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={explodedAmount}
                  onChange={(e) => setExplodedAmount(parseFloat(e.target.value))}
                  className="w-20 accent-sky-400 cursor-pointer"
                />
              </div>

              {/* Heatmap / Layer Switcher */}
              <div className="flex items-center gap-1">
                {layerOptions.slice(0, 5).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onLayerChange?.(opt.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeLayer === opt.id
                        ? 'bg-sky-500 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Camera & Lighting Presets */}
              <div className="flex items-center gap-1.5 border-l border-white/10 pl-2">
                {(
                  [
                    { id: 'room-focus', label: 'Focus (F)' },
                    { id: 'campus', label: 'Campus' },
                    { id: 'top', label: 'Top' },
                    { id: 'orbit', label: 'Orbit' },
                  ] as const
                ).map((cam) => (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => {
                      userInteractingRef.current = false;
                      presetRef.current = cam.id;
                      setCameraPreset(cam.id);
                    }}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      cameraPreset === cam.id
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Compass className="w-3 h-3 inline mr-1" />
                    {cam.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setLightingMode((prev) =>
                      prev === 'day' ? 'dusk' : prev === 'dusk' ? 'night' : 'day'
                    )
                  }
                  className="px-3 py-1.5 rounded-[18px] glass-panel text-[14px] font-medium text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Sun className="w-3 h-3 inline mr-1 text-amber-400" />
                  {lightingMode === 'day' ? 'Day' : lightingMode === 'dusk' ? 'Dusk' : 'Night'}
                </button>
                <button
                  type="button"
                  onClick={() => setLocalWeather((w) => (w === 'rain' ? 'clear' : 'rain'))}
                  className="px-3 py-1.5 rounded-[18px] glass-panel text-[14px] font-medium text-cyan-200 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {localWeather === 'rain' || weatherMode === 'rain' ? 'Rain On' : 'Rain'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
