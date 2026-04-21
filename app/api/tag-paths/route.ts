import { NextResponse } from "next/server";
import { getManagedTagPaths } from "@/lib/tag-taxonomy";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { ok: true, paths: getManagedTagPaths() },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
