import test from "node:test";
import assert from "node:assert/strict";
import {
  createDemoScenario,
  evaluateRoutine,
  MAX_SENSOR_AGE_MINUTES,
  overlaps,
} from "../src/lib/routine-engine.mjs";

test("clear scenario passes with no findings", () => {
  const result = evaluateRoutine(createDemoScenario("clear"));

  assert.equal(result.status, "PASS");
  assert.equal(result.findings.length, 0);
});

test("offline robot vacuum blocks the routine", () => {
  const result = evaluateRoutine(createDemoScenario("offline"));

  assert.equal(result.status, "BLOCKED");
  assert.ok(
    result.findings.some((finding) => finding.code === "DEVICE_OFFLINE"),
  );
});

test("overlapping conflicting light actions need review", () => {
  const result = evaluateRoutine(createDemoScenario("conflict"));

  assert.equal(result.status, "REVIEW");
  assert.ok(
    result.findings.some((finding) => finding.code === "SCHEDULE_CONFLICT"),
  );
});

test("missing sensor data never counts as a pass", () => {
  const result = evaluateRoutine(createDemoScenario("missing"));

  assert.equal(result.status, "UNKNOWN");
  assert.ok(
    result.findings.some(
      (finding) => finding.code === "SENSOR_DATA_UNAVAILABLE",
    ),
  );
});

test("non-overlapping light actions do not create a schedule conflict", () => {
  const result = evaluateRoutine(createDemoScenario("clear"));

  assert.equal(result.status, "PASS");
  assert.equal(
    result.findings.some((finding) => finding.code === "SCHEDULE_CONFLICT"),
    false,
  );
});

test("stale sensor data produces UNKNOWN", () => {
  const input = createDemoScenario("clear");
  input.sensorReadings[0].updatedMinutesAgo = 90;

  const result = evaluateRoutine(input);

  assert.equal(result.status, "UNKNOWN");
  assert.ok(
    result.findings.some(
      (finding) => finding.code === "SENSOR_DATA_UNAVAILABLE",
    ),
  );
});

test("an unconfigured device blocks the routine", () => {
  const input = createDemoScenario("clear");
  input.devices = input.devices.filter(
    (device) => device.id !== "robot-vacuum",
  );

  const result = evaluateRoutine(input);

  assert.equal(result.status, "BLOCKED");
  assert.ok(
    result.findings.some((finding) => finding.code === "DEVICE_NOT_FOUND"),
  );
});

test("conflict evidence names both routines correctly", () => {
  const result = evaluateRoutine(createDemoScenario("conflict"));

  assert.match(
    result.evidence,
    /Evening Reset: off conflicts with Focus Time: on/,
  );
  assert.doesNotMatch(result.evidence, /undefined/);
});

test("missing schedule produces UNKNOWN", () => {
  const input = createDemoScenario("clear");
  delete input.routine.steps[0].schedule;

  const result = evaluateRoutine(input);

  assert.equal(result.status, "UNKNOWN");
  assert.ok(
    result.findings.some((finding) => finding.code === "SCHEDULE_INVALID"),
  );
  assert.match(result.evidence, /Evening Reset/);
  assert.match(result.evidence, /Turn living-room light off/);
});

test("equal schedule start and end produces UNKNOWN", () => {
  const input = createDemoScenario("clear");
  input.routine.steps[0].schedule = {
    startMinute: 600,
    endMinute: 600,
  };

  const result = evaluateRoutine(input);

  assert.equal(result.status, "UNKNOWN");
  assert.ok(
    result.findings.some((finding) => finding.code === "SCHEDULE_INVALID"),
  );
});

test("schedule ending before it starts produces UNKNOWN", () => {
  const input = createDemoScenario("clear");
  input.routine.steps[0].schedule = {
    startMinute: 700,
    endMinute: 650,
  };

  const result = evaluateRoutine(input);

  assert.equal(result.status, "UNKNOWN");
  assert.ok(
    result.findings.some((finding) => finding.code === "SCHEDULE_INVALID"),
  );
});

test("NaN schedule values produce UNKNOWN", () => {
  const input = createDemoScenario("clear");
  input.routine.steps[0].schedule = {
    startMinute: Number.NaN,
    endMinute: 650,
  };

  const result = evaluateRoutine(input);

  assert.equal(result.status, "UNKNOWN");
  assert.ok(
    result.findings.some((finding) => finding.code === "SCHEDULE_INVALID"),
  );
});

test("infinite schedule values produce UNKNOWN", () => {
  const input = createDemoScenario("clear");
  input.routine.steps[0].schedule = {
    startMinute: 600,
    endMinute: Number.POSITIVE_INFINITY,
  };

  const result = evaluateRoutine(input);

  assert.equal(result.status, "UNKNOWN");
  assert.ok(
    result.findings.some((finding) => finding.code === "SCHEDULE_INVALID"),
  );
});

test("invalid schedule in another routine produces UNKNOWN", () => {
  const input = createDemoScenario("clear");
  delete input.otherRoutines[0].steps[0].schedule;

  const result = evaluateRoutine(input);

  assert.equal(result.status, "UNKNOWN");
  assert.ok(
    result.findings.some(
      (finding) =>
        finding.code === "SCHEDULE_INVALID" &&
        finding.evidence.includes("Focus Time") &&
        finding.evidence.includes("Keep living-room light on"),
    ),
  );
});

test("overlaps rejects invalid windows", () => {
  assert.equal(
    overlaps(
      { startMinute: 10, endMinute: 10 },
      { startMinute: 5, endMinute: 15 },
    ),
    false,
  );

  assert.equal(
    overlaps(
      { startMinute: Number.NaN, endMinute: 20 },
      { startMinute: 5, endMinute: 15 },
    ),
    false,
  );
});

test("sensor freshness threshold is exported", () => {
  assert.equal(MAX_SENSOR_AGE_MINUTES, 15);
});