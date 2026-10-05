import { httpClient } from "@/core/api/http-client";
import type {
  GenerateAiSuggestionsDto,
  AiSuggestion,
  AiRewriteMode,
  AiSummarizeDto,
  AiTestConnectionDto,
} from "@connectme/contracts";

export const aiApi = {
  getSuggestions: (dto: GenerateAiSuggestionsDto) => {
    return httpClient<{ suggestions: AiSuggestion[] }>("/api/ai/suggest", {
      method: "POST",
      body: JSON.stringify(dto),
      cache: "no-store",
    }).then((res) => res.suggestions);
  },

  rewrite: (text: string, mode: AiRewriteMode) => {
    return httpClient<{ text: string; originalText: string; mode: AiRewriteMode }>("/api/ai/rewrite", {
      method: "POST",
      body: JSON.stringify({ text, mode }),
    });
  },

  summarize: (dto: AiSummarizeDto) => {
    return httpClient<{ summary: string; sentiment: string; keyPoints: string[] }>("/api/ai/summarize", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  testConnection: (dto: AiTestConnectionDto) => {
    return httpClient<{ success: boolean; model: string; message: string }>("/api/ai/test", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },
};
