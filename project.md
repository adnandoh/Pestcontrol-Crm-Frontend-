# PestControl99 Frontend — Product Requirements Document (PRD)

**Purpose:** Build a clean, production-grade CRM frontend using React + Vite + TypeScript + TailwindCSS for the PestControl backend (Django REST). Fast, accessible, and maintainable UI for admins and operators.

---

## 1. Executive summary

Deliver a modern, responsive CRM web app (admin/operator portal) to manage Clients, Inquiries, Job Cards, Renewals, and Notifications. The frontend will be a single-page application (SPA) built with Vite + React + TypeScript, styled with TailwindCSS, using a component-driven architecture, strong performance optimizations, automated tests and CI/CD-ready build. Integration will use the provided REST API endpoints documented in the backend.

**Key goals**

* Fast first-load and snappy interactions.
* Production-level code quality: TypeScript, linting, formatting, tests, CI.
* Clear UX for common workflows: convert inquiry → job card, schedule services, manage renewals, push notifications.
* Role-based views: Admin, Manager, Operator.
* Offline-light / graceful retries for network issues on mobile.

---

## 2. Primary users & personas

* **Admin (Full access):** Manage users, view logs, notifications, system settings.
* **Operator / Sales (CRM user):** Manage inquiries, create clients, convert to jobcards, follow up renewals.

* **Accounts (optional):** View payment status, mark payments.

---

## 3. Core features & pages (high-level)

1. **Authentication / Login** (`/login`) — JWT login with Remember me, 2FA placeholder.
2. **Dashboard** (`/`) — Key metrics: inquiries count (New/Contacted/Converted), upcoming renewals, WIP jobcards, overdue payments, quick actions.
3. **Clients** (`/clients`) — list, filters, search, create/edit client modal, import/export CSV.
4. **Client Detail** (`/clients/:id`) — client profile, jobcards, notes, activity timeline.
5. **Inquiries** (`/inquiries`) — list, filters (status, city), convert to jobcard action, bulk mark-as-read, counters.
6. **Job Cards** (`/jobcards`) — list with advanced filtering, calendar view toggle, create/edit job card wizard, pause/resume, payment update.
7. **Job Card Detail** (`/jobcards/:id`) — timeline, visits, attachments, service notes, invoices and renewals link.
8. **Renewals** (`/renewals`) — due list, urgency color chips, bulk update urgency, mark completed.
9. **Notifications** (`/notifications`) — send push notifications, notification logs.
10. **Reports / Statistics** (`/reports`) — jobcard statistics, inquiry counts, revenue summary (optional if backend provides data).
11. **Settings / Users** (`/settings`, `/users`) — role management, API keys, integration settings (FCM), dropdowns for config.
12. **Health & Docs** (`/health`, `/api-docs`) — health check UI and link to backend docs.

**Mobile responsiveness:** All pages to be responsive with priority for list/key actions at small widths. Service flows optimized for mobile-first usage.

---

## 4. Page-by-page requirements (detailed)

### Login

* Fields: username, password, remember me.
* On successful login: store access token (in-memory + secure refresh strategy) and refresh token (HttpOnly cookie if backend supports, otherwise secure localStorage with refresh flow).
* Error handling: show messages for invalid credentials, throttling.

### Dashboard

* Cards: inquiries by status, renewals due (High/Medium/Normal), jobcard WIP, unpaid invoice count.
* Mini-actions: create inquiry, quick client search, create jobcard.
* Charts: small sparklines for trends (optional).

### Clients

* Table view: pagination, sort, search by name/mobile/email, filters by city/is_active.
* Bulk actions: export, deactivate, send notification.
* Create/Edit: modal with validation (10-digit mobile), client create_or_get flow.

### Inquiries

* New/read badges, filters by status/city, ability to convert to jobcard (open wizard pre-filled), mark as read/unread.
* Public inquiry creation form (for website) — optional embed component.

### Job Cards

* Table with columns: code, client, city, service_type, schedule_date, status, payment_status, price, actions.
* Create wizard: select existing client OR create client inline, choose service_type, schedule_date (date picker), price, contract_duration, notes.
* Detail page: timeline of events, pause toggle, update payment status, attachments (images/pdf) upload.

