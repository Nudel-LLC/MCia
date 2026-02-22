-- MCia Database Schema for Cloudflare D1
-- Auth.js required tables + MCia application tables

----------------------------------------------
-- Auth.js v5 Required Tables
----------------------------------------------

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  "sessionToken" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL,
  expires TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires TEXT NOT NULL,
  PRIMARY KEY (identifier, token)
);

----------------------------------------------
-- Users (Auth.js base + MCia extensions)
----------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  "emailVerified" TEXT,
  image TEXT,
  -- MCia extensions
  line_user_id TEXT,
  stripe_customer_id TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'inactive' CHECK(subscription_status IN ('active', 'inactive', 'trial')),
  gmail_history_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

----------------------------------------------
-- Agencies (所属事務所)
----------------------------------------------

CREATE TABLE IF NOT EXISTS agencies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  email_domain TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agencies_user_id ON agencies(user_id);
CREATE INDEX IF NOT EXISTS idx_agencies_email_domain ON agencies(email_domain);

----------------------------------------------
-- Projects (案件)
----------------------------------------------

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  agency_id TEXT,
  title TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  location TEXT,
  compensation TEXT,
  genre TEXT,
  requires_pr INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'draft_created', 'entered', 'confirmed', 'decline_draft', 'declined', 'expired')),
  source_email_id TEXT,
  draft_email_id TEXT,
  sent_email_id TEXT,
  calendar_event_id TEXT,
  raw_email_body TEXT,
  parsed_data TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_user_status ON projects(user_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_dates ON projects(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_projects_calendar_event ON projects(calendar_event_id);

----------------------------------------------
-- Email Classifications (メール分類履歴)
----------------------------------------------

CREATE TABLE IF NOT EXISTS email_classifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  gmail_message_id TEXT NOT NULL,
  from_address TEXT,
  subject TEXT,
  category TEXT NOT NULL CHECK(category IN ('recruitment', 'confirmation', 'decline_ack', 'other')),
  confidence REAL NOT NULL,
  reason TEXT,
  processed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(user_id, gmail_message_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

----------------------------------------------
-- Project Conflicts (案件間の日程重複関係)
----------------------------------------------

CREATE TABLE IF NOT EXISTS project_conflicts (
  id TEXT PRIMARY KEY,
  project_a_id TEXT NOT NULL,
  project_b_id TEXT NOT NULL,
  overlap_start TEXT NOT NULL,
  overlap_end TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(project_a_id, project_b_id),
  FOREIGN KEY (project_a_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (project_b_id) REFERENCES projects(id) ON DELETE CASCADE
);

----------------------------------------------
-- Email Tracking (メール追跡)
----------------------------------------------

CREATE TABLE IF NOT EXISTS email_tracking (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  gmail_message_id TEXT,
  gmail_draft_id TEXT,
  type TEXT NOT NULL CHECK(type IN ('entry', 'decline')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'sent')),
  tracking_tag TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_tracking_tracking_tag ON email_tracking(tracking_tag);

----------------------------------------------
-- PR History (PR実績履歴)
----------------------------------------------

CREATE TABLE IF NOT EXISTS pr_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  genre TEXT,
  pr_text TEXT NOT NULL,
  was_successful INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pr_history_user_genre ON pr_history(user_id, genre);

----------------------------------------------
-- Notifications (通知履歴)
----------------------------------------------

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT,
  type TEXT NOT NULL CHECK(type IN ('entry_ok', 'entry_ng', 'confirmed', 'decline_draft', 'decline_sent', 'classification_uncertain')),
  channel TEXT NOT NULL CHECK(channel IN ('line', 'web')),
  message TEXT NOT NULL,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
