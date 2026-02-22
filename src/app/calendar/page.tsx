"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

interface Project {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  agencyName: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-200 border-blue-400 text-blue-900",
  draft_created: "bg-purple-200 border-purple-400 text-purple-900",
  entered: "bg-amber-200 border-amber-400 text-amber-900",
  confirmed: "bg-green-200 border-green-400 text-green-900",
  decline_draft: "bg-orange-200 border-orange-400 text-orange-900",
  declined: "bg-red-100 border-red-300 text-red-700 line-through opacity-60",
  expired: "bg-gray-100 border-gray-300 text-gray-500 opacity-60",
};

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

export default function CalendarPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch("/api/projects?limit=100");
        if (res.ok) {
          setProjects(await res.json());
        }
      } catch {
        // API may not be available
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [year, month]);

  function getProjectsForDay(day: number): Project[] {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return projects.filter((p) => p.startDate <= dateStr && p.endDate >= dateStr);
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function goToday() {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">カレンダー</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 border border-border rounded-lg hover:bg-muted text-sm"
          >
            &larr;
          </button>
          <button
            onClick={goToday}
            className="px-3 py-2 border border-border rounded-lg hover:bg-muted text-sm"
          >
            今月
          </button>
          <span className="px-3 py-2 font-semibold text-sm min-w-[120px] text-center">
            {year}年{month + 1}月
          </span>
          <button
            onClick={nextMonth}
            className="p-2 border border-border rounded-lg hover:bg-muted text-sm"
          >
            &rarr;
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAY_NAMES.map((name, i) => (
              <div
                key={name}
                className={`px-2 py-2 text-center text-xs font-medium ${
                  i === 0 ? "text-danger" : i === 6 ? "text-blue-600" : "text-muted-foreground"
                }`}
              >
                {name}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dayProjects = day ? getProjectsForDay(day) : [];
              const dayOfWeek = i % 7;
              return (
                <div
                  key={i}
                  className={`min-h-[100px] border-b border-r border-border p-1 ${
                    day === null ? "bg-muted/30" : ""
                  }`}
                >
                  {day !== null && (
                    <>
                      <p
                        className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday(day)
                            ? "bg-primary text-white"
                            : dayOfWeek === 0
                              ? "text-danger"
                              : dayOfWeek === 6
                                ? "text-blue-600"
                                : ""
                        }`}
                      >
                        {day}
                      </p>
                      <div className="space-y-0.5">
                        {dayProjects.slice(0, 3).map((p) => (
                          <Link
                            key={p.id}
                            href={`/projects/${p.id}`}
                            className={`block text-[10px] leading-tight px-1 py-0.5 rounded border truncate ${STATUS_COLORS[p.status] || "bg-gray-100 border-gray-300"}`}
                            title={p.title}
                          >
                            {p.title}
                          </Link>
                        ))}
                        {dayProjects.length > 3 && (
                          <p className="text-[10px] text-muted-foreground px-1">
                            +{dayProjects.length - 3}件
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
