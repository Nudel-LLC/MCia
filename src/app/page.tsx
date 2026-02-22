import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">MCia</h1>
          <Link
            href="/login"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            ログイン
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 py-20 text-center">
          <h2 className="text-4xl font-bold mb-6 leading-tight">
            MC・コンパニオンの
            <br />
            エントリー業務を自動化
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            案件メールの確認、スケジュール管理、エントリー返信、辞退連絡。
            <br />
            毎日の煩雑な作業をMCiaが全て自動化します。
          </p>
          <Link
            href="/login"
            className="inline-block px-8 py-4 bg-primary text-white text-lg font-semibold rounded-lg hover:bg-primary-hover transition-colors"
          >
            無料で始める
          </Link>
        </section>

        {/* Features */}
        <section className="bg-muted py-20">
          <div className="max-w-6xl mx-auto px-4">
            <h3 className="text-2xl font-bold text-center mb-12">
              MCiaでできること
            </h3>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                title="メール自動解析"
                description="各事務所からの案件募集メールをAIが自動で読み取り、日程・場所・報酬などを抽出します。"
              />
              <FeatureCard
                title="スケジュール自動管理"
                description="Googleカレンダーと連携し、空き確認・仮予定登録・確定更新を自動で行います。"
              />
              <FeatureCard
                title="エントリー下書き作成"
                description="空きがあれば参加希望メールの下書きを自動作成。過去実績からPRも自動生成します。"
              />
              <FeatureCard
                title="辞退メール自動作成"
                description="案件決定時、日程が重複する他の仮案件への辞退メールを自動で下書き作成します。"
              />
              <FeatureCard
                title="LINE通知"
                description="エントリー結果、案件決定、辞退処理の状況をLINEでリアルタイム通知します。"
              />
              <FeatureCard
                title="請求データ出力"
                description="月次の確定案件を事務所別に一覧表示。CSV出力で請求書作成をサポートします。"
              />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20">
          <div className="max-w-6xl mx-auto px-4">
            <h3 className="text-2xl font-bold text-center mb-12">
              使い方はかんたん
            </h3>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <StepCard
                step="1"
                title="Googleアカウントで登録"
                description="Gmailとカレンダーを連携するだけ。"
              />
              <StepCard
                step="2"
                title="所属事務所を登録"
                description="事務所のメールドメインを追加します。"
              />
              <StepCard
                step="3"
                title="あとはMCiaにお任せ"
                description="メール受信からエントリーまで自動化。LINEで結果を通知します。"
              />
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="bg-muted py-20">
          <div className="max-w-md mx-auto px-4 text-center">
            <h3 className="text-2xl font-bold mb-8">料金プラン</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
              <p className="text-muted-foreground mb-2">月額</p>
              <p className="text-5xl font-bold mb-2">
                500<span className="text-xl font-normal">円</span>
              </p>
              <p className="text-sm text-muted-foreground mb-6">(税込)</p>
              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <span className="text-success mt-0.5">&#10003;</span>
                  メール自動解析・分類(無制限)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-0.5">&#10003;</span>
                  エントリー下書き自動作成
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-0.5">&#10003;</span>
                  カレンダー自動管理
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-0.5">&#10003;</span>
                  辞退メール自動作成
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-0.5">&#10003;</span>
                  LINE通知
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-0.5">&#10003;</span>
                  請求データエクスポート
                </li>
              </ul>
              <Link
                href="/login"
                className="block w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-semibold"
              >
                今すぐ始める
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 MCia. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-border">
      <h4 className="text-lg font-semibold mb-3">{title}</h4>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {step}
      </div>
      <h4 className="font-semibold mb-2">{title}</h4>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
