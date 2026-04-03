import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sourceId: string }> },
) {
  const { id: _bidId, sourceId: _sourceId } = await params;

  return NextResponse.json(
    { error: "Preview nije implementiran." },
    { status: 501 },
  );
}
