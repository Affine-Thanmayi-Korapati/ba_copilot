# BA Copilot (Business Analyst Copilot)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/Build-Succeeded-emerald.svg)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.x-grey.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2d3748.svg)](https://www.prisma.io/)
[![Vitest](https://img.shields.io/badge/Vitest-Testing-ffbb00.svg)](https://vitest.dev/)

BA Copilot is a powerful full-stack, AI-powered assistant designed specifically for Business Analysts, Product Managers, and Software Architects. It streamlines the requirements gathering process by transforming raw, unstructured meeting notes, interview transcripts, or brain dumps into fully structured, high-quality, and production-ready business analysis documents.

Leveraging state-of-the-art Google Gemini LLMs, the application generates comprehensive documentation including Executive Summaries, Functional Requirements, User Stories with clear Acceptance Criteria, Risk Assessments, Assumptions, and Clarifying Questions.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Architecture Overview](#architecture-overview)
5. [Folder Structure](#folder-structure)
6. [Prerequisites](#prerequisites)
7. [Installation](#installation)
8. [Environment Variables](#environment-variables)
9. [Database Setup (Prisma + PostgreSQL)](#database-setup-prisma--postgresql)
10. [Running the Application](#running-the-application)
11. [Running Tests](#running-tests)
12. [API Overview](#api-overview)
13. [Deployment](#deployment)
14. [Security Features](#security-features)
15. [Future Enhancements](#future-enhancements)
16. [License](#license)

---

## 1. Project Overview

In software development, translating stakeholder meetings into concrete requirements is often a slow, manual, and error-prone process. BA Copilot bridges this gap. BAs can log in, create dedicated sessions for their projects, paste unstructured discussions, and receive a beautifully structured, professional BA analysis in seconds. BAs can also fine-tune, edit, download, or export the generated output directly from the application dashboard.

### Application Mockups
> *Here is a preview of the main application screens:*

#### 🔐 User Authentication (Sign In & Register)
![Authentication Page Placeholder](https://via.placeholder.com/800x450.png?text=BA+Copilot+-+Secure+User+Authentication+Screen)

#### 📊 Business Analyst Dashboard (Sessions List)
![Dashboard Page Placeholder](https://via.placeholder.com/800x450.png?text=BA+Copilot+-+Dashboard+and+Sessions+List)

#### 📝 Analysis Canvas & Editor
![Analysis Details Page Placeholder](https://via.placeholder.com/800x450.png?text=BA+Copilot+-+Interactive+AI+Analysis+and+Requirements+Editor)

---

## 2. Features

- **Secure User Authentication**: Complete registration and login system backed by secure password hashing (bcryptjs) and stateless JSON Web Tokens (JWT).
- **Session Management**: Dedicated workspace sessions to organize different stakeholder meetings, project workshops, or discovery conversations.
- **AI-Powered Structured Analysis**: Converts unstructured markdown text, plain notes, or audio transcripts into structured requirements:
  - **Executive Summary**: High-level context and core business objectives.
  - **Functional Requirements**: Unambiguous, testable system requirements.
  - **User Stories & Acceptance Criteria**: Standard Agile stories (*"As a... I want to... So that..."*) with clear, executable acceptance criteria.
  - **Risk Assessments**: Identification of technical, operational, or business risks with potential mitigation directions.
  - **Assumptions**: Transparent listing of logical bounds and technical baselines.
  - **Clarifying Questions**: Recommended follow-ups to ask stakeholders to resolve ambiguities.
- **Interactive Inline Requirements Editor**: Business Analysts can directly modify the generated AI outputs, add comments, and refine stories to fit the project's exact needs.
- **Export & Integration Hub**: One-click tracking and support for downloading/exporting business analysis documents into multiple formats (Markdown, JSON).
- **Production-Ready Error Handling**: Graceful client-side toast notifications, clear API response schemas, and resilient server-side model-fallback mechanisms.

---

## 3. Tech Stack

### Frontend
- **Framework**: React 18 (Vite-powered Single Page Application)
- **Styling**: Tailwind CSS (fully responsive, custom components, modern layout design)
- **Icons**: Lucide React
- **Animations**: Motion (framer-motion) for smooth, subtle transitions

### Backend
- **Runtime**: Node.js
- **Server Framework**: Express (REST API with custom route controllers and middlewares)
- **Database ORM**: Prisma ORM
- **Database Engine**: PostgreSQL (fully compatible, configured via relational schemas)
- **AI SDK**: `@google/genai` (Modern official Google GenAI SDK for Gemini integration)

### Testing & Tooling
- **Test Runner**: Vitest
- **API Testing**: Supertest (Express route integration testing)
- **Linter**: ESLint with TypeScript compiler check (`tsc --noEmit`)

---

## 4. Architecture Overview

BA Copilot is built using a modern **Client-Server Architecture**:

```
 ┌─────────────────────────────────────────────────────────┐
 │                     React Frontend                      │
 │     (SPA with Dashboard, Login, Session Management)     │
 └────────────────────────────┬────────────────────────────┘
                              │ HTTPS / REST API (JWT)
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │                     Express Backend                     │
 │   - JWT Authentication Middleware (Security Boundary)  │
 │   - Auth Router & Session Management Router             │
 │   - AI Service Orchestrator (gemini-3.5-flash)          │
 └────────────────────┬───────────────┬────────────────────┘
                      │               │
                      │ Prisma ORM    │ Official Google GenAI SDK
                      ▼               ▼
 ┌─────────────────────────┐     ┌─────────────────────────┐
 │   PostgreSQL Database   │     │    Google Gemini API    │
 │ (Users, Sessions, Docs) │     │ (Model Fallbacks/Retry) │
 └─────────────────────────┘     └─────────────────────────┘
```

### Key Architectural Patterns
- **Service Layer Pattern**: Decoupled service providers manage critical operations such as the Gemini API Orchestrator (`server/services/ai.ts`) and the Prisma Client Wrapper (`server/services/db.ts`).
- **Resilient AI Failovers**: The AI Service utilizes an automated fallback loop. If `gemini-3.5-flash` fails or hits quota limits, the service transparently falls back to `gemini-3.1-flash-lite`, retrying up to 3 times per model with exponential backoff.
- **Middlewares as Security Gates**: JWT verification is isolated in a modular middleware (`server/middleware/auth.ts`), guaranteeing all session routes are securely protected.

---

## 5. Folder Structure

```
/
├── prisma/                  # Prisma schema definition and migration files
│   └── schema.prisma        # Database schema definitions
├── server/                  # Backend Node.js Express server
│   ├── controllers/         # Request handling and controller business logic
│   │   ├── auth.ts          # Auth controllers (register, login)
│   │   └── sessions.ts      # Sessions, analysis, and exports controllers
│   ├── middleware/          # Express Middlewares
│   │   └── auth.ts          # JWT Authentication and verification middleware
│   ├── routes/              # Express API Routes definitions
│   │   ├── auth.ts          # Authentication routes mapping
│   │   └── sessions.ts      # Sessions and analysis routes mapping
│   ├── services/            # Decoupled utility service integrations
│   │   ├── ai.ts            # Google Gemini AI SDK Orchestrator
│   │   └── db.ts            # Prisma client instance manager
│   └── types/               # Server-wide typescript declarations
│       └── index.ts         # Authentication type extensions
├── src/                     # Frontend React Application
│   ├── components/          # Reusable shared components
│   ├── pages/               # Primary screen components
│   │   ├── Dashboard.tsx    # Session workspace list & overview
│   │   ├── Login.tsx        # Secure authentication entry form
│   │   ├── Register.tsx     # Secure user sign-up form
│   │   └── SessionDetails.tsx # Main analysis display, interactive editing canvas
│   ├── services/            # Frontend API client utilities
│   │   └── api.ts           # Axios/Fetch integration wrapper
│   ├── index.css            # Tailwind global stylesheet
│   ├── main.tsx             # React SPA entry point
│   └── App.tsx              # Main React component & router setup
├── tests/                   # Complete Testing Suite (Unit & Integration)
│   ├── ai.test.ts           # Service-layer AI model unit tests
│   ├── auth.test.ts         # User auth unit tests
│   ├── crud.test.ts         # Database record CRUD unit tests
│   └── integration.test.ts  # Express REST API Supertest integration tests
├── .env.example             # Documented template for local configuration variables
├── index.html               # Main index HTML
├── package.json             # Manifest and dependencies manager
├── server.ts                # Main Full-Stack dev entry point (Express + Vite)
├── tsconfig.json            # TypeScript configuration profiles
└── vite.config.ts           # Vite bundler build config
```

---

## 6. Prerequisites

To run this application locally, you must have the following installed:
- **Node.js**: `v18.x` or higher
- **NPM** or **Yarn** or **Bun** package managers
- **PostgreSQL**: A running instance or accessible connection string (local or cloud-hosted)
- **Google Gemini API Key**: Obtainable from the [Google AI Studio Console](https://aistudio.google.com/)

---

## 7. Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/ba-copilot.git
   cd ba-copilot
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Duplicate the `.env.example` file and rename it to `.env`:
   ```bash
   cp .env.example .env
   ```

---

## 8. Environment Variables

Open the `.env` file and populate the variables with your values:

```env
# Database Settings
DATABASE_URL="postgresql://username:password@localhost:5432/ba_copilot_db?schema=public"

# JSON Web Token Secret (used for token signature verification)
JWT_SECRET="your_highly_secure_jwt_secret_key_string_here"

# Google Gemini API Key
GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere..."

# Environment mode
NODE_ENV="development"
```

*Note: In production environments, the Express server will immediately crash if `JWT_SECRET` is left unset, ensuring that default fallback keys are never deployed to live environments.*

---

## 9. Database Setup (Prisma + PostgreSQL)

Initialize your PostgreSQL database and push the database schema using Prisma:

1. **Run Database Migrations / Sync Schema**:
   ```bash
   npx prisma db push
   ```
   *This command maps the schema definitions from `/prisma/schema.prisma` directly to your PostgreSQL database, creating all required tables and relations.*

2. **Open Prisma Studio (Optional GUI)**:
   ```bash
   npx prisma studio
   ```
   *This launches an interactive database browser at `http://localhost:5555` to view, add, or modify database records.*

---

## 10. Running the Application

### 🚀 Development Mode
To start the application locally with full-stack capabilities (Express server serving API routes on `/api/*` and proxying Vite frontend assets):

```bash
npm run dev
```
The application will be accessible at: **`http://localhost:3000`**

### 📦 Production Build
To build and start the application in optimized production mode:

```bash
# Compile client assets and bundle Express backend to optimized CJS
npm run build

# Start the optimized Node production server
npm run start
```

---

## 11. Running Tests

BA Copilot contains a comprehensive test suite of unit and integration tests using `vitest` and `supertest` to guarantee codebase stability.

To execute all tests:
```bash
npm run test
```

### What is Covered:
- **Service Layer AI Orchestration Tests (`tests/ai.test.ts`)**:
  - Verification of required environment keys.
  - Mocked validation of structured JSON parsing of AI outputs.
  - Automated test coverage for rate limit retries and transparent model failover from `gemini-3.5-flash` to `gemini-3.1-flash-lite`.
- **Database CRUD & Authentication Logic (`tests/auth.test.ts`, `tests/crud.test.ts`)**:
  - Correct creation of user accounts, checking password hash comparisons.
  - Validation of session creation and requirement detail updates.
- **REST API End-to-End Integration Tests (`tests/integration.test.ts`)**:
  - Full request-response pipeline tests for `/api/auth/register` and `/api/auth/login`.
  - Authorized/unauthorized access checks for `/api/sessions`.
  - Ownership validation (preventing Insecure Direct Object Reference - IDOR) on session deletion.

---

## 12. API Overview

The backend exposes a highly standardized REST API. All endpoints are prefixed with `/api`.

### Authentication Endpoints
- `POST /api/auth/register`: Create a new user account.
- `POST /api/auth/login`: Authenticate existing user and retrieve JWT.

### Session Endpoints (Protected by JWT Auth Middleware)
- `GET /api/sessions`: Retrieve all analysis sessions belonging to the logged-in user.
- `POST /api/sessions`: Create a new, empty session.
- `GET /api/sessions/:id`: Retrieve detailed session data, including raw notes and structured AI analyses.
- `PUT /api/sessions/:id`: Update session details (e.g. rename title).
- `DELETE /api/sessions/:id`: Securely delete a session and all its associated analysis documents.

### AI Analysis & Export (Protected by JWT Auth Middleware)
- `POST /api/sessions/:id/analyze`: Trigger the Gemini API analysis flow on the session's meeting notes.
- `PUT /api/sessions/:id/analysis`: Update/save refined Business Analysis document details.
- `POST /api/sessions/:id/export`: Track and log a document export event.

---

## 13. Deployment

The application is fully containerized and compatible with modern cloud hosting platforms like **Google Cloud Run**, **Render**, or **Heroku**:

- **Production Target**: Built to run seamlessly behind Nginx or container ingress routing.
- **Port Ingress**: Configured to bind automatically to port `3000` and listen on host `0.0.0.0` as required by Cloud Run environments.
- **Static Assets Serving**: In production mode (`NODE_ENV=production`), the bundled Express server is optimized to serve compiled static frontend assets from `dist/` and route unmatched routes to `index.html` (supporting SPA routing).

---

## 14. Security Features

- **Strict Broken Object Level Authorization (BOLA/IDOR)**: Users can only view, edit, analyze, or delete sessions that they created. Every API request performs ownership checking before interacting with database records.
- **Stateless Session Tokens**: Handled via secure JSON Web Tokens. Access is guarded via robust headers validation.
- **Cryptographic Hashing**: Cleartext user passwords are never stored. The authentication controller utilizes strong `bcryptjs` salt hashes.
- **Strict Input Sanitization & Validation**:
  - Registration routes enforce valid emails, non-empty names, and minimum password lengths.
  - Protection against SQL injection via Prisma's automated parameterized queries.
  - Prevented development keys leakage by throwing errors during startup if `JWT_SECRET` is left in fallback modes during production builds.

---

## 15. Future Enhancements

- **Direct Audio Transcript Recorder**: Integrated browser microphone capability to capture stakeholder workshops directly and convert speech-to-text prior to AI analysis.
- **Interactive PDF & DOCX Downloader**: Generate beautifully styled corporate-grade PDF or Microsoft Word documents from the BA details panel.
- **Team Collaboration Spaces**: Multi-user workspaces enabling multiple BAs or developers to collaborate on acceptance criteria in real-time.
- **Custom BA Blueprint Templates**: Selectable prompt engineering templates, allowing analysts to choose between Agile Scrum User Stories, waterfall Software Requirement Specifications (SRS), or system-level API designs.

---

## 16. License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
