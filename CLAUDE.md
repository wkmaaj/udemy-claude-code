# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Arabic–English dictionary web app. Users create, manage, search, tag, and optionally share word definitions. Each definition pairs an Arabic headword with rich-text English content. Full spec in `docs/SPEC.md`. Read that file for general architectural tasks or to double-check the exact database structure, tech stack, or application architecture.

Keep your replies extremely concise and focus on conveying the key information. No unnecessary fluff, no long code snippets.

Whenever working with any third-party libraries, technologies, or something similar, you MUST look up the official documentation first to ensure that you're working with up-to-date information.
Use the DocsExplorer subagent for efficient documentation lookup.

## Tech Stack

- **Runtime/package manager:** Bun (use `bun` not `npm`/`yarn`/`pnpm`)
- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/postcss`)
- **Auth:** better-auth (sessions in SQLite, email/password + Google/GitHub OAuth)
- **Rich text:** TipTap (JSON document storage)
- **Database:** SQLite via `bun:sqlite` — raw parameterized SQL, no ORM
- **Validation:** Zod

## Commands

| Task       | Command         |
| ---------- | --------------- |
| Dev server | `bun dev`       |
| Build      | `bun run build` |
| Start prod | `bun start`     |
| Lint       | `bun lint`      |

## Architecture

This is early-stage — the app was just scaffolded with `create-next-app`. The planned architecture from the spec:

- `app/(auth)/` — login/register pages
- `app/(dashboard)/definitions/` — CRUD views for definitions
- `app/(dashboard)/tags/` — tag management
- `app/shared/[slug]/` — public read-only shared definition page
- `app/api/auth/[...all]/` — better-auth catch-all handler
- `app/api/definitions/` — definition CRUD + share/unshare routes
- `app/api/tags/` — tag CRUD routes
- `components/editor/` — TipTap editor + toolbar
- `lib/auth.ts` — better-auth server config
- `lib/auth-client.ts` — better-auth client helpers
- `lib/db.ts` — Bun SQLite connection + schema init

## Key Conventions

- Path alias: `@/*` maps to project root
- Database: raw SQL with parameterized queries via `bun:sqlite` — no ORM
- Auth tables (`user`, `session`, `account`, `verification`) are managed by better-auth
- App tables (`definitions`, `tags`, `definition_tags`) use snake_case columns
- Full-text search via SQLite FTS5
- Arabic text fields use `dir="rtl"`; app shell is LTR
- TipTap content stored as stringified JSON in the `content` column
