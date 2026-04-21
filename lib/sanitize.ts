export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function sanitizePostContent(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  return escapeHtml(trimmed);
}
