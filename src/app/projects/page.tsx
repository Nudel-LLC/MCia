"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { ProjectStatus } from "@/db/schema";

interface Project {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  agencyName: string | null;
  location: string | null;
  compensation: string | null;
  genre: string | null;
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

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "すべてのステータス" },
  { value: "new", label: "新着" },
  { value: "draft_created", label: "下書き作成済" },
  { value: "entered", label: "エントリー済" },
  { value: "confirmed", label: "確定" },
  { value: "decline_draft", label: "辞退下書き" },
  { value: "declined", label: "辞退済" },
  { value: "expired", label: "期限切れ" },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/projects?${params}`);
      if (res.ok) {
        setProjects(await res.json());
      }
    } catch {
      // API may not be available
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">案件一覧</h1>

      {/* Filter */}
      <div className="mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm bg-white"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Project list */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground text-sm">読み込み中...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground text-sm">
              {statusFilter ? "該当する案件がありません" : "案件メールを受信すると、ここに自動で表示されます。"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block px-6 py-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{project.title}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                      {project.agencyName && (
                        <p className="text-xs text-muted-foreground">{project.agencyName}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {project.startDate}
                        {project.endDate !== project.startDate && ` ~ ${project.endDate}`}
                      </p>
                      {project.location && (
                        <p className="text-xs text-muted-foreground">{project.location}</p>
                      )}
                      {project.compensation && (
                        <p className="text-xs text-muted-foreground">{project.compensation}</p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`ml-3 shrink-0 text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[project.status] || "bg-gray-100 text-gray-600"}`}
                  >
                    {STATUS_LABELS[project.status] || project.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
