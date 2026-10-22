import { z } from "zod";
import {
  createDemoScenario,
  evaluateRoutine,
} from "../src/lib/routine-engine.mjs";

const timeWindowSchema = z.object({
  startMinute: z.number().finite(),
  endMinute: z.number().finite(),
}).strict();

const routineStepSchema = z.object({
  id: z.string().min(1).max(100),
  label: z.string().min(1).max(160),
  deviceId: z.string().min(1).max(100),
  action: z.string().min(1).max(100),
  schedule: timeWindowSchema.optional(),
}).strict();

const routineSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  steps: z.array(routineStepSchema).min(1).max(50),
}).strict();

const deviceSchema = z.object({
  id: z.string().min(1).max(100),
  label: z.string().min(1).max(160),
  status: z.enum(["online", "offline", "unknown"]),
}).strict();

const sensorReadingSchema = z.object({
  sensorId: z.string().min(1).max(100),
  label: z.string().min(1).max(160),
  status: z.enum(["online", "offline", "unknown"]),
  value: z.unknown(),
  updatedMinutesAgo: z.number().finite().nullable(),
}).strict();

// Export this shape for the MCP protocol's tool input schema.
export const routineToolInputShape = {
  routine: routineSchema.describe("Routine being tested."),
  devices: z.array(deviceSchema).max(100).describe(
    "Simulated or supplied device states referenced by routines.",
  ),
  otherRoutines: z.array(routineSchema).max(50).optional().describe(
    "Other scheduled routines to check for conflicting actions.",
  ),
  requiredSensorIds: z.array(
    z.string().min(1).max(100),
  ).max(100).describe("Sensor identifiers whose readings are required."),
  sensorReadings: z.array(sensorReadingSchema).max(100).describe(
    "Available sensor readings and their age in minutes.",
  ),
};

export const routineInputSchema = z.object(
  routineToolInputShape,
).strict();

function buildReport(input, metadata = {}) {
  const result = evaluateRoutine(input);

  return {
    product: "RoutineGuard",
    reportVersion: "1.0",
    mode: "SIMULATION_ONLY",
    checkedAt: new Date().toISOString(),

    ...metadata,

    routineName: input.routine.name,
    checkedStepCount: input.routine.steps.length,
    comparedRoutineCount: (input.otherRoutines ?? []).length,
    requiredSensorCount: input.requiredSensorIds.length,

    status: result.status,
    severity: result.tone,
    title: result.title,
    description: result.description,
    evidence: result.evidence,
    recommendation: result.recommendation,
    findings: result.findings,

    safetyNotice:
      "This report checks only the supplied inputs. It does not control " +
      "devices or establish real-world home safety.",
  };
}

export function runPreflightTest(rawInput) {
  const input = routineInputSchema.parse(rawInput);
  return buildReport(input);
}

export function runDemoScenario(scenario) {
  const validScenario = z.enum([
    "clear",
    "offline",
    "conflict",
    "missing",
  ]).parse(scenario);

  const input = createDemoScenario(validScenario);

  return buildReport(input, {
    scenario: validScenario,
  });
}

export function getRoutineGuardPolicy() {
  return {
    product: "RoutineGuard",
    mode: "SIMULATION_ONLY",
    statuses: {
      PASS: "Supplied inputs passed the implemented consistency checks.",
      REVIEW: "Conflicting scheduled actions need attention.",
      BLOCKED: "A required device is offline or not configured.",
      UNKNOWN:
        "Required device, sensor, or schedule information cannot be verified.",
    },
    severityPrecedence: [
      "BLOCKED",
      "UNKNOWN",
      "REVIEW",
      "PASS",
    ],
    schedulePolicy:
      "Every step must have finite start and end minutes, with start before end.",
    sensorFreshnessLimitMinutes: 15,
    toolsAreReadOnlyWithRespectToDevices: true,
    hardwareConnected: false,
    externalServicesRequired: false,
    limitation:
      "A PASS only describes the supplied sample inputs. It is not a " +
      "guarantee that a real device or safety system will behave correctly.",
  };
}