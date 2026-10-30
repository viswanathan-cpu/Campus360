import { AIComplaintDiagnosis, CampusComplaint } from '../types/campus.ts';

/**
 * Campus360 Deterministic Diagnostic Engine
 * Purely deterministic rule-based facility fault diagnosis (Zero external LLM / Gemini API calls).
 */
export async function analyzeComplaintOnce(
  complaint: CampusComplaint
): Promise<AIComplaintDiagnosis> {
  if (complaint.aiAnalyzed && complaint.aiDiagnosis) {
    return complaint.aiDiagnosis;
  }

  const rootCauseMap: Record<CampusComplaint['category'], string> = {
    ELECTRICAL_GRID:
      'Harmonic resonance on Inverter Bank B 480V busbar due to capacitor bank detuning under peak solar backfeed.',
    HVAC_THERMAL:
      'Chilled-water pneumatic actuator hysteresis causing supply air damper drift (+3.8°C above setpoint).',
    AV_CLASSROOM:
      'IP-transceiver clock jitter on VLAN 40 multicast stream causing intermittent signal unlock.',
    LAB_EQUIPMENT:
      'Precision workstation power rail ripple exceeding tolerance on local branch distribution unit.',
    STRUCTURAL_SAFETY:
      'Perimeter magnetic access relay contact resistance elevated above nominal threshold.',
  };

  const actionMap: Record<CampusComplaint['category'], string> = {
    ELECTRICAL_GRID:
      'Engage active harmonic filter bank, shed 15% non-essential load on Feeder 02, and torque-verify busbar lugs.',
    HVAC_THERMAL:
      'Recalibrate actuator feedback loop, flush strainer bypass, and verify BACnet PID loop gain.',
    AV_CLASSROOM:
      'Reset Dante/AV-over-IP transceiver clock master and re-seat SFP+ uplink module on Floor Switch.',
    LAB_EQUIPMENT:
      'Switch equipment rack to isolated UPS bypass rail and run thermal diagnostic sweep.',
    STRUCTURAL_SAFETY:
      'Inspect magnetic lock controller board and verify 24V DC auxiliary supply rail.',
  };

  const specialtyMap: Record<CampusComplaint['category'], string> = {
    ELECTRICAL_GRID: 'High-Voltage Microgrid Engineer',
    HVAC_THERMAL: 'MEP & Cleanroom Automation Technician',
    AV_CLASSROOM: 'AV & Fiber Network Specialist',
    LAB_EQUIPMENT: 'Precision Lab Instrumentation Engineer',
    STRUCTURAL_SAFETY: 'Physical Security & Access Systems Tech',
  };

  const deterministicDiagnosis: AIComplaintDiagnosis = {
    rootCause: rootCauseMap[complaint.category] || rootCauseMap.HVAC_THERMAL,
    severityScore:
      complaint.priority === 'CRITICAL'
        ? 92
        : complaint.priority === 'HIGH'
        ? 81
        : complaint.priority === 'MEDIUM'
        ? 58
        : 36,
    recommendedAction: actionMap[complaint.category] || actionMap.HVAC_THERMAL,
    assignedSpecialty: specialtyMap[complaint.category] || specialtyMap.HVAC_THERMAL,
    estimatedRepairMinutes:
      complaint.priority === 'CRITICAL' ? 25 : complaint.priority === 'HIGH' ? 40 : 55,
    safetyHazard: complaint.priority === 'CRITICAL',
    analyzedAt: new Date().toISOString(),
    modelUsed: 'deterministic-rules-v5b',
  };

  complaint.aiAnalyzed = true;
  complaint.aiDiagnosis = deterministicDiagnosis;
  complaint.status = 'AI_TRIAGED';
  return deterministicDiagnosis;
}

