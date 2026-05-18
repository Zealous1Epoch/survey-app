import { NextRequest, NextResponse } from "next/server";
import { getSubmissions } from "@/lib/db/responses";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const submissions = getSubmissions(id);
  return NextResponse.json(submissions);
}
