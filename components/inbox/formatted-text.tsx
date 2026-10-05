"use client";

import React, { Fragment } from "react";

interface FormattedTextProps {
  text?: string | null;
  outgoing?: boolean;
  className?: string;
}

interface TextSegment {
  type:
    | "text"
    | "link"
    | "user_mention"
    | "channel_mention"
    | "special_mention"
    | "code";
  content: string;
  href?: string;
  label?: string;
}

/**
 * Parses Slack mrkdwn and general chat text formatting into structured segments:
 * - Slack links: `<https://url|label>` and `<https://url>`
 * - Slack user mentions: `<@U12345|name>` and `<@U12345>`
 * - Slack channel mentions: `<#C12345|channel>` and `<#C12345>`
 * - Slack special mentions: `<!here>`, `<!channel>`, `<!everyone>`, `<!subteam^...|handle>`
 * - Standard web URLs: `https://...`, `http://...`
 * - Inline code: `` `code` ``
 */
function parseFormattedText(raw: string): TextSegment[] {
  if (!raw) return [];

  // Match Slack markup tokens and raw URLs (including protocol-less loom/youtube links)
  const tokenRegex =
    /(<https?:\/\/[^|>]+(?:\|[^>]+)?>|<mailto:[^|>]+(?:\|[^>]+)?>|<tel:[^|>]+(?:\|[^>]+)?>|<@[A-Z0-9]+(?:\|[^>]+)?>|<#[A-Z0-9]+(?:\|[^>]+)?>|<![a-zA-Z0-9_^-]+(?:\|[^>]+)?>|`[^`\n]+`|https?:\/\/[^\s<>]+|\b(?:www\.)?(?:loom\.com\/(?:share|embed)\/[a-zA-Z0-9_-]+|youtube\.com\/watch\?[^\s<>]+|youtu\.be\/[a-zA-Z0-9_-]+))/g;

  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(raw)) !== null) {
    // Push preceding plain text
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: raw.slice(lastIndex, match.index),
      });
    }

    let token = match[0];
    let trailingPunctuation = "";

    // 1. Slack Link: <url|label> or <url>
    if (token.startsWith("<http://") || token.startsWith("<https://") || token.startsWith("<mailto:") || token.startsWith("<tel:")) {
      const inner = token.slice(1, -1);
      const pipeIdx = inner.indexOf("|");
      if (pipeIdx !== -1) {
        const url = inner.slice(0, pipeIdx);
        const label = inner.slice(pipeIdx + 1);
        segments.push({
          type: "link",
          content: token,
          href: url,
          label: label || url,
        });
      } else {
        segments.push({
          type: "link",
          content: token,
          href: inner,
          label: inner,
        });
      }
    }
    // 2. Slack User Mention: <@USERID|name> or <@USERID>
    else if (token.startsWith("<@")) {
      const inner = token.slice(2, -1);
      const pipeIdx = inner.indexOf("|");
      const userId = pipeIdx !== -1 ? inner.slice(0, pipeIdx) : inner;
      const name = pipeIdx !== -1 ? inner.slice(pipeIdx + 1) : userId;
      segments.push({
        type: "user_mention",
        content: token,
        label: name.startsWith("@") ? name : `@${name}`,
      });
    }
    // 3. Slack Channel Mention: <#CHANNELID|name> or <#CHANNELID>
    else if (token.startsWith("<#")) {
      const inner = token.slice(2, -1);
      const pipeIdx = inner.indexOf("|");
      const chanId = pipeIdx !== -1 ? inner.slice(0, pipeIdx) : inner;
      const name = pipeIdx !== -1 ? inner.slice(pipeIdx + 1) : chanId;
      segments.push({
        type: "channel_mention",
        content: token,
        label: name.startsWith("#") ? name : `#${name}`,
      });
    }
    // 4. Slack Special Mention: <!here>, <!channel>, <!everyone>, <!subteam^...|name>
    else if (token.startsWith("<!")) {
      const inner = token.slice(2, -1);
      const pipeIdx = inner.indexOf("|");
      const mentionKey = pipeIdx !== -1 ? inner.slice(0, pipeIdx) : inner;
      const label = pipeIdx !== -1 ? inner.slice(pipeIdx + 1) : mentionKey;
      segments.push({
        type: "special_mention",
        content: token,
        label: label.startsWith("@") ? label : `@${label}`,
      });
    }
    // 5. Inline Code: `code`
    else if (token.startsWith("`") && token.endsWith("`") && token.length > 1) {
      segments.push({
        type: "code",
        content: token.slice(1, -1),
      });
    }
    // 6. Raw URL or known video domain
    else if (token.startsWith("http://") || token.startsWith("https://") || token.includes("loom.com/") || token.includes("youtube.com/") || token.includes("youtu.be/")) {
      // Clean trailing punctuation
      const puncMatch = token.match(/[),.;:!?]+$/);
      if (puncMatch) {
        trailingPunctuation = puncMatch[0];
        token = token.slice(0, -trailingPunctuation.length);
      }
      const fullUrl = token.startsWith("http") ? token : `https://${token}`;
      segments.push({
        type: "link",
        content: token,
        href: fullUrl,
        label: token,
      });
      if (trailingPunctuation) {
        segments.push({
          type: "text",
          content: trailingPunctuation,
        });
      }
    } else {
      segments.push({
        type: "text",
        content: token,
      });
    }

    lastIndex = tokenRegex.lastIndex;
  }

  // Push any remaining text
  if (lastIndex < raw.length) {
    segments.push({
      type: "text",
      content: raw.slice(lastIndex),
    });
  }

  return segments;
}

