<div align="left">

# Samajh

**Contracts, explained.**

Upload any contract or official paper in **English** or **Hindi (`हिन्दी`)** to get a plain-language explanation and ask grounded questions about the document.

**[Live App: https://samajh-paperwork.vercel.app](https://samajh-paperwork.vercel.app)**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-samajh--paperwork.vercel.app-D9B97A?style=flat-square&logo=vercel&logoColor=081A22)](https://samajh-paperwork.vercel.app)
![React 19](https://img.shields.io/badge/React-19-081A22?style=flat-square&logo=react&logoColor=7FD1C4)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-081A22?style=flat-square&logo=typescript&logoColor=D9B97A)
![Vite 8](https://img.shields.io/badge/Vite-8-081A22?style=flat-square&logo=vite&logoColor=D9B97A)
![Express](https://img.shields.io/badge/Express-4-081A22?style=flat-square&logo=express&logoColor=EAF4F2)

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
* **Firebase Isolation**: Optional Firebase configuration uses environment variables (`VITE_FIREBASE_*`) and strict `firestore.rules` matching `firebase-blueprint.json`.
* **Routes & Compression Tool**: Focused app routes (`/`, `/compress`, `/privacy-policy`, `/terms`) with canonical URLs, JSON-LD structured data, `/robots.txt`, `/sitemap.xml`, and a browser-side exact-size document compressor (`/compress`).

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

### 5. Deploy to Vercel

Live URL: **[https://samajh-paperwork.vercel.app](https://samajh-paperwork.vercel.app)**

This repository includes `vercel.json` and `api/index.ts` for zero-config Vercel deployment (`npm run build` → `dist/`, plus Express serverless `/api/*` routing). Add `GEMINI_API_KEY` (and optional fallback keys `GROQ_API_KEY` / `OPENROUTER_API_KEY`) in Vercel **Project Settings → Environment Variables**.

## Project Structure

```text
.
├── api/index.ts                    # Vercel Serverless Function entry point
├── vercel.json                     # Vercel build, security headers, and SPA/API rewrites
├── server.ts                       # Express server, SSR HTML renderer, security middleware, AI routes
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
    ├── components/                 # Modular views (HeroLanding, CapturePreview, ResultWorkspace, DocCompressorPage, InfoPages, AppPreloader)
    ├── data/                       # Bilingual sample agreement and page metadata/copy
    ├── lib/                        # Pure validation, compression, highlighting, request schemas, Firebase client
    └── types/                      # Shared TypeScript interfaces
```

## Disclaimer

Samajh explains documents. It is not legal, financial, or medical advice. Verify critical terms directly against your signed document or consult a qualified professional before acting.
