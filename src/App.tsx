/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { LoginPage } from './components/auth/LoginPage.tsx';
import { RoleDashboards } from './components/dashboards/RoleDashboards.tsx';
import {
  CampusDigitalTwin,
  TwinLayerMode,
} from './components/digital-twin/CampusDigitalTwin.tsx';
import { BuildingData, CampusRoom3D } from './types/campus.ts';

const INITIAL_FALLBACK_BUILDINGS: BuildingData[] = [
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
    sensors: [],
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
    sensors: [],
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
    sensors: [],
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
    sensors: [],
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
    sensors: [],
  },
];

function Campus360Shell() {
  const { user } = useAuth();
  const [buildings, setBuildings] = useState<BuildingData[]>(INITIAL_FALLBACK_BUILDINGS);
  const [rooms3D, setRooms3D] = useState<CampusRoom3D[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('bldg-sci-02');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>('room-sci-302');
  const [activeLayer, setActiveLayer] = useState<TwinLayerMode>('overview');

  if (!user) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-[#070B14]">
        <div className="fixed inset-0 z-0">
          <CampusDigitalTwin
            buildings={buildings}
            rooms3D={rooms3D}
            selectedBuildingId={selectedBuildingId}
            activeLayer="overview"
            mode="login-background"
          />
        </div>
        <LoginPage />
      </div>
    );
  }

  return (
    <RoleDashboards
      buildings={buildings}
      setBuildings={setBuildings}
      rooms3D={rooms3D}
      setRooms3D={setRooms3D}
      selectedBuildingId={selectedBuildingId}
      setSelectedBuildingId={setSelectedBuildingId}
      selectedRoomId={selectedRoomId}
      setSelectedRoomId={setSelectedRoomId}
      activeLayer={activeLayer}
      setActiveLayer={setActiveLayer}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Campus360Shell />
    </AuthProvider>
  );
}
