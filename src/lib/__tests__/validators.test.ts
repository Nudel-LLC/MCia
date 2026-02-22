import { describe, it, expect } from "vitest";
import {
  createAgencySchema,
  updateAgencySchema,
  updateProjectStatusSchema,
  updateClassificationSchema,
  paginationSchema,
  invoiceQuerySchema,
  gmailWebhookSchema,
  stripeWebhookSchema,
  lineWebhookSchema,
} from "../validators";

// ============================================================
// Agency schemas
// ============================================================

describe("createAgencySchema", () => {
  it("有効な入力を受理する", () => {
    const result = createAgencySchema.safeParse({
      name: "スターダスト",
      email: "info@stardust.co.jp",
      emailDomain: "stardust.co.jp",
    });
    expect(result.success).toBe(true);
  });

  it("emailなしでも有効", () => {
    const result = createAgencySchema.safeParse({
      name: "テスト事務所",
      emailDomain: "test.com",
    });
    expect(result.success).toBe(true);
  });

  it("名前が空の場合はエラー", () => {
    const result = createAgencySchema.safeParse({
      name: "",
      emailDomain: "test.com",
    });
    expect(result.success).toBe(false);
  });

  it("不正なドメイン形式はエラー", () => {
    const result = createAgencySchema.safeParse({
      name: "テスト",
      emailDomain: "not-a-domain",
    });
    expect(result.success).toBe(false);
  });

  it("不正なメールアドレスはエラー", () => {
    const result = createAgencySchema.safeParse({
      name: "テスト",
      email: "invalid-email",
      emailDomain: "test.com",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateAgencySchema", () => {
  it("createAgencySchemaと同じバリデーション", () => {
    const result = updateAgencySchema.safeParse({
      name: "更新後",
      emailDomain: "updated.co.jp",
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// Project status
// ============================================================

describe("updateProjectStatusSchema", () => {
  it("有効なステータスを受理する", () => {
    for (const status of [
      "new",
      "draft_created",
      "entered",
      "confirmed",
      "decline_draft",
      "declined",
      "expired",
    ]) {
      const result = updateProjectStatusSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it("不正なステータスはエラー", () => {
    const result = updateProjectStatusSchema.safeParse({
      status: "invalid_status",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// Classification
// ============================================================

describe("updateClassificationSchema", () => {
  it("有効なカテゴリを受理する", () => {
    for (const category of [
      "recruitment",
      "confirmation",
      "decline_ack",
      "other",
    ]) {
      const result = updateClassificationSchema.safeParse({ category });
      expect(result.success).toBe(true);
    }
  });

  it("不正なカテゴリはエラー", () => {
    const result = updateClassificationSchema.safeParse({ category: "spam" });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// Pagination
// ============================================================

describe("paginationSchema", () => {
  it("デフォルト値が適用される", () => {
    const result = paginationSchema.parse({});
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(0);
  });

  it("文字列を数値に変換する", () => {
    const result = paginationSchema.parse({ limit: "20", offset: "10" });
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(10);
  });

  it("limitの上限は100", () => {
    const result = paginationSchema.safeParse({ limit: 200 });
    expect(result.success).toBe(false);
  });

  it("負のoffsetはエラー", () => {
    const result = paginationSchema.safeParse({ offset: -1 });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// Invoice query
// ============================================================

describe("invoiceQuerySchema", () => {
  it("有効なクエリを受理する", () => {
    const result = invoiceQuerySchema.safeParse({
      year: "2026",
      month: "3",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.year).toBe(2026);
      expect(result.data.month).toBe(3);
      expect(result.data.format).toBe("json");
    }
  });

  it("CSV形式を指定できる", () => {
    const result = invoiceQuerySchema.safeParse({
      year: "2026",
      month: "1",
      format: "csv",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.format).toBe("csv");
    }
  });

  it("yearなしはエラー", () => {
    const result = invoiceQuerySchema.safeParse({ month: "3" });
    expect(result.success).toBe(false);
  });

  it("月が範囲外はエラー", () => {
    const result = invoiceQuerySchema.safeParse({
      year: "2026",
      month: "13",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// Webhook payloads
// ============================================================

describe("gmailWebhookSchema", () => {
  it("有効なPub/Subメッセージを受理する", () => {
    const result = gmailWebhookSchema.safeParse({
      message: {
        data: btoa(
          JSON.stringify({
            emailAddress: "user@example.com",
            historyId: "12345",
          })
        ),
      },
    });
    expect(result.success).toBe(true);
  });

  it("messageがないペイロードはエラー", () => {
    const result = gmailWebhookSchema.safeParse({ subscription: "sub" });
    expect(result.success).toBe(false);
  });
});

describe("stripeWebhookSchema", () => {
  it("有効なStripeイベントを受理する", () => {
    const result = stripeWebhookSchema.safeParse({
      type: "customer.subscription.updated",
      data: {
        object: {
          status: "active",
          customer: "cus_12345",
        },
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("lineWebhookSchema", () => {
  it("有効なLINEイベントを受理する", () => {
    const result = lineWebhookSchema.safeParse({
      events: [
        {
          type: "follow",
          source: { userId: "U12345" },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("eventsがない場合はデフォルトで空配列", () => {
    const result = lineWebhookSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.events).toEqual([]);
    }
  });
});
