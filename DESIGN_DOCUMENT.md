# ApplyTrack System Design Document

This document outlines the architecture, design choices, user stories, personas, wireframes, and accessibility patterns for ApplyTrack — a full-stack job application tracking system for students.

---

## 1. Description

ApplyTrack is a full-stack web application that centralizes every stage of a student's job search into one organized system. It replaces fragmented spreadsheets and memory with a structured three-module platform: a **Pipeline** for tracking application statuses, an **Interviews** tracker for managing prep notes and round outcomes, and a **Networking** CRM for logging recruiter contacts and follow-ups.

### Design Philosophy

- **Data-Dense but Scannable**: The dashboard surfaces the most important information — company, role, status, salary, date — at a glance without requiring the user to click into individual records.
- **Dark-First**: The entire application uses a dark color palette (`#0d0f14` background, `#161b22` surfaces) consistent with the tools developers already live in (VS Code, GitHub, Linear).
- **Bootstrap-Backed, Token-Driven**: Bootstrap 5 provides the structural grid and component baseline; custom CSS design tokens (`--color-primary`, `--color-bg-2`, `--color-border`) override the theme for a cohesive look across all three pages.
- **Server-Side at Scale**: Filtering, sorting, searching, and pagination are all handled by the MongoDB backend so the app remains fast even with 1000+ records per collection.
- **No Bundler Complexity**: The frontend is served as plain HTML + ES module scripts — no Webpack, no build step, no compilation required.

---

## 2. User Stories

### Job-Seeking Student

- **Story**: As a student, I want to add a job application with its company, role, status, salary, and link so that I have a single place to track everything I've applied to.
- **Story**: As a student, I want to filter my pipeline by status (Applied, Phone Screen, Final Round, etc.) so that I can quickly see where each application stands.
- **Story**: As a student, I want to sort my applications by Applied Date or Company so that I can review them in the order that matters to me.
- **Story**: As a student, I want to search my applications by company or role so that I can quickly find a specific entry without scrolling.
- **Story**: As a student, I want to see my response rate metric on the dashboard so that I can gauge how effective my applications are.
- **Story**: As a student, I want to add prep notes to each interview round so that I can consolidate my study materials alongside my tracking.
- **Story**: As a student, I want to log recruiter contacts with follow-up dates so that I never miss a networking follow-up.

### Career Advisor / Professor

- **Story**: As a career advisor, I want students to be able to demonstrate a complete record of their job search activity so that I can give targeted advice on where they are applying.
- **Story**: As a professor grading the project, I want to see server-side pagination, sorting, and filtering so that I can confirm the application handles real-world data volumes correctly.
- **Story**: As a professor, I want to see consistent, accessible UI patterns across all pages so that the project demonstrates mastery of responsive web design.

### Power User (Graduate Student with 100+ Applications)

- **Story**: As a graduate student managing a large search, I want paginated results (20 per page) so that the page loads quickly even with hundreds of records.
- **Story**: As a power user, I want to link networking contacts directly to applications from the Pipeline so that I can see at a glance which companies I have an inside connection at.
- **Story**: As a power user, I want the networking stats bar to always reflect my full contact count — not just the current page — so that my total and overdue follow-up numbers are always accurate.

---

## 3. User Personas

### Persona 1: Priya Sharma, CS Graduate Student

- **Background**: MSCS student at Northeastern University, Boston. Applying to 80+ software engineering roles across fintech, big tech, and startups simultaneously.
- **Goals**: Track every application status in real time, know which rounds she has upcoming, and never let a recruiter follow-up fall through the cracks.
- **Frustrations**: Spreadsheets go stale, don't send reminders, and don't link prep notes to specific rounds. LinkedIn doesn't show her full pipeline at a glance.
- **Need**: A fast, searchable dashboard that shows status at a glance, surfaces overdue follow-ups, and keeps interview prep notes organized by round.

### Persona 2: James Nguyen, First-Generation Undergrad

