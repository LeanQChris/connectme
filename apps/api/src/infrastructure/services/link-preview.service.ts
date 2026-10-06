import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "../redis/redis.service";
import { isSafePublicUrl } from "../security/safe-fetch-url";

export interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

@Injectable()
export class LinkPreviewService {
  private readonly logger = new Logger(LinkPreviewService.name);

  constructor(private readonly redis: RedisService) {}

  async getPreview(rawUrl: string): Promise<LinkPreviewData | null> {
    // This endpoint is public and the caller chooses the target, so the server
    // would otherwise fetch any internal host on their behalf — cloud metadata,
    // RFC1918 services, loopback. Checked before the cache so a rejected URL can
    // never be served either.
    if (!(await isSafePublicUrl(rawUrl))) {
      this.logger.warn(`Blocked link preview for non-public URL: ${rawUrl}`);
      return null;
    }

    try {
      const url = new URL(rawUrl);

      // Check redis cache
      const cacheKey = `link_preview:${rawUrl}`;
      const cached = await this.redis.get(cacheKey).catch(() => null);
      if (cached) {
        return JSON.parse(cached);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(rawUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "ConnectMeBot/1.0 (+https://connectme.app)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      clearTimeout(timeout);

      if (!res.ok) return null;

      const html = await res.text();
      const preview: LinkPreviewData = {
        url: rawUrl,
        title: this.extractMeta(html, "og:title") || this.extractTag(html, "title"),
        description: this.extractMeta(html, "og:description") || this.extractMeta(html, "description"),
        image: this.extractMeta(html, "og:image"),
        siteName: this.extractMeta(html, "og:site_name") || url.hostname,
      };

      // Cache for 24 hours
      await this.redis.set(cacheKey, JSON.stringify(preview), 86400).catch(() => {});

      return preview;
    } catch {
      return null;
    }
  }

  private extractMeta(html: string, property: string): string | null {
    const regex = new RegExp(`<meta\\s+[^>]*?(?:property|name)=["']${property}["'][^>]*?content=["']([^"']+)["']`, "i");
    const match = html.match(regex);
    if (match && match[1]) return match[1].trim();

    const reverseRegex = new RegExp(`<meta\\s+[^>]*?content=["']([^"']+)["'][^>]*?(?:property|name)=["']${property}["']`, "i");
    const reverseMatch = html.match(reverseRegex);
    return reverseMatch && reverseMatch[1] ? reverseMatch[1].trim() : null;
  }

  private extractTag(html: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>([^<]+)<\/${tag}>`, "i");
    const match = html.match(regex);
    return match && match[1] ? match[1].trim() : null;
  }
}
