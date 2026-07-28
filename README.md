# 🎓 KU Sejong Course Scheduler & Optimizer

![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?style=flat-square&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3-38B2AC?style=flat-square&logo=tailwind-css)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-radix--nova-000000?style=flat-square)
![Postgres](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=flat-square&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker_Compose-2_services-2496ED?style=flat-square&logo=docker)
![UI Language](https://img.shields.io/badge/UI_Language-French-FF4B4B?style=flat-square)

An interactive course scheduler and timetable optimizer for students (especially international and
exchange students) at **Korea University — Sejong Campus**, with accounts, shared community
calendars and per-course discussion threads.

> ℹ️ **Note on Language & Datasets**
> - **App language**: the user interface is in **French**.
> - **Data source**: all JSON datasets are extracted from the official Korea University course
>   portal, [sugang.korea.ac.kr](https://sugang.korea.ac.kr/).
> - **Semester support**: the bundled dataset targets **Fall 2026**, but the app is
>   semester-agnostic — import any compatible JSON from the UI.

---

## 📌 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Deployment (Docker Compose)](#-deployment-docker-compose)
- [Local development](#-local-development)
- [Environment variables](#-environment-variables)
- [Database schema](#-database-schema)
- [HTTP API](#-http-api)
- [Migrating from the JSON store](#-migrating-from-the-json-store)
- [Data schema (KU JSON format)](#-data-schema-ku-json-format)
- [Contributors](#-contributors)

---

## 🚀 Features

### 👤 Accounts & community calendars
- **Email + password sign-up**, sessions carried by an httpOnly JWT cookie (bcrypt hashing, rate
  limiting on credential endpoints).
- Any calendar you create is **published immediately** to the community list.
- **Only its owner can edit or delete it.** Everybody else can open it, share its link, or duplicate
  it into a calendar of their own.
- Every calendar has a **direct share link** (`?calendar=<uuid>`).

### 💬 Per-course discussions
- Each course inside a calendar carries its own **discussion thread** — a mini chat between the
  calendar's owner and other students.
- Any signed-in user can post. A message can be removed by **its author** or by the
  **calendar owner** acting as moderator of their own thread.
- Message counts surface on the course cards, in the timetable cells and in the community list.

### 📅 Interactive timetable
- Weekly grid (Mon–Sat, periods 1–14) with **one secondary colour per course type**
  (IT / Business / Coréen / Autre), legible in both light and dark themes.
- Visual conflict warnings for overlapping slots, plus room and professor details.

### ⚡ 1-click automated optimizer
- Conflict-free timetable search with a 3-day (Mon–Wed) target, falling back to 4 days (Mon–Thu)
  and then to 4 days including Fri/Sat.
- Filters on exchange-student eligibility (`EXCH_COR_YN`), prioritises robotics/AI and avoids
  cyber/electronics/math-heavy courses.

### 🔍 Catalog & filtering
- Instant search by name, code, professor, department or personal note.
- Category tabs, exchange-only and English-only toggles, and sorting by rating, level, code or name.
- 1-to-5-star ratings and private per-course notes.

### ➕ Custom courses & category overrides
- Add personal commitments or external lectures with custom time slots.
- Reclassify any course by clicking its category badge.

### ✅ Real-time validation panel
- Live tracking of total credits (15+ requirement), active days per week, the
  3 IT + 1 Business + 1 Coréen rule, conflicts and exchange eligibility.

### 🎨 Interface
- Fully built on **shadcn/ui** (radix-nova style) with **light and dark themes** plus a system
  option, toggled from the header.

---

## 🏗 Architecture

Two containers, one `docker-compose.yml` at the repository root:

```text
┌─────────────────────────────┐        ┌──────────────────────┐
│  app                        │        │  db                  │
│  node:22-alpine             │───────▶│  postgres:17-alpine  │
│  Express API on /api        │  5432  │  volume: db_data     │
│  + static Vite SPA build    │        │                      │
│  exposed on ${APP_PORT}     │        └──────────────────────┘
└─────────────────────────────┘
```

The `app` image is built in two stages: the first compiles the SPA with Vite, the second installs
production dependencies only and serves both `/api` and `dist/`.

```text
ku-courses/
├── docker-compose.yml              # app + postgres
├── .env.example                    # copy to .env before the first run
├── app/
│   ├── Dockerfile                  # multi-stage build
│   ├── server/                     # Express API
│   │   ├── index.js                # bootstrap, static SPA, error handling
│   │   ├── config.js               # env parsing & production guards
│   │   ├── db.js                   # pg pool, schema, legacy import
│   │   ├── auth.js                 # bcrypt, JWT cookie, rate limiting
│   │   └── routes/{auth,calendars}.js
│   ├── public/courses.json         # default Fall 2026 dataset
│   └── src/                        # React 18 + TypeScript SPA
│       ├── components/ui/          # shadcn/ui primitives
│       ├── components/{auth,catalog,common,dialogs,discussion,layout,schedule}/
│       ├── context/AuthContext.tsx
│       ├── hooks/                  # useCoursesData, useCalendarDiscussions, …
│       ├── lib/api.ts              # typed API client
│       └── index.css               # theme tokens + per-category colours
└── *.json                          # raw KU Sejong datasets
```

---

## 🐳 Deployment (Docker Compose)

```bash
# 1. Configure secrets
cp .env.example .env
# Fill POSTGRES_PASSWORD and JWT_SECRET:
#   openssl rand -base64 24   # POSTGRES_PASSWORD
#   openssl rand -hex 32      # JWT_SECRET

# 2. Build and start
docker compose up -d --build

# 3. Check
curl http://localhost:3000/api/health   # {"ok":true,"database":"up"}
```

The schema is created (and the legacy JSON store imported, if present) automatically on startup —
there is no separate migration step.

Behind an HTTPS reverse proxy on the VPS, set `COOKIE_SECURE=true` and `TRUST_PROXY=1` in `.env`,
then `docker compose up -d`.

Useful commands:

```bash
docker compose logs -f app        # follow application logs
docker compose up -d --build app  # redeploy after a code change
docker compose down               # stop (keeps the database volume)
docker compose down -v            # stop and DELETE all data
```

---

## 💻 Local development

Two terminals, no Docker required for the frontend:

```bash
cd app
npm install

# Terminal 1 — API (needs a reachable Postgres; `docker compose up -d db` is enough)
DATABASE_URL=postgres://ku:<password>@localhost:5432/ku_scheduler npm run dev:server

# Terminal 2 — Vite dev server, proxies /api to localhost:3000
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Other scripts: `npm run build`, `npm run typecheck`, `npm run preview`, `npm start`.

To add a shadcn component: `npx shadcn@latest add <component>`.

---

## ⚙️ Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `POSTGRES_USER` | no | `ku` | Postgres role. |
| `POSTGRES_DB` | no | `ku_scheduler` | Database name. |
| `POSTGRES_PASSWORD` | **yes** | — | Postgres password. Compose refuses to start without it. |
| `APP_PORT` | no | `3000` | Host port mapped to the app container. |
| `JWT_SECRET` | **yes** in production | random in dev | Signs session cookies. Changing it logs everyone out. |
| `SESSION_TTL_SECONDS` | no | `2592000` (30 d) | Session lifetime. |
| `COOKIE_NAME` | no | `ku_session` | Session cookie name. |
| `COOKIE_SECURE` | no | `false` | Set to `true` once served over HTTPS. |
| `TRUST_PROXY` | no | `0` | Number of reverse proxies in front of the app. |
| `DATABASE_URL` | no | local default | Full connection string (set by compose). |

---

## 🗄 Database schema

| Table | Purpose |
| --- | --- |
| `users` | `id`, `email` (unique), `password_hash` (bcrypt), `display_name`, `created_at`. |
| `calendars` | Owned by a user (`owner_id`, nullable for legacy imports). Holds `selected_course_keys`, `category_overrides`, `ratings`, `notes` and `custom_courses` as `jsonb`, plus `total_credits`. |
| `course_comments` | One row per discussion message: `calendar_id`, `course_key`, `author_id`, `author_name`, `body`, `created_at`. |

Deleting a user cascades to their calendars; deleting a calendar cascades to its discussions.

---

## 🔌 HTTP API

All endpoints are under `/api` and return JSON. Errors use `{ "error": "message in French" }`.

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/health` | — | Liveness + database check. |
| `POST` | `/api/auth/register` | — | Create an account and open a session. |
| `POST` | `/api/auth/login` | — | Open a session. |
| `POST` | `/api/auth/logout` | — | Clear the session cookie. |
| `GET` | `/api/auth/me` | — | Current user, or `null`. |
| `PATCH` | `/api/auth/me` | ✅ | Rename the account (propagates to owned calendars). |
| `GET` | `/api/calendars` | — | Public list of calendar summaries. |
| `GET` | `/api/calendars/:id` | — | Full calendar. |
| `POST` | `/api/calendars` | ✅ | Create and publish a calendar. |
| `PATCH` | `/api/calendars/:id` | owner | Update a calendar. |
| `DELETE` | `/api/calendars/:id` | owner | Delete a calendar and its discussions. |
| `GET` | `/api/calendars/:id/comments` | — | All threads, grouped by course key. |
| `POST` | `/api/calendars/:id/comments` | ✅ | Post a message on one course. |
| `DELETE` | `/api/calendars/:id/comments/:commentId` | author or calendar owner | Delete a message. |

---

## 🔄 Migrating from the JSON store

Earlier versions stored calendars in `app/data/calendars.json`. That file is bind-mounted read-only
into the container and imported **once**, on the first startup where the `calendars` table is empty.

Imported calendars have no owner, so they are visible and duplicable by everyone but editable by
nobody. Re-publish them from an account if you want to keep editing them, then remove
`app/data/calendars.json`.

---

## 📄 Data schema (KU JSON format)

```json
{
  "COUR_CD": "COSE211",
  "COUR_CLS": "01",
  "COUR_NM": "Database System",
  "CREDIT": "3(3)",
  "PROF_NM": "Hong Gildong",
  "DEPARTMENT": "Computer Software Engineering",
  "TIME_ROOM": "Mon(1,2) Wed(1) Sci101",
  "EXCH_COR_YN": "X",
  "LMT_YN": "O",
  "MOOC_YN": "N"
}
```

- `COUR_CD` / `COUR_CLS`: course code and section number.
- `TIME_ROOM`: schedule and location (`Mon(1,2) Wed(1)` = Monday periods 1–2, Wednesday period 1).
- `EXCH_COR_YN`: `X` means the course is open to exchange students.
- `LMT_YN`: `O` indicates limited seat availability.

Load a different semester either by replacing `app/public/courses.json` before building, or from the
UI via **Fichiers → Charger un catalogue / Coller du JSON**.

---

## 👥 Contributors

- **Gianni Tuero** — GitHub: [@xJundo](https://github.com/xJundo) — `gianni.tuero@epitech.eu`
- **Nicolas Toro** — GitHub: [@toro-nicolas](https://github.com/toro-nicolas) — `nicolas.toro@epitech.eu`
