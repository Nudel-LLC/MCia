/**
 * PR自動生成（F3a）
 * Claude Haikuを使用して過去実績からPR文を自動生成
 */

export interface PastProject {
  title: string;
  genre: string;
  startDate: string;
  location: string | null;
  wasSuccessful: boolean;
}

const PR_GENERATION_PROMPT = `あなたはMC/コンパニオンのPR文作成支援AIです。
今回応募する案件情報と、過去の類似案件実績をもとに、エントリーメールに添付するPR文を200〜400文字で作成してください。

ルール:
- 丁寧かつ簡潔な文体で
- 過去実績を具体的に言及
- 今回の案件との関連性を示す
- 自信と意欲が伝わるトーンで
- 敬語を使用`;

export async function generatePR(
  apiKey: string,
  currentProject: {
    title: string;
    genre: string | null;
    location: string | null;
  },
  pastProjects: PastProject[]
): Promise<string | null> {
  if (pastProjects.length === 0) {
    return null;
  }

  const pastProjectsText = pastProjects
    .slice(0, 5)
    .map(
      (p, i) =>
        `${i + 1}. ${p.title}（${p.genre}、${p.startDate}、${p.location || "場所不明"}）${p.wasSuccessful ? "【確定済み】" : ""}`
    )
    .join("\n");

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
          content: `${PR_GENERATION_PROMPT}

【今回の案件】
案件名: ${currentProject.title}
ジャンル: ${currentProject.genre || "不明"}
場所: ${currentProject.location || "不明"}

【過去の類似案件実績】
${pastProjectsText}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`PR generation API error: ${response.status}`);
  }

  const data = (await response.json()) as { content: Array<{ text: string }> };
  return data.content[0].text;
}
