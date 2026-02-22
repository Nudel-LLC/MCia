import { describe, it, expect } from "vitest";
import {
  classifyCalendarEvent,
  checkScheduleConflicts,
  findDeclineCandidates,
  type CalendarEvent,
} from "../schedule-checker";

// ============================================================
// classifyCalendarEvent
// ============================================================

describe("classifyCalendarEvent", () => {
  const mciaIds = new Set(["event-001"]);
  const agencyNames = ["スターダスト", "ABC事務所"];

  it("MCia管理予定はmcia_managedに分類される", () => {
    const event: CalendarEvent = {
      id: "event-001",
      summary: "東京モーターショー MC",
      start: "2026-03-01",
      end: "2026-03-03",
      allDay: true,
    };
    expect(classifyCalendarEvent(event, mciaIds, agencyNames)).toBe(
      "mcia_managed"
    );
  });

  it("事務所名を含む予定はmc_relatedに分類される", () => {
    const event: CalendarEvent = {
      id: "event-999",
      summary: "スターダスト 撮影",
      start: "2026-03-10",
      end: "2026-03-10",
      allDay: true,
    };
    expect(classifyCalendarEvent(event, mciaIds, agencyNames)).toBe(
      "mc_related"
    );
  });

  it("MC業界キーワードを含む予定はmc_relatedに分類される", () => {
    const event: CalendarEvent = {
      id: "event-100",
      summary: "展示会 受付スタッフ",
      start: "2026-04-01",
      end: "2026-04-01",
      allDay: true,
    };
    expect(classifyCalendarEvent(event, mciaIds, agencyNames)).toBe(
      "mc_related"
    );
  });

  it("関連キーワードのない予定はpersonalに分類される", () => {
    const event: CalendarEvent = {
      id: "event-200",
      summary: "友人とランチ",
      start: "2026-03-15T12:00:00",
      end: "2026-03-15T14:00:00",
      allDay: false,
    };
    expect(classifyCalendarEvent(event, mciaIds, agencyNames)).toBe("personal");
  });

  it("「仮」キーワード + 終日予定はmc_relatedスコアを満たす", () => {
    const event: CalendarEvent = {
      id: "event-300",
      summary: "仮押さえ",
      start: "2026-05-01",
      end: "2026-05-01",
      allDay: true,
    };
    expect(classifyCalendarEvent(event, mciaIds, agencyNames)).toBe(
      "mc_related"
    );
  });
});

// ============================================================
// checkScheduleConflicts
// ============================================================

describe("checkScheduleConflicts", () => {
  const agencyNames = ["テスト事務所"];

  it("重複なしの場合はnoneを返す", () => {
    const result = checkScheduleConflicts(
      "2026-03-01",
      "2026-03-03",
      [],
      new Set(),
      new Map(),
      agencyNames
    );
    expect(result.hasConflict).toBe(false);
    expect(result.conflictType).toBe("none");
  });

  it("確定案件との重複はconfirmed_blockを返す", () => {
    const events: CalendarEvent[] = [
      {
        id: "cal-001",
        summary: "確定案件",
        start: "2026-03-02",
        end: "2026-03-04",
        allDay: true,
      },
    ];

    const result = checkScheduleConflicts(
      "2026-03-01",
      "2026-03-03",
      events,
      new Set(["cal-001"]),
      new Map([["cal-001", { id: "proj-001", status: "confirmed" }]]),
      agencyNames
    );
    expect(result.hasConflict).toBe(true);
    expect(result.conflictType).toBe("confirmed_block");
  });

  it("仮案件との重複はtentative_overlapを返す", () => {
    const events: CalendarEvent[] = [
      {
        id: "cal-002",
        summary: "【仮】展示会",
        start: "2026-03-02",
        end: "2026-03-04",
        allDay: true,
      },
    ];

    const result = checkScheduleConflicts(
      "2026-03-01",
      "2026-03-03",
      events,
      new Set(["cal-002"]),
      new Map([["cal-002", { id: "proj-002", status: "entered" }]]),
      agencyNames
    );
    expect(result.hasConflict).toBe(true);
    expect(result.conflictType).toBe("tentative_overlap");
  });

  it("個人予定のみとの重複はpersonal_onlyを返す", () => {
    const events: CalendarEvent[] = [
      {
        id: "cal-personal",
        summary: "歯医者",
        start: "2026-03-02T10:00:00",
        end: "2026-03-02T11:00:00",
        allDay: false,
      },
    ];

    const result = checkScheduleConflicts(
      "2026-03-01",
      "2026-03-03",
      events,
      new Set(),
      new Map(),
      agencyNames
    );
    expect(result.hasConflict).toBe(false);
    expect(result.conflictType).toBe("personal_only");
  });

  it("日程が重ならない場合はnoneを返す", () => {
    const events: CalendarEvent[] = [
      {
        id: "cal-far",
        summary: "確定案件",
        start: "2026-04-01",
        end: "2026-04-03",
        allDay: true,
      },
    ];

    const result = checkScheduleConflicts(
      "2026-03-01",
      "2026-03-03",
      events,
      new Set(["cal-far"]),
      new Map([["cal-far", { id: "proj-far", status: "confirmed" }]]),
      agencyNames
    );
    expect(result.hasConflict).toBe(false);
    expect(result.conflictType).toBe("none");
  });
});

// ============================================================
// findDeclineCandidates
// ============================================================

describe("findDeclineCandidates", () => {
  const tentativeProjects = [
    {
      id: "p1",
      startDate: "2026-03-01",
      endDate: "2026-03-03",
      title: "展示会A",
      agencyId: "a1",
    },
    {
      id: "p2",
      startDate: "2026-03-05",
      endDate: "2026-03-07",
      title: "展示会B",
      agencyId: "a2",
    },
    {
      id: "p3",
      startDate: "2026-03-10",
      endDate: "2026-03-12",
      title: "イベントC",
      agencyId: "a1",
    },
  ];

  it("重複する仮案件のみを返す", () => {
    const candidates = findDeclineCandidates(
      "2026-03-02",
      "2026-03-06",
      tentativeProjects
    );
    expect(candidates).toHaveLength(2);
    expect(candidates.map((c) => c.id)).toEqual(["p1", "p2"]);
  });

  it("重複がない場合は空配列を返す", () => {
    const candidates = findDeclineCandidates(
      "2026-04-01",
      "2026-04-03",
      tentativeProjects
    );
    expect(candidates).toHaveLength(0);
  });

  it("全て重複する場合は全案件を返す", () => {
    const candidates = findDeclineCandidates(
      "2026-02-01",
      "2026-04-30",
      tentativeProjects
    );
    expect(candidates).toHaveLength(3);
  });
});