### Renewals

* List with urgency color indicator and ability to jump to jobcard and mark completed.
* Bulk: update urgency levels endpoint call.

### Notifications

* Send notification modal (title, body), view notification logs.

### Reports

* Use backend statistics endpoints for charts/tables. Provide CSV export for major reports.

---

## 5. API integration mapping

Map every page action to backend endpoints (important for dev handoff). Example mapping (non-exhaustive):

* Login: `POST /api/token/`
* Refresh: `POST /api/token/refresh/`
* Clients list: `GET /api/v1/clients/` (qs: page, page_size, q, city, ordering)
* Create client: `POST /api/v1/clients/` or `POST /api/v1/clients/create_or_get/`
* Inquiries list: `GET /api/v1/inquiries/`
* Convert inquiry: `POST /api/v1/inquiries/{id}/convert/`
* Jobcards list: `GET /api/v1/jobcards/`
* Create jobcard: `POST /api/v1/jobcards/`
* Pause jobcard: `PATCH /api/v1/jobcards/{id}/toggle_pause/`
* Renewals list: `GET /api/v1/renewals/`
* Notifications send: `POST /api/v1/notifications/send/`


> Implementation note: Build a typed API client (see project structure) and centralize error handling, retry logic and token refresh.

---

## 6. Data model (frontend view)

Create TypeScript interfaces matching backend responses for compile-time safety. Example:

```ts
interface Client { id: number; full_name: string; mobile: string; email?: string; city?: string; address?: string; notes?: string; is_active: boolean; created_at: string; updated_at: string }
interface JobCard { id:number; code:string; client:number; client_name:string; client_mobile:string; client_email?: string; client_city?: string; client_address?: string; job_type:string; contract_duration?: string; status:string; service_type:string; schedule_date?: string; price?: string; payment_status?: string; next_service_date?: string; notes?: string }
```

Keep models in `/src/types/` and generate/update these interfaces from OpenAPI (if available) or use a shared contract file.

---

## 7. UX / UI system & component library

* Use a component-first approach: Atomic components (Button, Input, Select, Modal, Table, Badge, Chip, Avatar), Molecules (SearchBar, FilterBar), and Pages.
* Implement a small design system using Tailwind + CSS variables for theme tokens (colors, spacing, radii).
* Provide dark mode toggle (optional) and a high-contrast accessible theme.
* Use headless UI components (Radix or Headless UI) when accessible patterns are required (dialogs, popovers).
* Keep forms accessible with proper labels, aria attributes and keyboard navigation.

---

## 8. State management & data fetching

* Data fetching: React Query (TanStack Query) for caching, background refetch, pagination helpers and optimistic updates.
* State: keep local UI state with React state / Zustand for cross-component ephemeral state (e.g., left nav state, selected jobcard in bulk actions).
* Auth state: store access token in memory; store refresh token in secure cookie or httpOnly if backend supports. Token refresh logic centralized in axios interceptor.

---

## 9. Routing & access control

* Router: React Router v6.
* Routes: guarded routes for auth, role-based route guards.
* Deep links: jobcards/:id, clients/:id, renewals?upcoming=1

---

## 10. Project structure (suggested)

```
pestcontrol-frontend/
├─ public/
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ api/
│  │  ├─ axios.ts               # axios instance + interceptors
│  │  └─ client.ts              # typed REST client wrappers
│  ├─ assets/
│  ├─ components/              # atomic + composite components
│  │  ├─ ui/                   # Button, Input, Modal, Table
│  │  └─ layout/               # Header, Sidebar, Footer
│  ├─ features/                # feature folders (Clients, Inquiries, JobCards...)
│  │  ├─ clients/
│  │  │  ├─ components/
│  │  │  ├─ hooks.ts
│  │  │  └─ index.tsx          # page + route
│  │  └─ jobcards/
│  ├─ hooks/                   # shared hooks (useDebounce, useAuth)
│  ├─ pages/                   # route-level pages (Dashboard, Login)
│  ├─ state/                   # Zustand stores or context providers
│  ├─ services/                # utilities: formatters, validators
│  ├─ styles/                  # tailwind config, globals.css
│  ├─ types/                   # TS types/interfaces
│  ├─ utils/                   # date helpers, excel export helpers
│  └─ tests/                   # test utilities
├─ .eslintrc.js
├─ .prettierrc
├─ tsconfig.json
├─ vite.config.ts
└─ package.json
```

