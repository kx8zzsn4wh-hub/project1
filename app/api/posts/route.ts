import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { sanitizePostContent } from "@/lib/sanitize";

type CreatePostBody = {
  content?: string;
  channelId?: string;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  let body: CreatePostBody = {};

  try {
    body = (await request.json()) as CreatePostBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body" }, { status: 400 });
  }

  const content = typeof body.content === "string" ? sanitizePostContent(body.content) : "";
  const channelId = typeof body.channelId === "string" ? body.channelId.trim() : "";

  if (!content) {
    return NextResponse.json({ ok: false, message: "content is required" }, { status: 400 });
  }

  if (!channelId) {
    return NextResponse.json({ ok: false, message: "channelId is required" }, { status: 400 });
  }

  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel) {
    return NextResponse.json({ ok: false, message: "Invalid channelId" }, { status: 400 });
  }

  const post = await prisma.post.create({
    data: {
      content,
      channelId,
      authorId: user.id,
    },
    include: {
      author: {
        select: {
          username: true,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, post }, { status: 201 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get("channelId")?.trim() ?? "";
  const cursor = searchParams.get("cursor")?.trim() ?? "";
  const takeParam = Number(searchParams.get("take"));

  if (!channelId) {
    return NextResponse.json({ ok: false, message: "channelId is required" }, { status: 400 });
  }

  const take = Number.isFinite(takeParam) ? Math.min(Math.max(Math.floor(takeParam), 1), 50) : 50;

  const posts = await prisma.post.findMany({
    where: {
      channelId,
    },
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],
    ...(cursor
      ? {
          cursor: {
            id: cursor,
          },
          skip: 1,
        }
      : {}),
    take,
    include: {
      author: {
        select: {
          username: true,
        },
      },
    },
  });

  const nextCursor = posts.length === take ? posts[posts.length - 1]?.id ?? null : null;

  return NextResponse.json({ ok: true, posts, nextCursor });
}
