"use client";

import { useState, useEffect, useCallback } from "react";

interface Agency {
  id: string;
  name: string;
}

interface InvoiceRow {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  days: number;
  compensation: number | string | null;
  location: string | null;
  agencyName: string | null;
}

export default function InvoiceDataPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedAgency, setSelectedAgency] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [invoiceData, setInvoiceData] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/agencies")
      .then((res) => (res.ok ? (res.json() as Promise<Agency[]>) : []))
      .then(setAgencies)
      .catch(() => {});
  }, []);

  const fetchInvoiceData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: String(selectedYear),
        month: String(selectedMonth),
      });
      if (selectedAgency) params.set("agency_id", selectedAgency);
      const res = await fetch(`/api/invoice-data?${params}`);
      if (res.ok) {
        setInvoiceData(await res.json());
      }
    } catch {
      // API may not be available yet
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, selectedAgency]);

  useEffect(() => {
    fetchInvoiceData();
  }, [fetchInvoiceData]);

  const total = invoiceData.reduce(
    (sum, row) => sum + (parseInt(String(row.compensation || "0"), 10) || 0),
    0
  );
  const totalDays = invoiceData.reduce((sum, row) => sum + row.days, 0);

  function handleCopyTable() {
    const header = "案件名\t担当日付\t日数\t金額";
    const rows = invoiceData.map(
      (row) =>
        `${row.title}\t${row.startDate}${row.endDate !== row.startDate ? `~${row.endDate}` : ""}\t${row.days}\t${row.compensation || 0}`
    );
    const footer = `\t\t合計${totalDays}日間\t${total}`;
    navigator.clipboard.writeText([header, ...rows, footer].join("\n"));
  }

  function handleDownloadCSV() {
    const bom = "\uFEFF";
    const header = "案件名,担当日付,日数,金額";
    const rows = invoiceData.map(
      (row) =>
        `${row.title},${row.startDate}${row.endDate !== row.startDate ? `~${row.endDate}` : ""},${row.days},${row.compensation || 0}`
    );
    const footer = `,,合計,${total}`;
    const csv = bom + [header, ...rows, footer].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MCia_請求データ_${selectedYear}年${String(selectedMonth).padStart(2, "0")}月.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">請求データ</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={selectedAgency}
          onChange={(e) => setSelectedAgency(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm bg-white"
        >
          <option value="">全事務所</option>
          {agencies.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-3 py-2 border border-border rounded-lg text-sm bg-white"
        >
          {Array.from({ length: 3 }, (_, i) => {
            const y = new Date().getFullYear() - i;
            return (
              <option key={y} value={y}>
                {y}年
              </option>
            );
          })}
        </select>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="px-3 py-2 border border-border rounded-lg text-sm bg-white"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}月
            </option>
          ))}
        </select>
      </div>

      {/* Data table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden mb-4">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="text-left px-4 py-3 text-sm font-medium">案件名</th>
              <th className="text-left px-4 py-3 text-sm font-medium">日付</th>
              <th className="text-right px-4 py-3 text-sm font-medium">日数</th>
              <th className="text-right px-4 py-3 text-sm font-medium">金額</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-muted-foreground text-sm">
                  読み込み中...
                </td>
              </tr>
            ) : invoiceData.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-muted-foreground text-sm">
                  該当する確定案件がありません
                </td>
              </tr>
            ) : (
              <>
                {invoiceData.map((row) => (
                  <tr key={row.id} className="border-b border-border">
                    <td className="px-4 py-3 text-sm">{row.title}</td>
                    <td className="px-4 py-3 text-sm">
                      {row.startDate}
                      {row.endDate !== row.startDate && `~${row.endDate}`}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">{row.days}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      &yen;{(parseInt(String(row.compensation || "0"), 10) || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted font-medium">
                  <td className="px-4 py-3 text-sm">合計</td>
                  <td className="px-4 py-3 text-sm"></td>
                  <td className="px-4 py-3 text-sm text-right">{totalDays}日間</td>
                  <td className="px-4 py-3 text-sm text-right">
                    &yen;{total.toLocaleString()}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleCopyTable}
          disabled={invoiceData.length === 0}
          className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          テーブルをコピー
        </button>
        <button
          onClick={handleDownloadCSV}
          disabled={invoiceData.length === 0}
          className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          CSVダウンロード
        </button>
      </div>
    </div>
  );
}
