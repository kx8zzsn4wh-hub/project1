import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { SESSION_COOKIE_NAME } from "@/lib/session-constants";

type LoginBody = {
  username?: string;
  password?: string;
};

export async function POST(request: Request) {
  let body: LoginBody = {};

  try {
    body = (await request.json()) as LoginBody;
  } catch {
    body = {};
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!username) {
    return NextResponse.json({ ok: false, message: "usernameを入力してください。" }, { status: 400 });
  }

  if (!password) {
    return NextResponse.json({ ok: false, message: "passwordを入力してください。" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.passwordHash) {
    return NextResponse.json({ ok: false, message: "ユーザー名またはパスワードが正しくありません。" }, { status: 401 });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return NextResponse.json({ ok: false, message: "ユーザー名またはパスワードが正しくありません。" }, { status: 401 });
  }

  const session = await createSession({
    userId: user.id,
  });

  const response = NextResponse.json({
    ok: true,
    session: {
      id: session.id,
      createdAt: session.createdAt,
    },
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: session.id,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}
