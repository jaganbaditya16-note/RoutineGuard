# RoutineGuard

**Test the routine before you trust it.**

RoutineGuard checks simulated smart-home routines before they are treated
as verified. It detects invalid schedules, unavailable devices, stale sensor
readings, and conflicting actions.

## Features

- Next.js dashboard and Routine Lab
- Deterministic routine evaluation engine
- Regression tests for invalid schedules
- MCP server using Streamable HTTP
- Three MCP tools: `run_preflight_test`, `run_demo_scenario`,
  and `get_routineguard_policy`

## Requirements

Node.js 20.9 or later and npm.

## Run the dashboard

From PowerShell:

    Set-Location "C:\Users\Jagan\Projects\RoutineGuard\web"
    npm ci
    npm run dev

Open http://localhost:3000.

## Run the MCP server

Open a second PowerShell terminal:

    Set-Location "C:\Users\Jagan\Projects\RoutineGuard\web"
    npm run mcp

MCP endpoint: http://127.0.0.1:3001/mcp
Health endpoint: http://127.0.0.1:3001/health

Keep the server running while executing the MCP protocol test.

## Verify the project

Run these commands from the web directory:

    npm test
    npm run test:mcp
    npm run lint
    npm run build

With the MCP server running in another terminal:

    npm run test:protocol

## Decision statuses

- PASS: supplied inputs passed the implemented checks.
- REVIEW: conflicting actions need attention.
- BLOCKED: a required device is offline or not configured.
- UNKNOWN: required evidence is unavailable or invalid.

Severity precedence: BLOCKED > UNKNOWN > REVIEW > PASS.

## Safety and limitations

RoutineGuard currently uses simulated data. It does not control real
appliances and does not prove that a real home is safe. A PASS means only
that the supplied inputs passed the implemented checks.

The production dependency audit reported zero vulnerabilities. The full
development audit reported a braces advisory in the ESLint/Next.js tooling
dependency chain. No forced downgrade was applied.

See FRICTION_LOG.md for recorded development problems and workarounds.

## License

MIT. See LICENSE.