export default function FormattedText({
  text,
  outgoing = false,
  className = "",
}: FormattedTextProps) {
  if (!text) return null;

  const segments = parseFormattedText(text);

  return (
    <span className={`whitespace-pre-wrap break-words select-text ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.type === "link") {
          return (
            <a
              key={idx}
              href={seg.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline underline decoration-current/40 hover:decoration-current transition-all break-all ${
                outgoing
                  ? "text-white font-medium hover:text-white/90"
                  : "text-link hover:text-link/80 font-medium"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {seg.label}
            </a>
          );
        }

        if (seg.type === "user_mention") {
          return (
            <span
              key={idx}
              className={`inline-flex items-center px-1.5 py-0.5 rounded-[5px] text-[12px] font-medium align-baseline mx-0.5 ${
                outgoing
                  ? "bg-white/20 text-white border border-white/30"
                  : "bg-link/10 text-link border border-link/20"
              }`}
            >
              {seg.label}
            </span>
          );
        }

        if (seg.type === "channel_mention") {
          return (
            <span
              key={idx}
              className={`inline-flex items-center px-1.5 py-0.5 rounded-[5px] text-[11.5px] font-mono font-medium align-baseline mx-0.5 ${
                outgoing
                  ? "bg-white/20 text-white border border-white/30"
                  : "bg-surface-well text-ink border border-hairline"
              }`}
            >
              {seg.label}
            </span>
          );
        }

        if (seg.type === "special_mention") {
          return (
            <span
              key={idx}
              className={`inline-flex items-center px-1.5 py-0.5 rounded-[5px] text-[11.5px] font-semibold align-baseline mx-0.5 ${
                outgoing
                  ? "bg-amber-400/30 text-white border border-amber-300/40"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25"
              }`}
            >
              {seg.label}
            </span>
          );
        }

        if (seg.type === "code") {
          return (
            <code
              key={idx}
              className={`inline-block px-1.5 py-0.5 rounded-[4px] font-mono text-[11.5px] align-baseline mx-0.5 ${
                outgoing
                  ? "bg-black/25 text-white"
                  : "bg-surface-well text-ink border border-hairline"
              }`}
            >
              {seg.content}
            </code>
          );
        }

        return <Fragment key={idx}>{seg.content}</Fragment>;
      })}
    </span>
  );
}
