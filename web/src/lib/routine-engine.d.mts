export type Severity = "pass" | "review" | "blocked" | "unknown";
export type ResultStatus = "PASS" | "REVIEW" | "BLOCKED" | "UNKNOWN";

export interface TimeWindow {
  startMinute: number;
  endMinute: number;
}

export interface RoutineStep {
  id: string;
  label: string;
  deviceId: string;
  action: string;
  schedule?: TimeWindow;
}

export interface Routine {
  id: string;
  name: string;
  steps: RoutineStep[];
}

export interface Device {
  id: string;
  label: string;
  status: "online" | "offline" | "unknown";
}

export interface SensorReading {
  sensorId: string;
  label: string;
  status: "online" | "offline" | "unknown";
  value: unknown;
  updatedMinutesAgo: number | null;
}

export interface RoutineInput {
  routine: Routine;
  devices: Device[];
  otherRoutines?: Routine[];
  requiredSensorIds: string[];
  sensorReadings: SensorReading[];
}

export interface Finding {
  code: string;
  severity: Exclude<Severity, "pass">;
  evidence: string;
  recommendation: string;
}

export interface EvaluationResult {
  status: ResultStatus;
  tone: Severity;
  title: string;
  description: string;
  evidence: string;
  recommendation: string;
  findings: Finding[];
}

export function evaluateRoutine(input: RoutineInput): EvaluationResult;

export function createDemoScenario(
  scenario: "clear" | "offline" | "conflict" | "missing",
): RoutineInput;
