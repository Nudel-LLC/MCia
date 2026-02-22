import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDB } from "@/lib/db";

// GET /api/invoice-data - 請求データ取得
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const agencyId = searchParams.get("agency_id");
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const format = searchParams.get("format");

  if (!year || !month) {
    return NextResponse.json(
      { error: "year and month are required" },
      { status: 400 }
    );
  }

  // Build date range for the given month
  const startOfMonth = `${year}-${month.padStart(2, "0")}-01`;
  const nextMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
  const nextYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
  const endOfMonth = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  const db = getDB();
  let query = `
    SELECT p.id, p.title, p.start_date, p.end_date, p.compensation, p.location,
           a.name as agency_name
    FROM projects p
    LEFT JOIN agencies a ON p.agency_id = a.id
    WHERE p.user_id = ?
      AND p.status = 'confirmed'
      AND p.start_date >= ?
      AND p.start_date < ?
  `;
  const bindings: unknown[] = [session.user.id, startOfMonth, endOfMonth];

  if (agencyId) {
    query += " AND p.agency_id = ?";
    bindings.push(agencyId);
  }

  query += " ORDER BY p.start_date";

  const { results } = await db.prepare(query).bind(...bindings).all();

  interface InvoiceRow {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    compensation: string | null;
    location: string | null;
    agency_name: string | null;
    days: number;
  }

  // Calculate days for each project
  const data: InvoiceRow[] = (results as Array<Record<string, string | null>>).map((row) => {
    const start = new Date(row.start_date!);
    const end = new Date(row.end_date!);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return { ...row, days } as InvoiceRow;
  });

  // CSV format
  if (format === "csv") {
    const bom = "\uFEFF";
    const header = "案件名,担当日付,日数,金額";
    const rows = data.map(
      (row) =>
        `${row.title},${row.start_date}${row.start_date !== row.end_date ? `~${row.end_date}` : ""},${row.days},${row.compensation || 0}`
    );
    const total = data.reduce(
      (sum, row) => sum + parseInt(String(row.compensation || "0"), 10),
      0
    );
    rows.push(`,,合計,${total}`);

    const csv = bom + [header, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="MCia_請求データ_${year}年${month.padStart(2, "0")}月.csv"`,
      },
    });
  }

  return NextResponse.json(data);
}
