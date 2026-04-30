# 🎯 InterviewOS

> **Your AI-powered personal interview strategist — tailored to your resume, your target job, and your target company.**

InterviewOS is a production-grade, multi-agent AI platform that helps job seekers prepare for interviews with company-specific research, resume-aligned answers, salary intelligence, and a structured 7-day prep plan. It is built on **LangGraph.js**, **Next.js**, **NestJS**, **PostgreSQL + pgvector**, and **Redis + BullMQ**.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/Node-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-9.15-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)
[![LangGraph](https://img.shields.io/badge/LangGraph.js-0.2-1C3C3C)](https://github.com/langchain-ai/langgraphjs)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)](https://prisma.io)

---

## 📚 Table of Contents

- [✨ Features](#-features)
- [🧠 Why InterviewOS — and Why Not Off-the-Shelf Agent Skills?](#-why-interviewos--and-why-not-off-the-shelf-agent-skills)
- [🏛️ Architecture](#️-architecture)
- [🤖 LangGraph Agents](#-langgraph-agents)
- [🧭 User Flows](#-user-flows)
- [🗂️ Project Structure](#️-project-structure)
- [🚀 Getting Started](#-getting-started)
- [⚙️ Configuration](#️-configuration)
- [🧪 Testing](#-testing)
- [🛡️ Agent Safety Rules](#️-agent-safety-rules)
- [🤝 Contribution Guidelines](#-contribution-guidelines)
- [📜 License](#-license)

---

## ✨ Features

- 📄 **Resume Parsing** — Extract skills, experience, and impact statements from raw resume text.
- 🔍 **Job Description Analysis** — Identify hard skills, soft skills, signals, and disqualifiers.
- 🏢 **Company Research** — Live web research with citations (no hallucinated facts).
- 💰 **Salary Insights** — Range estimates with confidence levels and source URLs.
- 🩺 **Pain Point Detection** — Likely company/team pain points the role is meant to solve.
- ❓ **Interview Question Bank** — Behavioral, technical, and role-specific questions per company and seniority.
- 🎓 **Answer Coach** — STAR-structured sample answers grounded in *your* resume only.
- 🗓️ **7-Day Prep Plan** — Prioritized topics and a day-by-day study plan.
- 🧵 **Background Job Runs** — Long-running multi-agent runs orchestrated via BullMQ with live progress.
- 📊 **Per-Agent Debug Logs** — Inspect each LangGraph node's status, duration, errors, and outputs.

---

## 🧠 Why InterviewOS — and Why Not Off-the-Shelf Agent Skills?

> *"The OpenAI Assistants API, Claude Skills, and similar high-level agent abstractions are powerful — but they were the wrong tool for this job."*

I deliberately did **not** build InterviewOS on top of OpenAI Assistants/Agents SDK or Claude Skills (or similar managed agent runtimes). Here is why:

### 1. 🔒 **Provider Lock-In Was a Non-Starter**
Off-the-shelf agent skills tightly couple your application to one vendor's runtime, tool spec, and pricing tier. InterviewOS is **multi-provider by design** — OpenAI, Anthropic, Groq, and Google Gemini are interchangeable behind a single `LLMProvider` interface, with automatic fallback and retry. A single environment variable swaps providers; tomorrow's cheaper model is a one-line change.

### 2. 🧩 **The Workflow Is a Graph, Not a Conversation**
Managed "skills" frameworks model the world as a single agent + tools + memory. InterviewOS is a **directed graph of ten specialized agents** that share typed state, run in a deterministic order, and produce schema-validated outputs at every step. LangGraph.js fits this shape natively; assistant-style frameworks force you to fake it with prompts and hope.

### 3. 🧱 **Strict Output Schemas Required Code-Level Control**
Every agent output is a Zod-validated structure (`ResumeProfile`, `JDAnalysis`, `CompanyResearchReport`, …) that flows directly into Prisma. Generic "tool calling" is too loose — we need re-prompting, repair, and per-field confidence scores. Owning the loop lets us enforce the contract.

### 4. 🪵 **Observability and Debuggability Are First-Class**
Every node's start time, duration, status, error, prompt, and raw response are logged and surfaced in the UI's Agent Runs view. Hosted skills hide the runtime — when something fails at 3 AM, you need to see the actual prompt and the raw model response, not a black-box trace.

### 5. 💸 **Cost Control and Free-Tier Friendly**
Resume + company + JD analysis can easily fan out to 20+ LLM calls. We added a **Gemini Flash free model** path and a `MockLLMProvider` so contributors can develop and test without burning a single token. Hosted agent runtimes don't let you do this cleanly.

### 6. 🔁 **Background Jobs, Retries, and Idempotency**
Interview prep runs take minutes. They need a queue, retries, progress reporting, and the ability to resume. **BullMQ + Redis + LangGraph** gives that out of the box. Assistants APIs are request/response — you'd end up rebuilding a queue on top anyway.

### 7. 🧪 **Testability**
The `LLMProvider` and `SearchProvider` abstractions are mockable, so every node has a fast, deterministic unit test. Skills frameworks are hard to mock because the runtime is the framework.

### TL;DR
> Off-the-shelf agent skills optimize for **demos**. InterviewOS optimizes for **production**: typed state, schema-validated outputs, multi-provider failover, queueable runs, observable graphs, and zero vendor lock-in.

---

## 🏛️ Architecture

### High-Level System Diagram

```mermaid
flowchart TB
    subgraph Client["🖥️ Frontend — Next.js 14 (App Router)"]
        UI[Dashboard<br/>Job Targets<br/>Agent Runs<br/>Reports]
    end

    subgraph API["⚙️ Backend API — NestJS"]
        AUTH[Auth Module]
        JT[Job Targets Module]
        AR[Agent Runs Module]
        REP[Reports Module]
        SET[Settings Module]
    end

    subgraph Queue["📦 Job Queue"]
        BMQ[(BullMQ Worker)]
        RDS[(Redis)]
    end

    subgraph Agents["🧠 LangGraph.js Agent Layer"]
        WF[Interview Prep Workflow<br/>StateGraph]
        NODES[10 Agent Nodes]
        WF --> NODES
    end

    subgraph Providers["🌐 Provider Abstraction"]
        LLM[LLM Provider<br/>OpenAI · Anthropic · Groq · Gemini]
        SRCH[Search Provider<br/>Tavily · Exa · SerpAPI]
    end

    subgraph Data["💾 Data Layer"]
        PG[(PostgreSQL<br/>+ pgvector)]
        PRS[Prisma ORM]
    end

    UI -->|REST| API
    API -->|enqueue run| RDS
    RDS --> BMQ
    BMQ -->|invoke| WF
    NODES -->|generate| LLM
    NODES -->|research| SRCH
    NODES -->|persist| PRS
    PRS --> PG
    API -->|read| PRS
```

### Component Layers

```text
Frontend (Next.js)
        ↓
Backend API (NestJS)
        ↓
Agent Layer (LangGraph.js)
        ↓
Providers (LLM + Search)
        ↓
Database (PostgreSQL + pgvector)
        ↓
Queue (Redis + BullMQ)
```

---

## 🤖 LangGraph Agents

### Why LangGraph.js?

We chose **LangGraph.js** over alternatives like LangChain Agents, OpenAI Assistants, AutoGen, and CrewAI because the interview-prep problem is fundamentally a **graph-shaped, stateful, multi-step workflow** — exactly what LangGraph was designed for.

| Requirement | LangGraph Capability |
|---|---|
| 🧵 **Multi-step deterministic flow** | First-class `StateGraph` with explicit nodes and edges |
| 📦 **Shared typed state across agents** | `Annotation`-based state schema with reducers |
| 🔀 **Conditional routing** (e.g., skip salary if cached) | `addConditionalEdges` |
| ⏳ **Long-running background jobs** | Pure JS — composes naturally with BullMQ workers |
| 🔁 **Per-node retries and error isolation** | Each node is a function — wrappable with retry/backoff |
| 👁️ **Streaming progress to the UI** | Reducers + per-node hooks → live progress + node statuses |
| 👤 **Future human-in-the-loop review** | LangGraph supports interrupt/resume natively |
| 🧪 **Testable in isolation** | Nodes are plain functions; mock providers in unit tests |

### Workflow Graph

```mermaid
flowchart LR
    START([▶️ START]) --> A[🪪 intake]
    A --> B[📄 resumeParser]
    B --> C[🔍 jdAnalysis]
    C --> D[🏢 companyResearch]
    D --> E[💰 salaryResearch]
    E --> F[🩺 painPoint]
    F --> G[❓ interviewQuestion]
    G --> H[🎓 answerCoach]
    H --> I[🗓️ prepPlan]
    I --> J[✅ finalize]
    J --> END([⏹️ END])
```

### The 10 Agents

| # | Agent | Responsibility |
|---|---|---|
| 1 | **IntakeAgent** | Validate inputs, normalize the project |
| 2 | **ResumeParserAgent** | Extract structured profile from resume text |
| 3 | **JDAnalysisAgent** | Hard/soft skills, signals, disqualifiers |
| 4 | **CompanyResearchAgent** | Live web research with citations |
| 5 | **SalaryResearchAgent** | Salary range + confidence + sources |
| 6 | **PainPointAgent** | Likely team/company pain points |
| 7 | **InterviewQuestionAgent** | Tailored question bank |
| 8 | **AnswerCoachAgent** | STAR answers grounded in user's resume |
| 9 | **PrepPlanAgent** | Priority topics + 7-day plan |
| 10 | **FinalizeAgent** | Aggregate, persist, report |

### Implementation Highlights

- 📦 **Workflow Definition** — [packages/agents/src/workflows/interview-prep.workflow.ts](packages/agents/src/workflows/interview-prep.workflow.ts)
- 🧬 **Shared State (Annotation + Reducers)** — [packages/agents/src/state/](packages/agents/src/state/)
- 🧱 **Per-Node Implementations** — [packages/agents/src/nodes/](packages/agents/src/nodes/)
- 🔌 **Provider Abstractions** — [packages/agents/src/providers/](packages/agents/src/providers/)
- 📝 **Prompts** — [prompts/agents/](prompts/agents/) and [prompts/system/](prompts/system/)

Each node is wrapped in `createSafeWorkflowNode` which adds:
- ⏱️ Per-node timing and status reporting
- 🛟 Graceful failure (errors do not crash the run)
- 📊 Live progress percentage (10% → 100%) streamed back to BullMQ
- 🪵 Structured logging of inputs, outputs, and errors

---

## 🧭 User Flows

### Flow 1 — Create a Job Target & Run Agents

```mermaid
sequenceDiagram
    actor U as 👤 User
    participant W as 🖥️ Web (Next.js)
    participant A as ⚙️ API (NestJS)
    participant DB as 💾 Postgres
    participant Q as 📦 BullMQ
    participant G as 🧠 LangGraph Workflow
    participant L as 🌐 LLM/Search Providers

    U->>W: Paste resume + JD + target company
    W->>A: POST /job-targets
    A->>DB: Create JobTarget (status=pending)
    A->>Q: enqueue("interview-prep", jobTargetId)
    A-->>W: 201 { jobTargetId }
    W-->>U: Redirect → /agent-runs/[id]

    Q->>G: invoke(InterviewPrepState)
    loop For each of 10 agents
        G->>L: prompt + (optional) web search
        L-->>G: structured response
        G->>DB: persist node output
        G->>A: progress + node status
        A-->>W: SSE / poll → live UI update
    end
    G->>DB: status=completed
    W-->>U: Final report rendered
```

### Flow 2 — Review the Final Report

```mermaid
flowchart LR
    U[👤 User] --> D[📊 Dashboard]
    D --> JT[📁 Job Target page]
    JT --> R1[📄 Resume Match]
    JT --> R2[🏢 Company Report]
    JT --> R3[💰 Salary Insight]
    JT --> R4[❓ Question Bank]
    JT --> R5[🎓 Answer Guides]
    JT --> R6[🗓️ 7-Day Prep Plan]
    JT --> AR[🧪 Agent Run Debug View]
    AR --> NL[🪵 Per-node logs<br/>prompts · responses · errors]
```

### Flow 3 — Configure LLM Providers

```mermaid
flowchart LR
    U[👤 User] --> S[⚙️ Settings page]
    S --> K1[🔑 OpenAI key]
    S --> K2[🔑 Anthropic key]
    S --> K3[🔑 Groq key]
    S --> K4[🔑 Gemini key — free tier]
    S --> SP[🔍 Tavily / Exa / SerpAPI]
    S --> SAVE[💾 Persist in app_settings]
    SAVE --> RUN[▶️ Subsequent runs use new providers]
```

---

## 🗂️ Project Structure

```text
InterviewOS/
├── apps/
│   ├── web/              # Next.js 14 frontend (App Router + Tailwind)
│   └── api/              # NestJS backend (auth, job-targets, agent-runs, reports, settings)
├── packages/
│   ├── agents/           # LangGraph.js workflow + nodes + providers + prompts
│   │   └── src/
│   │       ├── nodes/        # The 10 agent implementations
│   │       ├── workflows/    # StateGraph definition
│   │       ├── state/        # Typed shared state + reducers
│   │       ├── providers/    # LLM + Search abstractions
│   │       ├── prompts/      # Prompt loader
│   │       └── queue/        # BullMQ worker glue
│   ├── database/         # Prisma schema + client
│   └── shared/           # Zod schemas + shared types
├── prompts/
│   ├── agents/           # Per-agent prompts (versioned, file-based)
│   └── system/           # System-level prompt fragments
├── docker/               # Postgres init scripts
├── scripts/              # Dev scripts (e.g. create-test-user)
├── docker-compose.yml    # Postgres (pgvector) + Redis
├── pnpm-workspace.yaml
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- 🟢 **Node.js** ≥ 20
- 📦 **pnpm** ≥ 9
- 🐳 **Docker** + Docker Compose (for Postgres and Redis)
- 🔑 At least one LLM provider key (Gemini Flash has a free tier)

### 1. Clone & Install

```bash
git clone https://github.com/<your-org>/InterviewOS.git
cd InterviewOS
pnpm install
```

### 2. Start Infrastructure

```bash
docker compose up -d         # Postgres (pgvector) + Redis
```

### 3. Configure Environment

Copy `.env.example` files in `apps/api`, `apps/web`, and `packages/database` to `.env` and fill in:

```env
DATABASE_URL=postgresql://interviewos:interviewos@localhost:5432/interviewos
REDIS_URL=redis://localhost:6379

OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=...

TAVILY_API_KEY=tvly-...
```

### 4. Migrate the Database

```bash
pnpm --filter @interviewos/database prisma migrate dev
pnpm tsx scripts/create-test-user.ts
```

### 5. Run Everything

```bash
pnpm dev   # runs web + api + agents in parallel
```

- 🌐 Web: <http://localhost:3000>
- 🛠️ API: <http://localhost:3001>

---

## ⚙️ Configuration

LLM and search provider keys can be set either via `.env` (for development) or via the in-app **Settings** page (persisted in `app_settings`). Settings page entries override env vars at runtime.

Supported providers out of the box:

| Type | Providers |
|---|---|
| 🧠 LLM | OpenAI · Anthropic · Groq · Google Gemini (Flash free tier) · Mock |
| 🔎 Search | Tavily · Exa · SerpAPI · Mock |

A `FallbackLLMProvider` and `RetryingLLMProvider` are composed automatically — if the primary provider fails or rate-limits, the next one is tried with exponential backoff.

---

## 🧪 Testing

```bash
pnpm test                                    # all packages
pnpm --filter @interviewos/agents test       # agent unit tests
```

Every agent node ships with a unit test that uses `MockLLMProvider` and `MockSearchProvider`, so the entire workflow can run end-to-end with **zero API calls and zero cost**.

---

## 🛡️ Agent Safety Rules

These are enforced by prompts, schemas, and tests across every agent:

- 🚫 Never invent company facts.
- 🚫 Never invent salary data.
- 📚 Use citations for all research-based claims.
- 🧾 Clearly separate facts, estimates, and assumptions.
- 📄 Resume-based answers must use only user-provided resume details.
- ❌ Never promise interview success.
- ❌ Never provide discriminatory advice.
- 🔐 Do not store unnecessary sensitive information.
- ✅ Every agent output must follow a Zod schema.
- 🌐 Every external research output must include source URLs.
- ⚠️ If confidence is low, mark it as **low confidence**.

---

## 🤝 Contribution Guidelines

We welcome contributions! 🎉

### 🧭 Ground Rules
1. **Be respectful.** This project follows a standard contributor code of conduct — be kind, be helpful.
2. **Open an issue first** for anything larger than a small fix. It saves wasted work.
3. **Keep PRs focused.** One concern per PR. Small, reviewable diffs > sprawling rewrites.

### 🛠️ Development Workflow
1. **Fork** the repo and create a feature branch:
   ```bash
   git checkout -b feat/your-feature
   ```
2. **Install + bootstrap** with `pnpm install` and `docker compose up -d`.
3. **Run the full pipeline** locally before opening a PR:
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   pnpm build
   ```
4. **Write a test** for any new node, provider, or schema. New agent nodes must include at least one unit test using mock providers.
5. **Update prompts in `/prompts`** — never hard-code prompts inside `.ts` files.
6. **Update the Zod schema in `packages/shared`** if you change an agent's output shape.

### 📐 Code Style
- 🟦 **TypeScript strict mode**, no `any`.
- 🪵 **Structured logging only** — no stray `console.log`.
- 🔌 **Provider interfaces stay abstract** — never import `openai`/`anthropic` SDKs directly inside a node.
- 🧪 **Dependency injection** — nodes receive their providers as parameters, not via global imports.
- 🌱 **No hard-coded API keys.** Ever. Use `.env` and `app_settings`.
- 🧹 **Prefer small, focused commits** with conventional-commit-style messages (`feat:`, `fix:`, `chore:`, `docs:`).

### 🧩 Adding a New Agent Node
1. Create the prompt in `prompts/agents/<your-agent>.md`.
2. Create the Zod schema in `packages/shared/src/schemas/`.
3. Implement the node in `packages/agents/src/nodes/<your-agent>.node.ts`.
4. Register it in `packages/agents/src/nodes/index.ts` and add it to the workflow graph in `packages/agents/src/workflows/interview-prep.workflow.ts`.
5. Write a unit test in `packages/agents/src/nodes/__tests__/`.
6. Update the Prisma schema if the output needs to be persisted.
7. Update this README's agent table. ✍️

### 🚦 Pull Request Checklist
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] New behavior is covered by tests
- [ ] Prompts live in `/prompts`, schemas in `packages/shared`
- [ ] No new vendor SDK imports outside `packages/agents/src/providers`
- [ ] Docs/README updated where relevant
- [ ] PR description explains the **why**, not just the **what**

### 🐛 Reporting Bugs
Please include:
- Reproduction steps
- Expected vs. actual behavior
- The affected agent run ID (so we can pull node-level logs)
- Provider used (OpenAI / Anthropic / Groq / Gemini / Mock)

### 💡 Feature Requests
Open a GitHub issue tagged `enhancement` and describe the user problem first, the proposed solution second.

---

## 📜 License

[MIT](./LICENSE) © 2026 Shadab

---

> Built with ❤️ for every job seeker who deserves a personal interview coach — not a generic chatbot.
