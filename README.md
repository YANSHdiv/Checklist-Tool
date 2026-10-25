# ReleaseCheck - Release Checklist Tool

> A reliable, responsive developer release checklist management tool built for the Cactro Full-Stack Engineering assessment.

![ReleaseCheck Mockup Reference](https://public-swap.s3.us-east-1.amazonaws.com/releasecheck.png)

---

## 1. Project Overview & Features

**ReleaseCheck** streamlines release coordination for engineering teams by providing a single-page management dashboard to track releases, automate status derivation across 7 critical deployment milestones, capture notes, and manage release schedules.

### Core Capabilities
- **Single-Page Reactive Dashboard:** Seamless navigation between releases list and detail views without full-page refreshes.
- **Automated Milestone Status Derivation:** Strict server-side status calculation (`planned`, `ongoing`, `done`) derived exclusively from completed checklist steps.
- **7 Predefined Release Engineering Steps:**
  1. `pr_merged`: *All relevant GitHub pull requests have been merged*
  2. `changelog_updated`: *CHANGELOG.md files have been updated*
  3. `tests_passing`: *All tests are passing*
  4. `github_releases_created`: *Releases in Github created*
  5. `deployed_demo`: *Deployed in demo*
  6. `tested_demo`: *Tested thoroughly in demo*
  7. `deployed_production`: *Deployed in production*
- **Full Release Lifecycle Management:** Create releases, edit names and release dates, toggle individual checklist steps with immediate persistence, add additional remarks/tasks, and delete releases with an accessible confirmation dialog.
- **Strict Data Integrity:** Robust GraphQL validation preventing malformed dates, empty release names, or unapproved checklist step identifiers.
- **Responsive & Accessible Design:** Handcrafted developer-tool styling matching the official Cactro assessment mockup with visible keyboard focus indicators and ARIA semantics.

---

## 2. Technology Stack & Design Decisions

| Layer | Technology | Decision Rationale |
| :--- | :--- | :--- |
| **Framework** | Next.js 15 (App Router, React 19) | Unified full-stack TypeScript monolith providing SSR, client-side routing, and zero-latency route handlers without the operational overhead of microservices. |
| **API Layer** | Apollo Server (`@as-integrations/next`) | Native GraphQL implementation mounted at `/api/graphql` with strict schema validation, strongly typed operations, and clean error sanitization. |
| **Database & ORM**| PostgreSQL & Prisma ORM | Enterprise ACID persistence. Completed step IDs are stored natively as a PostgreSQL string array (`text[]`), eliminating table joins while preserving referential integrity. |
| **Styling** | Tailwind CSS | Lightweight, utility-first styling faithfully implementing the cards, tables, badges, and controls from the official mockup. |
| **Containerization**| Docker & Docker Compose | Multi-stage production container with isolated Alpine runner and health-checked local PostgreSQL 16 container. |
| **Testing** | Vitest | High-speed ESM testing covering status calculations, schema execution, and mutation error handling. |
| **Benchmarking** | Custom Node.js Stress Suite | Concurrent virtual user load test measuring throughput, error rates, and p50/p95/p99 latency percentiles. |
| **Production Host**| Vercel & Hosted PostgreSQL (Neon) | Serverless edge execution with managed PostgreSQL pooling. |

### Architectural Trade-offs
1. **Single-User Architecture:** Avoids unnecessary session or authentication overhead, keeping the tool focused strictly on release tracking functionality as specified in the test requirements.
2. **Predefined Shared Steps:** Consistent checklist steps across all releases ensure standard engineering hygiene and predictable status derivation.
3. **Derived Status vs. Persisted Status:** Status is dynamically computed in the backend from `completedSteps` and cannot be manually overwritten, ensuring zero status drift or corrupted state.
4. **PostgreSQL Native Array (`text[]`):** Storing completed step IDs in a PostgreSQL native array avoids an extraneous junction table, reducing query latency while remaining fully queryable and indexable.

---

## 3. Architecture & Request Flow

```mermaid
flowchart LR
    Client["Browser (Next.js Client Components)"] -->|GraphQL Queries & Mutations| Route["Next.js Route Handler (/api/graphql)"]
    Route --> Apollo["Apollo Server"]
    Apollo --> Resolvers["GraphQL Resolvers & Validators"]
    Resolvers --> StatusLogic["Status Calculator (calculateReleaseStatus)"]
    Resolvers --> Prisma["Prisma Client Singleton"]
    Prisma --> Postgres[("PostgreSQL Database")]
```

1. **Client Interaction:** User triggers a view, creation, checklist toggle, or deletion.
2. **GraphQL Communication:** Client sends a POST request with GraphQL query or mutation payload to `/api/graphql`.
3. **Validation & Execution:** Apollo Server validates arguments against the schema. Resolvers enforce business rules (non-empty name, valid ISO date, valid step IDs).
4. **Persistence:** Prisma executes transactions against PostgreSQL.
5. **Dynamic Formatting:** The backend computes the derived status (`planned` / `ongoing` / `done`) and maps the 7 predefined steps before returning the updated entity.

---

## 4. Database Schema

### Table: `Release`
Defined in `prisma/schema.prisma`:

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY`, default `uuid()` | Stable unique release identifier |
| `name` | `TEXT` | `NOT NULL` | Release display name (e.g. `Version 1.0.1`) |
| `date` | `TIMESTAMP(3)`| `NOT NULL` | Target release date and time |
| `additionalInfo`| `TEXT` | `NULLABLE` | Optional markdown or text notes |
| `completedSteps`| `TEXT[]` | `DEFAULT ARRAY[]::TEXT[]` | Array of completed predefined step IDs |
| `createdAt` | `TIMESTAMP(3)`| `NOT NULL DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |
| `updatedAt` | `TIMESTAMP(3)`| `NOT NULL` | Automatic update timestamp |

**Indexes:**
- `Release_date_idx` on `date DESC` for optimal listing sort performance.

---

## 5. GraphQL API Reference

**Endpoint:** `/api/graphql`

### Example Query: Fetch All Releases
```graphql
query GetReleases {
  releases {
    id
    name
    date
    status
    additionalInfo
    completedSteps
    checklist {
      id
      label
      completed
    }
  }
}
```

### Example Mutation: Create Release
```graphql
mutation CreateRelease($input: CreateReleaseInput!) {
  createRelease(input: $input) {
    id
    name
    status
    completedSteps
  }
}
```
*Variables:*
```json
{
  "input": {
    "name": "Version 2.0.0",
    "date": "2026-11-01T00:00:00.000Z",
    "additionalInfo": "Major architecture overhaul",
    "completedSteps": ["pr_merged", "tests_passing"]
  }
}
```

### Example Mutation: Toggle Checklist Step
```graphql
mutation ToggleStep($id: ID!, $stepId: String!, $completed: Boolean!) {
  toggleReleaseStep(id: $id, stepId: $stepId, completed: $completed) {
    id
    status
    completedSteps
  }
}
```

### Example Mutation: Delete Release
```graphql
mutation DeleteRelease($id: ID!) {
  deleteRelease(id: $id)
}
```

---

## 6. Environment Variables

Create a `.env` file based on `.env.example`:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://postgres:postgres@localhost:5438/checklist?schema=public"

# Application server port
PORT=3000

# Environment mode
NODE_ENV=production
```

---

## 7. Local Development & Docker Setup

### Option A: Running with Docker Compose (Recommended)
Spins up both the PostgreSQL database and the Next.js production container:

```bash
# 1. Start all services
docker compose up -d

# 2. Apply database migrations
docker compose exec app npx prisma migrate deploy

# 3. Seed demonstration data (matching mockup)
docker compose exec app npm run prisma:seed

# 4. Open in browser:
# http://localhost:3000
```

### Option B: Local Node.js Development
```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL via Docker Compose
docker compose up -d postgres

# 3. Apply Prisma migrations
npx prisma migrate deploy

# 4. (Optional) Seed mock data
npm run prisma:seed

# 5. Start dev server
npm run dev
```

---

## 8. Automated Testing

Run the Vitest test suite covering status calculation rules, step validation, and GraphQL resolver operations:

```bash
npm run test
```

### Test Coverage Highlights:
- **Status Calculation (`tests/status.test.ts`):** 10 tests verifying 0 steps (`planned`), partial steps (`ongoing`), all 7 steps (`done`), null/undefined safety, and duplicate step handling.
- **GraphQL Resolvers (`tests/graphql.test.ts`):** 12 tests verifying queries, creation validation (empty name rejection, invalid date handling, unrecognized step ID rejection), step toggles, and deletion.

---

## 9. API Stress Test & Capacity Report

An automated benchmark script is located at `tests/load/load-test.mjs`.

### Methodology
- Target: `/api/graphql`
- Virtual User (VU) Concurrency Profile: 5 VUs, 10 VUs, 25 VUs, 50 VUs (read queries), and 10 VUs (write mutations with automated cleanup).
- Metrics captured: Throughput (RPS), Error Rate (%), Duration, Latency (avg, median p50, p95, p99, max).

### Measured Benchmark Results

| Scenario | Concurrency (VUs) | Total Requests | Throughput (RPS) | Error Rate | Latency (p50) | Latency (p95) | Latency (p99) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Read (`releases`)** | 5 VUs | 50 | **69.14 req/s** | 0.00% | 64.34 ms | 134.04 ms | 137.69 ms |
| **Read (`releases`)** | 10 VUs | 100 | **90.69 req/s** | 0.00% | 100.52 ms | 155.41 ms | 174.77 ms |
| **Read (`releases`)** | 25 VUs | 250 | **103.93 req/s** | 0.00% | 224.29 ms | 293.21 ms | 305.32 ms |
| **Read (`releases`)** | 50 VUs | 500 | **106.21 req/s** | 0.00% | 444.10 ms | 598.85 ms | 621.61 ms |
| **Write (`createRelease`)**| 10 VUs | 30 | **93.60 req/s** | 0.00% | 102.05 ms | 116.29 ms | 126.63 ms |

### Capacity Summary
- **Highest Concurrency Meeting SLA (<300ms p95, 0% error):** 25 Virtual Users (~104 req/sec).
- **First Observed Bottleneck:** Database connection pooling latency at 50 concurrent virtual users when running on a single local instance.

---

## 10. Production Deployment

### Live Deployment Information
- **GitHub Repository:** https://github.com/YANSHdiv/Checklist-Tool.git
- **Production URL:** [Pending Hosted PostgreSQL Database Configuration]
- **GraphQL Endpoint:** `[Production URL]/api/graphql`

---

## 11. Known Limitations & Future Roadmap
1. **Single-User Scope:** Designed as an internal developer tool without multi-tenant authentication or role-based access control.
2. **Fixed Predefined Steps:** Step labels are currently shared across all releases; future iterations could support customizable per-project checklists.
