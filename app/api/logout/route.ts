import { NextResponse } from "next/server";
import { deleteSessionById, getSession } from "@/lib/session";
import { SESSION_COOKIE_NAME } from "@/lib/session-constants";

export async function POST() {
  const session = await getSession();

  if (session) {
    await deleteSessionById(session.id);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);

  return response;
}
