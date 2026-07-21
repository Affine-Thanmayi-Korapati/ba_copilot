\--------- Vibe Coding Spec \& Annotated Prompt Library ------------



Project Name

BA Copilot – AI-Powered Business Analysis Assistant



Section 1: Project Overview

Project Goal



Develop an AI-powered Business Analysis Assistant that helps Business Analysts convert unstructured meeting notes into structured business documentation using Google Gemini AI.



The application enables users to securely manage analysis sessions, generate AI-powered requirements, edit generated content, and export documentation for stakeholder review.



Business Objective



Reduce manual effort involved in business analysis documentation, improve consistency across projects, and accelerate requirements gathering through AI-assisted workflows.



Section 2: Success Criteria



The project will be considered successful when it can:



Allow secure user registration and login

Create, edit, view, and delete analysis sessions

Generate AI-powered business analysis from meeting notes

Produce:

Executive Summary

Functional Requirements

User Stories

Acceptance Criteria

Risks

Assumptions

Clarifying Questions

Allow editing and saving generated content

Export analyses as Markdown and PDF

Display user-friendly error messages

Support responsive layouts on desktop and mobile

Pass unit and integration tests

Deploy successfully to a public URL

Section 3: Technology Stack

Layer	Technology

Frontend	React 18 + TypeScript

Styling	Tailwind CSS

Backend	Node.js + Express

Database	PostgreSQL + Prisma ORM (Neon)

Authentication	JWT + bcrypt

AI	Google Gemini API

Testing	Vitest + Supertest

Deployment	Google AI Studio + Neon Database

Section 4: Folder Structure

project-root/



├── prisma/

│   └── schema.prisma

│

├── server/

│   ├── controllers/

│   ├── middleware/

│   ├── routes/

│   ├── services/

│   ├── utils/

│   └── app.ts

│

├── src/

│   ├── components/

│   ├── pages/

│   ├── services/

│   ├── hooks/

│   ├── types/

│   ├── utils/

│   ├── App.tsx

│   └── main.tsx

│

├── tests/

│   ├── ai.test.ts

│   ├── auth.test.ts

│   ├── crud.test.ts

│   └── integration.test.ts

│

├── README.md

├── API\_DOCUMENTATION.md

├── SECURITY\_AUDIT.md

└── package.json

Section 5: Coding Standards



The project follows the following development standards:



TypeScript throughout the application

React Functional Components only

One component per file

Thin controllers with business logic in services

Prisma ORM for all database operations

Secure password hashing using bcrypt

JWT authentication for protected routes

Consistent API response format

Centralized error handling

Responsive UI using Tailwind CSS

ESLint and Prettier formatting

Meaningful Git commit messages

Section 6: Development Workflow



The application was developed using the following workflow.



Backend

Configure PostgreSQL database

Create Prisma schema

Generate Prisma client

Build Authentication

Create Middleware

Develop AI Service

Build Controllers

Create REST API Routes

Unit Testing

Integration Testing

Frontend

Define TypeScript models

Build reusable UI components

Create Login/Register pages

Develop Dashboard

Build Session Details page

Integrate AI Analysis

Implement Export functionality

Improve Responsiveness

Enhance Loading \& Error States

Section 7: Implementation Tasks (Cursor Composer Prompts)

Task 1 – Project Setup



Prompt



Create a full-stack application using React + TypeScript (Vite) for the frontend and Node.js + Express + TypeScript for the backend. Configure Tailwind CSS, Prisma ORM, PostgreSQL, ESLint, and Prettier. Generate the recommended folder structure without implementing business logic.



Task 2 – Database



Prompt



Using Prisma, create the database schema for User, AnalysisSession, AIAnalysis, and ExportRecord. Define relationships, UUID primary keys, timestamps, and generate the Prisma client.



Task 3 – Authentication



Prompt



Implement JWT authentication including user registration, login, bcrypt password hashing, protected middleware, and secure token validation. Return consistent API responses.



Task 4 – Session Management API



Prompt



Build CRUD REST APIs for Analysis Sessions following the architecture. Keep controllers thin, business logic in services, and validation in middleware.



Task 5 – Gemini Integration



Prompt



Integrate Google Gemini AI to convert meeting notes into structured business documentation including Executive Summary, Functional Requirements, User Stories, Acceptance Criteria, Risks, Assumptions, and Clarifying Questions. Implement retry handling and user-friendly error responses.



Task 6 – Dashboard



Prompt



Build a responsive dashboard displaying analysis sessions with create, edit, delete, search, and navigation functionality.



Task 7 – Analysis Editor



Prompt



Build an editable analysis page displaying AI-generated sections. Include loading indicators, error handling, save functionality, and responsive layouts.



Task 8 – Export



Prompt



Implement Markdown and PDF export while preserving formatting and allowing downloads from the frontend.



Task 9 – Testing



Prompt



Generate comprehensive unit tests and integration tests using Vitest and Supertest covering authentication, CRUD operations, AI generation, and exports.



Task 10 – Deployment



Prompt



Prepare the application for production deployment. Configure environment variables, PostgreSQL connection, Google Gemini API integration, and verify successful deployment.



Section 8: Definition of Done



The project is complete when:



User authentication works correctly

CRUD operations are fully functional

AI analysis generates all required sections

Sessions can be edited and deleted

Markdown and PDF exports work

Responsive layouts are implemented

Loading and error states are user-friendly

Unit and integration tests pass

README, API documentation, and Security Audit are completed

The application is successfully deployed

