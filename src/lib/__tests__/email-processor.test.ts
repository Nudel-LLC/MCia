import { describe, it, expect } from "vitest";
import {
  extractEmailBody,
  buildEntryEmailBody,
  buildDeclineEmailBody,
} from "../email-processor";

// ============================================================
// extractEmailBody
// ============================================================

describe("extractEmailBody", () => {
  it("単一パートのメール本文をデコードする", () => {
    const data = btoa("Hello World");
    const payload = {
      body: { data: data.replace(/\+/g, "-").replace(/\//g, "_") },
    };
    expect(extractEmailBody(payload)).toBe("Hello World");
  });

  it("マルチパートからtext/plainを抽出する", () => {
    const data = btoa("Plain text body");
    const payload = {
      parts: [
        {
          mimeType: "text/plain",
          body: { data: data.replace(/\+/g, "-").replace(/\//g, "_") },
        },
        {
          mimeType: "text/html",
          body: { data: btoa("<p>HTML body</p>") },
        },
      ],
    };
    expect(extractEmailBody(payload)).toBe("Plain text body");
  });

  it("ネストされたマルチパートを再帰的に処理する", () => {
    const data = btoa("Nested content");
    const payload = {
      parts: [
        {
          mimeType: "multipart/alternative",
          parts: [
            {
              mimeType: "text/plain",
              body: { data: data.replace(/\+/g, "-").replace(/\//g, "_") },
            },
          ],
        },
      ],
    };
    expect(extractEmailBody(payload)).toBe("Nested content");
  });

  it("本文がないペイロードは空文字を返す", () => {
    const payload = {};
    expect(extractEmailBody(payload)).toBe("");
  });

  it("パーツにdataがないペイロードは空文字を返す", () => {
    const payload = {
      parts: [
        {
          mimeType: "text/plain",
          body: {},
        },
      ],
    };
    expect(extractEmailBody(payload)).toBe("");
  });
});

// ============================================================
// buildEntryEmailBody
// ============================================================

describe("buildEntryEmailBody", () => {
  it("事務所名と案件名を含むエントリーメールを生成する", () => {
    const body = buildEntryEmailBody("東京モーターショー MC", "スターダスト", null);
    expect(body).toContain("スターダスト 御中");
    expect(body).toContain("東京モーターショー MC");
    expect(body).toContain("エントリー希望");
    expect(body).not.toContain("自己PR");
  });

  it("PR文がある場合はPRセクションを含む", () => {
    const body = buildEntryEmailBody(
      "展示会 コンパニオン",
      "ABC事務所",
      "過去に展示会での実績があります。"
    );
    expect(body).toContain("ABC事務所 御中");
    expect(body).toContain("展示会 コンパニオン");
    expect(body).toContain("【自己PR】");
    expect(body).toContain("過去に展示会での実績があります。");
  });
});

// ============================================================
// buildDeclineEmailBody
// ============================================================

describe("buildDeclineEmailBody", () => {
  it("案件名を含む辞退メールを生成する", () => {
    const body = buildDeclineEmailBody("東京ゲームショウ MC");
    expect(body).toContain("東京ゲームショウ MC");
    expect(body).toContain("辞退");
    expect(body).toContain("他決");
  });
});
