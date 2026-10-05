import { NextRequest, NextResponse } from "next/server";

export interface LinkPreviewData {
  url: string;
  type: "youtube" | "loom" | "vimeo" | "generic";
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
  author?: string;
  videoId?: string;
  embedUrl?: string;
}

// In-memory cache with 1-hour TTL to prevent repeated fetches
const cache = new Map<string, { data: LinkPreviewData; expiry: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function isPrivateIpOrHost(hostname: string): boolean {
  if (
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1"
  ) {
    return true;
  }
  // Check private IP ranges
  if (/^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) || /^169\.254\./.test(hostname)) {
    return true;
  }
  return false;
}

function extractYouTubeId(urlStr: string): string | null {
  try {
    const parsed = new URL(urlStr);
    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }
      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/")[2] || null;
      }
      if (parsed.pathname.startsWith("/shorts/")) {
        return parsed.pathname.split("/")[2] || null;
      }
    }
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1).split("?")[0] || null;
    }
  } catch {
    // ignore
  }
  return null;
}

function extractLoomId(urlStr: string): string | null {
  try {
    const parsed = new URL(urlStr);
    if (parsed.hostname.includes("loom.com")) {
      if (parsed.pathname.startsWith("/share/")) {
        return parsed.pathname.split("/")[2] || null;
      }
      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/")[2] || null;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function extractVimeoId(urlStr: string): string | null {
  try {
    const parsed = new URL(urlStr);
    if (parsed.hostname.includes("vimeo.com")) {
      const match = parsed.pathname.match(/\/(\d+)/);
      return match ? match[1] : null;
    }
  } catch {
    // ignore
  }
  return null;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .trim();
}

function extractMetaTag(html: string, nameOrProp: string): string | null {
  const regex = new RegExp(
    `<meta[^>]*(?:name|property)=["']${nameOrProp}["'][^>]*content=["']([^"']*)["']`,
    "i"
  );
  const match = html.match(regex);
  if (match && match[1]) return decodeHtmlEntities(match[1]);

  const altRegex = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${nameOrProp}["']`,
    "i"
  );
  const altMatch = html.match(altRegex);
  return altMatch && altMatch[1] ? decodeHtmlEntities(altMatch[1]) : null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let targetUrl = searchParams.get("url")?.trim();

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Prepend https:// if missing protocol
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `https://${targetUrl}`;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  if (isPrivateIpOrHost(parsedUrl.hostname)) {
    return NextResponse.json({ error: "Private or forbidden host" }, { status: 403 });
  }

  // Check cache
  const cached = cache.get(targetUrl);
  if (cached && Date.now() < cached.expiry) {
    return NextResponse.json(cached.data);
  }

  const hostname = parsedUrl.hostname.replace(/^www\./, "");
  const defaultFavicon = `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`;

  // 1. YouTube Handler
  const ytId = extractYouTubeId(targetUrl);
  if (ytId) {
    let title = "YouTube Video";
    let author: string | undefined;

    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        title = data.title || title;
        author = data.author_name;
      }
    } catch {
      // fallback to standard title
    }

    const previewData: LinkPreviewData = {
      url: targetUrl,
      type: "youtube",
      videoId: ytId,
      title,
      author,
      siteName: "YouTube",
      favicon: "https://www.youtube.com/s/desktop/favicon.ico",
      image: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1`,
    };

    cache.set(targetUrl, { data: previewData, expiry: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(previewData);
  }

  // 2. Loom Handler
  const loomId = extractLoomId(targetUrl);
  if (loomId) {
    let title = "Loom Video Recording";
    let author: string | undefined;
    let image = `https://cdn.loom.com/sessions/thumbnails/${loomId}-with-play.gif`;

    try {
      const oembedRes = await fetch(
        `https://www.loom.com/v1/oembed?url=https://www.loom.com/share/${loomId}`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        if (data.title) title = data.title;
        if (data.author_name) author = data.author_name;
        if (data.thumbnail_url) image = data.thumbnail_url;
      }
    } catch {
      // fallback
    }

    const previewData: LinkPreviewData = {
      url: targetUrl,
      type: "loom",
      videoId: loomId,
      title,
      author,
      siteName: "Loom",
      favicon: "https://cdn.loom.com/assets/favicons-loom/favicon-32x32.png",
      image,
      embedUrl: `https://www.loom.com/embed/${loomId}?autoplay=1`,
    };

    cache.set(targetUrl, { data: previewData, expiry: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(previewData);
  }

  // 3. Vimeo Handler
  const vimeoId = extractVimeoId(targetUrl);
  if (vimeoId) {
    let title = "Vimeo Video";
    let author: string | undefined;
    let image: string | undefined;

    try {
      const oembedRes = await fetch(
        `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${vimeoId}`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        if (data.title) title = data.title;
        if (data.author_name) author = data.author_name;
        if (data.thumbnail_url) image = data.thumbnail_url;
      }
    } catch {
      // fallback
    }

    const previewData: LinkPreviewData = {
      url: targetUrl,
      type: "vimeo",
      videoId: vimeoId,
      title,
      author,
      siteName: "Vimeo",
      favicon: "https://f.vimeocdn.com/images_v6/favicon.ico",
      image,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}?autoplay=1`,
    };

    cache.set(targetUrl, { data: previewData, expiry: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(previewData);
  }

  // 4. Generic Web Page OpenGraph Scraper
  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 ConnectMeBot/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(4000),
      redirect: "follow",
    });

    if (!res.ok) {
      const fallback: LinkPreviewData = {
        url: targetUrl,
        type: "generic",
        title: hostname,
        siteName: hostname,
        favicon: defaultFavicon,
      };
      cache.set(targetUrl, { data: fallback, expiry: Date.now() + CACHE_TTL_MS });
      return NextResponse.json(fallback);
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      const fallback: LinkPreviewData = {
        url: targetUrl,
        type: "generic",
        title: hostname,
        siteName: hostname,
        favicon: defaultFavicon,
      };
      cache.set(targetUrl, { data: fallback, expiry: Date.now() + CACHE_TTL_MS });
      return NextResponse.json(fallback);
    }

    // Read only up to 256KB to avoid massive downloads
    const reader = res.body?.getReader();
    let html = "";
    if (reader) {
      let receivedBytes = 0;
      while (receivedBytes < 262144) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        html += new TextDecoder("utf-8").decode(value);
        receivedBytes += value.length;
      }
      reader.cancel();
    } else {
      html = await res.text();
    }

    // Extract OpenGraph / Meta tags
    let title =
      extractMetaTag(html, "og:title") ||
      extractMetaTag(html, "twitter:title");
    
    if (!title) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        title = decodeHtmlEntities(titleMatch[1]);
      }
    }

    const description =
      extractMetaTag(html, "og:description") ||
      extractMetaTag(html, "twitter:description") ||
      extractMetaTag(html, "description");

    const rawImage =
      extractMetaTag(html, "og:image") ||
      extractMetaTag(html, "twitter:image") ||
      extractMetaTag(html, "og:image:secure_url");

    let image: string | undefined = rawImage || undefined;

    if (image && !/^https?:\/\//i.test(image)) {
      try {
        image = new URL(image, targetUrl).toString();
      } catch {
        image = undefined;
      }
    }

    const siteName =
      extractMetaTag(html, "og:site_name") ||
      hostname;

    // Favicon detection
    let favicon: string | undefined;
    const iconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i);
    if (iconMatch && iconMatch[1]) {
      try {
        favicon = new URL(iconMatch[1], targetUrl).toString();
      } catch {
        favicon = defaultFavicon;
      }
    } else {
      favicon = defaultFavicon;
    }

    const previewData: LinkPreviewData = {
      url: targetUrl,
      type: "generic",
      title: title || hostname,
      description: description ? description.slice(0, 200) : undefined,
      image,
      siteName,
      favicon,
    };

    cache.set(targetUrl, { data: previewData, expiry: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(previewData);
  } catch {
    const fallback: LinkPreviewData = {
      url: targetUrl,
      type: "generic",
      title: hostname,
      siteName: hostname,
      favicon: defaultFavicon,
    };
    cache.set(targetUrl, { data: fallback, expiry: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(fallback);
  }
}
