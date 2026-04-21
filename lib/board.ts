export type UserRole = "user" | "admin";

export type CurrentUser = {
  id: string;
  username: string;
  role: UserRole;
};

export type MeResponse = {
  ok: boolean;
  user?: CurrentUser;
};

export type PostItem = {
  id: string;
  content: string;
  createdAt: string;
  authorId: string;
  channelId: string;
  author: {
    username: string;
  };
};

export type PostsResponse = {
  ok?: boolean;
  posts?: PostItem[];
  nextCursor?: string | null;
  message?: string;
};

export type ChannelId = "notice" | "chat";

export const CHANNELS: Array<{ id: ChannelId; label: string }> = [
  { id: "notice", label: "連絡" },
  { id: "chat", label: "雑談" },
];

export const CHANNEL_LABELS: Record<ChannelId, string> = {
  notice: "連絡",
  chat: "雑談",
};

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "日時不明";
  }

  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function appendMention(currentText: string, username: string) {
  const mention = `@${username}`;

  if (!currentText.trim()) {
    return `${mention} `;
  }

  const needsSpace = currentText.endsWith(" ") || currentText.endsWith("\n");
  return `${currentText}${needsSpace ? "" : " "}${mention} `;
}
