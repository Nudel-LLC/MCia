"use client";

import { useState, useEffect } from "react";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  lineUserId: string | null;
  subscriptionStatus: string;
  gmailHistoryId: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/users/me");
        if (res.ok) {
          const data = (await res.json()) as UserProfile;
          setUser(data);
          setName(data.name || "");
        }
      } catch {
        // API may not be available
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // silent fail
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">設定</h1>

      {/* Profile */}
      <section className="bg-white rounded-xl border border-border p-6 mb-6">
        <h2 className="font-semibold mb-4">プロフィール</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">表示名</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-3 py-2 border border-border rounded-lg text-sm"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover text-sm disabled:opacity-50"
              >
                {saving ? "保存中..." : saved ? "保存しました" : "保存"}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">メールアドレス</label>
            <p className="text-sm text-muted-foreground">{user?.email || "未設定"}</p>
          </div>
        </div>
      </section>

      {/* Account status */}
      <section className="bg-white rounded-xl border border-border p-6 mb-6">
        <h2 className="font-semibold mb-4">アカウント状況</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">サブスクリプション</dt>
            <dd>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  user?.subscriptionStatus === "active"
                    ? "bg-green-100 text-green-700"
                    : user?.subscriptionStatus === "trial"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-gray-100 text-gray-600"
                }`}
              >
                {user?.subscriptionStatus === "active"
                  ? "有効"
                  : user?.subscriptionStatus === "trial"
                    ? "トライアル"
                    : "無効"}
              </span>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Gmail監視</dt>
            <dd className="text-sm">
              {user?.gmailHistoryId ? (
                <span className="text-success">連携済み</span>
              ) : (
                <span className="text-muted-foreground">未設定</span>
              )}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">LINE連携</dt>
            <dd className="text-sm">
              {user?.lineUserId ? (
                <span className="text-success">連携済み</span>
              ) : (
                <span className="text-muted-foreground">未連携</span>
              )}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">登録日</dt>
            <dd>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString("ja-JP") : "-"}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
