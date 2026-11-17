<div align="left">

# Samajh

**Paperwork, explained.**

Plain English and Hindi (`हिन्दी`) explanations for rental agreements, loan papers, and official notices.

![React 19](https://img.shields.io/badge/React-19-081A22?style=flat-square&logo=react&logoColor=7FD1C4)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-081A22?style=flat-square&logo=typescript&logoColor=D9B97A)
![Vite 8](https://img.shields.io/badge/Vite-8-081A22?style=flat-square&logo=vite&logoColor=D9B97A)
![Express](https://img.shields.io/badge/Express-4-081A22?style=flat-square&logo=express&logoColor=EAF4F2)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-081A22?style=flat-square&logo=firebase&logoColor=D9B97A)

</div>

---

## Overview

Samajh turns dense contracts, fee schedules, and official notices into structured, plain-language summaries in **English** and **Hindi** at a grade 6 to 8 reading level.

Built with an International Typographic (Swiss) layout system, server-rendered HTML routes for search indexing, and server-side document processing so API keys never touch the browser.

## Core Workflow

| Step | Stage | What happens |
| --- | --- | --- |
| **01** | **Scan** | Capture via camera or attach up to 5 pages (JPG, PNG, or PDF, max 8 MB each). Client and server verify file signatures and strip JPEG/PNG metadata before processing. |
| **02** | **Understand** | View plain-language breakdown of **deadlines**, **money** (rent, deposits, fees, penalties), and **risky or one-sided clauses** flagged by severity. |
| **03** | **Act** | Track an ordered next-steps checklist, switch seamlessly between English and Hindi, listen via browser speech synthesis, or ask grounded follow-up questions. |

## Architecture & Security

* **Server-side AI Proxy**: Gemini API requests run exclusively inside `server.ts` (`/api/analyze`, `/api/translate`, `/api/ask`).
* **Upload Sanitization**: File magic-byte verification and EXIF/PNG metadata stripping run before analysis.
* **Strict Input Schemas**: Every JSON payload is validated in `src/lib/requestSchemas.ts` with unknown-key rejection, field-length caps, and route-specific body limits.
* **Rate Limiting & CORS**: Per-IP sliding-window limiters return `429` with `Retry-After` headers alongside an exact-origin CORS allowlist on `/api/*`.
* **HTTP Hardening**: Enforces Content Security Policy, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, production `HSTS` and `X-Frame-Options: DENY`, and `404` blocking on dotfiles, configs, and source files.
* **Firebase Isolation**: Google Sign-In and optional saved scan summaries use `firestore.rules` with `email_verified` owner enforcement and field-level schema bounds matching `firebase-blueprint.json`.
* **SEO & SSR Routes**: Dedicated routes (`/`, `/services`, `/about`, `/faq`, `/contact`, `/privacy-policy`, `/terms`, `/sign-in`, `/saved`) render real HTML on initial request with canonical URLs, JSON-LD structured data, `/robots.txt`, and `/sitemap.xml`.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Tailwind CSS v4, Lucide Icons |
| Server & SSR | Express 4, TSX, Vite 8 middleware (dev) / static `dist/` (prod) |
| AI Processing | `@google/genai` (server-side only) |
| Auth & Persistence | Firebase Authentication (Google Sign-In) & Cloud Firestore |
| Verification | `tsc --noEmit`, `node:test`, `@firebase/eslint-plugin-security-rules`, GitHub Actions + Gitleaks |

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required and optional variables:

| Variable | Scope | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | Server | Gemini API key used by `/api/analyze`, `/api/translate`, and `/api/ask`. |
| `APP_URL` | Server | Public deployment origin for canonical links and CORS allowlist. |
| `ALLOW_INDEXING` | Server | Set to `true` only on the production domain to allow search indexing. |
| `VITE_FIREBASE_API_KEY` | Client | Firebase Web API key (or provide gitignored `firebase-applet-config.json`). |
| `VITE_FIREBASE_AUTH_DOMAIN` | Client | Firebase Auth domain. |
| `VITE_FIREBASE_PROJECT_ID` | Client | Firebase project ID. |
| `VITE_FIREBASE_STORAGE_BUCKET` | Client | Firebase storage bucket. |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Client | Firebase sender ID. |
| `VITE_FIREBASE_APP_ID` | Client | Firebase Web App ID. |
| `VITE_FIREBASE_DATABASE_ID` | Client | Firestore database ID. |

For local config via JSON template instead of `VITE_FIREBASE_*` env vars, copy `firebase-applet-config.example.json` to `firebase-applet-config.json` (excluded from Git via `.gitignore`).

### 3. Run in development

```bash
npm run dev
```

The server starts on `http://localhost:3000`.

### 4. Build and run production

```bash
npm run build
NODE_ENV=production npm start
```

## Verification & Checks

```bash
# TypeScript typecheck
npm run lint

# Production bundle
npm run build

# Firestore security rules lint
npx eslint firestore.rules

# Unit & schema tests
npx tsx --test src/lib/documentLogic.test.ts src/lib/requestSchemas.test.ts firestore.rules.test.ts
```

Optional local Git pre-commit secret check hook:

```bash
git config core.hooksPath .githooks
```

## Project Structure

```text
.
├── server.ts                       # Express server, SSR HTML renderer, security middleware, Gemini routes
├── index.html                      # HTML entry shell
├── firestore.rules                 # Cloud Firestore security rules
├── firebase-blueprint.json         # Firestore schema blueprint
├── .env.example                    # Environment variable template
├── .githooks/pre-commit            # Local secret-commit prevention hook
├── .github/
│   ├── dependabot.yml              # Weekly npm & GitHub Actions dependency updates
│   └── workflows/security.yml      # CI typecheck, build, test, audit, and secret scan
└── src/
    ├── App.tsx                     # Main application routing and document state
    ├── index.css                   # Swiss 12-column grid and typography tokens
    ├── components/                 # Modular views (HeroLanding, CapturePreview, ResultWorkspace, InfoPages, AuthPage, SavedScansPage)
    ├── data/                       # Bilingual sample agreement and page metadata/copy
    ├── lib/                        # Pure validation, request schemas, Firebase client, UTM helpers
    └── types/                      # Shared TypeScript interfaces
```

## Disclaimer

Samajh explains documents. It is not legal, financial, or medical advice. Verify critical terms directly against your signed document or consult a qualified professional before acting.
