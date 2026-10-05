import type { Channel, MessageType } from "./types";

/**
 * Resolves a media URL, routing private Slack file URLs through the `/api/slack/file` proxy endpoint.
 */
export function getProxiedMediaUrl(
  url: string | null | undefined,
  options?: {
    channel?: Channel | string;
    download?: boolean;
    name?: string | null;
  }
): string {
  if (!url) return "";

  // If already a local proxy route or relative path
  if (url.startsWith("/api/")) return url;

  // Check if it's a Slack private file URL
  const isSlackFile =
    options?.channel === "slack" ||
    url.includes("files.slack.com") ||
    url.includes("slack-edge.com") ||
    url.includes("slack-msgs.com");

  if (isSlackFile && (url.startsWith("http://") || url.startsWith("https://"))) {
    const params = new URLSearchParams();
    params.set("url", url);
    if (options?.download) params.set("download", "1");
    if (options?.name) params.set("name", options.name);
    return `/api/slack/file?${params.toString()}`;
  }

  return url;
}

export interface FileTypeInfo {
  ext: string;
  category: "pdf" | "spreadsheet" | "doc" | "presentation" | "archive" | "code" | "media" | "generic";
  badgeBg: string;
  badgeText: string;
  iconBg: string;
  label: string;
}

/**
 * Analyzes filename and extension to provide curated color palettes and metadata for cards.
 */
export function getFileTypeInfo(filename?: string | null): FileTypeInfo {
  if (!filename) {
    return {
      ext: "FILE",
      category: "generic",
      badgeBg: "bg-surface-well border-hairline",
      badgeText: "text-mute",
      iconBg: "bg-surface-well text-mute",
      label: "File",
    };
  }

  const parts = filename.split(".");
  const ext = (parts.length > 1 ? parts.pop() || "" : "FILE").toUpperCase().slice(0, 5);

  const lower = ext.toLowerCase();

  if (lower === "pdf") {
    return {
      ext: "PDF",
      category: "pdf",
      badgeBg: "bg-red-500/10 border-red-500/20",
      badgeText: "text-red-600 dark:text-red-400",
      iconBg: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25",
      label: "PDF Document",
    };
  }

  if (["xlsx", "xls", "csv", "tsv", "numbers"].includes(lower)) {
    return {
      ext,
      category: "spreadsheet",
      badgeBg: "bg-emerald-500/10 border-emerald-500/20",
      badgeText: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
      label: "Spreadsheet",
    };
  }

  if (["doc", "docx", "pages", "odt", "rtf", "txt", "md"].includes(lower)) {
    return {
      ext,
      category: "doc",
      badgeBg: "bg-blue-500/10 border-blue-500/20",
      badgeText: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
      label: "Document",
    };
  }

  if (["ppt", "pptx", "key", "odp"].includes(lower)) {
    return {
      ext,
      category: "presentation",
      badgeBg: "bg-amber-500/10 border-amber-500/20",
      badgeText: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
      label: "Presentation",
    };
  }

  if (["zip", "tar", "gz", "7z", "rar", "dmg"].includes(lower)) {
    return {
      ext,
      category: "archive",
      badgeBg: "bg-purple-500/10 border-purple-500/20",
      badgeText: "text-purple-600 dark:text-purple-400",
      iconBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25",
      label: "Archive",
    };
  }

  if (["json", "js", "ts", "tsx", "jsx", "html", "css", "py", "sql", "sh", "yaml", "yml"].includes(lower)) {
    return {
      ext,
      category: "code",
      badgeBg: "bg-indigo-500/10 border-indigo-500/20",
      badgeText: "text-indigo-600 dark:text-indigo-400",
      iconBg: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/25",
      label: "Code",
    };
  }

  return {
    ext: ext || "DOC",
    category: "generic",
    badgeBg: "bg-surface-well border-hairline",
    badgeText: "text-ink/80",
    iconBg: "bg-surface-well text-ink/80 border-hairline",
    label: "Document",
  };
}
