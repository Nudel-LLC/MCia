"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type Step = "gmail" | "agencies" | "calendar" | "complete";

interface AgencyDraft {
  name: string;
  emailDomain: string;
}

const STEPS: Step[] = ["gmail", "agencies", "calendar", "complete"];

export default function SetupPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [currentStep, setCurrentStep] = useState<Step>("gmail");
  const [agencies, setAgencies] = useState<AgencyDraft[]>([
    { name: "", emailDomain: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/setup");
    }
  }, [status, router]);

  function updateAgency(index: number, patch: Partial<AgencyDraft>) {
    setAgencies((prev) =>
      prev.map((a, i) => (i === index ? { ...a, ...patch } : a))
    );
  }

  function addAgency() {
    setAgencies((prev) => [...prev, { name: "", emailDomain: "" }]);
  }

  function removeAgency(index: number) {
    setAgencies((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index)
    );
  }

  async function submitAgencies() {
    setError(null);

    const filled = agencies.filter(
      (a) => a.name.trim() && a.emailDomain.trim()
    );
    if (filled.length === 0) {
      setError("少なくとも 1 件の事務所を登録してください。");
      return;
    }

    setSubmitting(true);
    try {
      for (const agency of filled) {
        const res = await fetch("/api/agencies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: agency.name.trim(),
            emailDomain: agency.emailDomain.trim(),
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as
            | { error?: { formErrors?: string[] } }
            | null;
          throw new Error(
            body?.error?.formErrors?.[0] ??
              `${agency.name} の登録に失敗しました（${res.status}）`
          );
        }
      }
      setCurrentStep("calendar");
    } catch (e) {
      setError(e instanceof Error ? e.message : "登録に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary">MCia</h1>
          <p className="text-muted-foreground mt-1">初期設定</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === currentStep
                    ? "bg-primary text-white"
                    : i < STEPS.indexOf(currentStep)
                      ? "bg-success text-white"
                      : "bg-border text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              {i < STEPS.length - 1 && <div className="w-8 h-0.5 bg-border" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
          {currentStep === "gmail" && (
            <div>
              <h2 className="text-lg font-semibold mb-4">
                Gmail・カレンダー連携
              </h2>
              {session?.user ? (
                <>
                  <p className="text-sm text-muted-foreground mb-2">
                    以下のアカウントで連携済みです。
                  </p>
                  <div className="bg-muted rounded-lg p-3 text-sm mb-6">
                    <p className="font-medium">{session.user.name}</p>
                    {session.user.email && (
                      <p className="text-muted-foreground text-xs">
                        {session.user.email}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setCurrentStep("agencies")}
                    className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                  >
                    次へ
                  </button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  ログイン状態を確認しています...
                </p>
              )}
            </div>
          )}

          {currentStep === "agencies" && (
            <div>
              <h2 className="text-lg font-semibold mb-4">所属事務所の登録</h2>
              <p className="text-sm text-muted-foreground mb-6">
                案件メールを受け取る事務所のメールドメインを登録してください。
                後からいつでも追加・変更できます。
              </p>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  {error}
                </p>
              )}

              <div className="space-y-4 mb-6">
                {agencies.map((agency, i) => (
                  <div
                    key={i}
                    className="space-y-2 border border-border rounded-lg p-3"
                  >
                    <input
                      type="text"
                      placeholder="事務所名"
                      value={agency.name}
                      onChange={(e) =>
                        updateAgency(i, { name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                      disabled={submitting}
                    />
                    <input
                      type="text"
                      placeholder="メールドメイン (例: abc-casting.co.jp)"
                      value={agency.emailDomain}
                      onChange={(e) =>
                        updateAgency(i, { emailDomain: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                      disabled={submitting}
                    />
                    {agencies.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAgency(i)}
                        disabled={submitting}
                        className="text-xs text-red-600 hover:underline"
                      >
                        この事務所を削除
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addAgency}
                  disabled={submitting}
                  className="text-sm text-primary hover:underline"
                >
                  + もう1つ追加
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentStep("gmail")}
                  disabled={submitting}
                  className="flex-1 py-3 border border-border rounded-lg hover:bg-muted transition-colors font-medium disabled:opacity-60"
                >
                  戻る
                </button>
                <button
                  onClick={submitAgencies}
                  disabled={submitting}
                  className="flex-1 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-60"
                >
                  {submitting ? "登録中..." : "次へ"}
                </button>
              </div>
            </div>
          )}

          {currentStep === "calendar" && (
            <div>
              <h2 className="text-lg font-semibold mb-4">カレンダー確認</h2>
              <p className="text-sm text-muted-foreground mb-6">
                既存のカレンダー予定からMC関連の予定を検出する機能は
                ログイン後にバックグラウンドで動作します。
                <br />
                このまま次へ進めて初期設定を完了してください。
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentStep("agencies")}
                  className="flex-1 py-3 border border-border rounded-lg hover:bg-muted transition-colors font-medium"
                >
                  戻る
                </button>
                <button
                  onClick={() => setCurrentStep("complete")}
                  className="flex-1 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                >
                  次へ
                </button>
              </div>
            </div>
          )}

          {currentStep === "complete" && (
            <div className="text-center">
              <div className="text-5xl mb-4">&#10003;</div>
              <h2 className="text-lg font-semibold mb-4">設定完了!</h2>
              <p className="text-sm text-muted-foreground mb-6">
                MCiaが案件メールの監視を開始しました。
                新しい案件メールを受信すると、自動でエントリー下書きを作成しLINEで通知します。
              </p>
              <button
                onClick={() => router.push("/dashboard")}
                className="inline-block w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
              >
                ダッシュボードへ
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
