# 🎓 KU Sejong Course Scheduler & Optimizer

![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=flat-square&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css)
![UI Language](https://img.shields.io/badge/UI_Language-French-FF4B4B?style=flat-square)

An interactive course scheduler and timetable optimizer designed for students (especially international and exchange students) at **Korea University - Sejong Campus**.

> ℹ️ **Note on Language & Datasets**:
> - **App Language**: The user interface of the web application is in **French**.
> - **Semester Support**: The bundled default dataset is based on **Fall 2026** course data. However, the application is semester-agnostic: you can easily import and load course datasets for **any other semester** by uploading or pasting a compatible JSON file directly on the website.

---

## 📌 Table of Contents

- [Features](#-features)
- [Multi-Semester Data Support](#-multi-semester-data-support)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Usage Guide](#-usage-guide)
- [Optimization Algorithm](#-optimization-algorithm)
- [Data Schema](#-data-schema)
- [Contributors](#-contributors)

---

## 🚀 Features

### 📅 Interactive Timetable (`ScheduleTable`)
- **Weekly Grid (Mon - Sat, Periods 1-9+)** displaying course time slots clearly.
- **Dynamic Color Coding** based on course categories (IT, Business, Korean, Others).
- **Visual Conflict Warning System** highlighting overlapping time slots in red.
- **Hover Superposition** and fast popovers showing room numbers and professor names.

### ⚡ 1-Click Automated Optimizer (`findValidCombo`)
- Algorithmic search generating **conflict-free timetable combinations** instantly.
- Smart preference handling:
  1. **3-Day Schedule Target (Monday – Wednesday)** prioritized.
  2. Fallback to **4-Day Schedule (Monday – Thursday)** and up to **4 days max (including Friday/Saturday)** if no 3-day combination is available.
  3. Automatic filter ensuring exchange student course eligibility (`EXCH_COR_YN`).

### 🔍 Course Catalog & Smart Filtering (`CourseCatalog`)
- **Instant Search** by course name, course code (`COUR_CD`), professor, or department.
- **Category Tabs**: IT, Business, Korean, Others.
- **Exchange Filter**: Toggle visibility for courses restricted to regular local students versus exchange students.
- **Preference Tags**: Automated detection for AI / Robotics / Math-heavy / Cyber Security tracks.
- **Rating System (1 to 5 Stars)** & personal notes/comments per course.

### ➕ Custom Courses & Category Customization
- **Custom Course Creator**: Manually add personal commitments or external lectures with custom time slot definitions.
- **1-Click Category Override**: Easily reclassify any course by clicking its category badge.

### ✅ Real-Time Validation Panel (`ValidationPanel`)
- Live tracking of:
  - Total selected credits (against the 12+ credits requirement).
  - Breakdown by course type.
  - Active study days per week.
  - Exchange course eligibility compliance.

---

## 🔄 Multi-Semester Data Support

Although default datasets provided in this repository are sourced from **Fall 2026**, the application supports course data from **any academic semester**.

You can load datasets for any semester directly:
1. **Directly on the web app (UI)**: Click the **"Coller JSON"** (Paste JSON) button in the top menu to paste raw course JSON copied from the KU course portal or scrapers. You can also import saved session files anytime.
2. **Via project source**: Replace `public/courses.json` with your preferred semester dataset before launching the application.

---

## 🛠️ Tech Stack

- **Frontend Framework**: React 18 (TypeScript), Vite 6
- **Styling**: Tailwind CSS, PostCSS, Autoprefixer
- **Icons**: Lucide React
- **State & Storage**: LocalStorage with automatic session persistence
- **Data Format**: JSON (Korea University Course Schema)

---

## 📁 Project Structure

```text
ku-courses/
├── app/                            # React + Vite web application
│   ├── public/
│   │   └── courses.json            # Default dataset
│   ├── src/
│   │   ├── components/
│   │   │   ├── catalog/            # CourseCatalog, CourseCard
│   │   │   ├── layout/             # Header
│   │   │   ├── modals/             # CourseDetailsModal, CustomCourseModal
│   │   │   └── schedule/           # ScheduleTable, ValidationPanel
│   │   ├── constants/              # Fallback datasets & configuration
│   │   ├── hooks/                  # useCoursesData, useScheduleValidation, useLocalStorage
│   │   ├── types/                  # TypeScript interfaces (Course, ProcessedCourse, etc.)
│   │   ├── utils/                  # courseUtils, scheduleUtils, optimizer, storage
│   │   ├── App.tsx                 # Root application component
│   │   └── main.tsx                # Entry point
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── all_sejong_fall2026.json         # Raw dataset of all KU Sejong courses
├── ai_cyber_security.json          # AI & Cyber Security department dataset
├── computer_software.json          # Computer Software engineering dataset
├── electronics_information_engineering.json
├── epitech_match_fall2026.json     # Epitech course mapping dataset
└── README.md                       # Project documentation
```

---

## 💻 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18.0.0 or higher
- `npm`, `yarn`, or `pnpm`

### Quick Start

1. **Navigate to the application directory**:
   ```bash
   cd app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open your browser at [http://localhost:5173](http://localhost:5173).

4. **Build for production**:
   ```bash
   npm run build
   ```
   To preview the production build locally:
   ```bash
   npm run preview
   ```

---

## ⚙️ Data Schema (KU JSON Format)

Each course follows the standard schema extracted from the Korea University academic system:

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

- `COUR_CD` / `COUR_CLS`: Course Code and Section Number.
- `TIME_ROOM`: Schedule & Location (e.g. `Mon(1,2) Wed(1)` = Monday periods 1–2, Wednesday period 1).
- `EXCH_COR_YN`: `X` means the course is open to exchange students.
- `LMT_YN`: `O` indicates limited class seat availability.

---

## 👥 Contributors

- **Gianni Tuero** — GitHub: [@xJundo](https://github.com/xJundo) — Email: `gianni.tuero@epitech.eu`
- **Nicolas Toro** — GitHub: [@toro-nicolas](https://github.com/toro-nicolas) — Email: `nicolas.toro@epitech.eu`
