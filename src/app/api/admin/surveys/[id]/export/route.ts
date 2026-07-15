import { NextRequest, NextResponse } from "next/server";
import { getExportRows } from "@/lib/db/responses";
import { getSurvey } from "@/lib/db/surveys";
import ExcelJS from "exceljs";

function getUserId(req: NextRequest): string | null {
  return req.headers.get("x-user-id");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = getUserId(req);

  const survey = getSurvey(id);
  if (!survey) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 });
  }
  if (userId && survey.owner_id !== userId) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const rows = getExportRows(id);

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
