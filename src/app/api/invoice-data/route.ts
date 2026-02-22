import { NextRequest, NextResponse } from "next/server";
import { eq, and, gte, lt } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { projects, agencies } from "@/db/schema";
import { invoiceQuerySchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = invoiceQuerySchema.safeParse({
    year: searchParams.get("year"),
    month: searchParams.get("month"),
    agency_id: searchParams.get("agency_id"),
    format: searchParams.get("format"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { year, month, agency_id, format } = parsed.data;
  const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endOfMonth = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  const db = getDb();
  const conditions = [
    eq(projects.userId, session.user.id),
    eq(projects.status, "confirmed"),
    gte(projects.startDate, startOfMonth),
    lt(projects.startDate, endOfMonth),
  ];
  if (agency_id) conditions.push(eq(projects.agencyId, agency_id));

  const results = await db
    .select({
      id: projects.id,
      title: projects.title,
      startDate: projects.startDate,
      endDate: projects.endDate,
      compensation: projects.compensation,
      location: projects.location,
      agencyName: agencies.name,
    })
    .from(projects)
    .leftJoin(agencies, eq(projects.agencyId, agencies.id))
    .where(and(...conditions))
    .orderBy(projects.startDate);

  const data = results.map((row) => {
    const start = new Date(row.startDate);
    const end = new Date(row.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return { ...row, days };
  });

  if (format === "csv") {
    const bom = "\uFEFF";
    const header = "案件名,担当日付,日数,金額";
    const rows = data.map(
      (row) =>
        `${row.title},${row.startDate}${row.startDate !== row.endDate ? `~${row.endDate}` : ""},${row.days},${row.compensation || 0}`
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
        "Content-Disposition": `attachment; filename="MCia_請求データ_${year}年${String(month).padStart(2, "0")}月.csv"`,
      },
    });
  }

  return NextResponse.json(data);
}
