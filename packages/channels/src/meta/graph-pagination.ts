import { fetchWithRetry } from "../http";
import { graphUrl } from "./graph";

export interface GraphPage<T> {
  data: T[];
  paging?: { cursors?: { after?: string }; next?: string };
}

/**
 * Follow Graph API cursor pagination until `limit` items are collected or the
 * provider stops returning a `next` cursor. Bounded to avoid runaway loops.
 */
export async function fetchGraphAllPages<T>(
  path: string,
  token: string,
  options: { limit?: number; maxPages?: number } = {},
): Promise<T[]> {
  const limit = options.limit ?? 100;
  const maxPages = options.maxPages ?? 10;
  const results: T[] = [];
  let next: string | undefined = graphUrl(path);

  for (let page = 0; page < maxPages && next && results.length < limit; page++) {
    const res: Response = await fetchWithRetry(next, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = (await res.json().catch(() => ({}))) as GraphPage<T>;
    if (!res.ok || !Array.isArray(json.data)) break;
    results.push(...json.data);
    next = json.paging?.next;
  }

  return results.slice(0, limit);
}

export interface MetaProfile {
  id: string;
  name?: string;
  username?: string;
  profile_pic?: string;
}

/** Fetch a Messenger/Instagram user profile (PSID/IGSID). */
export async function fetchMetaProfile(
  userId: string,
  token: string,
): Promise<MetaProfile | null> {
  const res = await fetchWithRetry(
    graphUrl(`${userId}?fields=name,username,profile_pic`),
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.id) return null;
  return json as MetaProfile;
}
