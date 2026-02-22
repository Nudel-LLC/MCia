/**
 * メール分類判定（F0）
 * Claude Haikuを使用してメールを分類する
 */

export interface ClassificationResult {
  category: "recruitment" | "confirmation" | "decline_ack" | "other";
  confidence: number;
  reason: string;
}

const CLASSIFICATION_PROMPT = `あなたはMC/コンパニオン業界のメール分類AIです。
以下のメールを分析し、カテゴリを判定してください。

カテゴリ:
- "recruitment": 案件募集メール（日程、場所、報酬、エントリー/先行情報を含む）
- "confirmation": 案件決定連絡（「決定」「採用」「アサイン」、日程確保依頼を含む）
- "decline_ack": 辞退受理（辞退に対する事務所からの返信）
- "other": 上記に該当しない事務連絡等

JSON形式で回答してください:
{ "category": "recruitment" | "confirmation" | "decline_ack" | "other", "confidence": 0.0-1.0, "reason": "判定理由" }`;

export async function classifyEmail(
  apiKey: string,
  subject: string,
  body: string
): Promise<ClassificationResult> {
  const truncatedBody = body.slice(0, 2000);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `${CLASSIFICATION_PROMPT}\n\n件名: ${subject}\n\n本文:\n${truncatedBody}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Classification API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content[0].text;

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { category: "other", confidence: 0, reason: "Failed to parse response" };
  }

  return JSON.parse(jsonMatch[0]) as ClassificationResult;
}
