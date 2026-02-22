export default function DashboardPage() {
  // TODO: Fetch projects from API
  const stats = {
    newProjects: 3,
    enteredProjects: 5,
    confirmedProjects: 2,
    pendingDeclines: 1,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">ダッシュボード</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="新着案件" value={stats.newProjects} color="blue" />
        <StatCard
          label="エントリー済み"
          value={stats.enteredProjects}
          color="yellow"
        />
        <StatCard
          label="確定案件"
          value={stats.confirmedProjects}
          color="green"
        />
        <StatCard
          label="辞退待ち"
          value={stats.pendingDeclines}
          color="red"
        />
      </div>

      {/* Recent Projects */}
      <div className="bg-white rounded-xl border border-border">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold">最近の案件</h2>
        </div>
        <div className="p-6">
          <p className="text-muted-foreground text-sm">
            案件メールを受信すると、ここに自動で表示されます。
          </p>
          {/* TODO: Project list component */}
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