- **Background**: Computer Science senior applying for his first full-time job. Less experienced with professional networking; only has 10–15 applications active at a time.
- **Goals**: Keep track of which companies he has applied to, avoid applying to the same company twice, and remember what each interviewer's name was.
- **Frustrations**: Gets confused about which stage each application is in. Forgets to follow up with campus recruiters he met at career fairs.
- **Need**: Simple Add/Edit forms, clear status labels, and a contacts section where he can store recruiter names and emails.

### Persona 3: Prof. John Guerra, CS 5610 Instructor

- **Background**: Web Development course professor evaluating student projects for real-world usability, technical depth, and UI polish.
- **Goals**: Verify the project handles real data volumes (1000+ records), confirms server-side logic is used for pagination/sorting, and UI is consistent across all pages.
- **Frustrations**: Projects that load all records client-side, have inconsistent navbar heights, or use `!important` to override CSS.
- **Need**: A demonstrably scalable full-stack implementation with a clean, professional UI that works identically on all three pages.

### Persona 4: Aisha Okonkwo, University Career Coach

- **Background**: Career Services advisor who holds weekly 1-on-1s with students to review their job search progress.
- **Goals**: Help students organize their outreach, identify which companies have gone silent, and prepare for upcoming interview rounds.
- **Frustrations**: Students come in with disorganized notes or no record of who they have talked to.
- **Need**: The Networking page's follow-up date tracking and the Interviews page's prep notes panel — visible, shareable records that make advising sessions productive.

### Persona 5: Marcus Bell, Campus Recruiter at a Tech Company

- **Background**: University recruiter who speaks to dozens of students at career fairs and expects students to follow up promptly.
- **Goals**: Hire motivated, organized candidates who demonstrate professionalism.
- **Frustrations**: Candidates who can't remember the conversation they had at the career fair or forget to send a follow-up email.
- **Need**: Indirectly — students who use ApplyTrack's Networking page log his contact details, set a follow-up reminder, and link him to the application, leading to better-prepared candidates who reach out promptly.

---

## 4. Design Choices

### Color Palette

The application uses a **dark theme** throughout, consistent with developer tooling aesthetics:

| Token             | Value     | Usage                         |
| ----------------- | --------- | ----------------------------- |
| `--color-bg`      | `#0d0f14` | Page background               |
| `--color-bg-2`    | `#13161e` | Navbar, card backgrounds      |
| `--color-bg-3`    | `#1a1e28` | Hover states, active tabs     |
| `--color-border`  | `#1e2533` | All borders and dividers      |
| `--color-text`    | `#e2e8f0` | Primary text                  |
| `--color-text-2`  | `#8892a4` | Secondary / muted text        |
| `--color-primary` | `#2563eb` | Buttons, active states, links |

Status chips use distinct semantic colors:

| Status              | Color      |
| ------------------- | ---------- |
| Wishlist            | Muted grey |
| Applied             | Blue       |
| Phone Screen        | Teal       |
| Technical Interview | Purple     |
| Final Round         | Amber      |
| Offer               | Green      |
| Rejected            | Red        |
| Withdrawn           | Grey       |

### Typography

- **Primary Font**: `Inter` (loaded via Google Fonts) — clean, modern, excellent readability at small sizes
- **Base Size**: 14px — optimized for dense data tables without feeling cramped
- **Font Weights**: 400 (body), 500 (nav links), 600 (labels, badges), 700–800 (headings, brand)

### Layout

- **Bootstrap 5.3** provides the responsive grid (`container`, `row`, `col-*`) and component base (table, modal, pagination, form controls)
- **Max-width 1280px** navigation inner container, **max-width 1200px** page content — consistent across all three pages
- **Navbar height**: exactly 60px across all pages, using the same `.navbar.nav-header` + `.nav-inner` pattern
- **Sticky navbar**: `sticky-top` ensures the nav stays visible while scrolling long tables

### Component Decisions

