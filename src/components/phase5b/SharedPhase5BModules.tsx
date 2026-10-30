import React, { useState } from 'react';
import {
  BuildingData,
  CampusComplaint,
  CampusWorkOrder,
  ProcurementItem,
  RoomReservation,
  RedisSessionRecord,
  SecurityAuditRecord,
  AuthUser,
  ROLE_RBAC_MATRIX,
  UserRole,
} from '../../types/campus.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Cpu,
  Plus,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Zap,
  Lock,
  Unlock,
  Calendar,
  FileCheck,
  ShieldAlert,
  RefreshCw,
  KeyRound,
  Search,
  MapPin,
} from 'lucide-react';

// ============================================================================
// 1. PHASE 5B AI COMPLAINT INSPECTOR & SUBMISSION MODULE
// (Strictly 1 Gemini API call per complaint analysis, cached thereafter)
// ============================================================================
export const AIComplaintInspectorPanel: React.FC<{
  complaints: CampusComplaint[];
  buildings: BuildingData[];
  canSubmit: boolean;
  canAnalyze: boolean;
  onSelectBuilding?: (id: string) => void;
  onComplaintUpdated: (c: CampusComplaint) => void;
  onComplaintCreated: (c: CampusComplaint) => void;
}> = ({
  complaints,
  buildings,
  canSubmit,
  canAnalyze,
  onSelectBuilding,
  onComplaintUpdated,
  onComplaintCreated,
}) => {
  const { authFetch } = useAuth();
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [buildingId, setBuildingId] = useState(buildings[0]?.id || 'bldg-sci-02');
  const [locationDetail, setLocationDetail] = useState('');
  const [category, setCategory] = useState<CampusComplaint['category']>('HVAC_THERMAL');
  const [priority, setPriority] = useState<CampusComplaint['priority']>('HIGH');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filterText, setFilterText] = useState('');

  const handleAnalyzeOnce = async (complaint: CampusComplaint) => {
    setAnalyzingId(complaint.id);
    try {
      const res = await authFetch('/api/complaints/analyze', {
        method: 'POST',
        body: JSON.stringify({ complaintId: complaint.id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.complaint) {
          onComplaintUpdated(data.complaint);
        }
      }
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      const res = await authFetch('/api/campus/complaints', {
        method: 'POST',
        body: JSON.stringify({
          buildingId,
          locationDetail: locationDetail.trim() || 'Level 2 Technical Corridor',
          category,
          priority,
          title: title.trim(),
          description: description.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.complaint) {
          onComplaintCreated(data.complaint);
          setTitle('');
          setDescription('');
          setLocationDetail('');
          setShowNewForm(false);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = complaints.filter(
    (c) =>
      c.title.toLowerCase().includes(filterText.toLowerCase()) ||
      c.buildingName.toLowerCase().includes(filterText.toLowerCase()) ||
      c.code.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="bg-[#11192B] border border-white/10 rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h3 className="text-base font-semibold text-white font-display">
            Phase 5B AI Complaint Inspector & Triage
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Single-call Gemini 3.8 Flash root-cause engineering analysis · Cached per incident
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter incidents..."
              className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900/90 border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
            />
          </div>

          {canSubmit && (
            <button
              type="button"
              onClick={() => setShowNewForm((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              {showNewForm ? 'Cancel Report' : 'Log Campus Incident'}
            </button>
          )}
        </div>
      </div>

      {showNewForm && canSubmit && (
        <form
          onSubmit={handleCreateComplaint}
          className="mt-4 p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Target Campus Building</label>
              <select
                value={buildingId}
                onChange={(e) => setBuildingId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} — {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">System Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CampusComplaint['category'])}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
              >
                <option value="HVAC_THERMAL">HVAC & Cleanroom Thermal</option>
                <option value="ELECTRICAL_GRID">Microgrid & Electrical</option>
                <option value="AV_CLASSROOM">Lecture Hall AV & Spatial Projection</option>
                <option value="LAB_EQUIPMENT">Lab Instrumentation</option>
                <option value="STRUCTURAL_SAFETY">Access & Structural Safety</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Severity Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as CampusComplaint['priority'])}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Incident Summary Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Chiller loop differential pressure drop in Lab 302"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Room / Zone Location</label>
              <input
                type="text"
                value={locationDetail}
                onChange={(e) => setLocationDetail(e.target.value)}
                placeholder="e.g., Floor 3 · Cleanroom Bay B"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Technical Observation & Symptoms</label>
            <textarea
              rows={2}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe observed sensor anomalies, equipment behavior, or environmental impact..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap shrink-0"
            >
              {submitting ? 'Submitting Incident...' : 'Submit Incident to Phase 5B Bus'}
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 space-y-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-xl bg-slate-900/60 border border-white/10 hover:border-white/20 transition-colors"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <span className="text-sky-400 font-semibold">{item.code}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.buildingName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.locationDetail}</span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={
                      item.priority === 'CRITICAL'
                        ? 'text-rose-400 font-semibold'
                        : item.priority === 'HIGH'
                        ? 'text-amber-400 font-semibold'
                        : 'text-emerald-400'
                    }
                  >
                    {item.priority} PRIORITY
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white mt-1">{item.title}</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{item.description}</p>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                  <span>Reported by {item.reportedBy}</span>
                  <span aria-hidden="true">·</span>
                  <span>Role: {ROLE_RBAC_MATRIX[item.reporterRole]?.displayName || item.reporterRole}</span>
                  <span aria-hidden="true">·</span>
                  <span>Status: {item.status}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onSelectBuilding && (
                  <button
                    type="button"
                    onClick={() => onSelectBuilding(item.buildingId)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors whitespace-nowrap shrink-0"
                  >
                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                    Locate in 3D Twin
                  </button>
                )}

                {canAnalyze && !item.aiAnalyzed && (
                  <button
                    type="button"
                    disabled={analyzingId === item.id}
                    onClick={() => handleAnalyzeOnce(item)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-medium text-xs transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    {analyzingId === item.id ? 'Running Gemini Triage...' : 'Run AI Inspector (1 Call)'}
                  </button>
                )}
              </div>
            </div>

            {item.aiAnalyzed && item.aiDiagnosis && (
              <div className="mt-3 pt-3 border-t border-white/10 bg-slate-950/70 rounded-lg p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                    AI Inspector Root-Cause Diagnosis ({item.aiDiagnosis.modelUsed} · Cached)
                  </span>
                  <span className="font-mono tabular-nums text-slate-300">
                    Severity Index: <strong className="text-white">{item.aiDiagnosis.severityScore}/100</strong> · Est. Repair:{' '}
                    <strong className="text-white">{item.aiDiagnosis.estimatedRepairMinutes}m</strong>
                  </span>
                </div>
                <p className="text-xs text-slate-200 mt-1.5">
                  <strong className="text-slate-400">Root Cause:</strong> {item.aiDiagnosis.rootCause}
                </p>
                <p className="text-xs text-sky-200 mt-1">
                  <strong className="text-slate-400">Directive:</strong> {item.aiDiagnosis.recommendedAction}
                </p>
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                  <span>Assigned Specialty: {item.aiDiagnosis.assignedSpecialty}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Safety Hazard: {item.aiDiagnosis.safetyHazard ? 'HIGH VOLTAGE / THERMAL ALERT' : 'Contained'}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 2. PHASE 5B BUILDING MISSION CONTROL & ENVIRONMENTAL ACTUATOR PANEL
// ============================================================================
export const BuildingMissionControlPanel: React.FC<{
  building: BuildingData;
  canOverrideGrid: boolean;
  onBuildingUpdated: (b: BuildingData) => void;
}> = ({ building, canOverrideGrid, onBuildingUpdated }) => {
  const { authFetch } = useAuth();
  const [updating, setUpdating] = useState(false);

  const mutateBuilding = async (patch: {
    hvacSetpointC?: number;
    loadSheddingActive?: boolean;
    securityLockdown?: boolean;
  }) => {
    setUpdating(true);
    try {
      const res = await authFetch(`/api/campus/buildings/${building.id}/control`, {
        method: 'POST',
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.building) onBuildingUpdated(data.building);
      }
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-[#11192B] border border-white/10 rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span className="text-sky-400 font-semibold">{building.code}</span>
            <span aria-hidden="true">·</span>
            <span>{building.zone} Zone</span>
            <span aria-hidden="true">·</span>
            <span>{building.department}</span>
          </div>
          <h3 className="text-base font-semibold text-white font-display mt-0.5">
            {building.name} — Live Telemetry & Actuators
          </h3>
        </div>

        <span
          className={`text-xs font-mono font-semibold ${
            building.status === 'CRITICAL'
              ? 'text-rose-400'
              : building.status === 'WARNING'
              ? 'text-amber-400'
              : 'text-emerald-400'
          }`}
        >
          STATE: {building.status}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <div className="p-3 rounded-lg bg-slate-900/80 border border-white/10">
          <span className="text-[11px] text-slate-400 block">Ambient / Setpoint</span>
          <span className="text-base font-semibold font-mono tabular-nums text-white mt-0.5 block">
            {building.currentTempC}°C <span className="text-xs text-slate-400">/ {building.hvacSetpointC}°C</span>
          </span>
        </div>
        <div className="p-3 rounded-lg bg-slate-900/80 border border-white/10">
          <span className="text-[11px] text-slate-400 block">Active Grid Load</span>
          <span className="text-base font-semibold font-mono tabular-nums text-sky-400 mt-0.5 block">
            {building.powerKw} kW
          </span>
        </div>
        <div className="p-3 rounded-lg bg-slate-900/80 border border-white/10">
          <span className="text-[11px] text-slate-400 block">Rooftop Solar Yield</span>
          <span className="text-base font-semibold font-mono tabular-nums text-emerald-400 mt-0.5 block">
            +{building.solarOutputKw} kW
          </span>
        </div>
        <div className="p-3 rounded-lg bg-slate-900/80 border border-white/10">
          <span className="text-[11px] text-slate-400 block">Live Occupancy</span>
          <span className="text-base font-semibold font-mono tabular-nums text-white mt-0.5 block">
            {building.occupancy} <span className="text-xs text-slate-400">/ {building.maxCapacity}</span>
          </span>
        </div>
      </div>

      {/* Interactive Controls */}
      <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sliders className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-medium text-slate-200">HVAC Thermal Setpoint:</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={updating}
              onClick={() => mutateBuilding({ hvacSetpointC: building.hvacSetpointC - 0.5 })}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-white transition-colors"
            >
              -0.5°C
            </button>
            <span className="px-2.5 py-1 rounded bg-slate-950 border border-white/10 text-xs font-mono tabular-nums text-sky-300">
              {building.hvacSetpointC.toFixed(1)}°C
            </span>
            <button
              type="button"
              disabled={updating}
              onClick={() => mutateBuilding({ hvacSetpointC: building.hvacSetpointC + 0.5 })}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-white transition-colors"
            >
              +0.5°C
            </button>
          </div>
        </div>

        {canOverrideGrid && (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={updating}
              onClick={() => mutateBuilding({ loadSheddingActive: !building.loadSheddingActive })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                building.loadSheddingActive
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              {building.loadSheddingActive ? 'Load Shedding Active (-18% kW)' : 'Engage Load Shedding'}
            </button>

            <button
              type="button"
              disabled={updating}
              onClick={() => mutateBuilding({ securityLockdown: !building.securityLockdown })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                building.securityLockdown
                  ? 'bg-rose-500 text-white font-semibold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              {building.securityLockdown ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  Perimeter Locked
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  Perimeter Normal
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Building Sensor Nodes */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <span className="text-xs font-medium text-slate-400 block mb-2">
          Attached 3D Telemetry Nodes ({building.sensors.length})
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {building.sensors.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950/70 border border-white/10 text-xs"
            >
              <div>
                <span className="font-medium text-slate-200">{s.label}</span>
                <span className="text-slate-400 block text-[11px]">
                  {s.type} · {s.metric}
                </span>
              </div>
              <div className="text-right font-mono tabular-nums">
                <span className="text-white font-semibold">
                  {s.value} {s.unit}
                </span>
                <span
                  className={`block text-[10px] ${
                    s.status === 'CRITICAL'
                      ? 'text-rose-400'
                      : s.status === 'WARNING'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {s.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. PHASE 5B WORK-ORDER DISPATCH & FIELD EXECUTION QUEUE
// ============================================================================
export const WorkOrderDispatchQueue: React.FC<{
  workOrders: CampusWorkOrder[];
  onSelectBuilding?: (id: string) => void;
  onWorkOrderUpdated: (wo: CampusWorkOrder) => void;
}> = ({ workOrders, onSelectBuilding, onWorkOrderUpdated }) => {
  const { authFetch } = useAuth();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const updateStatus = async (id: string, status: CampusWorkOrder['status']) => {
    setUpdatingId(id);
    try {
      const res = await authFetch(`/api/campus/workorders/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.workOrder) onWorkOrderUpdated(data.workOrder);
      }
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="bg-[#11192B] border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <h3 className="text-base font-semibold text-white font-display">
            Phase 5B Field Work-Order Queue
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time MEP dispatch synchronized with 3D Digital Twin fault nodes
          </p>
        </div>
        <span className="text-xs font-mono tabular-nums text-slate-300">
          Active Orders: {workOrders.filter((w) => w.status !== 'COMPLETED').length}
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/10 text-slate-400">
              <th className="py-2.5 pr-3 font-medium">Order Code</th>
              <th className="py-2.5 px-3 font-medium">Facility & Sub-System</th>
              <th className="py-2.5 px-3 font-medium">Directive</th>
              <th className="py-2.5 px-3 font-medium text-right">SLA Window</th>
              <th className="py-2.5 px-3 font-medium">State</th>
              <th className="py-2.5 pl-3 font-medium text-right">Field Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {workOrders.map((wo) => (
              <tr key={wo.id} className="hover:bg-slate-900/50 transition-colors">
                <td className="py-3 pr-3 font-mono font-semibold text-sky-400 whitespace-nowrap">
                  {wo.code}
                  <span
                    className={`block text-[10px] ${
                      wo.priority === 'CRITICAL'
                        ? 'text-rose-400'
                        : wo.priority === 'HIGH'
                        ? 'text-amber-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {wo.priority}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <button
                    type="button"
                    onClick={() => onSelectBuilding?.(wo.buildingId)}
                    className="font-medium text-white hover:text-sky-300 text-left transition-colors"
                  >
                    {wo.buildingName}
                  </button>
                  <span className="block text-[11px] text-slate-400">{wo.system}</span>
                </td>
                <td className="py-3 px-3 text-slate-200 max-w-xs">{wo.title}</td>
                <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-200 whitespace-nowrap">
                  {wo.slaHoursLeft.toFixed(1)}h
                </td>
                <td className="py-3 px-3 font-mono text-xs whitespace-nowrap">
                  <span
                    className={
                      wo.status === 'COMPLETED'
                        ? 'text-emerald-400'
                        : wo.status === 'IN_PROGRESS'
                        ? 'text-sky-400'
                        : 'text-amber-400'
                    }
                  >
                    {wo.status}
                  </span>
                </td>
                <td className="py-3 pl-3 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5">
                    {wo.status !== 'IN_PROGRESS' && wo.status !== 'COMPLETED' && (
                      <button
                        type="button"
                        disabled={updatingId === wo.id}
                        onClick={() => updateStatus(wo.id, 'IN_PROGRESS')}
                        className="px-2.5 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-xs font-medium transition-colors"
                      >
                        Start Work
                      </button>
                    )}
                    {wo.status !== 'COMPLETED' && (
                      <button
                        type="button"
                        disabled={updatingId === wo.id}
                        onClick={() => updateStatus(wo.id, 'COMPLETED')}
                        className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// 4. PHASE 5B PROCUREMENT REQUISITION & VENDOR SLA PORTAL
// ============================================================================
export const ProcurementRequisitionTable: React.FC<{
  items: ProcurementItem[];
  buildings: BuildingData[];
  canApprove: boolean;
  canRequest: boolean;
  onItemUpdated: (item: ProcurementItem) => void;
  onItemCreated: (item: ProcurementItem) => void;
}> = ({ items, buildings, canApprove, canRequest, onItemUpdated, onItemCreated }) => {
  const { authFetch } = useAuth();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [itemTitle, setItemTitle] = useState('');
  const [vendor, setVendor] = useState('Siemens Smart Infrastructure');
  const [buildingId, setBuildingId] = useState(buildings[0]?.id || 'bldg-sci-02');
  const [amountUsd, setAmountUsd] = useState('12500');
  const [urgency, setUrgency] = useState<'STANDARD' | 'EXPEDITED' | 'EMERGENCY'>('EXPEDITED');

  const handleDecision = async (id: string, decision: 'APPROVED' | 'REJECTED' | 'ORDERED') => {
    const res = await authFetch(`/api/campus/procurement/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.requisition) onItemUpdated(data.requisition);
    }
  };

  const handleCreateReq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle.trim()) return;
    const res = await authFetch('/api/campus/procurement', {
      method: 'POST',
      body: JSON.stringify({
        itemTitle: itemTitle.trim(),
        vendor,
        buildingId,
        amountUsd: Number(amountUsd) || 5000,
        urgency,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.requisition) {
        onItemCreated(data.requisition);
        setItemTitle('');
        setShowRequestModal(false);
      }
    }
  };

  const totalPendingUsd = items
    .filter((i) => i.status === 'PENDING_APPROVAL')
    .reduce((acc, i) => acc + i.amountUsd, 0);

  return (
    <div className="bg-[#11192B] border border-white/10 rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <h3 className="text-base font-semibold text-white font-display">
            Capital Equipment & Parts Requisition Ledger
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Pending Sign-Off Volume:{' '}
            <strong className="font-mono tabular-nums text-white">
              ${totalPendingUsd.toLocaleString()} USD
            </strong>
          </p>
        </div>

        {canRequest && (
          <button
            type="button"
            onClick={() => setShowRequestModal((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            {showRequestModal ? 'Close Form' : 'New Parts Requisition'}
          </button>
        )}
      </div>

      {showRequestModal && canRequest && (
        <form
          onSubmit={handleCreateReq}
          className="mt-4 p-4 rounded-xl bg-slate-900/90 border border-white/10 grid grid-cols-1 md:grid-cols-4 gap-3"
        >
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Component / Equipment Specification</label>
            <input
              type="text"
              required
              value={itemTitle}
              onChange={(e) => setItemTitle(e.target.value)}
              placeholder="e.g., Cryogenic Chiller Modulating Valve Kit CV-204"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Approved Vendor</label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Amount (USD)</label>
            <input
              type="number"
              value={amountUsd}
              onChange={(e) => setAmountUsd(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Target Facility</label>
            <select
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
            >
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} — {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Urgency Tier</label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as typeof urgency)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
            >
              <option value="STANDARD">Standard</option>
              <option value="EXPEDITED">Expedited</option>
              <option value="EMERGENCY">Emergency</option>
            </select>
          </div>
          <div className="md:col-span-2 flex items-end justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-colors"
            >
              Submit Requisition for Approval
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/10 text-slate-400">
              <th className="py-2.5 pr-3 font-medium">Req ID</th>
              <th className="py-2.5 px-3 font-medium">Capital Item & Vendor</th>
              <th className="py-2.5 px-3 font-medium">Facility</th>
              <th className="py-2.5 px-3 font-medium text-right">Amount (USD)</th>
              <th className="py-2.5 px-3 font-medium text-right">Vendor SLA</th>
              <th className="py-2.5 px-3 font-medium">Status</th>
              {canApprove && <th className="py-2.5 pl-3 font-medium text-right">Executive Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-900/50 transition-colors">
                <td className="py-3 pr-3 font-mono font-semibold text-violet-400 whitespace-nowrap">
                  {item.reqCode}
                  <span className="block text-[10px] text-slate-400">{item.urgency}</span>
                </td>
                <td className="py-3 px-3">
                  <span className="font-medium text-white block">{item.itemTitle}</span>
                  <span className="text-[11px] text-slate-400">
                    {item.vendor} · Req by {item.requestedBy}
                  </span>
                </td>
                <td className="py-3 px-3 text-slate-300">{item.buildingName}</td>
                <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-white whitespace-nowrap">
                  ${item.amountUsd.toLocaleString()}
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-400 whitespace-nowrap">
                  {item.slaCompliance}%
                </td>
                <td className="py-3 px-3 font-mono whitespace-nowrap">
                  <span
                    className={
                      item.status === 'APPROVED' || item.status === 'ORDERED'
                        ? 'text-emerald-400 font-semibold'
                        : item.status === 'REJECTED'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }
                  >
                    {item.status}
                  </span>
                </td>
                {canApprove && (
                  <td className="py-3 pl-3 text-right whitespace-nowrap">
                    {item.status === 'PENDING_APPROVAL' ? (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDecision(item.id, 'APPROVED')}
                          className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecision(item.id, 'REJECTED')}
                          className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-medium transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-mono">
                        Signed by {item.approvedBy || 'Approver'}
                      </span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// 5. PHASE 5B SMART STUDY SPACE & LECTURE HALL SCHEDULER
// ============================================================================
export const RoomAndLabBookingGrid: React.FC<{
  rooms: RoomReservation[];
  onRoomUpdated: (room: RoomReservation) => void;
}> = ({ rooms, onRoomUpdated }) => {
  const { authFetch } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggleBooking = async (roomId: string) => {
    setBusyId(roomId);
    try {
      const res = await authFetch(`/api/campus/rooms/${roomId}/book`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.room) onRoomUpdated(data.room);
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-[#11192B] border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <h3 className="text-base font-semibold text-white font-display">
            Smart Academic Space & Study Pod Reservations
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Live environmental & AV readiness linked to Campus360 room sensors
          </p>
        </div>
        <Calendar className="w-4 h-4 text-sky-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        {rooms.map((rm) => (
          <div
            key={rm.id}
            className="p-4 rounded-xl bg-slate-900/70 border border-white/10 flex flex-col justify-between gap-3"
          >
            <div>
              <div className="flex items-center justify-between gap-2 text-xs font-mono">
                <span className="text-sky-400 font-semibold">{rm.roomCode}</span>
                <span
                  className={
                    rm.status === 'AVAILABLE' ? 'text-emerald-400 font-semibold' : 'text-amber-400'
                  }
                >
                  {rm.status}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-white mt-1">{rm.purpose}</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {rm.buildingName} · Window: {rm.timeSlot} · Capacity: {rm.capacity} seats
              </p>
            </div>

            <div className="pt-2.5 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
              <div className="text-slate-300 font-mono tabular-nums">
                <span>{rm.envTempC}°C</span>
                <span aria-hidden="true"> · </span>
                <span>{rm.avReady ? '8K Laser AV Ready' : 'AV Maintenance'}</span>
                <span aria-hidden="true"> · </span>
                <span className="text-slate-400">{rm.currentBookedBy}</span>
              </div>

              <button
                type="button"
                disabled={busyId === rm.id}
                onClick={() => toggleBooking(rm.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  rm.status === 'AVAILABLE'
                    ? 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {rm.status === 'AVAILABLE' ? 'Reserve Space' : 'Release Slot'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 6. SYSTEM ADMINISTRATION CENTER: REDIS SESSIONS, RBAC MATRIX & AUDIT STREAM
// ============================================================================
export const SystemAdminSecurityCenter: React.FC<{
  sessions: RedisSessionRecord[];
  auditLogs: SecurityAuditRecord[];
  users: AuthUser[];
  onSessionsChange: (next: RedisSessionRecord[]) => void;
  onUsersChange: (next: AuthUser[]) => void;
}> = ({ sessions, auditLogs, users, onSessionsChange, onUsersChange }) => {
  const { authFetch, rotateTokenManually, session: currentSession } = useAuth();
  const [rotating, setRotating] = useState(false);

  const handleRevokeSession = async (sessionId: string) => {
    const res = await authFetch(`/api/admin/sessions/${sessionId}/revoke`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.sessions) onSessionsChange(data.sessions);
    }
  };

  const handleToggleUserVerify = async (userId: string) => {
    const res = await authFetch(`/api/admin/users/${userId}/toggle-verify`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.users) onUsersChange(data.users);
    }
  };

  const handleRotateSelf = async () => {
    setRotating(true);
    try {
      await rotateTokenManually();
    } finally {
      setRotating(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Redis JWT & Refresh Token Rotation Cluster */}
      <div className="bg-[#11192B] border border-white/10 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <h3 className="text-base font-semibold text-white font-display">
              Redis Session Cluster & Refresh Token Rotation Inspector
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Stateful token families with automatic replay detection and instant revocation
            </p>
          </div>

          <button
            type="button"
            disabled={rotating}
            onClick={handleRotateSelf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${rotating ? 'animate-spin' : ''}`} />
            Test Live Refresh Token Rotation
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="py-2.5 pr-3 font-medium">Session ID / Family</th>
                <th className="py-2.5 px-3 font-medium">Identity & Role</th>
                <th className="py-2.5 px-3 font-medium text-right">Rotations</th>
                <th className="py-2.5 px-3 font-medium">Last Rotated</th>
                <th className="py-2.5 px-3 font-medium">State</th>
                <th className="py-2.5 pl-3 font-medium text-right">Zero-Trust Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-900/50">
                  <td className="py-3 pr-3 font-mono text-sky-400 whitespace-nowrap">
                    {s.id}
                    {currentSession?.id === s.id && (
                      <span className="ml-1.5 text-[10px] text-emerald-400">(Current)</span>
                    )}
                    <span className="block text-[10px] text-slate-400">Family: {s.tokenFamily}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-medium text-white block">{s.userName}</span>
                    <span className="text-[11px] text-slate-400">
                      {s.userEmail} · {s.userRole}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-white">
                    #{s.rotationCount}
                  </td>
                  <td className="py-3 px-3 font-mono tabular-nums text-slate-300 whitespace-nowrap">
                    {new Date(s.lastRotatedAt).toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-3 font-mono whitespace-nowrap">
                    <span className={s.revoked ? 'text-rose-400' : 'text-emerald-400 font-semibold'}>
                      {s.revoked ? 'REVOKED' : 'ACTIVE'}
                    </span>
                  </td>
                  <td className="py-3 pl-3 text-right whitespace-nowrap">
                    {!s.revoked && (
                      <button
                        type="button"
                        onClick={() => handleRevokeSession(s.id)}
                        className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-medium transition-colors"
                      >
                        Revoke Token Family
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Directory & RBAC Policy Matrix */}
      <div className="bg-[#11192B] border border-white/10 rounded-xl p-5">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h3 className="text-base font-semibold text-white font-display">
              Enterprise Identity Directory & RBAC Clearance Matrix
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Toggle email verification status on any account to test the unverified login gate
            </p>
          </div>
          <KeyRound className="w-4 h-4 text-rose-400" />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="py-2.5 pr-3 font-medium">User & Email</th>
                <th className="py-2.5 px-3 font-medium">Enterprise Role & Target Console</th>
                <th className="py-2.5 px-3 font-medium">Allowed RBAC Scopes</th>
                <th className="py-2.5 px-3 font-medium">Email Status</th>
                <th className="py-2.5 pl-3 font-medium text-right">Verification Gate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {users.map((u) => {
                const meta = ROLE_RBAC_MATRIX[u.role as UserRole];
                return (
                  <tr key={u.id} className="hover:bg-slate-900/50">
                    <td className="py-3 pr-3">
                      <span className="font-medium text-white block">{u.fullName}</span>
                      <span className="font-mono text-[11px] text-slate-400">{u.email}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`font-semibold block ${meta?.badgeColor || 'text-sky-400'}`}>
                        {meta?.displayName || u.role}
                      </span>
                      <span className="text-[11px] text-slate-400">{meta?.dashboardTitle}</span>
                    </td>
                    <td className="py-3 px-3 text-[11px] font-mono text-slate-300 max-w-md">
                      {u.permissions.join(' · ')}
                    </td>
                    <td className="py-3 px-3 font-mono whitespace-nowrap">
                      <span className={u.emailVerified ? 'text-emerald-400' : 'text-amber-400'}>
                        {u.emailVerified ? 'VERIFIED' : 'PENDING_OTP'}
                      </span>
                    </td>
                    <td className="py-3 pl-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleUserVerify(u.id)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
                      >
                        {u.emailVerified ? 'Require Re-Verify' : 'Mark Verified'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Immutable Security Audit Log Stream */}
      <div className="bg-[#11192B] border border-white/10 rounded-xl p-5">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h3 className="text-base font-semibold text-white font-display">
              Real-Time Security & Operational Audit Log Stream
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live Socket.IO event ledger recording authentication, token rotation, RBAC, and Digital Twin actions
            </p>
          </div>
          <ShieldAlert className="w-4 h-4 text-sky-400" />
        </div>

        <div className="mt-4 max-h-72 overflow-y-auto divide-y divide-white/10 text-xs font-mono">
          {auditLogs.map((log) => (
            <div key={log.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={
                    log.status === 'DENIED'
                      ? 'text-rose-400 font-semibold'
                      : log.status === 'WARNING'
                      ? 'text-amber-400 font-semibold'
                      : 'text-emerald-400'
                  }
                >
                  [{log.status}]
                </span>
                <span className="text-white font-semibold">{log.action}</span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-sky-300">{log.userEmail}</span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-slate-400">{log.metadata}</span>
              </div>
              <span className="text-slate-500 tabular-nums">
                {new Date(log.createdAt).toLocaleTimeString()} · {log.ipAddress}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
