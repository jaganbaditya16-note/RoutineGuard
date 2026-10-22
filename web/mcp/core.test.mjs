import test from "node:test";
import assert from "node:assert/strict";

import {
  createDemoScenario,
  evaluateRoutine,
} from "../src/lib/routine-engine.mjs";

import {
  getRoutineGuardPolicy,
  runDemoScenario,
  runPreflightTest,
} from "./core.mjs";

test("clear demo returns PASS and a simulation warning", () => {
  const report = runDemoScenario("clear");

  assert.equal(report.status, "PASS");
  assert.equal(report.mode, "SIMULATION_ONLY");
  assert.equal(report.routineName, "Evening Reset");
  assert.match(report.safetyNotice, /does not control/);
});

test("offline demo returns BLOCKED", () => {
  const report = runDemoScenario("offline");

  assert.equal(report.status, "BLOCKED");
  assert.ok(report.findings.some(
    (finding) => finding.code === "DEVICE_OFFLINE",
  ));
});

test("conflict demo returns REVIEW", () => {
  const report = runDemoScenario("conflict");

  assert.equal(report.status, "REVIEW");
  assert.ok(report.findings.some(
    (finding) => finding.code === "SCHEDULE_CONFLICT",
  ));
});

test("missing data demo returns UNKNOWN", () => {
  const report = runDemoScenario("missing");

  assert.equal(report.status, "UNKNOWN");
  assert.ok(report.findings.some(
    (finding) => finding.code === "SENSOR_DATA_UNAVAILABLE",
  ));
});

test("custom input with missing schedule cannot pass", () => {
  const input = createDemoScenario("clear");
  delete input.routine.steps[0].schedule;

  const report = runPreflightTest(input);

  assert.equal(report.status, "UNKNOWN");
  assert.ok(report.findings.some(
    (finding) => finding.code === "SCHEDULE_INVALID",
  ));
  assert.match(report.evidence, /Evening Reset/);
});

test("custom input can test the deterministic engine", () => {
  const input = createDemoScenario("clear");
  input.routine.name = "MCP Custom Routine";

  const report = runPreflightTest(input);

  assert.equal(report.routineName, "MCP Custom Routine");
  assert.equal(report.status, "PASS");
  assert.equal(report.checkedStepCount, 3);
});

test("invalid input is rejected by schema validation", () => {
  assert.throws(
    () => runPreflightTest({ routine: { name: "incomplete" } }),
  );
});

test("unknown demo scenarios are rejected", () => {
  assert.throws(() => runDemoScenario("not-a-scenario"));
});

test("policy clearly says no real device control", () => {
  const policy = getRoutineGuardPolicy();

  assert.equal(policy.hardwareConnected, false);
  assert.equal(policy.toolsAreReadOnlyWithRespectToDevices, true);
  assert.equal(policy.sensorFreshnessLimitMinutes, 15);
  assert.deepEqual(policy.severityPrecedence, [
    "BLOCKED",
    "UNKNOWN",
    "REVIEW",
    "PASS",
  ]);
});

test("engine still rejects invalid schedules independently", () => {
  const input = createDemoScenario("clear");
  input.routine.steps[0].schedule = {
    startMinute: 800,
    endMinute: 700,
  };

  assert.equal(evaluateRoutine(input).status, "UNKNOWN");
});