/**
 * Extracts previewable URLs from message strings across all channel formats
 * (Slack syntax `<http...>`, plain URLs, markdown links, etc.)
 */
export function extractUrlsFromMessage(rawText?: string | null): string[] {
  if (!rawText) return [];

  const urls: string[] = [];
  const seen = new Set<string>();

  // 1. Extract Slack link tokens: <https://url|label> or <https://url>
  const slackLinkRegex = /<(https?:\/\/[^|>]+)(?:\|[^>]+)?>/g;
  let match: RegExpExecArray | null;

  while ((match = slackLinkRegex.exec(rawText)) !== null) {
    const url = match[1].trim();
    if (url && !seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }

  // Replace slack link tokens in text so step 2 doesn't double-parse them
  const sanitizedText = rawText.replace(/<https?:\/\/[^>]+>/g, " ");

  // 2. Standard URLs with protocol
  const standardUrlRegex = /(https?:\/\/[^\s<>"]+)/gi;
  while ((match = standardUrlRegex.exec(sanitizedText)) !== null) {
    let url = match[1].trim();
    // Clean trailing punctuation or pipes that might get captured
    url = url.replace(/[),.;:!?|]+$/, "");
    if (url && !seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }

  // 3. Domain URLs without protocol for known video hosts: loom.com/share/..., youtube.com/watch?...
  const commonMediaRegex = /\b((?:www\.)?(?:loom\.com\/(?:share|embed)\/[a-zA-Z0-9_-]+|youtube\.com\/watch\?[^\s<>"]+|youtu\.be\/[a-zA-Z0-9_-]+))/gi;
  while ((match = commonMediaRegex.exec(sanitizedText)) !== null) {
    let url = match[1].trim();
    url = url.replace(/[),.;:!?|]+$/, "");
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    if (!seen.has(fullUrl) && !seen.has(url)) {
      seen.add(fullUrl);
      urls.push(fullUrl);
    }
  }

  return urls;
}
