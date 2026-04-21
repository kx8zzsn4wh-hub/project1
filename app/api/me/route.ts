import { NextResponse } from "next/server";
import { getCurrentUser, getSession } from "@/lib/session";

export async function GET() {
  const [session, user] = await Promise.all([getSession(), getCurrentUser()]);

  if (!session || !user) {
    return NextResponse.json({ ok: false, session: null, user: null }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    session: {
      id: session.id,
      createdAt: session.createdAt,
    },
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
}
