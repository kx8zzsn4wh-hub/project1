import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { sanitizePostContent } from "@/lib/sanitize";

type UpdatePostBody = {
  content?: string;
};

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const target = await prisma.post.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ ok: false, message: "Post not found" }, { status: 404 });
  }

  if (target.authorId !== user.id) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  let body: UpdatePostBody = {};

  try {
    body = (await request.json()) as UpdatePostBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body" }, { status: 400 });
  }

  const content = typeof body.content === "string" ? sanitizePostContent(body.content) : "";
  if (!content) {
    return NextResponse.json({ ok: false, message: "content is required" }, { status: 400 });
  }

  const post = await prisma.post.update({
    where: { id },
    data: { content },
    include: {
      author: {
        select: {
          username: true,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, post });
}

export async function DELETE(_request: Request, context: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const target = await prisma.post.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ ok: false, message: "Post not found" }, { status: 404 });
  }

  const canDelete = target.authorId === user.id || user.role === "admin";
  if (!canDelete) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  await prisma.post.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
