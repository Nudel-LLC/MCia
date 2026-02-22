import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getGmailHistory,
  getGmailMessage,
  createGmailDraft,
  getCalendarEvents,
  createCalendarEvent,
  refreshAccessToken,
  deleteCalendarEvent,
} from "../google-api";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

// ============================================================
// Gmail API
// ============================================================

describe("getGmailHistory", () => {
  it("正しいURLとAuthorizationヘッダーでリクエストする", async () => {
    mockFetch.mockReturnValue(jsonResponse({ history: [] }));

    await getGmailHistory("test-token", "12345");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("history?startHistoryId=12345");
    expect(options.headers.Authorization).toBe("Bearer test-token");
  });
});

describe("getGmailMessage", () => {
  it("メッセージIDでGmailメッセージを取得する", async () => {
    const mockMessage = { id: "msg-001", payload: { headers: [] } };
    mockFetch.mockReturnValue(jsonResponse(mockMessage));

    const result = await getGmailMessage("test-token", "msg-001");

    expect(result).toEqual(mockMessage);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("messages/msg-001");
  });
});

describe("createGmailDraft", () => {
  it("エンコードされたメッセージで下書きを作成する", async () => {
    const mockDraft = { id: "draft-001" };
    mockFetch.mockReturnValue(jsonResponse(mockDraft));

    const result = await createGmailDraft(
      "test-token",
      "to@example.com",
      "テスト件名",
      "テスト本文",
      "tracking-123"
    );

    expect(result).toEqual(mockDraft);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/drafts");
    expect(options.method).toBe("POST");

    const body = JSON.parse(options.body);
    expect(body.message.raw).toBeDefined();
  });
});

// ============================================================
// Calendar API
// ============================================================

describe("getCalendarEvents", () => {
  it("日付範囲でカレンダーイベントを取得する", async () => {
    const mockEvents = { items: [{ id: "event-1", summary: "テスト" }] };
    mockFetch.mockReturnValue(jsonResponse(mockEvents));

    const result = await getCalendarEvents(
      "test-token",
      "2026-03-01",
      "2026-03-31"
    );

    expect(result).toEqual(mockEvents);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("events?");
    expect(url).toContain("timeMin=");
    expect(url).toContain("timeMax=");
  });
});

describe("createCalendarEvent", () => {
  it("終日イベントを作成し、endDateを翌日に設定する", async () => {
    const mockEvent = { id: "event-new" };
    mockFetch.mockReturnValue(jsonResponse(mockEvent));

    const result = await createCalendarEvent(
      "test-token",
      "【仮】展示会MC",
      "2026-03-01",
      "2026-03-03",
      "MCia自動登録",
      "5"
    );

    expect(result).toEqual(mockEvent);
    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.start.date).toBe("2026-03-01");
    expect(body.end.date).toBe("2026-03-04"); // 翌日（exclusive end）
    expect(body.colorId).toBe("5");
  });
});

describe("deleteCalendarEvent", () => {
  it("DELETEリクエストを送信する", async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({ ok: true, status: 204 })
    );

    await deleteCalendarEvent("test-token", "event-123");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("events/event-123");
    expect(options.method).toBe("DELETE");
  });

  it("404の場合はエラーを投げない", async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({ ok: false, status: 404 })
    );

    await expect(
      deleteCalendarEvent("test-token", "event-not-found")
    ).resolves.toBeUndefined();
  });
});

// ============================================================
// Token Management
// ============================================================

describe("refreshAccessToken", () => {
  it("トークンリフレッシュに成功する", async () => {
    const mockTokenResponse = {
      access_token: "new-token",
      expires_in: 3600,
    };
    mockFetch.mockReturnValue(jsonResponse(mockTokenResponse));

    const result = await refreshAccessToken(
      "client-id",
      "client-secret",
      "refresh-token"
    );

    expect(result.access_token).toBe("new-token");
    expect(result.expires_in).toBe(3600);
  });

  it("失敗時にエラーを投げる", async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({ ok: false, status: 401, text: () => Promise.resolve("Unauthorized") })
    );

    await expect(
      refreshAccessToken("id", "secret", "bad-token")
    ).rejects.toThrow("Token refresh failed: 401");
  });
});

// ============================================================
// Error handling
// ============================================================

describe("Google API error handling", () => {
  it("APIエラー時に詳細なエラーメッセージを投げる", async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({
        ok: false,
        status: 403,
        text: () => Promise.resolve("Quota exceeded"),
      })
    );

    await expect(
      getGmailHistory("test-token", "12345")
    ).rejects.toThrow("Google API error (403): Quota exceeded");
  });
});
