# PRD — RedPulse (Blood Bank & Donor Locator)

## Original Problem Statement
Build a complete, professional Blood Bank & Donor Locator web app for a B.Tech
Computer Science backend project. The system must connect donors and
recipients, honour red-blood-cell compatibility, use Haversine distance
filtering, provide donor / recipient / admin roles, expose REST APIs, work
with MySQL, ship with seed data, a map view, notification architecture, and
demonstrable end-to-end flows.

## Architecture (as implemented, Feb 2026)
- **Frontend** — React 19 (CRA) + Tailwind + Leaflet + sonner. Located at
  `/app/frontend`.
- **Backend** — Node.js 20 + Express 4 + JWT + bcryptjs. Located at
  `/app/server`. Runs on port 8002.
- **Database** — MariaDB 10.11 (MySQL-wire compatible) with 8 relational
  tables, foreign keys, indexes, enums.
- **Emergent proxy** — Because supervisor is locked to `uvicorn server:app`,
  `/app/backend/server.py` is an ASGI reverse-proxy that boots MariaDB + Node
  and forwards `/api/*` to `127.0.0.1:8002`.

## User Personas
1. **Donor** — Wants to know when their blood is urgently needed nearby and
   respond quickly.
2. **Recipient / Hospital Coordinator** — Needs to broadcast an urgent
   request and see matched, verified, available donors on a map.
3. **Admin** — Verifies donor authenticity, manages users and blood banks,
   monitors live request/donation activity.

## Core Requirements (locked)
- Registration / login with JWT + bcrypt, role-based authorization
- Donor profile (blood group, geo, availability, verification)
- Recipient profile (blood group, geo)
- Blood request lifecycle: pending → matched → accepted → fulfilled / cancelled
- Compatibility-aware donor matching within radius (Haversine)
- Donor accept / reject with response persistence and notifications
- Donation history with total counter and last-donation update
- Blood bank directory with location and supported groups
- Admin dashboard, user management, donor verification, seed reset
- Notification architecture with FCM mock mode when unconfigured
- Fallback map (Leaflet + OSM) when Google Maps key is missing

## What's Implemented (Feb 2026)
- [x] MySQL schema + seed script (`/app/server/database/`)
- [x] Node.js + Express modular backend under `/app/server`
- [x] All REST endpoints listed in README §8
- [x] JWT auth, bcrypt hashing, rate-limited auth endpoints
- [x] Compatibility utility + Haversine matching
- [x] Recipient request creation auto-generates donor_requests +
      notifications
- [x] Donor accept/reject flow with response propagation
- [x] Admin dashboard stats, user list, verify donor, seed reset
- [x] Notification store + FCM mock mode + config endpoint
- [x] Frontend fully wired to Node backend (nothing hardcoded)
- [x] Donor / recipient / admin dashboards + Find Donors map
- [x] Registration modal asks new users to pick Donor or Recipient
- [x] Demo credentials in `/app/memory/test_credentials.md`
- [x] Root README, schema.sql, seed.sql, database.sql wrappers
- [x] Supervisor-compatible boot via FastAPI ASGI proxy
- [x] End-to-end smoke pass: register, login, create request, respond,
      notifications, admin dashboard, unauthorized 403

## Prioritized Backlog

### P1
- Real Firebase Cloud Messaging integration when credentials supplied.
- Real Google Maps swap when API key supplied (adapter is in place).
- Recipient page: matched donors ranked view + one-tap contact.
- Automated Jest/Supertest suite in `/app/tests`.

### P2
- Extract Auth, Matching and Notification into standalone microservices.
- Blood bank inventory tracking with expiry.
- SMS fallback (Twilio) for donors offline for push.
- Basic i18n for regional deployments.

## Non-Goals (for this deliverable)
- Payments / donation drives.
- Chat between donor and recipient.
- Live location tracking of donors en-route.

## Test Credentials
See `/app/memory/test_credentials.md`.

## Change Log
- **2026-02-27** — Full rewrite of backend from initial FastAPI/Mongo scaffold
  to **Node.js + Express + MySQL** (as requested). Added ASGI reverse-proxy so
  the platform's locked supervisor config still works. Added MySQL schema +
  programmatic seed, wired frontend to Node API. Docs and demo credentials
  updated.
