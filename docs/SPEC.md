# Technical Specification — Arabic–English Dictionary Web Application

**Version 1.0 · March 2026**

**Stack:** Next.js · Bun · TypeScript · Tailwind CSS · SQLite · TipTap · better-auth

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Authentication](#2-authentication)
3. [Data Model](#3-data-model)
4. [API Design](#4-api-design)
5. [Rich Text Editor](#5-rich-text-editor)
6. [Bilingual & RTL Support](#6-bilingual--rtl-support)
7. [Search, Tags & Sorting](#7-search-tags--sorting)
8. [Public Sharing](#8-public-sharing)
9. [Project Structure](#9-project-structure)
10. [UI / UX Considerations](#10-ui--ux-considerations)
11. [Security Considerations](#11-security-considerations)
12. [Future Considerations](#12-future-considerations)

---

## 1. Project Overview

### 1.1 Purpose

This document defines the technical specification for an Arabic–English dictionary web application. The app allows authenticated users to create, manage, and optionally share word definitions. Each definition pairs an Arabic word with an English explanation authored through a rich text editor.

The application is conceptually similar to a note-taking app: users maintain a personal collection of word definitions they can search, tag, sort, and selectively publish via shareable links.

### 1.2 Technology Stack

| Layer                     | Technology                                   |
| ------------------------- | -------------------------------------------- |
| Runtime & package manager | Bun                                          |
| Framework                 | Next.js (App Router)                         |
| Language                  | TypeScript                                   |
| Styling                   | Tailwind CSS                                 |
| Authentication            | better-auth                                  |
| Rich text editor          | TipTap                                       |
| Database                  | SQLite via Bun's built-in SQLite client      |
| Data format               | JSON (TipTap document stored as JSON column) |

### 1.3 Key Requirements

- Full CRUD operations on word definitions (authenticated users only)
- Rich text editing with TipTap (bold, italic, headings, code, lists, separators)
- Public sharing via unique shareable links per definition
- Bidirectional script support (Arabic RTL + English LTR)
- Search across Arabic and English content
- Tag-based categorization
- Sorting (alphabetical, by date)
- Authentication via email/password and OAuth (Google, GitHub)

---

## 2. Authentication

### 2.1 Provider: better-auth

The app uses the better-auth library for all authentication flows. better-auth is configured as a Next.js API route handler and manages sessions, tokens, and provider integration.

### 2.2 Supported Methods

| Method           | Details                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Email / Password | Classic credential-based registration and login. Passwords hashed via better-auth defaults (bcrypt/argon2). Email verification recommended. |
| OAuth – Google   | Sign in with Google. Requires a Google Cloud OAuth 2.0 client ID and secret.                                                                |
| OAuth – GitHub   | Sign in with GitHub. Requires a GitHub OAuth App client ID and secret.                                                                      |

### 2.3 Session Management

better-auth handles session creation and validation. Sessions are stored server-side in the SQLite database. A session token is sent to the client as an HTTP-only cookie. All mutating API routes (create, update, delete, share, unshare) must validate the session and reject unauthenticated requests with a `401` status.

### 2.4 Auth Database Tables

better-auth requires its own tables. These are created automatically by the library or via its CLI (`npx auth@latest migrate`). The core tables are:

#### `user`

| Column          | Type    | Constraints | Description                              |
| --------------- | ------- | ----------- | ---------------------------------------- |
| `id`            | TEXT    | PRIMARY KEY | Unique identifier for each user          |
| `name`          | TEXT    | NOT NULL    | User's chosen display name               |
| `email`         | TEXT    | NOT NULL    | User's email address                     |
| `emailVerified` | INTEGER | NOT NULL    | Whether the user's email is verified     |
| `image`         | TEXT    |             | User's image URL (optional)              |
| `createdAt`     | TEXT    | NOT NULL    | Timestamp of when the user was created   |
| `updatedAt`     | TEXT    | NOT NULL    | Timestamp of the last update to the user |

#### `session`

| Column      | Type | Constraints              | Description                               |
| ----------- | ---- | ------------------------ | ----------------------------------------- |
| `id`        | TEXT | PRIMARY KEY              | Unique identifier for each session        |
| `userId`    | TEXT | NOT NULL, FK → `user.id` | The ID of the user                        |
| `token`     | TEXT | NOT NULL, UNIQUE         | The unique session token                  |
| `expiresAt` | TEXT | NOT NULL                 | The time when the session expires         |
| `ipAddress` | TEXT |                          | The IP address of the device (optional)   |
| `userAgent` | TEXT |                          | The user agent of the device (optional)   |
| `createdAt` | TEXT | NOT NULL                 | Timestamp of when the session was created |
| `updatedAt` | TEXT | NOT NULL                 | Timestamp of when the session was updated |

#### `account`

| Column                  | Type | Constraints              | Description                                                                       |
| ----------------------- | ---- | ------------------------ | --------------------------------------------------------------------------------- |
| `id`                    | TEXT | PRIMARY KEY              | Unique identifier for each account                                                |
| `userId`                | TEXT | NOT NULL, FK → `user.id` | The ID of the user                                                                |
| `accountId`             | TEXT | NOT NULL                 | The account ID from the SSO provider (or equal to userId for credential accounts) |
| `providerId`            | TEXT | NOT NULL                 | The ID of the provider (e.g., `credential`, `google`, `github`)                   |
| `accessToken`           | TEXT |                          | Access token returned by the provider (optional)                                  |
| `refreshToken`          | TEXT |                          | Refresh token returned by the provider (optional)                                 |
| `accessTokenExpiresAt`  | TEXT |                          | Expiration time of the access token (optional)                                    |
| `refreshTokenExpiresAt` | TEXT |                          | Expiration time of the refresh token (optional)                                   |
| `scope`                 | TEXT |                          | OAuth scope returned by the provider (optional)                                   |
| `idToken`               | TEXT |                          | ID token returned from the provider (optional)                                    |
| `password`              | TEXT |                          | Hashed password for email/password authentication (optional)                      |
| `createdAt`             | TEXT | NOT NULL                 | Timestamp of when the account was created                                         |
| `updatedAt`             | TEXT | NOT NULL                 | Timestamp of when the account was updated                                         |

#### `verification`

| Column       | Type | Constraints | Description                                            |
| ------------ | ---- | ----------- | ------------------------------------------------------ |
| `id`         | TEXT | PRIMARY KEY | Unique identifier for each verification                |
| `identifier` | TEXT | NOT NULL    | The identifier for the verification request            |
| `value`      | TEXT | NOT NULL    | The value to be verified                               |
| `expiresAt`  | TEXT | NOT NULL    | The time when the verification request expires         |
| `createdAt`  | TEXT | NOT NULL    | Timestamp of when the verification request was created |
| `updatedAt`  | TEXT | NOT NULL    | Timestamp of when the verification request was updated |

---

## 3. Data Model

### 3.1 Database: SQLite

The application uses Bun's built-in SQLite client (`bun:sqlite`) with raw SQL statements. No ORM is used. All queries are parameterized to prevent SQL injection.

### 3.2 Application Tables

#### 3.2.1 `definitions`

Stores every word definition created by users.

| Column        | Type    | Constraints                        | Description                                         |
| ------------- | ------- | ---------------------------------- | --------------------------------------------------- |
| `id`          | TEXT    | PRIMARY KEY                        | UUID (`crypto.randomUUID()`)                        |
| `user_id`     | TEXT    | NOT NULL, FK → `user.id`           | Owner of the definition                             |
| `arabic_word` | TEXT    | NOT NULL                           | The Arabic headword                                 |
| `content`     | TEXT    | NOT NULL                           | TipTap JSON document (stringified)                  |
| `is_public`   | INTEGER | NOT NULL DEFAULT 0                 | 0 = private, 1 = publicly shared                    |
| `share_slug`  | TEXT    | UNIQUE                             | URL-friendly slug for public link (null if private) |
| `created_at`  | TEXT    | NOT NULL DEFAULT `datetime('now')` | ISO 8601 creation timestamp                         |
| `updated_at`  | TEXT    | NOT NULL DEFAULT `datetime('now')` | ISO 8601 last-update timestamp                      |

#### 3.2.2 `tags`

Lookup table for reusable tags.

| Column    | Type | Constraints              | Description             |
| --------- | ---- | ------------------------ | ----------------------- |
| `id`      | TEXT | PRIMARY KEY              | UUID                    |
| `user_id` | TEXT | NOT NULL, FK → `user.id` | Tag owner               |
| `name`    | TEXT | NOT NULL                 | Display name of the tag |

Unique constraint on `(user_id, name)` to prevent duplicate tag names per user.

#### 3.2.3 `definition_tags`

Many-to-many join table linking definitions to tags.

| Column          | Type | Constraints                     | Description             |
| --------------- | ---- | ------------------------------- | ----------------------- |
| `definition_id` | TEXT | NOT NULL, FK → `definitions.id` | References a definition |
| `tag_id`        | TEXT | NOT NULL, FK → `tags.id`        | References a tag        |

Composite primary key on `(definition_id, tag_id)`. Cascade delete when either parent is removed.

### 3.3 Indexes

- `definitions(user_id)` — fast lookup of a user's definitions
- `definitions(share_slug)` — fast public link resolution (already UNIQUE)
- `definitions(arabic_word)` — accelerate search by headword
- `tags(user_id, name)` — unique constraint doubles as lookup index
- `definition_tags(definition_id)` and `definition_tags(tag_id)` — fast join traversal

### 3.4 Full-Text Search

SQLite FTS5 is used for searching across both Arabic and English content. An FTS virtual table is created alongside the definitions table:

```sql
CREATE VIRTUAL TABLE definitions_fts USING fts5(
  arabic_word,
  content_text,
  content=definitions,
  content_rowid=rowid
);
```

The `content_text` column stores a plain-text extraction of the TipTap JSON (stripped of formatting). Triggers on INSERT, UPDATE, and DELETE keep the FTS index synchronized with the definitions table. Queries use the `MATCH` operator for ranked results.

---

## 4. API Design

### 4.1 Routing Strategy

All server-side logic is implemented as Next.js App Router route handlers under `/app/api/`. better-auth is mounted as a catch-all route. Definition and tag endpoints use RESTful conventions.

### 4.2 Endpoints

#### 4.2.1 Authentication (better-auth)

| Method | Path                 | Description                                                                          |
| ------ | -------------------- | ------------------------------------------------------------------------------------ |
| ALL    | `/api/auth/[...all]` | Catch-all handled by better-auth (login, register, OAuth callbacks, session, logout) |

#### 4.2.2 Definitions

| Method | Path                           | Auth | Description                                                         |
| ------ | ------------------------------ | ---- | ------------------------------------------------------------------- |
| GET    | `/api/definitions`             | Yes  | List current user's definitions (supports `?q=`, `?tag=`, `?sort=`) |
| POST   | `/api/definitions`             | Yes  | Create a new definition                                             |
| GET    | `/api/definitions/:id`         | Yes  | Get a single definition (must own it)                               |
| PATCH  | `/api/definitions/:id`         | Yes  | Update a definition (must own it)                                   |
| DELETE | `/api/definitions/:id`         | Yes  | Delete a definition (must own it)                                   |
| POST   | `/api/definitions/:id/share`   | Yes  | Generate `share_slug` and set `is_public = 1`                       |
| POST   | `/api/definitions/:id/unshare` | Yes  | Clear `share_slug` and set `is_public = 0`                          |
| GET    | `/api/shared/:slug`            | No   | Public read-only view of a shared definition                        |

#### 4.2.3 Tags

| Method | Path            | Auth | Description                                      |
| ------ | --------------- | ---- | ------------------------------------------------ |
| GET    | `/api/tags`     | Yes  | List all tags for the current user               |
| POST   | `/api/tags`     | Yes  | Create a new tag                                 |
| DELETE | `/api/tags/:id` | Yes  | Delete a tag (cascades removal from definitions) |

### 4.3 Request / Response Shapes

#### 4.3.1 Create Definition — `POST /api/definitions`

**Request body:**

```json
{
  "arabic_word": "string",
  "content": {
    /* TipTap JSON */
  },
  "tag_ids": ["uuid", "..."]
}
```

**Response (`201`):**

```json
{
  "id": "uuid",
  "arabic_word": "...",
  "content": {},
  "is_public": false,
  "share_slug": null,
  "tags": [],
  "created_at": "...",
  "updated_at": "..."
}
```

#### 4.3.2 Update Definition — `PATCH /api/definitions/:id`

**Request body** (all fields optional):

```json
{
  "arabic_word": "string",
  "content": {
    /* TipTap JSON */
  },
  "tag_ids": ["uuid", "..."]
}
```

#### 4.3.3 Share Definition — `POST /api/definitions/:id/share`

**Response (`200`):**

```json
{
  "share_slug": "abc123xyz",
  "share_url": "https://yourdomain.com/shared/abc123xyz"
}
```

### 4.4 Error Responses

| Status | Meaning               | When                                                           |
| ------ | --------------------- | -------------------------------------------------------------- |
| 400    | Bad Request           | Validation failure (missing `arabic_word`, invalid JSON, etc.) |
| 401    | Unauthorized          | No valid session                                               |
| 403    | Forbidden             | Attempting to access/modify another user's resource            |
| 404    | Not Found             | Definition or tag does not exist                               |
| 500    | Internal Server Error | Unexpected failure                                             |

---

## 5. Rich Text Editor

### 5.1 TipTap Configuration

TipTap is used as the rich text editor for definition content. It runs client-side as a React component and produces a JSON document structure that is stored directly in the database.

### 5.2 Enabled Extensions

| Extension             | Purpose                                                                   |
| --------------------- | ------------------------------------------------------------------------- |
| StarterKit            | Base extension bundle (includes Document, Paragraph, Text, History, etc.) |
| Bold                  | Inline bold formatting (included in StarterKit)                           |
| Italic                | Inline italic formatting (included in StarterKit)                         |
| Heading               | Heading levels 1–3 plus normal text (configured: `levels: [1, 2, 3]`)     |
| Code                  | Inline code formatting                                                    |
| CodeBlock             | Fenced code block for code snippets                                       |
| BulletList + ListItem | Unordered bullet-point lists                                              |
| HorizontalRule        | Horizontal separator line                                                 |
| Placeholder           | Ghost text when editor is empty (e.g., "Write your definition…")          |
| TextDirection         | Automatic or manual RTL/LTR detection for Arabic and English content      |

### 5.3 Editor Toolbar

The toolbar presents the following controls in order: text style dropdown (Normal, Heading 1–3), bold toggle, italic toggle, inline code toggle, code block toggle, bullet list toggle, horizontal rule insert. The toolbar should be visually minimal and consistent with the app's design language.

### 5.4 Storage Format

TipTap's JSON output is stored as a stringified JSON string in the `definitions.content` column. On read, it is parsed and fed back into the editor. For the public shared view (read-only), the JSON is rendered using TipTap's read-only mode (`editable: false`) or a static HTML renderer.

---

## 6. Bilingual & RTL Support

### 6.1 Layout Strategy

The app must handle both Arabic (RTL) and English (LTR) scripts gracefully. The overall application shell is LTR (English UI). Arabic content within definitions uses RTL rendering.

### 6.2 Implementation Details

- The `arabic_word` input field uses `dir="rtl"` to ensure correct cursor and text flow.
- Within TipTap, the TextDirection extension auto-detects script direction per block. Users can also override direction manually.
- Tailwind's RTL utilities (`rtl:` prefix) are used where needed for layout adjustments.
- Font stack: specify Arabic-friendly fonts (e.g., Noto Sans Arabic, Amiri) alongside Latin fonts. Load via `next/font` or Google Fonts.
- The shared public view also respects directional settings embedded in the TipTap JSON.

---

## 7. Search, Tags & Sorting

### 7.1 Search

Search is powered by SQLite FTS5. When a user types a query, the API searches both `arabic_word` and the plain-text content of definitions. Results are ranked by FTS5's built-in BM25 scoring.

The search input should support mixed Arabic and English input. Debounce search requests on the client (300ms recommended) to avoid excessive API calls during typing.

### 7.2 Tags

Tags are user-scoped: each user manages their own set of tags. Tags are created inline when editing a definition (type-to-search with an option to create a new tag) or managed in a dedicated tags section. A definition can have zero or more tags. Filtering by tag narrows the definition list to only those with the selected tag.

### 7.3 Sorting

The definitions list supports the following sort options:

- **Alphabetical (A–Z / Z–A)** — sorted by `arabic_word` using Unicode collation
- **Date created** (newest / oldest first)
- **Date updated** (newest / oldest first)

The selected sort preference can be stored in local state or a cookie so it persists across sessions.

---

## 8. Public Sharing

### 8.1 Share Flow

When a user clicks "Share" on a definition, the API generates a unique URL-safe slug (e.g., nanoid, 10–12 characters), stores it in `share_slug`, and sets `is_public = 1`. The client receives the full shareable URL and can copy it to the clipboard.

### 8.2 Unshare Flow

Clicking "Stop sharing" calls the unshare endpoint, which sets `is_public = 0` and clears `share_slug`. Any existing links immediately become invalid (404).

### 8.3 Public View

The route `/shared/:slug` is a publicly accessible page. It fetches the definition by slug (only if `is_public = 1`), renders the TipTap content in read-only mode, and shows the Arabic headword. No authentication is required. If the slug is invalid or the definition is no longer shared, a 404 page is shown.

---

## 9. Project Structure

```
/
├── app/
│   ├── (auth)/                   # Auth pages (login, register)
│   ├── (dashboard)/              # Protected app shell
│   │   ├── definitions/          # List, create, edit views
│   │   └── tags/                 # Tag management
│   ├── shared/[slug]/            # Public shared definition page
│   └── api/
│       ├── auth/[...all]/        # better-auth catch-all
│       ├── definitions/          # CRUD + share/unshare routes
│       └── tags/                 # Tag routes
├── components/
│   ├── editor/                   # TipTap editor + toolbar
│   ├── definitions/              # Definition card, list, form
│   ├── tags/                     # Tag input, tag badges
│   └── ui/                       # Shared UI primitives
├── lib/
│   ├── auth.ts                   # better-auth server config
│   ├── auth-client.ts            # better-auth client helpers
│   ├── db.ts                     # Bun SQLite connection + schema init
│   └── utils.ts                  # Shared helpers (slug generation, etc.)
├── data.db                       # SQLite database file
└── tailwind.config.ts
```

---

## 10. UI / UX Considerations

### 10.1 Page Layout

- Sidebar or top-nav with: definition list, tag filter, search bar, user menu
- Main area: definition editor or read-only view
- Responsive: collapses to single-column on mobile

### 10.2 Definition List View

- Card or row layout showing: Arabic headword, preview snippet of English content, tags, date
- Sort controls and search bar at the top
- Shared status indicator (icon/badge) on public definitions

### 10.3 Definition Editor View

- Arabic word input at the top (RTL, large font)
- TipTap editor below with toolbar
- Tag selector (multi-select with type-ahead)
- Action buttons: Save, Delete, Share / Unshare

### 10.4 Typography

Use a dual font strategy: a Latin font (e.g., Inter) for the UI and English content, and an Arabic font (e.g., Noto Sans Arabic or Amiri) for Arabic text. Font sizes for Arabic headwords should be noticeably larger to aid readability.

---

## 11. Security Considerations

- All definition and tag mutations require authenticated sessions (enforced server-side).
- Ownership checks on every read/write: users can only access their own definitions and tags.
- All SQL queries use parameterized statements to prevent injection.
- TipTap JSON is validated on the server before storage (reject malformed documents).
- Rate limiting on auth endpoints to prevent brute force (consider better-auth plugins or middleware).
- CSRF protection via SameSite cookies (better-auth default behavior).
- Share slugs are generated with sufficient entropy (nanoid, 12+ characters) to prevent guessing.
- Sanitize rendered HTML on the public shared page to prevent XSS if converting JSON to HTML server-side.

---

## 12. Future Considerations

The following features are out of scope for v1 but worth considering for future iterations:

- Export definitions as PDF, Anki flashcard decks, or CSV
- Bulk import from existing dictionaries or spreadsheets
- Collaborative editing (shared workspaces)
- Audio pronunciation attachments (TTS or recorded)
- Spaced repetition / flashcard mode for studying
- Dark mode
- PWA support for offline access
- Migration to PostgreSQL if scaling beyond single-server SQLite
