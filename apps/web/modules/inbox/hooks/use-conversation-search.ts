"use client";

import { useEffect, useMemo, useState } from "react";
import { useMessageSearch } from "./use-inbox";
import type { ConversationSummary } from "@/core/types";

export interface ConversationRow {
  conversation: ConversationSummary;
  snippet: string;
  createdAt: string;
}

export function useConversationSearch(conversations: ConversationSummary[]) {
  const [search, setSearch] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce server search to prevent flooding API on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(search.trim());
    }, 250);
    return () => clearTimeout(handler);
  }, [search]);

  const query = search.trim();
  const searching = debouncedQuery.length >= 2;
  const { data: hits = [], isFetching } = useMessageSearch(debouncedQuery);

  const rows: ConversationRow[] = useMemo(() => {
    if (searching) {
      return hits.map((hit) => ({
        conversation: hit.conversation,
        snippet: hit.snippet,
        createdAt: hit.createdAt,
      }));
    }

    // Instant local filtering while typing
    return conversations
      .filter((c) => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (
          c.contactName.toLowerCase().includes(q) ||
          c.contactExternalId.toLowerCase().includes(q) ||
          (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
        );
      })
      .map((c) => ({
        conversation: c,
        snippet: c.lastMessage ?? "",
        createdAt: c.lastMessageAt,
      }));
  }, [searching, hits, conversations, query]);

  return {
    search,
    setSearch,
    query,
    searching,
    rows,
    isFetching,
  };
}
