"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface ProjectDetail {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  agencyName: string | null;
  location: string | null;
  compensation: string | null;
  genre: string | null;
  requiresPr: boolean;
  calendarEventId: string | null;
  rawEmailBody: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ConflictProject {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  agencyName: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  new: "新着",
  draft_created: "下書き作成済",
  entered: "エントリー済",
  confirmed: "確定",
  decline_draft: "辞退下書き",
  declined: "辞退済",
  expired: "期限切れ",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  draft_created: "bg-purple-100 text-purple-700",
  entered: "bg-amber-100 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  decline_draft: "bg-orange-100 text-orange-700",
  declined: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-500",
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [conflicts, setConflicts] = useState<ConflictProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (res.ok) {
          setProject(await res.json());
        }

        const conflictsRes = await fetch(`/api/projects/${id}/conflicts`);
        if (conflictsRes.ok) {
          setConflicts(await conflictsRes.json());
        }
      } catch {
        // API may not be available
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-muted-foreground mb-4">案件が見つかりません</p>
        <Link href="/projects" className="text-primary hover:underline text-sm">
          案件一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/projects" className="text-sm text-primary hover:underline mb-4 inline-block">
        &larr; 案件一覧
      </Link>

      <div className="bg-white rounded-xl border border-border p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-xl font-bold">{project.title}</h1>
          <span
            className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[project.status] || "bg-gray-100 text-gray-600"}`}
          >
            {STATUS_LABELS[project.status] || project.status}
          </span>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {project.agencyName && (
            <>
              <dt className="text-muted-foreground">事務所</dt>
              <dd>{project.agencyName}</dd>
            </>
          )}
          <dt className="text-muted-foreground">日程</dt>
          <dd>
            {project.startDate}
            {project.endDate !== project.startDate && ` ~ ${project.endDate}`}
          </dd>
          {project.location && (
            <>
              <dt className="text-muted-foreground">場所</dt>
              <dd>{project.location}</dd>
            </>
          )}
          {project.compensation && (
            <>
              <dt className="text-muted-foreground">報酬</dt>
              <dd>{project.compensation}</dd>
            </>
          )}
          {project.genre && (
            <>
              <dt className="text-muted-foreground">ジャンル</dt>
              <dd>{project.genre}</dd>
            </>
          )}
          <dt className="text-muted-foreground">PR必要</dt>
          <dd>{project.requiresPr ? "はい" : "いいえ"}</dd>
          <dt className="text-muted-foreground">登録日</dt>
          <dd>{new Date(project.createdAt).toLocaleDateString("ja-JP")}</dd>
        </dl>
      </div>

      {/* Schedule conflicts */}
      {conflicts.length > 0 && (
        <div className="bg-white rounded-xl border border-danger/30 p-6 mb-6">
          <h2 className="font-semibold text-danger mb-3">日程が重複する案件</h2>
          <div className="space-y-2">
            {conflicts.map((c) => (
              <Link
                key={c.id}
                href={`/projects/${c.id}`}
                className="block p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <p className="text-sm font-medium">{c.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {c.agencyName && `${c.agencyName} / `}
                  {c.startDate}
                  {c.endDate !== c.startDate && ` ~ ${c.endDate}`}
                  {" / "}
                  {STATUS_LABELS[c.status] || c.status}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Raw email body */}
      {project.rawEmailBody && (
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="font-semibold mb-3">元メール本文</h2>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted p-4 rounded-lg max-h-80 overflow-y-auto">
            {project.rawEmailBody}
          </pre>
        </div>
      )}
    </div>
  );
}
