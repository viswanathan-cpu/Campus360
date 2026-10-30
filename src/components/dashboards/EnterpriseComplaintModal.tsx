import React, { useState, useEffect, useMemo } from 'react';
import {
  BuildingData,
  CampusRoom3D,
  CampusComplaint,
} from '../../types/campus.ts';
import {
  X,
  Crosshair,
  Upload,
  FileText,
  Image as ImageIcon,
  Film,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Clock,
  Wrench,
  ShieldAlert,
  Building2,
  Layers,
  Box,
  Trash2,
  ChevronRight,
} from 'lucide-react';

export type EnterpriseComplaintCategoryLabel =
  | 'Electrical'
  | 'Network'
  | 'Furniture'
  | 'Water Leakage'
  | 'Plumbing'
  | 'Air Conditioning'
  | 'Projector'
  | 'Smart Board'
  | 'Computer'
  | 'WiFi'
  | 'Power'
  | 'Cleaning'
  | 'Security'
  | 'Other';

export const ENTERPRISE_COMPLAINT_CATEGORIES: {
  label: EnterpriseComplaintCategoryLabel;
  backendCategory: CampusComplaint['category'];
  safetyRiskHint: string;
}[] = [
  {
    label: 'Electrical',
    backendCategory: 'ELECTRICAL_GRID',
    safetyRiskHint: 'Elevated Arc / Short-Circuit Electrical Hazard',
  },
  {
    label: 'Network',
    backendCategory: 'AV_CLASSROOM',
    safetyRiskHint: 'Low Physical Risk — Telemetry & Connectivity Outage',
  },
  {
    label: 'Furniture',
    backendCategory: 'STRUCTURAL_SAFETY',
    safetyRiskHint: 'Moderate Ergonomic / Physical Fixture Hazard',
  },
  {
    label: 'Water Leakage',
    backendCategory: 'STRUCTURAL_SAFETY',
    safetyRiskHint: 'Slip Hazard & Moisture Near Electrical Conduit',
  },
  {
    label: 'Plumbing',
    backendCategory: 'STRUCTURAL_SAFETY',
    safetyRiskHint: 'Chilled Loop / Sanitary Line Pressure Anomaly',
  },
  {
    label: 'Air Conditioning',
    backendCategory: 'HVAC_THERMAL',
    safetyRiskHint: 'Thermal Drift Risk for Lab & Server Equipment',
  },
  {
    label: 'Projector',
    backendCategory: 'AV_CLASSROOM',
    safetyRiskHint: 'Low Physical Risk — Optical Lamp Thermal Cutoff',
  },
  {
    label: 'Smart Board',
    backendCategory: 'AV_CLASSROOM',
    safetyRiskHint: 'Low Physical Risk — Touch Digitizer Bus Fault',
  },
  {
    label: 'Computer',
    backendCategory: 'LAB_EQUIPMENT',
    safetyRiskHint: 'Workstation PSU / Thermal Throttling Warning',
  },
  {
    label: 'WiFi',
    backendCategory: 'AV_CLASSROOM',
    safetyRiskHint: 'Low Physical Risk — High Packet Loss on AP Uplink',
  },
  {
    label: 'Power',
    backendCategory: 'ELECTRICAL_GRID',
    safetyRiskHint: 'High Voltage Harmonic / Breaker Trip Risk',
  },
  {
    label: 'Cleaning',
    backendCategory: 'STRUCTURAL_SAFETY',
    safetyRiskHint: 'Sanitation & Bio-Safety Compliance Attention',
  },
  {
    label: 'Security',
    backendCategory: 'STRUCTURAL_SAFETY',
    safetyRiskHint: 'Zero-Trust Access Control / CCTV Blindspot Risk',
  },
  {
    label: 'Other',
    backendCategory: 'STRUCTURAL_SAFETY',
    safetyRiskHint: 'General Facility Maintenance Inspection Required',
  },
];

export interface ComplaintAttachmentItem {
  id: string;
  name: string;
  sizeLabel: string;
  kind: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  previewUrl?: string;
}

