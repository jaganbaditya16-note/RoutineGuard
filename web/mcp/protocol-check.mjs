import assert from "node:assert/strict";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createDemoScenario } from "../src/lib/routine-engine.mjs";

const endpoint = "http://127.0.0.1:3001/mcp";

const client = new Client({
  name: "routineguard-protocol-check",
  version: "1.0.0",
});

const transport = new StreamableHTTPClientTransport(new URL(endpoint));

function parseReport(result) {
  if (result.isError) {
    throw new Error(
      result.content?.map((item) => item.text ?? "").join("\n") ??
        "MCP tool returned an error.",
    );
  }

  const item = result.content?.find((entry) => entry.type === "text");

  assert.ok(item, "Expected a text result from the MCP tool.");

  return JSON.parse(item.text);
}

async function testDemoScenario(scenario, expectedStatus) {
  const result = await client.callTool({
    name: "run_demo_scenario",
    arguments: { scenario },
  });

  const report = parseReport(result);

  assert.equal(report.status, expectedStatus);
  assert.equal(report.mode, "SIMULATION_ONLY");

  console.log(`PASS: ${scenario} scenario -> ${report.status}`);
}

try {
  console.log("Connecting to RoutineGuard MCP...");
  await client.connect(transport);
  console.log("PASS: MCP client initialized over Streamable HTTP");

  const { tools } = await client.listTools();
  const names = tools.map((tool) => tool.name);

  console.log("Discovered tools:", names.join(", "));

  for (const expected of [
    "run_preflight_test",
    "run_demo_scenario",
    "get_routineguard_policy",
  ]) {
    assert.ok(names.includes(expected), `Missing MCP tool: ${expected}`);
  }

  console.log("PASS: all three MCP tools discovered");

  await testDemoScenario("clear", "PASS");
  await testDemoScenario("offline", "BLOCKED");
  await testDemoScenario("conflict", "REVIEW");
  await testDemoScenario("missing", "UNKNOWN");

  // Test the preflight tool with a supplied routine.
  const customInput = createDemoScenario("clear");
  customInput.routine.name = "MCP Custom Routine";

  const customResult = await client.callTool({
    name: "run_preflight_test",
    arguments: customInput,
  });

  const customReport = parseReport(customResult);

  assert.equal(customReport.status, "PASS");
  assert.equal(customReport.routineName, "MCP Custom Routine");

  console.log("PASS: custom routine preflight");

  // Test that invalid schedules stay UNKNOWN through MCP.
  const invalidInput = createDemoScenario("clear");
  delete invalidInput.routine.steps[0].schedule;

  const invalidResult = await client.callTool({
    name: "run_preflight_test",
    arguments: invalidInput,
  });

  const invalidReport = parseReport(invalidResult);

  assert.equal(invalidReport.status, "UNKNOWN");
  assert.ok(
    invalidReport.findings.some(
      (finding) => finding.code === "SCHEDULE_INVALID",
    ),
  );

  console.log("PASS: invalid schedule returns UNKNOWN through MCP");

  // Test the read-only policy tool.
  const policyResult = await client.callTool({
    name: "get_routineguard_policy",
    arguments: {},
  });

  const policy = parseReport(policyResult);

  assert.equal(policy.hardwareConnected, false);
  assert.equal(policy.toolsAreReadOnlyWithRespectToDevices, true);

  console.log("PASS: simulation-only policy confirmed");
  console.log("\nALL MCP PROTOCOL CHECKS PASSED");
} catch (error) {
  console.error("\nMCP PROTOCOL CHECK FAILED");
  console.error(error);
  process.exitCode = 1;
} finally {
  try {
    await client.close();
  } catch {
    // Preserve the original test result if the connection already closed.
  }
}