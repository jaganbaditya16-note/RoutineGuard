import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { z } from "zod";

import {
  getRoutineGuardPolicy,
  routineToolInputShape,
  runDemoScenario,
  runPreflightTest,
} from "./core.mjs";

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT ?? 3001);

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("PORT must be a valid TCP port between 1 and 65535.");
}

function textResult(value) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

function errorResult(error) {
  const message = error instanceof Error
    ? error.message
    : "The request could not be processed.";

  return {
    isError: true,
    content: [
      {
        type: "text",
        text: `RoutineGuard rejected the request: ${message}`,
      },
    ],
  };
}

function createRoutineGuardServer() {
  const server = new McpServer({
    name: "routineguard",
    version: "1.0.0",
  });

  server.registerTool(
    "run_preflight_test",
    {
      title: "Run Routine Preflight Test",
      description:
        "Evaluate a supplied smart-home routine using deterministic rules. " +
        "Checks device states, sensor freshness, invalid schedule windows, " +
        "and overlapping conflicting actions. Returns structured evidence " +
        "and recommendations. It does not control real devices.",
      inputSchema: routineToolInputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) => {
      try {
        return textResult(runPreflightTest(input));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "run_demo_scenario",
    {
      title: "Run RoutineGuard Demo Scenario",
      description:
        "Run a built-in synthetic scenario: clear, offline, conflict, " +
        "or missing. Useful for demonstrating expected outcomes.",
      inputSchema: {
        scenario: z.enum([
          "clear",
          "offline",
          "conflict",
          "missing",
        ]).describe("Which synthetic scenario to evaluate."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ scenario }) => {
      try {
        return textResult(runDemoScenario(scenario));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "get_routineguard_policy",
    {
      title: "Get RoutineGuard Policy",
      description:
        "Explain RoutineGuard's statuses, severity precedence, sensor " +
        "freshness limit, and simulation-only limitations.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => textResult(getRoutineGuardPolicy()),
  );

  return server;
}

const app = createMcpExpressApp({ host: HOST });

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    product: "RoutineGuard",
    transport: "MCP Streamable HTTP",
    mode: "SIMULATION_ONLY",
  });
});

app.post("/mcp", async (req, res) => {
  // Stateless transport: each request creates an isolated server instance.
  const server = createRoutineGuardServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  let closed = false;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    void transport.close().catch(() => {});
    void server.close().catch(() => {});
  };

  res.once("close", cleanup);

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP request error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }

    cleanup();
  }
});

app.get("/mcp", (_req, res) => {
  res.status(405).json({
    error: "This stateless MCP endpoint accepts POST requests.",
  });
});

app.delete("/mcp", (_req, res) => {
  res.status(405).json({
    error: "This stateless MCP endpoint does not support DELETE.",
  });
});

const listener = app.listen(PORT, HOST, () => {
  console.log(`RoutineGuard MCP server listening on http://${HOST}:${PORT}/mcp`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
  console.log("Mode: simulation only; no real device control.");
});

function shutdown() {
  listener.close(() => {
    console.log("RoutineGuard MCP server stopped.");
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);