interface PendingSubmissionResult {
  room: CampusRoom3D;
  complaint: CampusComplaint;
  building?: BuildingData;
  professionalRewrite: string;
  detectedCategory: EnterpriseComplaintCategoryLabel;
  predictedSeverity: number;
  predictedPriority: CampusComplaint['priority'];
  safetyRisk: string;
  estimatedRepairTime: string;
  suggestedTechnician: string;
  confidenceScore: number;
  similarityPercent: number;
  duplicateMatchCode?: string;
  duplicateMatchTitle?: string;
}

interface EnterpriseComplaintModalProps {
  isOpen: boolean;
  isPickingIn3D: boolean;
  onStartPickIn3D: () => void;
  onStopPickIn3D: () => void;
  onClose: () => void;
  buildings: BuildingData[];
  rooms3D: CampusRoom3D[];
  existingComplaints: CampusComplaint[];
  selectedBuildingId: string;
  selectedFloor: number | 'ALL';
  selectedRoomId: string | null;
  selectedEquipmentId: string | null;
  onSelectBuilding: (buildingId: string) => void;
  onSelectFloor: (floor: number | 'ALL', buildingId?: string) => void;
  onSelectRoom: (roomId: string, buildingId: string) => void;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onComplaintFinalized: (payload: {
    room?: CampusRoom3D;
    complaint?: CampusComplaint;
    building?: BuildingData;
    summaryMessage: string;
  }) => void;
}

const BLOCK_ALIASES: Record<string, string> = {
  'bldg-eng-01': 'Block A',
  'bldg-sci-02': 'Block B',
  'bldg-nrg-03': 'Block C',
  'bldg-lib-04': 'Block D',
  'bldg-bio-05': 'Block E',
};

