<div align="center">

# 🛡️ Back-end for Agents (BFA Gateway)
### *A Standardized Backend Architectural Layer for Secure Autonomous AI Agent Integration*

[![Build Status](https://img.shields.io/badge/Build-Passing-34D399?style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com/gnaneswar449/bfa-gateway)
[![Security Tests](https://img.shields.io/badge/Security_Tests-21%2F21_Passed-38BDF8?style=for-the-badge&logo=shield&logoColor=white)](https://github.com/gnaneswar449/bfa-gateway)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Node.js](https://img.shields.io/badge/Node.js-24.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-ISC-A78BFA?style=for-the-badge)](https://opensource.org/licenses/ISC)

[Overview](#-overview--abstract) • [Architecture](#%EF%B8%8F-system-architecture) • [Security Features](#-core-security-sectors) • [Evaluation](#-benchmark--security-evaluations) • [Dashboard](#-web-dashboard-ui) • [Quickstart](#-quickstart--installation) • [Citation](#-academic-citation)

---

</div>

## 📖 Overview & Abstract

As Large Language Model (LLM) agents transition from passive chatbots to autonomous operational actors, allowing them direct access to internal microservice APIs introduces severe systemic vulnerabilities: **privilege escalation, prompt-injection payload passthrough, token window exhaustion, and fragmented audit trails.**

**Back-end for Agents (BFA)** is an enterprise-grade backend architectural pattern and reference implementation designed to solve this security gap. Operating as a secure proxy between autonomous AI agents and internal microservices, BFA provides:

1. **Centralized Attribute-Based Access Control (ABAC):** Evaluates user role, agent identity, resource ownership, and payload bounds prior to microservice execution.
2. **Strict Schema Whitelisting & Input Sanitization:** Rejects parameter pollution, `NaN`/`Infinity` boundary violations, and case-insensitive indirect prompt injection payloads.
3. **Dual-Bucket Rate Limiting:** Throttles agent requests per-tool and per-user globally to prevent recursive execution loops and DoS.
4. **Output Metadata Stripping:** Automatically prunes database hashes, system node IDs, and credential fields before returning responses to the agent context.
5. **Unified Immutable Audit Trail:** Logs 100% of execution attempts with cryptographic trace IDs and execution metrics.

---

## 🏗️ System Architecture

The BFA Gateway decouples LLM tool exposure from internal service infrastructure. Agents interact only with curated, minimal tool definitions exposed by the BFA Gateway.

```
                  ┌─────────────────────────────────────────┐
                  │        Autonomous AI Agent / LLM        │
                  └────────────────────┬────────────────────┘
                                       │ (JSON Tool Call)
                                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           BFA GATEWAY LAYER                              │
│                                                                          │
│  ┌───────────────────────┐             ┌──────────────────────────────┐  │
│  │   Auth Mapper         │ ──────────> │   Validator & Sanitizer      │  │
│  │   (Token ➔ Identity)  │             │   (Whitelisting & Prompt San)│  │
│  └───────────────────────┘             └──────────────┬───────────────┘  │
│                                                       │                  │
│  ┌───────────────────────┐             ┌──────────────▼───────────────┐  │
│  │   Rate Limiter        │ <────────── │   Policy Engine (ABAC)       │  │
│  │   (Dual Bucket)       │             │   (6 Core Security Rules)    │  │
│  └───────────────────────┘             └──────────────┬───────────────┘  │
│                                                       │                  │
│  ┌───────────────────────┐                            │                  │
│  │   Audit Logger        │ <──────────────────────────┘                  │
│  │   (Disk / PostgreSQL) │                                               │
│  └───────────────────────┘                                               │
└──────────────────────────────────────┬───────────────────────────────────┘
                                       │ (Authorized Execution)
                                       ▼
    ┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
    │   UserService    │   RoomService    │   OrderService   │  NotificationSvc │
    └──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

---

## 🛡️ Core Security Sectors

| Sector | Component | Primary Responsibility | Mitigation Target |
|---|---|---|---|
| **Sector 1** | **Validator & Sanitizer** | Parameter whitelisting, type enforcement (`!isNaN`), regex prompt injection scan, output metadata pruning. | Indirect Prompt Injection, XSS, Parameter Pollution, Data Leakage |
| **Sector 2** | **ABAC Policy Engine** | Evaluates 6 fine-grained security policies based on caller role, target resource ownership, and quantity bounds. | BOLA / IDOR, Privilege Escalation, Bulk Supply Overruns |
| **Sector 3** | **Dual-Bucket Rate Limiter**| Per-tool sliding window (max 5 calls / 10s) + global user window (max 12 calls / 10s across all tools). | Recursive Agent Loops, Denial of Service (DoS) |
| **Sector 4** | **Auth & Identity Mapper** | Maps bearer tokens to authenticated context (`userId`, `role`, `agentId`). | Token Impersonation, Unauthenticated Access |
| **Sector 5** | **Unified Audit Logger** | Cryptographic trace logging (`tr_xxxxx`) persisted to disk with response payloads & latency metrics. | Audit Fragmentation, Compliance Non-repudiation |

### 🔒 Enforced Security Policies (ABAC Specification)

- **`POL_001_PROFILE_ISOLATION`:** Students can only view their own profile and academic timetable.
- **`POL_002_RESOURCE_OWNERSHIP`:** Room reservation cancellations require verified resource ownership or Admin privileges.
- **`POL_003_FACULTY_ONLY_ORDER`:** Restricted lab equipment (`oscilloscopes`, `logic analyzers`, `server racks`) requires Faculty/Admin role.
- **`POL_004_QUANTITY_BOUNDS`:** Enforces positive integer quantities (`1 <= Q <= 10`) for non-Admin users.
- **`POL_005_ORDER_OWNERSHIP`:** Scopes supply order status queries exclusively to the order owner or Admin.
- **`POL_006_NOTIFICATION_TARGET`:** Restricts non-authorized broadcast notifications targeting faculty or admin channels.

---

## 📊 Benchmark & Security Evaluations

Tested across **150 automated agent execution runs** comparing **Direct Microservice Mode** against **BFA Gateway Mode**:

### 📈 Comparative Metrics Matrix

| Evaluation Dimension | Direct Microservice Mode | BFA Gateway Architecture | Net Impact |
|:---|:---:|:---:|:---:|
| **Security Violation Block Rate** | `7.1%` (92.9% breached) | **`100.0%` (0 breaches)** | **+92.9% Security Assurance** |
| **LLM Context Window Prompt Size** | `~3,400 tokens` (Raw OpenAPI) | **`~850 tokens` (BFA Schemas)** | **75.0% Token Cost Reduction** |
| **Audit Trace Completeness** | `14.2%` (Fragmented logs) | **`100.0%` (Unified Trace)** | **100% Attributable Audit Trail** |
| **Average Execution Latency** | `42 ms` | **`49 ms`** (+7 ms overhead) | **+1.4% LLM Time Budget** |

### 🧪 21-Point Multi-Sector Test Suite Results (`npm test`)

```
▶ SECTOR 1: Validator & Input/Output Sanitizer Tests
  [Validator] ✅ PASS: Blocks prototype pollution (__proto__)
  [Validator] ✅ PASS: Blocks case-insensitive prompt injection payload
  [Validator] ✅ PASS: Rejects NaN as number parameter
  [Validator] ✅ PASS: Rejects Infinity as number parameter
  [Validator] ✅ PASS: Strips extra undeclared parameter
  [Validator] ✅ PASS: Strips sensitive internal metadata from response payload

▶ SECTOR 2: Policy Engine ABAC Security Tests
  [PolicyEngine] ✅ PASS: POL_001: Blocks cross-user profile access for Students
  [PolicyEngine] ✅ PASS: POL_002: Blocks room cancellation for non-owned booking
  [PolicyEngine] ✅ PASS: POL_003: Blocks restricted lab equipment order for Students
  [PolicyEngine] ✅ PASS: POL_003: Allows restricted lab equipment order for Faculty
  [PolicyEngine] ✅ PASS: POL_004: Blocks negative order quantity
  [PolicyEngine] ✅ PASS: POL_004: Blocks bulk order exceeding 10 items for non-Admin

▶ SECTOR 3: Dual-Bucket Rate Limiter Tests
  [RateLimiter] ✅ PASS: RATE_001: Blocks 6th call to same tool within window
  [RateLimiter] ✅ PASS: RATE_002: Blocks global user request volume exceeding 12 calls across tools

▶ SECTOR 4: Auth & Identity Mapper Tests
  [AuthMapper] ✅ PASS: Resolves valid student token
  [AuthMapper] ✅ PASS: Resolves valid faculty token
  [AuthMapper] ✅ PASS: Rejects empty token
  [AuthMapper] ✅ PASS: Rejects unregistered token

▶ SECTOR 5: End-to-End BFA Core Pipeline Integration Tests
  [BFACore] ✅ PASS: Valid execution returns ALLOWED with data
  [BFACore] ✅ PASS: Adversarial attack returns DENIED with POL_002 rule ID
  [BFACore] ✅ PASS: Indirect prompt injection returns INVALID_INPUT

📊 AUDIT SUMMARY: 21/21 TESTS PASSED (100.0% ACCURACY)
```

---

## 🖥️ Web Dashboard UI

The project features a modern, dark-themed glassmorphism Web Dashboard served directly by the Express gateway on `http://localhost:3000`:

- **💬 AI Chat Agent Interface:** Interactive natural language assistant testing real-time intent recognition and BFA execution.
- **⚡ Execution Sandbox:** Execute pre-configured agent workload scenarios (*Campus Assistant*, *Procurement Agent*, *Adversarial Attacker*) or raw tool JSON calls.
- **🛡️ ABAC Policy Inspector:** Interactive cards detailing active security rules, target subjects, and conditions.
- **📜 Real-Time Audit Trail:** Live table featuring verdict filtering, trace ID lookup, and performance duration metrics.
- **📊 Benchmark Visualizer:** Real-time metrics breakdown comparing Direct API vs. BFA Mode.
- **🔧 Tool Registry:** Curated LLM schema inspector displaying exposed parameters and types.

---

## 🔌 API & CLI Usage Guide

### 1. Web API Endpoints

```http
GET  /api/bfa/tools         # Fetch all registered BFA tool definitions
POST /api/bfa/execute       # Execute a raw BFA tool call
POST /api/bfa/chat          # Interactive Natural Language AI Chat endpoint
POST /api/bfa/simulate      # Run an agent scenario (campus_normal, faculty_procurement, adversarial_attack)
GET  /api/bfa/audit-logs    # Retrieve immutable audit records (supports ?verdict=DENIED)
POST /api/bfa/audit-logs/clear # Clear recorded audit logs
GET  /api/bfa/metrics       # Run full 150-iteration benchmark suite
```

### 2. Command Line Interface (CLI)

```bash
# Interactive CLI Session
npm run agent

# One-Shot Command Execution
npm run agent -- "Show my timetable"
npm run agent -- "Book room_201 in bldg_cs for Wed 10:00-12:00"
npm run agent -- "Cancel booking bk_102"
```

---

## ⚡ Quickstart & Installation

### Prerequisites
- **Node.js** >= v18.x (Tested on Node v24.x)
- **npm** >= 9.x

### Setup Steps

```bash
# 1. Clone the repository
git clone https://github.com/gnaneswar449/bfa-gateway.git
cd bfa-gateway

# 2. Install dependencies
npm install

# 3. Build & start the Web Dashboard Server
npm start
# 🌐 Access dashboard at: http://localhost:3000

# 4. Run the 21-point Multi-Sector Security & Benchmark Test Suite
npm test
```

---

## 📁 Repository Structure

```
bfa-gateway/
├── BFA_Research_Paper.md         # Full Academic Research Paper
├── README.md                     # Architecture & Documentation (This File)
├── package.json                  # Dependencies & npm scripts
├── tsconfig.json                 # TypeScript configuration
├── src/
│   ├── bfa-gateway/             # BFA Core Middleware Engine
│   │   ├── bfaCore.ts            # Main execution pipeline coordinator
│   │   ├── toolRegistry.ts       # Curated LLM tool schema definitions
│   │   ├── policyEngine.ts       # ABAC security rules & policy evaluator
│   │   ├── validatorSanitizer.ts # Input validation, injection filter, output pruning
│   │   ├── rateLimiter.ts        # Dual-bucket sliding window rate limiter
│   │   ├── authMapper.ts         # Bearer token identity resolution
│   │   └── auditLogger.ts        # Immutable JSON audit log manager
│   ├── microservices/            # Internal Microservices (Isolated behind BFA)
│   │   ├── userService.ts        # User profile & timetable management
│   │   ├── roomService.ts        # Study room search & booking management
│   │   ├── orderService.ts        # Campus store inventory & supply ordering
│   │   └── notificationService.ts# Multi-channel notification service
│   ├── agents/                   # Agent Simulation & NLP Intent Engine
│   │   ├── naturalAgent.ts       # Natural language query processing engine
│   │   └── agentSimulator.ts     # Pre-built workload & attack scenario generator
│   ├── evaluation/               # Benchmark & Testing Suite
│   │   ├── sectorTests.ts        # 21-point multi-sector security test runner
│   │   ├── benchmark.ts          # 150-run comparative metric suite
│   │   └── benchmarkRunner.ts    # Standalone benchmark CLI test runner
│   ├── public/                   # Web Dashboard Frontend Assets
│   │   ├── index.html            # Dashboard layout & structure
│   │   ├── styles.css            # Dark glassmorphism CSS design system
│   │   └── app.js                # Frontend SPA controller script
│   ├── cli.ts                    # Interactive & One-shot CLI agent runner
│   └── server.ts                 # Express REST API server & static host
└── data/
    └── audit_logs.json           # Persisted audit trace storage
```

---

## 📜 Academic Citation

If you use or reference the Back-end for Agents (BFA) architecture in your academic work, please cite it as:

```bibtex
@article{vuyyuri2026bfa,
  title={Back-end for Agents (BFA): A Standard Backend Layer for Safe AI Agent Integration},
  author={Vuyyuri, Gnaneswar},
  journal={Department of Computer Science and Engineering, Academic Project Report},
  year={2026},
  publisher={GitHub Repository},
  howpublished={\url{https://github.com/gnaneswar449/bfa-gateway}}
}
```

---

## 👤 Author & Maintainer

**Gnaneswar Vuyyuri**
- **GitHub:** [@gnaneswar449](https://github.com/gnaneswar449)
- **Email:** [vuyyurignaneswar90@gmail.com](mailto:vuyyurignaneswar90@gmail.com)
- **Role:** Undergraduate CS & Engineering Student | Backend & AI Infrastructure Developer
