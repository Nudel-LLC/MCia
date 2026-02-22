/**
 * MCia Database Schema — Drizzle ORM definitions for Cloudflare D1
 *
 * Auth.js テーブル + MCia 業務テーブルを型安全に定義。
 * `@auth/drizzle-adapter` がこのスキーマを直接参照し、
 * API ルートからも `typeof users.$inferSelect` 等で型を取得できる。
 */

import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ============================================================
// Auth.js Required Tables
// ============================================================

export const users = sqliteTable("users", {
  // Auth.js standard columns
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
  // MCia extension columns
  lineUserId: text("line_user_id"),
  stripeCustomerId: text("stripe_customer_id"),
  subscriptionStatus: text("subscription_status", {
    enum: ["active", "inactive", "trial"],
  })
    .notNull()
    .default("inactive"),
  gmailHistoryId: text("gmail_history_id"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`),
});

export const accounts = sqliteTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })]
);

export const sessions = sqliteTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull().unique(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })]
);

// ============================================================
// MCia Business Tables
// ============================================================

/** 所属事務所 */
export const agencies = sqliteTable(
  "agencies",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    emailDomain: text("email_domain").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`),
  },
  (table) => [
    index("idx_agencies_user_id").on(table.userId),
    index("idx_agencies_email_domain").on(table.emailDomain),
  ]
);

/** 案件ステータス */
export const PROJECT_STATUSES = [
  "new",
  "draft_created",
  "entered",
  "confirmed",
  "decline_draft",
  "declined",
  "expired",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** 案件 */
export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    agencyId: text("agency_id").references(() => agencies.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    location: text("location"),
    compensation: text("compensation"),
    genre: text("genre"),
    requiresPr: integer("requires_pr", { mode: "boolean" })
      .notNull()
      .default(false),
    status: text("status", { enum: PROJECT_STATUSES })
      .notNull()
      .default("new"),
    sourceEmailId: text("source_email_id"),
    draftEmailId: text("draft_email_id"),
    sentEmailId: text("sent_email_id"),
    calendarEventId: text("calendar_event_id"),
    rawEmailBody: text("raw_email_body"),
    parsedData: text("parsed_data"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`),
  },
  (table) => [
    index("idx_projects_user_id").on(table.userId),
    index("idx_projects_status").on(table.status),
    index("idx_projects_user_status").on(table.userId, table.status),
    index("idx_projects_dates").on(table.startDate, table.endDate),
    index("idx_projects_calendar_event").on(table.calendarEventId),
  ]
);

/** メール分類カテゴリ */
export const CLASSIFICATION_CATEGORIES = [
  "recruitment",
  "confirmation",
  "decline_ack",
  "other",
] as const;
export type ClassificationCategory =
  (typeof CLASSIFICATION_CATEGORIES)[number];

/** メール分類履歴 */
export const emailClassifications = sqliteTable(
  "email_classifications",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gmailMessageId: text("gmail_message_id").notNull(),
    fromAddress: text("from_address"),
    subject: text("subject"),
    category: text("category", { enum: CLASSIFICATION_CATEGORIES }).notNull(),
    confidence: real("confidence").notNull(),
    reason: text("reason"),
    processed: integer("processed", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`),
  },
  (table) => [
    uniqueIndex("idx_ec_user_gmail").on(table.userId, table.gmailMessageId),
  ]
);

/** 案件間の日程重複関係 */
export const projectConflicts = sqliteTable(
  "project_conflicts",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    projectAId: text("project_a_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    projectBId: text("project_b_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    overlapStart: text("overlap_start").notNull(),
    overlapEnd: text("overlap_end").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`),
  },
  (table) => [
    uniqueIndex("idx_pc_pair").on(table.projectAId, table.projectBId),
  ]
);

/** メール追跡 */
export const emailTracking = sqliteTable(
  "email_tracking",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    gmailMessageId: text("gmail_message_id"),
    gmailDraftId: text("gmail_draft_id"),
    type: text("type", { enum: ["entry", "decline"] as const }).notNull(),
    status: text("status", { enum: ["draft", "sent"] as const })
      .notNull()
      .default("draft"),
    trackingTag: text("tracking_tag").notNull().unique(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`),
  },
  (table) => [
    index("idx_email_tracking_tracking_tag").on(table.trackingTag),
  ]
);

/** PR実績履歴 */
export const prHistory = sqliteTable(
  "pr_history",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    genre: text("genre"),
    prText: text("pr_text").notNull(),
    wasSuccessful: integer("was_successful", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`),
  },
  (table) => [index("idx_pr_history_user_genre").on(table.userId, table.genre)]
);

/** 通知タイプ */
export const NOTIFICATION_TYPES = [
  "entry_ok",
  "entry_ng",
  "confirmed",
  "decline_draft",
  "decline_sent",
  "classification_uncertain",
] as const;

/** 通知履歴 */
export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    type: text("type", { enum: NOTIFICATION_TYPES }).notNull(),
    channel: text("channel", { enum: ["line", "web"] as const }).notNull(),
    message: text("message").notNull(),
    sentAt: text("sent_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`),
  },
  (table) => [index("idx_notifications_user_id").on(table.userId)]
);

// ============================================================
// Inferred Types (for use across the application)
// ============================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Agency = typeof agencies.$inferSelect;
export type NewAgency = typeof agencies.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type EmailClassification = typeof emailClassifications.$inferSelect;
export type NewEmailClassification = typeof emailClassifications.$inferInsert;

export type EmailTracking = typeof emailTracking.$inferSelect;
export type NewEmailTracking = typeof emailTracking.$inferInsert;

export type PrHistory = typeof prHistory.$inferSelect;
export type NewPrHistory = typeof prHistory.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
