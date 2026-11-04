import { NextRequest, NextResponse } from "next/server";
import { getExportRows } from "@/lib/db/responses";
import ExcelJS from "exceljs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rows = getExportRows(id);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("数据");

    if (rows.length > 0) {
      ws.columns = Object.keys(rows[0]).map((key) => ({
        header: key,
        key,
        width: 30,
      }));

      rows.forEach((row) => ws.addRow(row));
    }

    const buf = await wb.xlsx.writeBuffer();
    return new NextResponse(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="survey-${id}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("导出数据失败:", error);
    return NextResponse.json({ error: "导出数据失败" }, { status: 500 });
  }
}
