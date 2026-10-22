# RoutineGuard Web and MCP Server

See the root README for full installation and verification instructions.

Quick start from this directory:

    npm ci
    npm run dev

Start the MCP server in a second terminal:

    npm run mcp

Run checks:

    npm test
    npm run test:mcp
    npm run lint
    npm run build

With the MCP server running, test the protocol:

    npm run test:protocol

All demo scenarios use synthetic data. No real devices are controlled.