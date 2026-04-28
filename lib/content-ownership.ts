import { prisma } from "@/lib/prisma";

type ContentKind = "problem" | "wiki";

type Actor = {
  id: string;
  role: "user" | "admin";
};

export class ContentPermissionError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

export async function ensureOwnership(kind: ContentKind, slug: string, ownerId: string) {
  return prisma.contentOwnership.upsert({
    where: { kind_slug: { kind, slug } },
    create: { kind, slug, ownerId },
    update: {},
  });
}

export async function assertCanEditContent(kind: ContentKind, slug: string, actor: Actor) {
  if (actor.role !== "admin") {
    throw new ContentPermissionError("既存コンテンツの編集は管理者のみ可能です。", 403);
  }

  const ownership = await prisma.contentOwnership.findUnique({
    where: { kind_slug: { kind, slug } },
  });

  return { ownership, canClaim: !ownership };
}

