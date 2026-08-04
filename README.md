# 🛡️ Back-end for Agents (BFA)
### A Standard Backend Layer for Safe AI Agent Integration

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express)](https://expressjs.com/)
[![Node.js](https://img.shields.io/badge/Node.js-24.x-339933?logo=nodedotjs)](https://nodejs.org/)

---

## 🚀 Overview

**Back-end for Agents (BFA)** is a production-grade backend architectural pattern and reference implementation that places a secure middleware layer between autonomous AI agents and internal microservices.

Instead of allowing agents to call backend APIs directly — which introduces security vulnerabilities, policy fragmentation, and poor auditability — BFA acts as a **policy-enforcing gateway** that:

- 🔒 Enforces Attribute-Based Access Control (ABAC)
- 🔧 Exposes curated, minimal tool schemas to LLMs
- 📜 Logs every execution in an immutable audit trail
- ⏱ Rate-limits agent calls to prevent loops and DoS
- 🧹 Sanitizes inputs and strips sensitive internal metadata

---

## 🏗️ Architecture

```
 Autonomous AI Agents
      │
      ▼ (JSON Tool Calls)
┌─────────────────────────────────────────────┐
│            BFA GATEWAY LAYER                │
│  ┌──────────────┐  ┌────────────────────┐   │
│  │ Tool Registry│  │  Policy Engine     │   │
│  │ (9 tools)    │  │  (ABAC/RBAC Rules) │   │
│  ├──────────────┤  ├────────────────────┤   │
│  │ Auth Mapper  │  │  Rate Limiter      │   │
│  ├──────────────┤  ├────────────────────┤   │
│  │ I/O Validator│  │  Audit Logger      │   │
│  └──────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────┘
      │ (Authorized Internal Calls)
      ▼
 User │ Room │ Order │ Notification Microservices
```

---

## 🖥️ Web Dashboard

A modern dark-themed glassmorphism dashboard provides:
- **💬 AI Chat Agent** — Natural language interface to BFA
- **⚡ Execution Sandbox** — Run agent scenarios and custom tool calls
- **🛡️ ABAC Policy Inspector** — View all active security policies
- **📜 Real-Time Audit Trail** — Filter and review every execution
- **📊 Benchmark Results** — Direct API vs BFA comparison
- **🔧 Tool Registry** — All LLM-exposed schemas

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| BFA Gateway | TypeScript + Express 5 |
| Validation | Pydantic-style TypeScript interfaces |
| Rate Limiting | In-memory sliding window token bucket |
| Audit Persistence | JSON file-based (upgradeable to PostgreSQL) |
| Build Tool | TypeScript Compiler (tsc) |
| Runtime | Node.js 24 |

---

## 📦 Setup & Usage

```bash
# 1. Install dependencies
npm install

# 2. Start the dashboard server (port 3000)
npm start
# → Open http://localhost:3000

# 3. One-shot CLI query
npm run agent -- "Show my timetable"
npm run agent -- "Book room_201 in bldg_cs for Wed 10:00-12:00"
npm run agent -- "Cancel booking bk_102"

# 4. Run full benchmark suite
npm test
```

---

## 🛡️ Security Policies (ABAC)

| Policy ID | Rule |
|---|---|
| `POL_001` | Students can only view their own profile/timetable |
| `POL_002` | Users can only cancel their own room bookings |
| `POL_003` | Lab equipment orders require Faculty role |
| `POL_004` | Max 10 items per order transaction |
| `POL_005` | Order status scoped to booking owner |
| `RATE_001` | Max 5 tool calls / 10 seconds per agent |

---

## 📊 Benchmark Results (150 Automated Runs)

| Metric | Direct API | BFA Mode |
|---|---|---|
| Security Block Rate | 7.1% | **100.0%** |
| Prompt Token Usage | ~3,400 tokens | **~850 tokens** |
| Audit Trace Completeness | 14.2% | **100.0%** |
| Avg Latency | 42 ms | **49 ms** (+7ms) |

---

## 📁 Project Structure

```
src/
├── bfa-gateway/
│   ├── toolRegistry.ts       # Tool definitions & schemas
│   ├── policyEngine.ts       # ABAC security rules
│   ├── authMapper.ts         # User identity mapping
│   ├── rateLimiter.ts        # Sliding window limiter
│   ├── validatorSanitizer.ts # Input validation & sanitization
│   ├── auditLogger.ts        # Persistent audit trail
│   └── bfaCore.ts            # Main execution pipeline
├── microservices/
│   ├── userService.ts
│   ├── roomService.ts
│   ├── orderService.ts
│   └── notificationService.ts
├── agents/
│   ├── agentSimulator.ts     # Pre-built agent scenarios
│   └── naturalAgent.ts       # NL intent recognition engine
├── evaluation/
│   ├── benchmark.ts          # Metrics comparison engine
│   └── benchmarkRunner.ts    # CLI benchmark runner
├── public/                   # Web dashboard (HTML/CSS/JS)
├── cli.ts                    # Interactive CLI agent
└── server.ts                 # Express API server
```

---

## 📖 Research Paper

The full academic research paper is included: [`BFA_Research_Paper.md`](./BFA_Research_Paper.md)

---

## 👤 Author

**Gnaneswar** — [github.com/gnaneswar449](https://github.com/gnaneswar449)

*Computer Engineering Department — Academic Research Project 2026*
