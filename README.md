# BFA Gateway

A TypeScript and Express gateway for safely connecting AI agents to internal business tools. BFA Gateway is a working project template: it validates tool calls, applies access rules, limits request volume, records audit events, and routes authorized work to isolated domain services.

## What it provides

- A curated tool registry for user, room, order, and notification operations
- Input validation and output sanitization
- Attribute-based access control (ABAC) for ownership, roles, and order limits
- Per-tool and per-user rate limits
- Decoy tools for detecting suspicious privilege-escalation attempts
- Audit records with trace IDs and response attestation metadata
- A browser dashboard, REST API, interactive CLI, simulations, and verification suite

## Architecture

```text
AI agent / dashboard / CLI
            |
            v
       BFA Gateway
  auth -> defense -> limits
  validation -> policy -> audit
            |
            v
 User | Room | Order | Notification services
```

All tool calls pass through `BFACore` before a domain service is invoked. The gateway returns a structured verdict: `ALLOWED`, `DENIED`, `INVALID_INPUT`, `RATE_LIMITED`, or `HONEYPOT_TRIGGERED`.

## Security controls

| Control | Purpose |
| --- | --- |
| Validator and sanitizer | Enforces registered parameters, types, length limits, and known unsafe-input patterns. |
| ABAC policy engine | Enforces profile, booking, order, and notification authorization rules. |
| Rate limiter | Applies a five-calls-per-tool and 12-calls-per-user window over 10 seconds. |
| Identity mapper | Resolves the caller into a user and role context for the demo environment. |
| Audit logger | Stores traceable execution records locally for inspection. |
| Honeypots | Flags access attempts to decoy administrative tools. |
| Tool-schema filtering | Excludes honeypot tools from the schemas shared with agents. |
| Output attestation | Adds an HMAC-based provenance marker to successful response data. |

## Quick start

### Requirements

- Node.js 18 or later
- npm 9 or later

### Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000` to use the dashboard.

### Verify the project

```bash
npm test
```

This builds the TypeScript project, runs the sector checks, and executes the local benchmark scenarios.

### Run with Docker

```bash
docker build -t bfa-gateway .
docker run -p 3000:3000 bfa-gateway
```

## API

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/bfa/health` | Returns service health and registered-tool count. |
| `GET` | `/api/bfa/tools` | Lists agent-visible tool definitions. |
| `POST` | `/api/bfa/execute` | Runs a tool call through the gateway. |
| `POST` | `/api/bfa/chat` | Sends a natural-language request to the demo agent. |
| `POST` | `/api/bfa/simulate` | Runs a predefined normal, procurement, or adversarial scenario. |
| `GET` | `/api/bfa/audit-logs` | Retrieves local audit records. |
| `GET` | `/api/bfa/metrics` | Returns cached local benchmark metrics. |

Example request:

```bash
curl -X POST http://localhost:3000/api/bfa/execute \
  -H "Content-Type: application/json" \
  -d '{"userToken":"usr_student_01","toolName":"get_user_timetable","args":{"userId":"usr_student_01"}}'
```

## CLI

```bash
npm run agent
npm run agent -- "Show my timetable"
```

## Project structure

```text
src/
  agents/          Demo agent and scenario simulator
  bfa-gateway/     Gateway pipeline and security controls
  evaluation/      Verification and benchmark scripts
  microservices/   In-memory domain-service implementations
  public/          Dashboard assets
  cli.ts           Interactive command-line client
  server.ts         Express API and static dashboard host
```

## Deployment notes

This repository is a demo implementation. Before production use, integrate a real identity provider, move secrets to managed configuration, persist audit events in protected append-only storage, protect administrative endpoints, and use a shared rate-limit store for multi-instance deployments.

## License

ISC
