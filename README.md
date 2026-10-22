# RoutineGuard

**Test the routine before you trust it.**

RoutineGuard is a simulation-first preflight checker for smart-home routines. Before a routine is treated as verified, it checks the supplied schedule, device availability, sensor-data freshness, and conflicting actions, then explains the result and a recommended next step.

> **Prototype limitation:** RoutineGuard uses synthetic/example data. It does not connect to or control real appliances, and a PASS result does not prove that a real home is safe.

## What it demonstrates

- A Next.js dashboard with Overview, Routine Lab, Devices, and Activity Log views.
- A deterministic evaluation engine that returns `PASS`, `REVIEW`, `BLOCKED`, or `UNKNOWN`.
- Evidence and recommended next steps for each example result.
- A self-hosted MCP server over Streamable HTTP.
- Three MCP tools: `run_preflight_test`, `run_demo_scenario`, and `get_routineguard_policy`.
- Unit tests for the engine and MCP tools, plus a protocol integration check.

## Requirements

- Node.js 20.9 or later
- npm

## Run the dashboard

In PowerShell:

    Set-Location "C:\Users\Jagan\Projects\RoutineGuard\web"
    npm ci
    npm run dev

Open http://localhost:3000.

## Run the MCP server

Open a **second** PowerShell terminal:

    Set-Location "C:\Users\Jagan\Projects\RoutineGuard\web"
    npm run mcp

The local MCP endpoint is http://127.0.0.1:3001/mcp. The health endpoint is http://127.0.0.1:3001/health. Keep this terminal running while you run the protocol check.

## Verify the project

From the `web` directory:

    npm test
    npm run test:mcp
    npm run lint
    npm run build

With the MCP server running in another terminal:

    npm run test:protocol

The protocol check initializes an MCP client, discovers the three tools, and exercises the demo scenarios and policy response. Verify the negotiated MCP protocol version against the hackathon's required minimum before claiming compliance.

## Decision statuses

- **PASS** — the supplied inputs passed the implemented checks; this is not real-world safety verification.
- **REVIEW** — conflicting scheduled actions need attention.
- **BLOCKED** — a required device is offline or not configured.
- **UNKNOWN** — required evidence is unavailable or invalid.

Severity precedence: `BLOCKED > UNKNOWN > REVIEW > PASS`.

## Demo walkthrough

1. Open **Routine Lab** and run **All checks clear**.
2. Select **Device offline** and run the check; review the blocking evidence and recommendation.
3. Select **Schedule conflict** and run the check; review the overlapping actions.
4. Select **Sensor data missing** and run the check; observe that missing evidence produces UNKNOWN, not PASS.
5. Start the MCP server in a second terminal and run `npm run test:protocol` to demonstrate tool discovery and calls.

Use the walkthrough as a recording plan; add the public demo-video URL to your hackathon submission once the video is uploaded.

## Security and dependency audit

The production dependency audit previously reported zero vulnerabilities (`npm audit --omit=dev`). The full development audit currently reports a high-severity advisory for `braces`, pulled in through the ESLint/Next.js development-tooling dependency chain. The advisory currently lists no patched release, and npm's suggested `--force` fix would downgrade `eslint-config-next` to an incompatible major version. Do **not** run `npm audit fix --force` as a blind fix. Recheck the advisory and dependency tree before changing the lockfile; this is an unresolved development-tooling advisory, not a claim that the full audit is clean.

## Development friction

See [FRICTION_LOG.md](./FRICTION_LOG.md) for the recorded issues, workarounds, and suggested improvements.

## License

MIT. See [LICENSE](./LICENSE).
