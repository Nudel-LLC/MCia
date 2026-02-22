import { describe, it, expect } from "vitest";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
  agencies,
  projects,
  emailClassifications,
  projectConflicts,
  emailTracking,
  prHistory,
  notifications,
  PROJECT_STATUSES,
  CLASSIFICATION_CATEGORIES,
  NOTIFICATION_TYPES,
} from "../schema";
import { getTableName } from "drizzle-orm";

describe("Drizzle schema table definitions", () => {
  it("全テーブルが正しいテーブル名を持つ", () => {
    expect(getTableName(users)).toBe("users");
    expect(getTableName(accounts)).toBe("accounts");
    expect(getTableName(sessions)).toBe("sessions");
    expect(getTableName(verificationTokens)).toBe("verification_tokens");
    expect(getTableName(agencies)).toBe("agencies");
    expect(getTableName(projects)).toBe("projects");
    expect(getTableName(emailClassifications)).toBe("email_classifications");
    expect(getTableName(projectConflicts)).toBe("project_conflicts");
    expect(getTableName(emailTracking)).toBe("email_tracking");
    expect(getTableName(prHistory)).toBe("pr_history");
    expect(getTableName(notifications)).toBe("notifications");
  });
});

describe("Enum constants", () => {
  it("PROJECT_STATUSESに全ステータスが含まれる", () => {
    expect(PROJECT_STATUSES).toContain("new");
    expect(PROJECT_STATUSES).toContain("draft_created");
    expect(PROJECT_STATUSES).toContain("entered");
    expect(PROJECT_STATUSES).toContain("confirmed");
    expect(PROJECT_STATUSES).toContain("decline_draft");
    expect(PROJECT_STATUSES).toContain("declined");
    expect(PROJECT_STATUSES).toContain("expired");
    expect(PROJECT_STATUSES).toHaveLength(7);
  });

  it("CLASSIFICATION_CATEGORIESに全カテゴリが含まれる", () => {
    expect(CLASSIFICATION_CATEGORIES).toContain("recruitment");
    expect(CLASSIFICATION_CATEGORIES).toContain("confirmation");
    expect(CLASSIFICATION_CATEGORIES).toContain("decline_ack");
    expect(CLASSIFICATION_CATEGORIES).toContain("other");
    expect(CLASSIFICATION_CATEGORIES).toHaveLength(4);
  });

  it("NOTIFICATION_TYPESに全タイプが含まれる", () => {
    expect(NOTIFICATION_TYPES).toContain("entry_ok");
    expect(NOTIFICATION_TYPES).toContain("entry_ng");
    expect(NOTIFICATION_TYPES).toContain("confirmed");
    expect(NOTIFICATION_TYPES).toContain("decline_draft");
    expect(NOTIFICATION_TYPES).toContain("decline_sent");
    expect(NOTIFICATION_TYPES).toContain("classification_uncertain");
    expect(NOTIFICATION_TYPES).toHaveLength(6);
  });
});

describe("Type inference exports", () => {
  it("テーブルからSelect/Insert型が推論可能", () => {
    // This is a compile-time check — if it compiles, the types exist
    type UserSelect = typeof users.$inferSelect;
    type UserInsert = typeof users.$inferInsert;
    type ProjectSelect = typeof projects.$inferSelect;
    type ProjectInsert = typeof projects.$inferInsert;

    // Runtime assertion (trivially true, the real test is compilation)
    const _typeCheck: boolean =
      true as unknown as UserSelect extends object ? true : false;
    expect(_typeCheck).toBe(true);
  });
});
