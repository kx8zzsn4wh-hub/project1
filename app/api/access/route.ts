import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: { code?: string } = {};

  try {
    body = (await request.json()) as { code?: string };
  } catch {
    body = {};
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  const expected = process.env.ACCESS_CODE ?? "";

  if (!code || code !== expected) {
    return NextResponse.json({ ok: false, message: "アクセスコードが正しくありません。" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("access_verified", "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
