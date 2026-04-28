import { NextResponse } from "next/server";
import { getManagedTagPaths } from "@/lib/tag-taxonomy";

export const dynamic = "force-dynamic";

export async function GET() {
  const paths = getManagedTagPaths();

  return NextResponse.json(
    { ok: true, paths },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