| Component           | Approach                                                                                              | Reason                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Table               | Bootstrap `.table.table-hover` + dark overrides                                                       | Consistent with Bootstrap's dark theme                                          |
| Modals              | Custom overlay with `hidden` attribute toggle (interviews/networking), Bootstrap Modal API (pipeline) | Pipeline uses Bootstrap JS already loaded; interviews/networking keep it simple |
| Pagination          | Bootstrap `.pagination` component + custom windowed `buildPageRange()` logic                          | Reuses Bootstrap styling, custom logic for ellipsis                             |
| Filter pills        | Custom pill buttons with `filter-pill--active` class                                                  | Bootstrap tabs don't match the desired pill aesthetic                           |
| Status chips        | Custom `.status-chip` spans with per-status color classes                                             | Need 8 distinct status colors, Bootstrap badges don't cover them                |
| Badges (interviews) | Custom `.badge--blue/green/yellow/red/grey` classes                                                   | Round/Result badges need colors not in Bootstrap's palette                      |

---

## 5. Accessibility (A11y)

- **Semantic HTML**: `<main>`, `<nav>`, `<aside>` (notes panel), `<table>` with `<thead>` and `<tbody>`, `<button>` for all interactive controls
- **ARIA Sort**: Sortable column headers use `aria-sort="ascending"/"descending"/"none"` so screen readers announce sort direction
- **ARIA Labels**: Icon-only buttons (edit ✏️, delete 🗑️) have `title` attributes; modal dialogs use `aria-modal="true"` and `aria-labelledby`
- **Bootstrap Dark Theme**: `data-bs-theme="dark"` on the `<html>` element ensures Bootstrap's own components (form controls, modals, pagination) use dark variants that meet contrast requirements
- **Keyboard Navigation**: All interactive elements are `<button>` or `<a>` elements, fully keyboard-focusable and Tab-navigable
- **Color Not Alone**: Status is conveyed by both color chip and text label — no status is communicated by color alone
- **Focus Management**: Modal opens focus on the first input field; closing the modal returns focus to the triggering element

---

## 6. Architecture Overview

```
Browser
  │
  ├─ GET /  ──────────────────────────────► Express Static Middleware
  │                                         (serves frontend/index.html)
  │
  ├─ GET /pages/dashboard.html ───────────► Express Static Middleware
  │
  └─ fetch('/api/...') ───────────────────► Express API Routes
                                              │
                                    ┌─────────┴──────────┐
                                    │   Route Handlers    │
                                    │ /api/auth           │
                                    │ /api/applications   │
                                    │ /api/interviews     │
                                    │ /api/networking     │
                                    └─────────┬──────────┘
                                              │
                                        MongoDB Atlas
                                    ┌─────────────────────┐
                                    │  Collections:        │
                                    │  • users             │
                                    │  • applications      │
                                    │  • interviews        │
                                    │  • networking        │
                                    └─────────────────────┘
```

### Session Management

Authentication is intentionally lightweight for a student project: on login, the server returns `{ userId, username }` which the frontend stores in `localStorage` via `storage.js`. Every protected page calls `requireAuth()` on load — if no session exists, the user is redirected to the login page. All API requests use `credentials: 'include'` for future cookie-based auth compatibility.

### Pagination Pattern

All three collection endpoints implement the same pattern:

```
GET /api/<collection>?page=1&limit=20&sortBy=<field>&sortDir=asc|desc&search=<query>&status=<status>
```

Response shape:

```json
{
  "data": [...],
  "total": 1100,
  "page": 1,
  "limit": 20,
  "totalPages": 55
}
```

The frontend maintains `currentPage`, `sortColumn`, `sortDirection`, `searchQuery`, and `activeFilter` as state variables. Any change to one resets `currentPage = 1` and triggers a new fetch.

---

## 7. Wireframes

### Authentication Page (`index.html`)

