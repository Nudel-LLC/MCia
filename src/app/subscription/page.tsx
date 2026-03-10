"use client";

import { useState, useEffect } from "react";

interface UserProfile {
  subscriptionStatus: string;
  stripeCustomerId: string | null;
}

export default function SubscriptionPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/users/me");
        if (res.ok) {
          setUser(await res.json());
        }
      } catch {
        // API may not be available
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  const isActive = user?.subscriptionStatus === "active";
  const isTrial = user?.subscriptionStatus === "trial";

  async function handleCheckout() {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const { url } = (await res.json()) as { url?: string };
      if (url) {
        window.location.href = url;
      }
    } catch {
      alert("決済ページの作成に失敗しました。");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const { url } = (await res.json()) as { url?: string };
      if (url) {
        window.location.href = url;
      }
    } catch {
      alert("ポータルの作成に失敗しました。");
    } finally {
      setPortalLoading(false);
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
      <h1 className="text-2xl font-bold mb-8">サブスクリプション</h1>

      {/* Current status */}
      <div className="bg-white rounded-xl border border-border p-6 mb-6">
        <h2 className="font-semibold mb-4">現在のプラン</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold">
              {isActive ? "MCia プロ" : isTrial ? "トライアル" : "未契約"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isActive
                ? "すべての機能をご利用いただけます"
                : isTrial
                  ? "トライアル期間中です"
                  : "プランに加入して全機能をご利用ください"}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              isActive
                ? "bg-green-100 text-green-700"
                : isTrial
                  ? "bg-amber-100 text-amber-700"
                  : "bg-gray-100 text-gray-600"
            }`}
          >
            {isActive ? "有効" : isTrial ? "トライアル" : "無効"}
          </span>
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-xl border border-border p-6 mb-6">
        <h2 className="font-semibold mb-4">料金プラン</h2>
        <div className="border border-primary/30 rounded-xl p-6 bg-blue-50/30">
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-3xl font-bold">&yen;500</span>
            <span className="text-sm text-muted-foreground">/ 月（税込）</span>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground mb-6">
            <li>&#10003; 案件メール自動分類・パース</li>
            <li>&#10003; エントリー下書き自動作成</li>
            <li>&#10003; スケジュール重複チェック</li>
            <li>&#10003; 辞退メール自動作成</li>
            <li>&#10003; Googleカレンダー連携</li>
            <li>&#10003; LINE通知</li>
            <li>&#10003; 請求データCSVエクスポート</li>
          </ul>
          {!isActive && (
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50"
            >
              {checkoutLoading ? "処理中..." : "プランに加入する"}
            </button>
          )}
        </div>
      </div>

      {isActive && (
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="font-semibold mb-4">プラン管理</h2>
          <p className="text-sm text-muted-foreground mb-4">
            プランの変更や解約はStripeのカスタマーポータルから行えます。
          </p>
          <button
            onClick={handlePortal}
            disabled={portalLoading}
            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm disabled:opacity-50"
          >
            {portalLoading ? "処理中..." : "プランを管理する"}
          </button>
        </div>
      )}
    </div>
  );
}
