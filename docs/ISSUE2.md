# Issue #2 — FTS `content_text` Stores Raw TipTap JSON Instead of Plain Text

## Summary

The SQLite FTS5 index for definition content is populated with the raw TipTap JSON string rather than a plain-text extraction. This causes degraded and incorrect full-text search behaviour.

---

## Background

The spec (§3.4) defines a full-text search virtual table:

```sql
CREATE VIRTUAL TABLE definitions_fts USING fts5(
  arabic_word,
  content_text,
  content=definitions,
  content_rowid=rowid
);
```

The intent is that `content_text` holds **a plain-text extraction of the TipTap JSON** — the human-readable words only, stripped of all markup and structure. This is what FTS5 tokenises and indexes for search queries.

---

## The Bug

### What TipTap actually stores

When a user writes a definition, TipTap serialises the document to a JSON structure like this:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "Meaning" }]
    },
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "To go or travel somewhere quickly." }]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [{ "type": "text", "text": "Used in formal Arabic." }]
            }
          ]
        }
      ]
    }
  ]
}
```

This is stored as a stringified JSON blob in `definitions.content`.

### What the FTS trigger does

In `lib/db.ts`, the INSERT trigger is:

```sql
CREATE TRIGGER IF NOT EXISTS definitions_fts_insert AFTER INSERT ON definitions BEGIN
  INSERT INTO definitions_fts(rowid, arabic_word, content_text)
  VALUES (new.rowid, new.arabic_word, new.content);  -- new.content is the raw JSON string
END;
```

`new.content` is the raw TipTap JSON string. The trigger inserts the entire JSON blob directly into `content_text`. The same problem exists in the UPDATE trigger.

### What FTS5 indexes as a result

FTS5 tokenises the raw JSON string. The resulting search index contains not just the user's words but also all JSON structural tokens:

```
type doc content heading attrs level paragraph text meaning
bulletList listItem used formal arabic go travel somewhere quickly
```

Structural tokens like `type`, `doc`, `content`, `heading`, `attrs`, `level`, `paragraph`, `bulletList`, `listItem` are indexed alongside actual definition words.

---

## Consequences

### 1. False positives

Searching for `"type"`, `"content"`, `"paragraph"`, `"level"`, or `"doc"` will match **every single definition** in the database, since every TipTap document contains these JSON keys. This makes those search terms completely useless.

### 2. Noise in ranked results

FTS5 uses BM25 scoring for result ranking. The frequency of JSON structural tokens inflates term frequencies across all documents, skewing relevance scores and causing legitimate matches to be ranked incorrectly.

### 3. Broken search for words that collide with JSON keys

If a user writes a definition that legitimately mentions "type" or "content" in the English text, those matches will be buried among every other definition in the database. The signal-to-noise ratio makes search unreliable.

### 4. Arabic content is unaffected but English content is polluted

`arabic_word` is stored as a plain string and is indexed correctly. The damage is confined to `content_text`, which covers the English rich-text body.

---

## Why a SQLite Trigger Cannot Fix This

SQLite triggers execute inside the database engine. They have access only to SQL expressions — they cannot call JavaScript, walk a JSON tree recursively, or concatenate nested text node values across arbitrary depth. The plain-text extraction of TipTap JSON requires application-layer code.

SQLite does have `json_extract()`, but the TipTap JSON structure has arbitrary nesting depth and no fixed path to all text nodes. A single `json_extract(new.content, '$.content[0].content[0].text')` would only ever reach the first text node of the first block — useless for real documents.

---

## Potential Solutions

### Option A — Extract plain text at the API layer, store in a dedicated column (recommended)

Add a `content_text TEXT` column to the `definitions` table. When the API handles POST and PATCH, extract plain text from the TipTap JSON in TypeScript before inserting into the database. The existing FTS triggers then read `new.content_text` (a clean string) instead of `new.content`.

**Schema change** (`lib/db.ts`):

```sql
CREATE TABLE IF NOT EXISTS definitions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  arabic_word TEXT NOT NULL,
  content     TEXT NOT NULL,
  content_text TEXT NOT NULL DEFAULT '',  -- plain-text extraction
  is_public   INTEGER NOT NULL DEFAULT 0,
  share_slug  TEXT UNIQUE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Updated trigger** (`lib/db.ts`):

