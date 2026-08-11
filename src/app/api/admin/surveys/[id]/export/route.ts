import { NextRequest, NextResponse } from "next/server";
import { getSurvey } from "@/lib/db/surveys";
import { getExportRows } from "@/lib/db/responses";
import ExcelJS from "exceljs";

function checkOwnership(survey: { user_id: string | null } | null, req: NextRequest): NextResponse | null {
  if (!survey) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 });
  }
  const role = req.headers.get("x-user-role");
  const userId = req.headers.get("x-user-id");
  if (role !== "super_admin" && survey.user_id !== userId) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const survey = await getSurvey(id);
  const err = checkOwnership(survey, req);
  if (err) return err;

  const rows = await getExportRows(id);

  if (rows.length === 0) {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet("数据");
    const buf = await wb.xlsx.writeBuffer();
    return new NextResponse(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="survey-${id}.xlsx"`,
      },
    });
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("数据");

  ws.columns = Object.keys(rows[0]).map((key) => ({
    header: key,
    key,
    width: 30,
  }));

  rows.forEach((row) => ws.addRow(row));

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="survey-${id}.xlsx"`,
    },
  });
}