```
┌────────────────────────────────────────┐
│         🎯 ApplyTrack                  │
│   ────────────────────────────────     │
│                                        │
│   ┌──────────────────────────────┐     │
│   │  Sign In          Register   │     │  ← Toggle tabs
│   │──────────────────────────────│     │
│   │  Email:    [______________]  │     │
│   │  Password: [______________]  │     │
│   │                              │     │
│   │       [ Sign In ]            │     │
│   └──────────────────────────────┘     │
│                                        │
└────────────────────────────────────────┘
```

### Pipeline Dashboard (`dashboard.html`)

```
┌─────────────────────────────────────────────────────┐
│  🎯 ApplyTrack  Pipeline · Interviews · Networking  │  ← Sticky navbar (60px)
├─────────────────────────────────────────────────────┤
│  [ Total ] [ Interviews ] [ Offers ] [ Rate ]        │  ← Metric cards (4-col)
├─────────────────────────────────────────────────────┤
│  [All][Wishlist][Applied][Phone Screen]...[Withdrawn]│  ← Filter tabs
│                                    [🔍 Search___] [+]│
├──────────┬──────────┬────────┬────────┬──────┬──────┤
│ Company↑ │ Role     │ Status │ Salary │ Date │ Act. │  ← Sortable headers
├──────────┼──────────┼────────┼────────┼──────┼──────┤
│ Google   │ SWE      │ ● Appl │ $150k  │ Jun 1│ ✏️🗑️ │
│ Meta     │ Intern   │ ● Offr │ $180k  │ Jun 3│ ✏️🗑️ │
│  ...     │  ...     │  ...   │  ...   │  ... │ ...  │
├──────────┴──────────┴────────┴────────┴──────┴──────┤
│  Showing 1–20 of 1100    ‹ 1  2  3 … 55 ›           │  ← Pagination
└─────────────────────────────────────────────────────┘
```

### Interview Prep Page (`interviews.html`)

```
┌─────────────────────────────────────────────────────┐
│  🎯 ApplyTrack  Pipeline · Interviews · Networking  │
├─────────────────────────────────────────────────────┤
│  Interview Prep                      [ + Add ]       │
│  [All][Upcoming][Completed][Cancelled] [🔍 Search]   │
├──────────┬──────┬──────────┬────────┬──────┬────────┤
│ Company↕ │ Role │ Round    │ Status │ Date │ Result │
├──────────┼──────┼──────────┼────────┼──────┼────────┤
│ Google   │ SWE  │ Tech 1   │ ● Upcm │Jun 10│Pending │  ← Click row →
│ Amazon   │ SDI  │ Behavrl  │ ● Comp │Jun 5 │ ● Pass │    opens side panel
│  ...                                                 │
├─────────────────────────────────────────┬───────────┤
│  Showing 1–20 of 1100   ‹ 1 2 3…55 ›   │ Prep Notes│
│                                         │ Tech: ...  │  ← Side panel
│                                         │ Behav: ... │
└─────────────────────────────────────────┴───────────┘
```

### Networking Page (`networking.html`)

```
┌─────────────────────────────────────────────────────┐
│  🎯 ApplyTrack  Pipeline · Interviews · Networking  │
├─────────────────────────────────────────────────────┤
│  [ 1,100 Contacts ] [ 47 Follow-ups Due ] [ 12 /mo ]│  ← Stat cards
├─────────────────────────────────────────────────────┤
│  [All][Recruiter][Engineer][Manager]  [🔍 Search]    │
├────────────┬─────────┬───────────┬──────┬───────────┤
│ Name↕      │ Company │ Role      │ Email│ Follow-Up │
├────────────┼─────────┼───────────┼──────┼───────────┤
│ 👤 J. Smith│ Google  │ Recruiter │ j@.. │ ⚠ Jun 1   │  ← Overdue
│ 👤 A. Lee  │ Meta    │ Engineer  │ a@.. │ Jun 20    │
│  ...                                                 │
├──────────────────────────────────────────────────────┤
│  Showing 1–20 of 1100    ‹ 1  2  3 … 55 ›           │
└──────────────────────────────────────────────────────┘
```