```sql
CREATE TRIGGER IF NOT EXISTS definitions_fts_insert AFTER INSERT ON definitions BEGIN
  INSERT INTO definitions_fts(rowid, arabic_word, content_text)
  VALUES (new.rowid, new.arabic_word, new.content_text);  -- now reads plain text
END;
```

**TypeScript extraction helper** (e.g., `lib/utils.ts`):

```ts
type TipTapNode = {
  type: string;
  text?: string;
  content?: TipTapNode[];
};

export function extractPlainText(node: TipTapNode): string {
  if (node.type === 'text' && node.text) return node.text;
  if (!node.content) return '';
  return node.content.map(extractPlainText).join(' ');
}
```

**API usage** (POST/PATCH handler):

```ts
const tipTapDoc = JSON.parse(body.content);
const plainText = extractPlainText(tipTapDoc);

db.run(
  `INSERT INTO definitions (id, user_id, arabic_word, content, content_text, ...) VALUES (?, ?, ?, ?, ?, ...)`,
  [id, userId, arabicWord, body.content, plainText, ...]
);
```

**Pros:** Clean separation. The FTS index only ever contains human-readable text. No changes needed to the trigger logic beyond pointing at the right column.

**Cons:** Requires a schema migration (adding the column). The `content_text` column duplicates data but in a fundamentally different form, so the storage overhead is acceptable.

---

### Option B — Bypass triggers; insert into FTS manually from the API

Keep the schema as-is (no new column) but delete the triggers and manage FTS population entirely from the API layer.

**Remove triggers** from `lib/db.ts`.

**In each API handler**, after writing to `definitions`, manually update the FTS table:

```ts
// INSERT
db.run(`INSERT INTO definitions_fts(rowid, arabic_word, content_text) VALUES (?, ?, ?)`, [
  rowid,
  arabicWord,
  plainText,
]);

// UPDATE
db.run(
  `INSERT INTO definitions_fts(definitions_fts, rowid, arabic_word, content_text) VALUES ('delete', ?, ?, ?)`,
  [oldRowid, oldArabicWord, oldContentText],
);
db.run(`INSERT INTO definitions_fts(rowid, arabic_word, content_text) VALUES (?, ?, ?)`, [
  newRowid,
  newArabicWord,
  newPlainText,
]);

// DELETE
db.run(
  `INSERT INTO definitions_fts(definitions_fts, rowid, arabic_word, content_text) VALUES ('delete', ?, ?, ?)`,
  [rowid, arabicWord, contentText],
);
```

**Pros:** No schema change. The `definitions` table stays as currently designed.

**Cons:** FTS synchronisation logic is now scattered across three separate API handlers. Easy to forget one and end up with a stale index. Triggers exist precisely to prevent this class of bug.

---

### Option C — Run a backfill migration + switch to Option A

If there is already data in the database with the corrupted FTS index (e.g., during development), a one-time migration is needed:

1. Add the `content_text` column to `definitions`.
2. Rebuild the FTS index:

```sql
INSERT INTO definitions_fts(definitions_fts) VALUES ('rebuild');
```

3. Deploy the updated triggers (reading from `content_text`).
4. Backfill `content_text` for existing rows via a migration script that reads each row, extracts plain text in TypeScript, and writes it back.

---

## Recommendation

Use **Option A**. Adding `content_text` to the `definitions` table is a one-line schema change at this early stage (no existing production data). It keeps FTS synchronisation inside the database via triggers (the right place for it), ensures the FTS index is always consistent, and keeps the API handlers free of index management boilerplate.

The `extractPlainText` helper is small (~10 lines), easily testable, and can live in `lib/utils.ts` alongside the slug generation utility.
