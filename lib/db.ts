import { Database } from 'bun:sqlite';

const db = new Database('data.db', { create: true });

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS definitions (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    arabic_word TEXT NOT NULL,
    content     TEXT NOT NULL,
    is_public   INTEGER NOT NULL DEFAULT 0,
    share_slug  TEXT UNIQUE,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tags (
    id      TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name    TEXT NOT NULL,
    UNIQUE(user_id, name)
  );

  CREATE TABLE IF NOT EXISTS definition_tags (
    definition_id TEXT NOT NULL REFERENCES definitions(id) ON DELETE CASCADE,
    tag_id        TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (definition_id, tag_id)
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS definitions_fts USING fts5(
    arabic_word,
    content_text,
    content=definitions,
    content_rowid=rowid
  );

  CREATE INDEX IF NOT EXISTS idx_definitions_user_id   ON definitions(user_id);
  CREATE INDEX IF NOT EXISTS idx_definitions_arabic    ON definitions(arabic_word);
  CREATE INDEX IF NOT EXISTS idx_definition_tags_def   ON definition_tags(definition_id);
  CREATE INDEX IF NOT EXISTS idx_definition_tags_tag   ON definition_tags(tag_id);
`);

// FTS sync triggers
db.exec(`
  CREATE TRIGGER IF NOT EXISTS definitions_fts_insert AFTER INSERT ON definitions BEGIN
    INSERT INTO definitions_fts(rowid, arabic_word, content_text)
    VALUES (new.rowid, new.arabic_word, new.content);
  END;

  CREATE TRIGGER IF NOT EXISTS definitions_fts_update AFTER UPDATE ON definitions BEGIN
    INSERT INTO definitions_fts(definitions_fts, rowid, arabic_word, content_text)
    VALUES ('delete', old.rowid, old.arabic_word, old.content);
    INSERT INTO definitions_fts(rowid, arabic_word, content_text)
    VALUES (new.rowid, new.arabic_word, new.content);
  END;

  CREATE TRIGGER IF NOT EXISTS definitions_fts_delete AFTER DELETE ON definitions BEGIN
    INSERT INTO definitions_fts(definitions_fts, rowid, arabic_word, content_text)
    VALUES ('delete', old.rowid, old.arabic_word, old.content);
  END;
`);

export default db;
