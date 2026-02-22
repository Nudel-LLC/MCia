/**
 * スケジュール重複判定ロジック（F2, 4.5, 4.5a）
 */

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string; // ISO8601
  end: string; // ISO8601
  allDay: boolean;
}

export type EventClassification = "mcia_managed" | "mc_related" | "personal";

export interface ConflictResult {
  hasConflict: boolean;
  conflictType:
    | "none"
    | "confirmed_block"
    | "tentative_overlap"
    | "mc_related_confirm"
    | "personal_only";
  conflictingEvents: Array<{
    event: CalendarEvent;
    classification: EventClassification;
    projectId?: string;
    projectStatus?: string;
  }>;
}

/**
 * カレンダー予定を分類する（3段階判定）
 * Step 1: MCia管理予定の照合（calendar_event_idで判定）
 * Step 2: MC関連予定のヒューリスティック判定
 * Step 3: 個人予定として扱う
 */
export function classifyCalendarEvent(
  event: CalendarEvent,
  mciaEventIds: Set<string>,
  agencyNames: string[]
): EventClassification {
  // Step 1: MCia管理予定
  if (mciaEventIds.has(event.id)) {
    return "mcia_managed";
  }

  // Step 2: MC関連キーワードによるヒューリスティック判定
  const text = `${event.summary} ${event.description || ""}`.toLowerCase();
  let score = 0;

  // 事務所名チェック（高スコア）
  for (const name of agencyNames) {
    if (text.includes(name.toLowerCase())) {
      score += 3;
      break;
    }
  }

  // MC/コンパニオン業界キーワード（高スコア）
  const mcKeywords = [
    "mc", "コンパニオン", "司会", "受付", "ナレーション",
    "展示会", "イベント", "発表会", "モーターショー", "説明会",
    "撮影", "キャスティング",
  ];
  for (const keyword of mcKeywords) {
    if (text.includes(keyword)) {
      score += 2;
      break;
    }
  }

  // 「仮」関連キーワード（中スコア）
  const tentativeKeywords = ["仮", "仮押さえ", "仮確保", "仮予定"];
  for (const keyword of tentativeKeywords) {
    if (text.includes(keyword)) {
      score += 2;
      break;
    }
  }

  // 終日予定（参考スコア）
  if (event.allDay) {
    score += 1;
  }

  // 閾値判定
  if (score >= 3) {
    return "mc_related";
  }

  // Step 3: 個人予定
  return "personal";
}

/**
 * 新規案件の日程と既存カレンダーの重複を判定
 */
export function checkScheduleConflicts(
  newStartDate: string,
  newEndDate: string,
  calendarEvents: CalendarEvent[],
  mciaEventIds: Set<string>,
  mciaProjects: Map<string, { id: string; status: string }>,
  agencyNames: string[]
): ConflictResult {
  const conflictingEvents: ConflictResult["conflictingEvents"] = [];

  for (const event of calendarEvents) {
    // 日付範囲の重複チェック (start_a <= end_b AND end_a >= start_b)
    const eventStart = event.start.split("T")[0];
    const eventEnd = event.end.split("T")[0];

    if (newStartDate <= eventEnd && newEndDate >= eventStart) {
      const classification = classifyCalendarEvent(
        event,
        mciaEventIds,
        agencyNames
      );
      const project = mciaProjects.get(event.id);

      conflictingEvents.push({
        event,
        classification,
        projectId: project?.id,
        projectStatus: project?.status,
      });
    }
  }

  if (conflictingEvents.length === 0) {
    return { hasConflict: false, conflictType: "none", conflictingEvents };
  }

  // 確定予定との重複チェック
  const confirmedConflict = conflictingEvents.find(
    (c) =>
      c.classification === "mcia_managed" && c.projectStatus === "confirmed"
  );
  if (confirmedConflict) {
    return {
      hasConflict: true,
      conflictType: "confirmed_block",
      conflictingEvents,
    };
  }

  // MCia仮予定との重複（エントリー可能）
  const tentativeConflicts = conflictingEvents.filter(
    (c) =>
      c.classification === "mcia_managed" && c.projectStatus !== "confirmed"
  );
  if (tentativeConflicts.length > 0) {
    return {
      hasConflict: true,
      conflictType: "tentative_overlap",
      conflictingEvents,
    };
  }

  // MC関連予定（MCia導入前）との重複
  const mcRelatedConflicts = conflictingEvents.filter(
    (c) => c.classification === "mc_related"
  );
  if (mcRelatedConflicts.length > 0) {
    return {
      hasConflict: true,
      conflictType: "mc_related_confirm",
      conflictingEvents,
    };
  }

  // 個人予定のみ → 空きあり扱い
  return {
    hasConflict: false,
    conflictType: "personal_only",
    conflictingEvents,
  };
}

/**
 * 決定案件と重複する辞退対象の仮案件を検索
 */
export function findDeclineCandidates(
  confirmedStartDate: string,
  confirmedEndDate: string,
  tentativeProjects: Array<{
    id: string;
    startDate: string;
    endDate: string;
    title: string;
    agencyId: string;
  }>
): typeof tentativeProjects {
  return tentativeProjects.filter(
    (project) =>
      project.startDate <= confirmedEndDate &&
      project.endDate >= confirmedStartDate
  );
}
