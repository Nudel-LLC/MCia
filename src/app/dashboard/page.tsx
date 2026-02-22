"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Project {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  agencyName: string | null;
  location: string | null;
  compensation: string | null;
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

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/projects?limit=20");
        if (res.ok) {
          setProjects(await res.json());
        }
      } catch {
        // API may not be available yet
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const stats = {
    newProjects: projects.filter((p) => p.status === "new" || p.status === "draft_created").length,
    enteredProjects: projects.filter((p) => p.status === "entered").length,
    confirmedProjects: projects.filter((p) => p.status === "confirmed").length,
    pendingDeclines: projects.filter((p) => p.status === "decline_draft").length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">ダッシュボード</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="新着案件" value={stats.newProjects} color="blue" />
        <StatCard label="エントリー済み" value={stats.enteredProjects} color="yellow" />
        <StatCard label="確定案件" value={stats.confirmedProjects} color="green" />
        <StatCard label="辞退待ち" value={stats.pendingDeclines} color="red" />
      </div>

      {/* Recent Projects */}
      <div className="bg-white rounded-xl border border-border">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">最近の案件</h2>
          <Link href="/projects" className="text-sm text-primary hover:underline">
            すべて見る
          </Link>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="p-6">
              <p className="text-muted-foreground text-sm">読み込み中...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="p-6">
              <p className="text-muted-foreground text-sm">
                案件メールを受信すると、ここに自動で表示されます。
              </p>
            </div>
          ) : (
            projects.slice(0, 10).map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block px-6 py-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{project.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {project.agencyName && <span>{project.agencyName} / </span>}
                      {project.startDate}
                      {project.endDate !== project.startDate && ` ~ ${project.endDate}`}
                      {project.location && ` / ${project.location}`}
                    </p>
                  </div>
                  <span
                    className={`ml-3 shrink-0 text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[project.status] || "bg-gray-100 text-gray-600"}`}
                  >
                    {STATUS_LABELS[project.status] || project.status}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "blue" | "yellow" | "green" | "red";
}) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    yellow: "bg-amber-50 text-amber-700 border-amber-200",
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className={`rounded-xl p-4 border ${colorMap[color]}`}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}
