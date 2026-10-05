import { z } from "zod";

export const AiProviderSchema = z.enum([
  "openai",
  "anthropic",
  "gemini",
  "openai-compatible",
  "openrouter",
  "azure",
]);
export type AiProvider = z.infer<typeof AiProviderSchema>;

export const AiSuggestionToneSchema = z.enum([
  "helpful",
  "empathetic",
  "concise",
  "professional",
  "friendly",
]);
export type AiSuggestionTone = z.infer<typeof AiSuggestionToneSchema>;

export const AiRoutingStrategySchema = z.enum([
  "priority",
  "balanced",
  "lowest_latency",
  "lowest_cost",
]);
export type AiRoutingStrategy = z.infer<typeof AiRoutingStrategySchema>;

export const AiRewriteModeSchema = z.enum([
  "professional",
  "friendly",
  "concise",
  "expand",
  "fix_grammar",
  "translate_es",
  "translate_fr",
  "translate_de",
  "translate_ja",
  "translate_pt",
  "translate_zh",
  "translate_ar",
  "translate_hi",
  "translate_it",
  "translate_ru",
  "translate_ko",
]);
export type AiRewriteMode = z.infer<typeof AiRewriteModeSchema>;

export const GenerateAiSuggestionsSchema = z.object({
  conversationId: z.string().uuid().optional(),
  contactName: z.string().optional(),
  channel: z.string().optional(),
  lastMessages: z
    .array(
      z.object({
        direction: z.enum(["in", "out", "note"]),
        text: z.string().nullable().optional(),
        createdAt: z.string().optional(),
      }),
    )
    .optional(),
  userPrompt: z.string().optional(),
});
export type GenerateAiSuggestionsDto = z.infer<typeof GenerateAiSuggestionsSchema>;

export const AiSuggestionSchema = z.object({
  id: z.string(),
  label: z.string(),
  text: z.string(),
  tone: AiSuggestionToneSchema,
});
export type AiSuggestion = z.infer<typeof AiSuggestionSchema>;

export const AiRewriteSchema = z.object({
  text: z.string().min(1, "Text to rewrite is required"),
  mode: AiRewriteModeSchema,
});
export type AiRewriteDto = z.infer<typeof AiRewriteSchema>;

export const AiSummarizeSchema = z.object({
  conversationId: z.string().uuid().optional(),
  contactName: z.string().optional(),
  messages: z.array(
    z.object({
      direction: z.enum(["in", "out", "note"]),
      text: z.string().nullable().optional(),
      createdAt: z.string().optional(),
    }),
  ),
});
export type AiSummarizeDto = z.infer<typeof AiSummarizeSchema>;

export const AiTestConnectionSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  provider: AiProviderSchema.default("openai"),
  model: z.string().default("gpt-4o-mini"),
  customBaseUrl: z.string().optional(),
});
export type AiTestConnectionDto = z.infer<typeof AiTestConnectionSchema>;
