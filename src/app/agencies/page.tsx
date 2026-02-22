"use client";

import { useState, useEffect } from "react";

interface Agency {
  id: string;
  name: string;
  email: string | null;
  emailDomain: string;
}

export default function AgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAgencies();
  }, []);

  async function fetchAgencies() {
    try {
      const res = await fetch("/api/agencies");
      if (res.ok) {
        setAgencies(await res.json());
      }
    } catch {
      // API may not be available yet
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!name) return;
    const domain = email.includes("@") ? email.split("@")[1] : email;
    if (!domain) return;

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/agencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: email.includes("@") ? email : undefined,
          emailDomain: domain,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: { fieldErrors?: { emailDomain?: string[] } } };
        setError(data.error?.fieldErrors?.emailDomain?.[0] || "登録に失敗しました");
        return;
      }
      const agency = (await res.json()) as Agency;
      setAgencies([agency, ...agencies]);
      setName("");
      setEmail("");
      setIsAdding(false);
    } catch {
      setError("ネットワークエラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("この事務所を削除しますか？")) return;
    try {
      const res = await fetch(`/api/agencies/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAgencies(agencies.filter((a) => a.id !== id));
      }
    } catch {
      // silent fail
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">所属事務所</h1>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm"
        >
          + 事務所を追加
        </button>
      </div>

      {/* Add form */}
      {isAdding && (
        <div className="bg-white rounded-xl border border-border p-6 mb-6">
          <h2 className="font-semibold mb-4">新しい事務所を追加</h2>
          {error && (
            <p className="text-sm text-danger mb-4">{error}</p>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">事務所名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: ABC キャスティング"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                メールアドレスまたはドメイン
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="例: info@abc-casting.co.jp または abc-casting.co.jp"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                この事務所から届くメールのアドレスまたはドメインを入力してください
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={submitting}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover text-sm disabled:opacity-50"
              >
                {submitting ? "追加中..." : "追加"}
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setName("");
                  setEmail("");
                  setError("");
                }}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted text-sm"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agency list */}
      {loading ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      ) : agencies.length === 0 && !isAdding ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground mb-4">
            まだ事務所が登録されていません
          </p>
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover text-sm"
          >
            最初の事務所を追加
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {agencies.map((agency) => (
            <div
              key={agency.id}
              className="bg-white rounded-xl border border-border p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium">{agency.name}</p>
                <p className="text-sm text-muted-foreground">
                  {agency.emailDomain}
                </p>
              </div>
              <button
                onClick={() => handleDelete(agency.id)}
                className="text-sm text-danger hover:underline"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
