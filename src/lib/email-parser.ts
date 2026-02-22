/**
 * 案件メール解析（F1）
 * Claude Haikuを使用してメールから案件情報を抽出する
 */

export interface ParsedProject {
  title: string;
  startDate: string; // ISO8601 date
  endDate: string; // ISO8601 date
  location: string | null;
  compensation: string | null;
  genre: string | null;
  requiresPr: boolean;
  conditions: string | null;
}

const PARSING_PROMPT = `あなたはMC/コンパニオン業界のメール解析AIです。
以下の案件募集メールから情報を抽出してください。

JSON形式で回答してください:
{
  "title": "案件名/イベント名",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "location": "場所/会場名 (不明な場合はnull)",
  "compensation": "報酬額 (例: '30000', '日給25000円' — 不明な場合はnull)",
  "genre": "案件ジャンル (展示会/イベント/司会/受付/ナレーション/その他)",
  "requiresPr": true/false (自己PR・実績の記載が求められているか),
  "conditions": "その他の条件 (不明な場合はnull)"
}

日付が「1/17」のような形式の場合、現在の年を補完してください（現在は2026年）。
日程が1日のみの場合、startDateとendDateを同じ日にしてください。`;

export async function parseProjectEmail(
  apiKey: string,
  subject: string,
  body: string
): Promise<ParsedProject> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `${PARSING_PROMPT}\n\n件名: ${subject}\n\n本文:\n${body}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Parsing API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content[0].text;

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse project data from email");
  }

  return JSON.parse(jsonMatch[0]) as ParsedProject;
}