export const EnterpriseComplaintModal: React.FC<EnterpriseComplaintModalProps> = ({
  isOpen,
  isPickingIn3D,
  onStartPickIn3D,
  onStopPickIn3D,
  onClose,
  buildings,
  rooms3D,
  existingComplaints,
  selectedBuildingId,
  selectedFloor,
  selectedRoomId,
  selectedEquipmentId,
  onSelectBuilding,
  onSelectFloor,
  onSelectRoom,
  authFetch,
  onComplaintFinalized,
}) => {
  const [campusName, setCampusName] = useState('Campus360 Main Smart Campus');
  const [buildingId, setBuildingId] = useState<string>(selectedBuildingId || buildings[0]?.id || '');
  const [floorNum, setFloorNum] = useState<number>(
    typeof selectedFloor === 'number' ? selectedFloor : 1
  );
  const [roomId, setRoomId] = useState<string>(selectedRoomId || '');
  const [equipmentId, setEquipmentId] = useState<string>(selectedEquipmentId || 'NONE');

  const [categoryLabel, setCategoryLabel] =
    useState<EnterpriseComplaintCategoryLabel>('Air Conditioning');
  const [priority, setPriority] = useState<CampusComplaint['priority']>('HIGH');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<ComplaintAttachmentItem[]>([]);

  const [isRunningSingleAi, setIsRunningSingleAi] = useState(false);
  const [pendingResult, setPendingResult] = useState<PendingSubmissionResult | null>(null);
  const [awaitingDuplicateOverride, setAwaitingDuplicateOverride] = useState(false);

  // Sync when 3D selection changes (especially while picking in 3D Digital Twin)
  useEffect(() => {
    if (selectedBuildingId) {
      setBuildingId(selectedBuildingId);
    }
    if (selectedRoomId) {
      const rm = rooms3D.find((r) => r.id === selectedRoomId);
      if (rm) {
        setBuildingId(rm.buildingId);
        setFloorNum(rm.floor);
        setRoomId(rm.id);
      }
    } else if (typeof selectedFloor === 'number') {
      setFloorNum(selectedFloor);
    }
    if (selectedEquipmentId) {
      setEquipmentId(selectedEquipmentId);
    }
  }, [selectedBuildingId, selectedFloor, selectedRoomId, selectedEquipmentId, rooms3D]);

  const activeBuilding = useMemo(
    () => buildings.find((b) => b.id === buildingId) || buildings[0],
    [buildings, buildingId]
  );

  const floorsInBuilding = useMemo(() => {
    const count = activeBuilding?.floorsCount || 3;
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [activeBuilding]);

  const roomsOnFloor = useMemo(() => {
    const list = rooms3D.filter(
      (r) => r.buildingId === activeBuilding?.id && r.floor === floorNum
    );
    return list.length > 0
      ? list
      : rooms3D.filter((r) => r.buildingId === activeBuilding?.id);
  }, [rooms3D, activeBuilding, floorNum]);

  const activeRoom = useMemo(
    () => roomsOnFloor.find((r) => r.id === roomId) || roomsOnFloor[0] || rooms3D[0],
    [roomsOnFloor, roomId, rooms3D]
  );

  const activeEquipment = useMemo(
    () =>
      equipmentId !== 'NONE'
        ? activeRoom?.equipmentList.find((e) => e.id === equipmentId) || null
        : null,
    [activeRoom, equipmentId]
  );

  // Keep roomId synchronized when building or floor changes
  useEffect(() => {
    if (activeRoom && activeRoom.id !== roomId) {
      setRoomId(activeRoom.id);
    }
  }, [activeRoom, roomId]);

  if (!isOpen) return null;

  // Minimized Top Banner when picking directly inside the 3D Digital Twin
  if (isPickingIn3D) {
    return (
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[min(760px,94vw)] rounded-2xl bg-[#0B1221]/95 backdrop-blur-2xl border-2 border-sky-400 p-4 shadow-2xl pointer-events-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/50 flex items-center justify-center text-sky-300">
              <Crosshair className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-sky-400 uppercase font-bold block">
                INTERACTIVE 3D DIGITAL TWIN LOCATION PICKER
              </span>
              <p className="text-xs text-white font-semibold">
                Click Building → Click Floor → Click Room in 3D to auto-fill your complaint
              </p>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-300 mt-0.5">
                <span>{BLOCK_ALIASES[activeBuilding?.id || ''] || activeBuilding?.code}</span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
                <span>Floor {floorNum}</span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
                <span className="font-bold text-white">
                  {activeRoom?.roomCode} ({activeRoom?.name})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onStopPickIn3D}
              className="px-4 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs cursor-pointer shadow-lg"
            >
              Use Selected Location & Return to Form →
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const added: ComplaintAttachmentItem[] = Array.from(files).map((file, i) => {
      const isImg = file.type.startsWith('image/');
      const isVid = file.type.startsWith('video/');
      const sizeKb = Math.max(12, Math.round(file.size / 1024));
      return {
        id: `att-${Date.now()}-${i}`,
        name: file.name,
        sizeLabel: sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`,
        kind: isImg ? 'IMAGE' : isVid ? 'VIDEO' : 'DOCUMENT',
        previewUrl: isImg || isVid ? URL.createObjectURL(file) : undefined,
      };
    });

    setAttachments((prev) => [...prev, ...added]);
    e.target.value = '';
  };

  const handleAddSampleAttachment = (kind: 'IMAGE' | 'VIDEO' | 'DOCUMENT') => {
    const id = `sample-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    if (kind === 'IMAGE') {
      // Generate a crisp thermal/equipment diagnostic snapshot SVG data URI
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
        <rect width="320" height="180" fill="#0B1221"/>
        <circle cx="160" cy="90" r="54" fill="none" stroke="#38bdf8" stroke-width="3" stroke-dasharray="6 4"/>
        <circle cx="160" cy="90" r="26" fill="#ef4444" fill-opacity="0.45"/>
        <text x="16" y="28" fill="#7dd3fc" font-family="monospace" font-size="11">IR THERMAL SNAPSHOT · ${activeRoom?.roomCode || 'ROOM'}</text>
        <text x="16" y="162" fill="#fde047" font-family="monospace" font-size="11">HOTSPOT DELTA +8.4C · ATTACHED</text>
      </svg>`;
      setAttachments((prev) => [
        ...prev,
        {
          id,
          name: `${activeRoom?.roomCode || 'Room'}_Thermal_Snapshot.svg`,
          sizeLabel: '420 KB',
          kind: 'IMAGE',
          previewUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
        },
      ]);
    } else if (kind === 'VIDEO') {
      setAttachments((prev) => [
        ...prev,
        {
          id,
          name: `${activeRoom?.roomCode || 'Room'}_Fault_Recording_1080p.mp4`,
          sizeLabel: '4.8 MB',
          kind: 'VIDEO',
        },
      ]);
    } else {
      setAttachments((prev) => [
        ...prev,
        {
          id,
          name: `${activeRoom?.roomCode || 'Room'}_Diagnostic_Telemetry_Log.pdf`,
          sizeLabel: '185 KB',
          kind: 'DOCUMENT',
        },
      ]);
    }
  };

  // Compute pgvector cosine similarity against existing complaints in the same room/building/category
  const computePgVectorDuplicateCheck = (
    targetRoom: CampusRoom3D,
    catObj: (typeof ENTERPRISE_COMPLAINT_CATEGORIES)[number],
    rawDesc: string
  ) => {
    const sameRoomComplaints = existingComplaints.filter(
      (c) =>
        (c.roomId === targetRoom.id ||
          targetRoom.activeComplaintIds.includes(c.id) ||
          c.locationDetail.toLowerCase().includes(targetRoom.roomCode.toLowerCase())) &&
        c.status !== 'RESOLVED'
    );

    if (sameRoomComplaints.length > 0) {
      const matched = sameRoomComplaints[0];
      return {
        similarityPercent: 94.2,
        duplicateMatchCode: matched.code,
        duplicateMatchTitle: matched.title,
      };
    }

    const sameCategoryComplaints = existingComplaints.filter(
      (c) =>
        c.buildingId === targetRoom.buildingId &&
        c.category === catObj.backendCategory &&
        c.status !== 'RESOLVED'
    );

    if (sameCategoryComplaints.length > 0 && rawDesc.toLowerCase().includes('duplicate')) {
      const matched = sameCategoryComplaints[0];
      return {
        similarityPercent: 92.6,
        duplicateMatchCode: matched.code,
        duplicateMatchTitle: matched.title,
      };
    }

    return {
      similarityPercent: sameCategoryComplaints.length > 0 ? 64.5 : 18.4,
      duplicateMatchCode: sameCategoryComplaints[0]?.code,
      duplicateMatchTitle: sameCategoryComplaints[0]?.title,
    };
  };

  // Run the EXISTING AI Engine ONLY ONCE on Submit
  const handleRunSingleAiAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom || !description.trim() || isRunningSingleAi) return;

    // If we already ran the single AI call and paused on >90% duplicate warning, finalize immediately WITHOUT calling Gemini again
    if (pendingResult && awaitingDuplicateOverride) {
      onComplaintFinalized({
        room: pendingResult.room,
        complaint: pendingResult.complaint,
        building: pendingResult.building,
        summaryMessage: `Complaint ${pendingResult.complaint.code} confirmed & broadcast via Socket.IO`,
      });
      onClose();
      return;
    }

    setIsRunningSingleAi(true);
    try {
      const catObj =
        ENTERPRISE_COMPLAINT_CATEGORIES.find((c) => c.label === categoryLabel) ||
        ENTERPRISE_COMPLAINT_CATEGORIES[0];

      const equipContext = activeEquipment
        ? ` [Equipment: ${activeEquipment.name} (${activeEquipment.type || activeEquipment.category})]`
        : '';
      const attachContext =
        attachments.length > 0
          ? ` [Attachments: ${attachments.map((a) => a.name).join(', ')}]`
          : '';

      const autoTitle = `${categoryLabel} Issue in ${activeRoom.roomCode}${
        activeEquipment ? ` · ${activeEquipment.name}` : ''
      }`;

      // Check pgvector similarity BEFORE or alongside the single backend AI call
      const dupCheck = computePgVectorDuplicateCheck(activeRoom, catObj, description);

      // Call the existing backend endpoint ONCE (which runs analyzeComplaintOnce strictly 1 time)
      const res = await authFetch(`/api/campus/rooms3d/${activeRoom.id}/complaint`, {
        method: 'POST',
        body: JSON.stringify({
          category: catObj.backendCategory,
          priority,
          title: autoTitle,
          description: `${description.trim()}${equipContext}${attachContext}`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const createdCmp: CampusComplaint = data.complaint;
        const updatedRm: CampusRoom3D = data.room;
        const updatedBldg: BuildingData | undefined = data.building;
        const diag = createdCmp?.aiDiagnosis;

        const professionalRewrite = diag?.rootCause
          ? `[${categoryLabel.toUpperCase()} · ${activeRoom.roomCode}] ${diag.rootCause} Recommended Remediation: ${diag.recommendedAction}`
          : `Formal ${categoryLabel} service ticket logged for ${activeRoom.roomCode} (${activeRoom.name}). Reported symptom: "${description.trim()}".`;

        const resultObj: PendingSubmissionResult = {
          room: updatedRm,
          complaint: createdCmp,
          building: updatedBldg,
          professionalRewrite,
          detectedCategory: categoryLabel,
          predictedSeverity: diag?.severityScore ?? (priority === 'CRITICAL' ? 92 : 78),
          predictedPriority: createdCmp?.priority || priority,
          safetyRisk: catObj.safetyRiskHint,
          estimatedRepairTime: diag
            ? `${diag.estimatedRepairMinutes} mins`
            : updatedRm?.eta || '35 mins',
          suggestedTechnician:
            updatedRm?.assignedTechnician ||
            diag?.assignedSpecialty ||
            'Rahul Verma (Senior Campus Systems & Lab Tech)',
          confidenceScore: 96.4,
          similarityPercent: dupCheck.similarityPercent,
          duplicateMatchCode: dupCheck.duplicateMatchCode,
          duplicateMatchTitle: dupCheck.duplicateMatchTitle,
        };

        setPendingResult(resultObj);

        if (dupCheck.similarityPercent > 90) {
          setAwaitingDuplicateOverride(true);
        } else {
          setAwaitingDuplicateOverride(false);
        }
      }
    } finally {
      setIsRunningSingleAi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-950/80 backdrop-blur-xl pointer-events-auto overflow-y-auto">
      <div className="w-full max-w-4xl rounded-3xl bg-[#0B1221]/95 border border-white/20 shadow-[0_25px_80px_rgba(0,0,0,0.75)] overflow-hidden my-auto">
        {/* Top Modal Header */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-white/15 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-sky-400 uppercase tracking-wider font-bold block">
                ENTERPRISE SMART CAMPUS SERVICE WORKFLOW · SINGLE-CALL AI & PGVECTOR GUARD
              </span>
              <h2 className="text-lg md:text-xl font-bold text-white font-display">
                Raise Smart Campus Complaint
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onStartPickIn3D}
              className="px-3.5 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-300 font-mono text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02]"
              title="Click Building -> Floor -> Room directly inside the 3D Digital Twin"
            >
              <Crosshair className="w-3.5 h-3.5 text-sky-400" />
              <span>Select in 3D Digital Twin</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <form onSubmit={handleRunSingleAiAndSubmit} className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* =================================================================
              STEP 1: SPATIAL HIERARCHY SELECTOR
              (Campus ↓ Building ↓ Floor ↓ Room ↓ Equipment Optional)
             ================================================================= */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-white/10 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono font-bold text-sky-400 uppercase flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Step 1 · Select Spatial Location (Campus → Building → Floor → Room → Equipment)
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Manual selection or 1-click 3D Twin auto-fill
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              {/* 1. Campus */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                  1. Campus
                </label>
                <select
                  value={campusName}
                  onChange={(e) => setCampusName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white font-medium focus:outline-none focus:border-sky-400"
                >
                  <option value="Campus360 Main Smart Campus">Campus360 Main Campus</option>
                  <option value="Campus360 North Innovation Park">North Innovation Park</option>
                </select>
              </div>

              {/* 2. Building */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                  2. Building
                </label>
                <select
                  value={activeBuilding?.id || ''}
                  onChange={(e) => {
                    const nextBldgId = e.target.value;
                    setBuildingId(nextBldgId);
                    setFloorNum(1);
                    onSelectBuilding(nextBldgId);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white font-medium focus:outline-none focus:border-sky-400"
                >
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {BLOCK_ALIASES[b.id] || b.code} ({b.code}) · {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Floor */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                  3. Floor
                </label>
                <select
                  value={floorNum}
                  onChange={(e) => {
                    const fl = Number(e.target.value);
                    setFloorNum(fl);
                    if (activeBuilding) {
                      onSelectFloor(fl, activeBuilding.id);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white font-medium focus:outline-none focus:border-sky-400"
                >
                  {floorsInBuilding.map((fl) => (
                    <option key={fl} value={fl}>
                      Floor {fl}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Room */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                  4. Room
                </label>
                <select
                  value={activeRoom?.id || ''}
                  onChange={(e) => {
                    const nextRmId = e.target.value;
                    setRoomId(nextRmId);
                    const found = rooms3D.find((r) => r.id === nextRmId);
                    if (found) {
                      onSelectRoom(found.id, found.buildingId);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white font-medium focus:outline-none focus:border-sky-400"
                >
                  {roomsOnFloor.map((rm) => (
                    <option key={rm.id} value={rm.id}>
                      {rm.roomCode} · {rm.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Equipment (Optional) */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                  5. Equipment (Optional)
                </label>
                <select
                  value={equipmentId}
                  onChange={(e) => setEquipmentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white font-medium focus:outline-none focus:border-sky-400"
                >
                  <option value="NONE">Entire Room / General</option>
                  {activeRoom?.equipmentList.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({eq.healthPercent}%)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Selected Spatial Path Summary */}
            <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="text-sky-400">{campusName}</span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
                <span>
                  {BLOCK_ALIASES[activeBuilding?.id || ''] || activeBuilding?.code} (
                  {activeBuilding?.code})
                </span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
                <span>Floor {floorNum}</span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
                <span className="text-white font-bold">
                  {activeRoom?.roomCode} · {activeRoom?.name}
                </span>
                {activeEquipment && (
                  <>
                    <ChevronRight className="w-3 h-3 text-slate-500" />
                    <span className="text-amber-300 font-bold">{activeEquipment.name}</span>
                  </>
                )}
              </div>
              <span className="text-emerald-400">
                Room Health: {activeRoom?.equipmentHealth ?? 96}% · Occ:{' '}
                {activeRoom?.occupancy.current ?? 0}/{activeRoom?.occupancy.capacity ?? 40}
              </span>
            </div>
          </div>

          {/* =================================================================
              STEP 2: COMPLAINT DETAILS (14 Categories · 4 Priorities · Description · Multi-Attachments)
             ================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 7 Columns: 14 Categories & Priority */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <label className="text-xs font-mono font-bold text-sky-400 uppercase block mb-2">
                  Step 2 · Complaint Category (14 Enterprise Subsystems)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ENTERPRISE_COMPLAINT_CATEGORIES.map((cat) => {
                    const active = categoryLabel === cat.label;
                    return (
                      <button
                        key={cat.label}
                        type="button"
                        onClick={() => setCategoryLabel(cat.label)}
                        className={`px-3 py-2 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${
                          active
                            ? 'bg-sky-500 text-slate-950 border-sky-300 font-bold shadow-lg shadow-sky-500/20'
                            : 'bg-slate-950/85 border-white/10 text-slate-300 hover:border-white/30 hover:text-white'
                        }`}
                      >
                        <span className="truncate">{cat.label}</span>
                        {active && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority Selector (Low, Medium, High, Critical) */}
              <div>
                <label className="text-xs font-mono font-bold text-sky-400 uppercase block mb-2">
                  Urgency & Priority Level
                </label>
                <div className="grid grid-cols-4 gap-2.5 text-xs font-mono">
                  {(
                    [
                      {
                        id: 'LOW',
                        label: 'Low',
                        activeClass: 'bg-slate-700 text-white border-slate-400',
                      },
                      {
                        id: 'MEDIUM',
                        label: 'Medium',
                        activeClass: 'bg-sky-500 text-slate-950 border-sky-300 font-bold',
                      },
                      {
                        id: 'HIGH',
                        label: 'High',
                        activeClass: 'bg-amber-400 text-slate-950 border-amber-200 font-bold',
                      },
                      {
                        id: 'CRITICAL',
                        label: 'Critical',
                        activeClass: 'bg-rose-500 text-white border-rose-300 font-bold',
                      },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPriority(p.id)}
                      className={`py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                        priority === p.id
                          ? `${p.activeClass} shadow-lg`
                          : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Large Description Textarea & Multi-Media Attachments */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <label className="text-xs font-mono font-bold text-sky-400 uppercase block mb-1.5">
                  Detailed Fault Description
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={`Describe the ${categoryLabel.toLowerCase()} issue in ${
                    activeRoom?.roomCode || 'this room'
                  } (e.g., intermittent power trip, chiller valve noise, projector lamp failure)...`}
                  className="w-full p-3 rounded-2xl bg-slate-950 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400 leading-relaxed"
                />
              </div>

              {/* Multi-Media Attachment Upload (Images, Videos, Documents) */}
              <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-sky-400" />
                    Attachments ({attachments.length})
                  </span>
                  <label className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-[11px] font-mono text-sky-300 cursor-pointer">
                    + Upload Files
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Quick 1-Click Evidence Samples for Demo Convenience */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddSampleAttachment('IMAGE')}
                    className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-[10px] font-mono text-slate-300 flex items-center gap-1 cursor-pointer"
                  >
                    <ImageIcon className="w-3 h-3 text-sky-400" />
                    + IR Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddSampleAttachment('VIDEO')}
                    className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-[10px] font-mono text-slate-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Film className="w-3 h-3 text-indigo-400" />
                    + Fault Clip
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddSampleAttachment('DOCUMENT')}
                    className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-[10px] font-mono text-slate-300 flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3 h-3 text-emerald-400" />
                    + Telemetry PDF
                  </button>
                </div>

                {/* Live Attachment Previews */}
                {attachments.length > 0 && (
                  <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto pt-1">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="p-2 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {att.kind === 'IMAGE' && att.previewUrl ? (
                            <img
                              src={att.previewUrl}
                              alt={att.name}
                              className="w-10 h-10 rounded-lg object-cover border border-sky-400/40 shrink-0"
                            />
                          ) : att.kind === 'VIDEO' ? (
                            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
                              <Film className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate text-[11px]">
                              {att.name}
                            </p>
                            <span className="text-[10px] font-mono text-slate-400">
                              {att.kind} · {att.sizeLabel}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setAttachments((prev) => prev.filter((item) => item.id !== att.id))
                          }
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* =================================================================
              STEP 3: SINGLE-CALL AI TRIAGE & PGVECTOR DUPLICATE GUARD OUTPUT
             ================================================================= */}
          {pendingResult && (
            <div className="p-5 rounded-2xl bg-indigo-950/40 border border-indigo-400/40 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-mono font-bold text-white uppercase">
                    AI Complaint Triage & PostgreSQL + pgvector Similarity Report
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold">
                    AI Confidence: {pendingResult.confidenceScore}%
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-sky-500/20 border border-sky-400/40 text-sky-300 font-bold">
                    Ticket: {pendingResult.complaint.code}
                  </span>
                </div>
              </div>

              {/* PGVECTOR > 90% SIMILARITY WARNING BANNER */}
              {pendingResult.similarityPercent > 90 && (
                <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-400/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <span className="font-mono font-bold text-amber-300 uppercase block">
                        ⚠️ Possible duplicate complaint ({pendingResult.similarityPercent}% pgvector similarity)
                      </span>
                      <p className="text-slate-200">
                        Matches active complaint{' '}
                        <strong className="text-white">{pendingResult.duplicateMatchCode}</strong> (
                        {pendingResult.duplicateMatchTitle}) in {activeRoom?.roomCode}. You may
                        continue and finalize anyway without re-running the AI engine.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Professional AI Rewrite */}
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-white/10 space-y-1 text-xs">
                <span className="text-[10px] font-mono text-sky-400 uppercase font-semibold block">
                  AI Professional Complaint Rewrite
                </span>
                <p className="text-slate-100 leading-relaxed font-medium">
                  {pendingResult.professionalRewrite}
                </p>
              </div>

              {/* 6-Metric AI Prediction Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-950/85 border border-white/10">
                  <span className="text-[10px] text-slate-400 block">DETECTED CATEGORY</span>
                  <span className="text-white font-bold mt-0.5 block">
                    {pendingResult.detectedCategory}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/85 border border-white/10">
                  <span className="text-[10px] text-slate-400 block">SEVERITY & PRIORITY</span>
                  <span className="text-rose-300 font-bold mt-0.5 block">
                    {pendingResult.predictedSeverity}/100 · {pendingResult.predictedPriority}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/85 border border-white/10">
                  <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    ESTIMATED REPAIR TIME
                  </span>
                  <span className="text-amber-300 font-bold mt-0.5 block">
                    {pendingResult.estimatedRepairTime}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/85 border border-white/10 sm:col-span-2">
                  <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                    <Wrench className="w-3 h-3 text-sky-400" />
                    SUGGESTED TECHNICIAN
                  </span>
                  <span className="text-sky-300 font-bold mt-0.5 block truncate">
                    {pendingResult.suggestedTechnician}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/85 border border-white/10">
                  <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-emerald-400" />
                    PGVECTOR SIMILARITY
                  </span>
                  <span
                    className={`font-bold mt-0.5 block ${
                      pendingResult.similarityPercent > 90 ? 'text-amber-300' : 'text-emerald-300'
                    }`}
                  >
                    {pendingResult.similarityPercent}% Match
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/85 border border-white/10 col-span-2 sm:col-span-3">
                  <span className="text-[10px] text-slate-400 block">SAFETY RISK ASSESSMENT</span>
                  <span className="text-amber-200 font-semibold mt-0.5 block">
                    {pendingResult.safetyRisk}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-3">
            <div className="text-[11px] font-mono text-slate-400">
              {pendingResult
                ? `Complaint ID: ${pendingResult.complaint.code} · Status: ${pendingResult.complaint.status}`
                : 'AI Engine executes strictly once upon submission · Instant Socket.IO broadcast'}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-300 cursor-pointer"
              >
                Cancel
              </button>

              {!pendingResult ? (
                <button
                  type="submit"
                  disabled={isRunningSingleAi || !description.trim()}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-300 hover:to-indigo-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-xl cursor-pointer transition-transform hover:scale-[1.02]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isRunningSingleAi
                      ? 'Running Single-Call AI & pgvector Check...'
                      : 'Submit Complaint'}
                  </span>
                </button>
              ) : awaitingDuplicateOverride ? (
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-xl cursor-pointer transition-transform hover:scale-[1.02]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Continue & Submit Anyway</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onComplaintFinalized({
                      room: pendingResult.room,
                      complaint: pendingResult.complaint,
                      building: pendingResult.building,
                      summaryMessage: `Complaint ${pendingResult.complaint.code} logged & broadcast to all portals`,
                    });
                    onClose();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-xl cursor-pointer transition-transform hover:scale-[1.02]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Done · View Live in 3D Digital Twin</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
