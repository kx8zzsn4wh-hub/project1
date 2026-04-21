import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

type RegisterBody = {
  username?: string;
  password?: string;
};

export async function POST(request: Request) {
  let body: RegisterBody = {};

  try {
    body = (await request.json()) as RegisterBody;
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

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) {
    return NextResponse.json({ ok: false, message: "そのusernameは既に使用されています。" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      role: "user",
    },
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, user }, { status: 201 });
}
