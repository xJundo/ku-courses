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

### 👤 Accounts & profiles
- **Email + password sign-up**, sessions carried by an httpOnly JWT cookie (bcrypt hashing, rate
  limiting on credential endpoints).
- Every account gets a public **`@handle`**, derived from its display name and unique across the app.
- **`/profils`** lists every account (calendars published, courses rated, sign-up date) with a search
  box that accepts a name or an `@handle`.
- **`/profils/@handle`** shows one profile: the calendars you are allowed to see, and every course
  they rated — stars **and** notes, readable by everybody but editable only by their author.
- Each rating carries its **own discussion thread**, so you can reply to somebody's note the same
  way you comment a course inside a calendar. E-mail addresses are never part of a profile payload.

### 🔒 Community calendars & access control
- Each calendar is either **public** (listed for everyone, openable by link) or **restricted** to an
  explicit, editable list of profiles — picked from a searchable table of checkboxes.
- **Only its owner can edit, delete or re-share it.** Everybody with access can open it, share its
  link, or duplicate it into a calendar of their own.
- Every calendar has a **direct share link** (`?calendar=<uuid>`), which still honours its access
  list.

### 💬 Per-course discussions
- Each course inside a calendar carries its own **discussion thread** — a mini chat between the
  calendar's owner and other students. Ratings on a profile page get the same treatment.
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
- 1-to-5-star ratings and private per-course notes, **owned by your profile** rather than by the
  calendar you happen to have open. Opening someone else's calendar never touches your own ratings.
  Ratings made while signed out live in `localStorage` and are imported into the first account that
  signs in on that browser. Stars and notes are both public on your profile page, read-only for
  everybody else.

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
│   │   ├── db.js                   # pg pool, schema, migrations, legacy import
│   │   ├── auth.js                 # bcrypt, JWT cookie, rate limiting
│   │   ├── access.js               # calendar visibility predicate
│   │   ├── handles.js              # @handle generation
│   │   └── routes/{auth,calendars,ratings,users}.js
│   ├── public/courses.json         # default Fall 2026 dataset
│   └── src/                        # React 18 + TypeScript SPA
│       ├── components/ui/          # shadcn/ui primitives
│       ├── components/{auth,catalog,common,dialogs,discussion,layout,schedule}/
│       ├── context/AuthContext.tsx
│       ├── hooks/                  # useCoursesData, useMyRatings, useRouter, …
│       ├── pages/                   # ProfilesPage, ProfilePage
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
POSTGRES_HOST=localhost POSTGRES_USER=ku POSTGRES_PASSWORD=<password> POSTGRES_DB=ku_scheduler \
  npm run dev:server

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
| `POSTGRES_USER` | no | `ku` | Postgres role. Passed to both `db` and `app` as discrete fields — never concatenated into a URL, so any character in the password is safe. |
| `POSTGRES_DB` | no | `ku_scheduler` | Database name. |
| `POSTGRES_PASSWORD` | **yes** | — | Postgres password. Compose refuses to start without it. Any character is fine, including `/`, `@`, `#` from `openssl rand -base64`. |
| `APP_PORT` | no | `3000` | Host port mapped to the app container. |
| `JWT_SECRET` | **yes** in production | random in dev | Signs session cookies. Changing it logs everyone out. |
| `SESSION_TTL_SECONDS` | no | `2592000` (30 d) | Session lifetime. |
| `COOKIE_NAME` | no | `ku_session` | Session cookie name. |
| `COOKIE_SECURE` | no | `false` | Set to `true` once served over HTTPS. |
| `TRUST_PROXY` | no | `0` | Number of reverse proxies in front of the app. |
| `DATABASE_URL` | no | unset | Only for an external/managed Postgres — overrides the discrete `POSTGRES_*` fields with a full connection string. |

---

## 🗄 Database schema

| Table | Purpose |
| --- | --- |
| `users` | `id`, `email` (unique), `password_hash` (bcrypt), `display_name`, `handle` (unique, case-insensitive), `created_at`. |
| `calendars` | Owned by a user (`owner_id`, nullable for legacy imports). Holds `selected_course_keys`, `category_overrides` and `custom_courses` as `jsonb`, plus `total_credits` and `visibility` (`public` \| `restricted`). |
| `calendar_shares` | Allow-list backing `visibility = 'restricted'`: `(calendar_id, user_id)`. |
| `course_ratings` | One row per `(user_id, course_key)`: `rating` (0–5), private `note`, `updated_at`. |
| `course_comments` | One row per discussion message on a calendar's course: `calendar_id`, `course_key`, `author_id`, `author_name`, `body`, `created_at`. |
| `rating_comments` | Same, for the thread on a profile's rating: `profile_id`, `course_key`, author fields, `body`, `created_at`. |
| `schema_migrations` | Bookkeeping so one-shot data migrations run exactly once. |

Deleting a user cascades to their calendars, ratings, shares and rating threads; deleting a calendar
cascades to its discussions and its allow-list.

### Migration from calendar-scoped ratings

Ratings and notes used to live in `calendars.ratings` / `calendars.notes`, which meant everybody who
opened a calendar inherited — and could overwrite — its author's ratings. On first boot after the
upgrade, `migrate()` lifts every rating and note of an *owned* calendar into `course_ratings`,
attributed to that owner. When somebody owns several calendars touching the same course, the star and
the note are each taken from the most recent calendar that actually has one, so nothing is dropped.
The old `jsonb` columns are deliberately left in place as a safety net, and the migration is recorded
in `schema_migrations` so it never runs twice. Existing calendars become `visibility = 'public'`,
which is exactly how they behaved before.

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
| `GET` | `/api/users` | — | Profile directory. `?q=` matches a name or an `@handle`. |
| `GET` | `/api/users/:idOrHandle` | — | One profile, addressable by uuid or `@handle`. |
| `GET` | `/api/users/:id/ratings` | — | Their rated courses: star, note and message count. |
| `GET` | `/api/users/:id/comments` | — | Threads on their ratings, grouped by course key. |
| `POST` | `/api/users/:id/comments` | ✅ | Reply to one of their ratings. |
| `DELETE` | `/api/users/:id/comments/:commentId` | author or rated profile | Delete a message. |
| `GET` | `/api/ratings/me` | ✅ | Your own ratings and private notes. |
| `PUT` | `/api/ratings/me/:courseKey` | ✅ | Upsert one rating/note; empty values delete it. |
| `POST` | `/api/ratings/me/import` | ✅ | Merge `localStorage` ratings in; existing rows win. |
| `GET` | `/api/calendars` | — | Calendars visible to the caller. `?owner=<uuid>` narrows to one profile. |
| `GET` | `/api/calendars/:id` | access | Full calendar (404 when not visible to the caller). |
| `POST` | `/api/calendars` | ✅ | Create a calendar. |
| `PATCH` | `/api/calendars/:id` | owner | Update a calendar. |
| `DELETE` | `/api/calendars/:id` | owner | Delete a calendar and its discussions. |
| `GET` | `/api/calendars/:id/shares` | owner | Current visibility and allow-list. |
| `PUT` | `/api/calendars/:id/shares` | owner | Set visibility and replace the allow-list. |
| `GET` | `/api/calendars/:id/comments` | access | All threads, grouped by course key. |
| `POST` | `/api/calendars/:id/comments` | ✅ + access | Post a message on one course. |
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
