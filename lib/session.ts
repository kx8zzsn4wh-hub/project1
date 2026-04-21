import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/session-constants";

export type Session = {
  id: string;
  createdAt: Date;
  userId: string;
  user: User;
};

type CreateSessionInput = {
  userId: string;
};

function generateSessionId() {
  return randomBytes(32).toString("hex");
}

export async function createSession(input: CreateSessionInput) {
  const id = generateSessionId();

  const session = await prisma.session.create({
    data: {
      id,
      userId: input.userId,
    },
    include: {
      user: true,
    },
  });

  return session;
}

export async function deleteSessionById(sessionId: string | null | undefined) {
  if (!sessionId) {
    return;
  }

  await prisma.session.deleteMany({
    where: {
      id: sessionId,
    },
  });
}

export async function findSessionById(sessionId: string | null | undefined): Promise<Session | null> {
  if (!sessionId) {
    return null;
  }

  return prisma.session.findUnique({
    where: {
      id: sessionId,
    },
    include: {
      user: true,
    },
  });
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  return findSessionById(sessionId);
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}
