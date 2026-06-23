# ApplyTrack — Job Application Tracking System

A full-stack web application that helps students manage their job search from first wishlist to final offer — tracking applications, interview rounds, and recruiter contacts in one organized dashboard.

---

## Project Objective

The objective of ApplyTrack is to give job-seeking students a centralized, structured hub to manage every stage of their job search. It serves as:

- A live **Pipeline dashboard** to track application statuses with sorting, filtering, search, and server-side pagination across hundreds of records.
- An **Interview Prep tracker** to log every round, record technical and behavioral prep notes, and monitor outcomes.
- A **Networking CRM** to store recruiter and engineer contacts, set follow-up reminders, and link contacts directly to applications.

---

## Screenshot

![ApplyTrack Dashboard](./frontend/images/application.gif)

---

## Tech Requirements

ApplyTrack is engineered as a modern full-stack application using industry-standard technologies:

- **Runtime**: Node.js (v18+)
- **Backend Framework**: Express 5 (REST API, static file serving, SPA fallback routing)
- **Database**: MongoDB 7 (Atlas or local) — collections for `users`, `applications`, `interviews`, `networking`
- **Frontend Structure**: HTML5 (semantic, accessible markup)
- **Styling**: CSS3 with custom design tokens, Bootstrap 5.3 (grid, components, dark theme via `data-bs-theme="dark"`)
- **Scripting**: ES6+ JavaScript Modules (no bundler — native browser modules)
- **Dev Tooling**: Nodemon (hot reload), ESLint + Prettier (code quality), dotenv (environment config)

---

## Project Structure

The codebase separates concerns cleanly into a backend API layer and a static frontend:

```text
ApplyTrack/
├── backend/
│   ├── config/
│   │   └── db.js                  # MongoDB connection + singleton getter
│   ├── db/
│   │   ├── interviews.js          # CRUD helpers for interviews collection
│   │   └── networking.js          # CRUD helpers for networking collection
│   ├── routes/
│   │   ├── auth.js                # POST /api/auth/register, /api/auth/login
│   │   ├── applications.js        # Full CRUD + paginated GET with sort/filter/search
│   │   ├── interviews.js          # Full CRUD + paginated GET with sort/filter/search
│   │   └── networking.js          # Full CRUD + paginated GET with sort/filter/search + stats
│   ├── server.js                  # Express app bootstrap, CORS, static serving, routes
├── frontend/
│   ├── css/
│   │   ├── base.css               # Design tokens, shared utilities, toast, spinner
│   │   ├── auth.css               # Login / register page styles
│   │   ├── dashboard.css          # Pipeline page — nav, metrics, table, filters, pagination
│   │   ├── interviews.css         # Interviews page — nav, badges, notes panel, pagination
│   │   └── networking.css         # Networking page — nav, stat cards, contact cells, pagination
│   ├── js/
│   │   ├── auth.js                # Login / register form logic
│   │   ├── dashboard.js           # Pipeline CRUD, sort, filter, search, pagination
│   │   ├── interviews.js          # Interviews CRUD, sort, filter, search, pagination
│   │   ├── networking.js          # Contacts CRUD, sort, filter, search, pagination, stats
│   │   ├── contacts-column.js     # Injects "Contacts" column into pipeline table
│   │   └── modules/
│   │       ├── api.js             # Fetch wrappers for /api/applications endpoints
│   │       ├── storage.js         # Session persistence (localStorage), requireAuth guard
│   │       └── ui.js              # show/hide, toast, status chip, date format helpers
│   ├── pages/
│   │   ├── dashboard.html         # Pipeline page
│   │   ├── interviews.html        # Interview Prep page
│   │   └── networking.html        # Networking / Contacts page
│   └── index.html                 # Auth page (login + register)
├── .env                           # MONGODB_URI, PORT (not committed)
├── package.json
├── DESIGN_DOCUMENT.md
└── README.md
```

---

## How to Install and Use

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [Git](https://git-scm.com/)
- A MongoDB instance — [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier) or a local MongoDB installation

### Installation Steps

1. **Clone the repository**:

   ```bash
   git clone https://github.com/anurag-reddy1/ApplyTrack.git
   ```

2. **Navigate into the project directory**:

   ```bash
   cd ApplyTrack
   ```

3. **Install dependencies**:

   ```bash
   npm install
   ```

4. **Create a `.env` file** in the project root:
   ```env
   MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/applytrack
   PORT=3000
   ```

### Running Locally

#### Development Mode (with auto-reload)

```bash
npm run dev
```

#### Production Mode

```bash
npm start
```

Then open your browser and navigate to:
`http://localhost:3000`

Register a new account and you will be redirected to the Pipeline dashboard automatically.

## Features

### Pipeline (Dashboard)

- Add, edit, and delete job applications
- Filter by status: All, Wishlist, Applied, Phone Screen, Technical Interview, Final Round, Offer, Rejected, Withdrawn
- Sort by any column (Company, Role, Status, Salary, Applied Date)
- Full-text search across company and role
- Server-side pagination (20 per page) with windowed page controls
- Notes tooltip indicator (📝) inline on each row
- Response rate metric that excludes Wishlist and Withdrawn from the denominator
- **Contacts column** — link networking contacts directly to applications from the table

### Interviews

- Track every interview round with company, role, round type, date, status, and result
- Side panel for technical and behavioral prep notes per round
- Filter by status (Upcoming / Completed / Cancelled), search, and sort all columns
- Server-side pagination

### Networking

- Store recruiter and engineer contacts with email, phone, LinkedIn, and follow-up dates
- Stats bar showing total contacts, overdue follow-ups, and contacts made this month (always reflects full collection, not just current page)
- Link contacts to applications via the Pipeline Contacts column
- Filter by contact role, search, and sort all columns
- Server-side pagination

---

## GenAI Usage

- **Tool**: Claude Sonnet 4.6 (Anthropic)
- **Usage Highlights**:
  - _Bootstrap 5 Migration_: Assisted with migrating the application from scratch-built CSS to Bootstrap 5, replacing custom components with Bootstrap equivalents while maintaining custom design tokens for theming.
  - _Prompt Used_: "I basically want to use bootstrap for most of the things so that we have minimal CSS. Is this achievable?"
  - _Server-Side Pagination_: Generated the MongoDB `.find().sort().skip().limit()` + `countDocuments()` pattern for all three collections and the corresponding frontend pagination render logic.
  - _Prompt Used_: "how to implement pagination and sorting?"
  - _Bug Fixes_: Resolved issues including broken job link routing, `bootstrap is not defined` ESLint errors, hidden table empty states, and incorrect response rate calculation.
  - _Also used for_: Navbar consistency fixes across pages, adding column sorting, notes tooltip, contacts-column feature, and generating this documentation.
  - _Prompt Used_: Convert the provided images into the readme format for the Wireframes in the Design_Document.md.

---

## Authors

**Anurag Reddy Pottigari**

- **Email**: [pottigari.a@northeastern.edu](mailto:pottigari.a@northeastern.edu)
- **LinkedIn**: [linkedin.com/in/anurag-reddy-pottigari](https://www.linkedin.com/in/anurag-reddy-7140a85a)
- **GitHub**: [github.com/anurag-reddy1](https://github.com/anurag-reddy1)

**Sanjay** _(Networking & Interviews pages)_

---

## Class Link

**CS 5610 - Web Development**
Northeastern University — Khoury College of Computer Sciences
🔗 [Course Link](https://johnguerra.co/classes/webDevelopment_online_summer_2026/)

---

## Video Demonstration

🎥 [Watch the demo video](https://youtu.be/rswyWj3NTU0)

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
