"use client";

import { useState } from "react";

type Step = "gmail" | "agencies" | "calendar" | "complete";

export default function SetupPage() {
  const [currentStep, setCurrentStep] = useState<Step>("gmail");

  return (
    <div className="min-h-screen bg-muted flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary">MCia</h1>
          <p className="text-muted-foreground mt-1">初期設定</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(["gmail", "agencies", "calendar", "complete"] as Step[]).map(
            (step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === currentStep
                      ? "bg-primary text-white"
                      : i <
                          ["gmail", "agencies", "calendar", "complete"].indexOf(
                            currentStep
                          )
                        ? "bg-success text-white"
                        : "bg-border text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
                {i < 3 && (
                  <div className="w-8 h-0.5 bg-border" />
                )}
              </div>
            )
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
          {currentStep === "gmail" && (
            <div>
              <h2 className="text-lg font-semibold mb-4">
                Gmail・カレンダー連携
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                MCiaがメールの読み取りとカレンダー管理を行うために、
                Googleアカウントへのアクセスを許可してください。
              </p>
              <button
                onClick={() => setCurrentStep("agencies")}
                className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
              >
                Googleアカウントを連携する
              </button>
            </div>
          )}

          {currentStep === "agencies" && (
            <div>
              <h2 className="text-lg font-semibold mb-4">所属事務所の登録</h2>
              <p className="text-sm text-muted-foreground mb-6">
                案件メールを受け取る事務所のメールドメインを登録してください。
                後からいつでも追加・変更できます。
              </p>
              <div className="space-y-3 mb-6">
                <input
                  type="text"
                  placeholder="事務所名"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
                <input
                  type="text"
                  placeholder="メールドメイン (例: abc-casting.co.jp)"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
                <button className="text-sm text-primary hover:underline">
                  + もう1つ追加
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentStep("gmail")}
                  className="flex-1 py-3 border border-border rounded-lg hover:bg-muted transition-colors font-medium"
                >
                  戻る
                </button>
                <button
                  onClick={() => setCurrentStep("calendar")}
                  className="flex-1 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                >
                  次へ
                </button>
              </div>
            </div>
          )}

          {currentStep === "calendar" && (
            <div>
              <h2 className="text-lg font-semibold mb-4">
                カレンダー確認
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                既存のカレンダー予定からMC関連の予定を検出しました。
                以下の予定はMC案件として管理しますか？
              </p>
              <div className="space-y-2 mb-6">
                <p className="text-sm text-muted-foreground text-center py-4">
                  カレンダーを読み込み中...
                </p>
              </div>
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
              <a
                href="/dashboard"
                className="inline-block w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
              >
                ダッシュボードへ
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
