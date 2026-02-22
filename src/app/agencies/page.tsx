"use client";

import { useState } from "react";

interface Agency {
  id: string;
  name: string;
  email: string;
  emailDomain: string;
}

export default function AgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  function handleAdd() {
    if (!name || !email) return;
    const domain = email.includes("@") ? email.split("@")[1] : email;
    const newAgency: Agency = {
      id: crypto.randomUUID(),
      name,
      email,
      emailDomain: domain,
    };
    setAgencies([...agencies, newAgency]);
    setName("");
    setEmail("");
    setIsAdding(false);
    // TODO: POST /api/agencies
  }

  function handleDelete(id: string) {
    setAgencies(agencies.filter((a) => a.id !== id));
    // TODO: DELETE /api/agencies/:id
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
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                事務所名
              </label>
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
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover text-sm"
              >
                追加
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setName("");
                  setEmail("");
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
      {agencies.length === 0 && !isAdding ? (
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
