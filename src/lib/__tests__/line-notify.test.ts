import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  formatEntryOkMessage,
  formatEntryNgMessage,
  formatConfirmedMessage,
  formatDeclineSentMessage,
  formatEntrySentMessage,
  formatUncertainMessage,
  formatMcRelatedConfirmMessage,
} from "../line-notify";

describe("LINE notification message formatters", () => {
  it("formatEntryOkMessage — single day", () => {
    const msg = formatEntryOkMessage("展示会MC", "2026-03-15", "2026-03-15");
    expect(msg).toContain("展示会MC");
    expect(msg).toContain("3/15");
    expect(msg).toContain("下書き");
    expect(msg).not.toContain("〜");
  });

  it("formatEntryOkMessage — multi day", () => {
    const msg = formatEntryOkMessage("モーターショー", "2026-05-01", "2026-05-03");
    expect(msg).toContain("5/1〜5/3");
    expect(msg).toContain("モーターショー");
  });

  it("formatEntryNgMessage includes conflict info", () => {
    const msg = formatEntryNgMessage("新案件", "2026-06-10", "2026-06-12", "確定済み案件A");
    expect(msg).toContain("新案件");
    expect(msg).toContain("確定済み案件A");
    expect(msg).toContain("重複");
  });

  it("formatConfirmedMessage with decline targets", () => {
    const msg = formatConfirmedMessage("決定案件", [
      { title: "辞退A", startDate: "2026-07-01", endDate: "2026-07-02" },
      { title: "辞退B", startDate: "2026-07-03", endDate: "2026-07-03" },
    ]);
    expect(msg).toContain("決定案件が決定しました");
    expect(msg).toContain("辞退A");
    expect(msg).toContain("辞退B");
    expect(msg).toContain("辞退下書き");
  });

  it("formatConfirmedMessage without decline targets", () => {
    const msg = formatConfirmedMessage("決定案件", []);
    expect(msg).toContain("決定案件が決定しました");
    expect(msg).not.toContain("辞退下書き");
  });

  it("formatDeclineSentMessage", () => {
    const msg = formatDeclineSentMessage("辞退案件");
    expect(msg).toContain("辞退案件");
    expect(msg).toContain("辞退が完了");
    expect(msg).toContain("カレンダーから削除");
  });

  it("formatEntrySentMessage", () => {
    const msg = formatEntrySentMessage("イベントMC", "ABC事務所");
    expect(msg).toContain("イベントMC");
    expect(msg).toContain("ABC事務所");
    expect(msg).toContain("カレンダーに登録");
  });

  it("formatUncertainMessage", () => {
    const msg = formatUncertainMessage("Re: お知らせ", 0.55);
    expect(msg).toContain("55%");
    expect(msg).toContain("Re: お知らせ");
    expect(msg).toContain("確認");
  });

  it("formatMcRelatedConfirmMessage", () => {
    const msg = formatMcRelatedConfirmMessage(
      "新規案件",
      "2026-08-01",
      "2026-08-03",
      "既存MC予定",
    );
    expect(msg).toContain("新規案件");
    expect(msg).toContain("8/1〜8/3");
    expect(msg).toContain("既存MC予定");
    expect(msg).toContain("エントリーしますか");
  });
});
