import { NextResponse } from "next/server";
import { listManagedTagPaths } from "@/lib/tagManagement";

export const dynamic = "force-dynamic";

export async function GET() {
  const paths = await listManagedTagPaths();

  return NextResponse.json(
    { ok: true, paths },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