**Why feature folders?** Keeps feature logic co-located and easy to onboard for devs working on specific features.

---

## 11. Styling & design details

* TailwindCSS + PostCSS. Keep a central `tailwind.config.js` with theme extension for brand colors (urgency colors: red/yellow/green), spacing and breakpoints.
* Design tokens in `:root` for non-Tailwind variables used by third party components.
* Use utility classes for layout + small component CSS modules for complex components.
* Icons: Heroicons / lucide-react.

---

## 12. Accessibility

* Ensure semantic HTML in forms and tables.
* Keyboard navigation for dialogs and modals.
* Color contrast >= 4.5:1 for primary text; use color chips + icon to convey urgency (not color alone).
* Screen reader labels on dynamic content.

---

## 13. Performance & optimization

* Use code-splitting/lazy routes for large pages.
* Use React Query for caching and avoid overfetching.
* Image optimization for attachments (client-side compression before upload).
* Preload critical assets and keep bundle sizes minimal.

---

## 14. Testing strategy

* Unit tests: Jest + React Testing Library for components and hooks.
* Integration tests: Playwright for critical flows (login, create jobcard, convert inquiry).
* API contract tests: test that typed client matches backend responses (mock server).

---

## 15. CI/CD & deployment

* GitHub Actions pipeline:

  * `lint` (eslint), `typecheck`, `test`, `build` steps.
  * On `main` branch: build and deploy to chosen static host (Vercel / Netlify / Railway static) or Docker container behind CDN.
* Environment variables: VITE_API_BASE_URL, VITE_FCM_KEY (if used), etc. Use secret management for prod.

---

## 16. Security considerations

* Use HTTPS, secure cookies for refresh tokens (preferable), XSS hardening, CSP headers.
* Role-based authorization enforced client-side *and* backend should enforce. Never rely only on frontend checks.
* Limit file upload size and validate file types.

---

## 17. Observability & analytics

* Sentry for frontend error tracking.
* Instrument key events (conversion, job completion) with Segment or Google Analytics.
* Health check page that reads `/api/v1/health/`.

---

## 18. Deliverables & next steps (developer handoff)

**Deliverables for the MVP phase:**

* Fully implemented pages: Login, Dashboard, Clients, Inquiries (convert flow), Job Cards (list + detail + create), Renewals, Notifications (send).
* Shared component library and Tailwind setup.
* Typed API client and authentication interceptor.
* Tests for critical flows, CI pipeline, and deployment config.

**Immediate next steps:**

1. Confirm priority pages for MVP (which pages you want first).
2. Provide brand tokens (logo, primary color) and any design preferences/screens.
3. Provide sample API keys or dev environment for integration testing.
4. Optionally provide OpenAPI/Swagger JSON to auto-generate types and client code.

---

## 19. Acceptance criteria

* All listed pages load and show real backend data using proper auth flows.
* Critical flows work: create client, inquiry → convert to jobcard, schedule service, mark payment, renewals summary.
* Cross-browser support: Chrome, Edge, Firefox, Safari (latest 2 versions).
* Accessibility basics met and major WCAG checkpoints satisfied.

---

## 20. Appendix — Useful conventions

* Filenames: `PascalCase.tsx` for components, `kebab-case.ts` for utils.
* CSS: avoid inline styles where possible; prefer Tailwind classes.
* Commit messages: Conventional Commits.

---

*End of PRD.*

*If you'd like, I can:*

* Generate the initial React + Vite starter scaffold (file layout + example components).
* Create a component library skeleton (Button, Input, Modal, Table).
* Generate typed API client stubs for the listed endpoints.

Tell me which of these you'd like me to produce next and I will generate code and files.
