# BA Copilot REST API Documentation

Welcome to the BA Copilot REST API documentation. This document describes the available API endpoints, authentication mechanisms, request/response formats, and error handling for the BA Copilot application.

---

## Global API Information

### Base URL
All API requests are prefixed with:
```
/api
```
*(e.g., `http://localhost:3000/api` in development)*

### Content-Type
All request bodies must be sent in JSON format with the header:
```http
Content-Type: application/json
```

---

## Authentication Mechanism

Authentication is managed via stateless **JSON Web Tokens (JWT)**.

Endpoints marked with **Authentication Required: Yes** require a valid JWT token passed in the `Authorization` request header as a Bearer token:

```http
Authorization: Bearer <YOUR_JWT_TOKEN>
```

### Authentication Failure States
* **401 Unauthorized**: Missing token or invalid Authorization header format.
  ```json
  { "error": "Access token is missing" }
  ```
  or
  ```json
  { "error": "Authorization header format is invalid. Use 'Bearer <token>'" }
  ```
* **403 Forbidden**: Token has expired, has an invalid signature, or fails verification.
  ```json
  { "error": "Token is invalid or expired" }
  ```

---

## Endpoints Index

### Authentication
* [`POST /api/auth/register`](#1-register-user)
* [`POST /api/auth/login`](#2-login-user)

### Sessions
* [`GET /api/sessions`](#3-get-all-sessions)
* [`GET /api/sessions/:id`](#4-get-session-by-id)
* [`POST /api/sessions`](#5-create-session)
* [`PUT /api/sessions/:id`](#6-update-session)
* [`DELETE /api/sessions/:id`](#7-delete-session)

### AI Analysis
* [`POST /api/analysis/generate`](#8-generate-ai-analysis)

### Export
* [`POST /api/export/markdown`](#9-export-to-markdown)
* [`POST /api/export/pdf`](#10-log-pdf-export)

---

## Authentication Endpoints

### 1. Register User
Creates a new user account and returns a JWT access token.

* **HTTP Method**: `POST`
* **URL**: `/api/auth/register`
* **Authentication Required**: No

#### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `name` | String | Yes | Full name of the user. |
| `email` | String | Yes | Must be a valid email format (converted to lowercase). |
| `password` | String | Yes | Must be at least 6 characters in length. |

```json
{
  "name": "Jane Doe",
  "email": "jane@company.com",
  "password": "securePassword123"
}
```

#### Responses
* **201 Created**: Registration successful.
  ```json
  {
    "message": "Registration successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "cm0xbX...8z",
      "name": "Jane Doe",
      "email": "jane@company.com",
      "createdAt": "2026-07-20T20:18:46.000Z"
    }
  }
  ```
* **400 Bad Request**: Validation failure (e.g., missing fields, invalid email format, short password, or email already registered).
  ```json
  { "error": "User with this email already exists" }
  ```

---

### 2. Login User
Authenticates an existing user and returns a JWT token.

* **HTTP Method**: `POST`
* **URL**: `/api/auth/login`
* **Authentication Required**: No

#### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `email` | String | Yes | Log-in email address. |
| `password` | String | Yes | Account password. |

```json
{
  "email": "jane@company.com",
  "password": "securePassword123"
}
```

#### Responses
* **200 OK**: Login successful.
  ```json
  {
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "cm0xbX...8z",
      "name": "Jane Doe",
      "email": "jane@company.com",
      "createdAt": "2026-07-20T20:18:46.000Z"
    }
  }
  ```
* **401 Unauthorized**: Invalid email address or password.
  ```json
  { "error": "Invalid email or password" }
  ```

---

## Session Endpoints

All session endpoints are protected and require a valid Bearer token in the `Authorization` header.

### 3. Get All Sessions
Retrieves all workspace sessions belonging to the authenticated user.

* **HTTP Method**: `GET`
* **URL**: `/api/sessions`
* **Authentication Required**: Yes

#### Request Headers
* `Authorization`: `Bearer <token>`

#### Responses
* **200 OK**: Sessions retrieved successfully. Returns an array of session objects sorted by creation date descending.
  ```json
  [
    {
      "id": "session_abc_123",
      "userId": "cm0xbX...8z",
      "title": "Discovery Meeting with Stakeholders",
      "meetingNotes": "Notes from initial requirements gathering...",
      "createdAt": "2026-07-20T19:30:00.000Z",
      "updatedAt": "2026-07-20T19:45:00.000Z"
    },
    {
      "id": "session_def_456",
      "userId": "cm0xbX...8z",
      "title": "Sprint 3 Refinement",
      "meetingNotes": "",
      "createdAt": "2026-07-20T12:00:00.000Z",
      "updatedAt": "2026-07-20T12:00:00.000Z"
    }
  ]
  ```

---

### 4. Get Session By Id
Retrieves detailed information for a specific session including its raw meeting notes and the structured AI analysis documents.

* **HTTP Method**: `GET`
* **URL**: `/api/sessions/:id`
* **Authentication Required**: Yes
* **Path Parameters**:
  * `id` (String): The unique UUID/ID of the session.

#### Request Headers
* `Authorization`: `Bearer <token>`

#### Responses
* **200 OK**: Session successfully retrieved. Includes the `analysis` field containing the structured requirements analysis.
  ```json
  {
    "id": "session_abc_123",
    "userId": "cm0xbX...8z",
    "title": "Discovery Meeting with Stakeholders",
    "meetingNotes": "Notes from initial requirements gathering...",
    "createdAt": "2026-07-20T19:30:00.000Z",
    "updatedAt": "2026-07-20T19:45:00.000Z",
    "analysis": {
      "id": "analysis_xyz_999",
      "sessionId": "session_abc_123",
      "executiveSummary": "This system provides user authentication and responsive dashboards.",
      "functionalRequirements": [
        "The system must secure credential storage.",
        "The system must provide cross-browser responsive grids."
      ],
      "userStories": [
        {
          "title": "Secure authentication",
          "story": "As a user, I want to authenticate so that my workspace is protected.",
          "acceptanceCriteria": [
            "Given a registered credential, when submitted, access token is issued."
          ]
        }
      ],
      "acceptanceCriteria": null,
      "risks": [
        "High security risk on credential transport if SSL is not configured."
      ],
      "assumptions": [
        "Database layer uses standard PostgreSQL."
      ],
      "clarifyingQuestions": [
        "Should we support single sign-on (SSO)?"
      ],
      "createdAt": "2026-07-20T19:40:00.000Z",
      "updatedAt": "2026-07-20T19:45:00.000Z"
    }
  }
  ```
* **404 Not Found**: Session does not exist or does not belong to the user.
  ```json
  { "error": "Session not found" }
  ```
* **403 Forbidden**: Requesting user does not have permission to view this session.
  ```json
  { "error": "Forbidden" }
  ```

---

### 5. Create Session
Creates a new session to organize raw meeting notes.

* **HTTP Method**: `POST`
* **URL**: `/api/sessions`
* **Authentication Required**: Yes

#### Request Headers
* `Authorization`: `Bearer <token>`

#### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `title` | String | Yes | Title of the analysis session. |
| `meetingNotes` | String | No | Initial meeting notes text. Defaults to empty string. |

```json
{
  "title": "New Platform Specifications",
  "meetingNotes": "Notes on billing portal integration requirements..."
}
```

#### Responses
* **201 Created**: Session created successfully.
  ```json
  {
    "id": "new_sess_789",
    "userId": "cm0xbX...8z",
    "title": "New Platform Specifications",
    "meetingNotes": "Notes on billing portal integration requirements...",
    "createdAt": "2026-07-20T20:25:00.000Z",
    "updatedAt": "2026-07-20T20:25:00.000Z"
  }
  ```
* **400 Bad Request**: Title is missing or blank.
  ```json
  { "error": "Title and meeting notes are required" }
  ```

---

### 6. Update Session
Updates a session's metadata (e.g. title, meeting notes) or updates/manually refines the saved structured AI Analysis.

* **HTTP Method**: `PUT`
* **URL**: `/api/sessions/:id`
* **Authentication Required**: Yes
* **Path Parameters**:
  * `id` (String): The unique ID of the session.

#### Request Headers
* `Authorization`: `Bearer <token>`

#### Request Body
All fields are optional.

| Field | Type | Description |
|---|---|---|
| `title` | String | New session title. |
| `meetingNotes` | String | Updated raw meeting notes content. |
| `analysis` | Object | Full manually-edited structured requirements payload to override the existing saved AI analysis. |

##### Example Body (Updating Title and editing Analysis):
```json
{
  "title": "Refined Platform Specifications",
  "analysis": {
    "executiveSummary": "Refined executive summary after BA edits.",
    "functionalRequirements": [
      "The system must secure credential storage with bcrypt.",
      "The layout must render smoothly on 1080p and mobile viewport ratios."
    ],
    "userStories": [
      {
        "title": "Secure authentication using JWT",
        "story": "As a user, I want to authenticate securely using a signed stateless JWT token.",
        "acceptanceCriteria": [
          "Token verified on every API request",
          "Graceful login/logout triggers"
        ]
      }
    ],
    "risks": [
      "No security risks identified under current scope."
    ],
    "assumptions": [
      "PostgreSQL and Prisma ORM are configured."
    ],
    "clarifyingQuestions": []
  }
}
```

#### Responses
* **200 OK**: Session and/or analysis updated successfully.
  ```json
  {
    "message": "Session updated successfully",
    "session": {
      "id": "session_abc_123",
      "userId": "cm0xbX...8z",
      "title": "Refined Platform Specifications",
      "meetingNotes": "Notes on billing portal integration requirements...",
      "createdAt": "2026-07-20T20:25:00.000Z",
      "updatedAt": "2026-07-20T20:28:00.000Z"
    },
    "analysis": {
      "id": "analysis_xyz_999",
      "sessionId": "session_abc_123",
      "executiveSummary": "Refined executive summary after BA edits.",
      "functionalRequirements": [
        "The system must secure credential storage with bcrypt.",
        "The layout must render smoothly on 1080p and mobile viewport ratios."
      ],
      "userStories": [
        {
          "title": "Secure authentication using JWT",
          "story": "As a user, I want to authenticate securely using a signed stateless JWT token.",
          "acceptanceCriteria": [
            "Token verified on every API request",
            "Graceful login/logout triggers"
          ]
        }
      ],
      "acceptanceCriteria": null,
      "risks": [
        "No security risks identified under current scope."
      ],
      "assumptions": [
        "PostgreSQL and Prisma ORM are configured."
      ],
      "clarifyingQuestions": [],
      "updatedAt": "2026-07-20T20:28:00.000Z"
    }
  }
  ```
* **403 Forbidden**: Requesting user does not own the target session.
  ```json
  { "error": "Forbidden" }
  ```
* **404 Not Found**: Session does not exist.
  ```json
  { "error": "Session not found" }
  ```

---

### 7. Delete Session
Securely deletes a session and automatically cascades the deletion to remove any of its related structured AI Analyses and export logs from the database.

* **HTTP Method**: `DELETE`
* **URL**: `/api/sessions/:id`
* **Authentication Required**: Yes
* **Path Parameters**:
  * `id` (String): The unique ID of the session.

#### Request Headers
* `Authorization`: `Bearer <token>`

#### Responses
* **200 OK**: Session and cascade dependencies successfully deleted.
  ```json
  { "message": "Session and related documents deleted successfully" }
  ```
* **403 Forbidden**: Requesting user does not own the target session (prevents Insecure Direct Object Reference).
  ```json
  { "error": "Forbidden" }
  ```
* **404 Not Found**: Session does not exist.
  ```json
  { "error": "Session not found" }
  ```

---

## AI Analysis Endpoint

### 8. Generate AI Analysis
Triggers the Google Gemini AI analysis orchestrator over the session's meeting notes. Returns the structured business requirements document. This endpoint incorporates rate-limit retries and automatic fallbacks to `gemini-3.1-flash-lite`.

* **HTTP Method**: `POST`
* **URL**: `/api/analysis/generate`
* **Authentication Required**: Yes

#### Request Headers
* `Authorization`: `Bearer <token>`

#### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `sessionId` | String | Yes | ID of the session whose meeting notes will be analyzed. |

```json
{
  "sessionId": "session_abc_123"
}
```

#### Responses
* **200 OK**: Analysis generated and saved/updated in database successfully.
  ```json
  {
    "id": "analysis_xyz_999",
    "sessionId": "session_abc_123",
    "executiveSummary": "This platform provides user management and role controls.",
    "functionalRequirements": [
      "The system must secure access token cookies.",
      "The system must offer robust session invalidations."
    ],
    "userStories": [
      {
        "title": "Role-based views",
        "story": "As an administrator, I want to access roles so that I can audit user permissions.",
        "acceptanceCriteria": [
          "Admin flag present on session token displays active access control layouts."
        ]
      }
    ],
    "acceptanceCriteria": null,
    "risks": [
      "Potential token hijack if transport layer TLS certificates are misconfigured."
    ],
    "assumptions": [
      "Prisma ORM handles dynamic connection pooling."
    ],
    "clarifyingQuestions": [
      "What is the token expiration duration goal?"
    ],
    "createdAt": "2026-07-20T20:26:00.000Z",
    "updatedAt": "2026-07-20T20:26:00.000Z"
  }
  ```
* **400 Bad Request**: Missing session ID or meeting notes are empty.
  ```json
  { "error": "Cannot analyze empty meeting notes" }
  ```
* **403 Forbidden**: User does not own the requested session.
  ```json
  { "error": "Forbidden" }
  ```
* **404 Not Found**: Session not found.
  ```json
  { "error": "Session not found" }
  ```
* **500 Internal Server Error**: Gemini AI error, schema parsing failures, or connection errors.
  ```json
  { "error": "AI generation failed" }
  ```

---

## Export Endpoints

### 9. Export to Markdown
Generates an optimized, beautifully styled Markdown document layout from a structured analysis payload and logs the export action in the database.

* **HTTP Method**: `POST`
* **URL**: `/api/export/markdown`
* **Authentication Required**: Yes

#### Request Headers
* `Authorization`: `Bearer <token>`

#### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `sessionId` | String | Yes | ID of the export session. |
| `title` | String | No | Document header title. Defaults to "Business Analysis Document". |
| `analysis` | Object | Yes | The structured analysis document to convert. |

```json
{
  "sessionId": "session_abc_123",
  "title": "Discovery Phase Specification",
  "analysis": {
    "executiveSummary": "Core specifications of the user portal.",
    "functionalRequirements": ["Requirements detail one.", "Requirements detail two."],
    "userStories": [
      {
        "title": "Admin dashboard",
        "story": "As an admin, I want to view a dashboard...",
        "acceptanceCriteria": ["AC 1", "AC 2"]
      }
    ],
    "risks": ["Risk 1"],
    "assumptions": ["Assumption 1"],
    "clarifyingQuestions": ["Question 1"]
  }
}
```

#### Responses
* **200 OK**: Markdown layout generated successfully.
  ```json
  {
    "markdown": "# Discovery Phase Specification\n\n*Generated by BA Copilot on 7/20/2026*\n\n## Executive Summary\n\nCore specifications of the user portal.\n\n## Functional Requirements\n\n1. Requirements detail one.\n2. Requirements detail two.\n\n## User Stories & Acceptance Criteria\n\n### US-1: Admin dashboard\n\n**User Story:**\n> As an admin, I want to view a dashboard...\n\n**Acceptance Criteria:**\n- [ ] AC 1\n- [ ] AC 2\n\n## Identified Risks\n\n- Risk 1\n\n## Assumptions\n\n- Assumption 1\n\n## Clarifying Questions\n\n- Question 1\n\n"
  }
  ```
* **403 Forbidden**: Requesting user does not own the target session.
  ```json
  { "error": "Forbidden: You do not own this session" }
  ```
* **404 Not Found**: Session not found.
  ```json
  { "error": "Session not found" }
  ```

---

### 10. Log PDF Export
Logs and registers a PDF document export event in the `ExportRecord` schema database for tracking and audit logs, ensuring compliance and access telemetry.

* **HTTP Method**: `POST`
* **URL**: `/api/export/pdf`
* **Authentication Required**: Yes

#### Request Headers
* `Authorization`: `Bearer <token>`

#### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `sessionId` | String | Yes | ID of the export session. |

```json
{
  "sessionId": "session_abc_123"
}
```

#### Responses
* **200 OK**: PDF export action logged successfully.
  ```json
  {
    "success": true,
    "message": "PDF export action logged."
  }
  ```
* **403 Forbidden**: Requesting user does not own the target session.
  ```json
  { "error": "Forbidden: You do not own this session" }
  ```
* **404 Not Found**: Session not found.
  ```json
  { "error": "Session not found" }
  ```
