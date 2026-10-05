import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TenantCredential } from "@connectme/database";
import { AesVaultService } from "@connectme/channels";
import {
  AIRouter,
  type ChatMessage,
  type ModelRoute,
  type ProviderId,
} from "@ai-router-sdk/core";
import type {
  GenerateAiSuggestionsDto,
  AiSuggestion,
  AiRewriteMode,
  AiProvider,
  AiSummarizeDto,
} from "@connectme/contracts";

export interface AiTenantConfig {
  apiKey: string;
  provider: AiProvider;
  model: string;
  customBaseUrl?: string | null;
  customSystemPrompt?: string | null;
  fallbackApiKey?: string | null;
  fallbackProvider?: AiProvider | null;
  fallbackModel?: string | null;
  routingStrategy?: "priority" | "balanced" | "lowest_latency" | "lowest_cost" | null;
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (typeof part === "object" && part !== null && "text" in part) {
          return String((part as { text?: unknown }).text || "");
        }
        return "";
      })
      .join("");
  }
  return "";
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @InjectRepository(TenantCredential)
    private readonly credentialRepo: Repository<TenantCredential>,
    private readonly vault: AesVaultService,
  ) {}

  public async getTenantAiConfig(tenantId: string): Promise<AiTenantConfig> {
    const cred = await this.credentialRepo.findOne({ where: { tenantId } });
    if (!cred || !cred.aiApiKeyEnc) {
      throw new BadRequestException(
        "No AI API key configured. Please add your BYOK AI key (OpenAI, Anthropic, Gemini, or OpenRouter) in Settings to activate AI Copilot.",
      );
    }

    const apiKey = this.vault.decrypt(cred.aiApiKeyEnc) as string;
    const provider = (cred.aiProvider || "openai") as AiProvider;
    const model = cred.aiModel || "gpt-4o-mini";

    let fallbackApiKey: string | null = null;
    if (cred.aiFallbackApiKeyEnc) {
      fallbackApiKey = this.vault.decrypt(cred.aiFallbackApiKeyEnc) as string;
    }

    return {
      apiKey,
      provider,
      model,
      customBaseUrl: cred.aiCustomBaseUrl,
      customSystemPrompt: cred.aiCustomSystemPrompt,
      fallbackApiKey,
      fallbackProvider: (cred.aiFallbackProvider as AiProvider) || null,
      fallbackModel: cred.aiFallbackModel || null,
      routingStrategy: (cred.aiRoutingStrategy as any) || "priority",
    };
  }

  private createRouter(config: AiTenantConfig): AIRouter {
    const providerMap: Record<AiProvider, ProviderId> = {
      openai: "openai",
      anthropic: "anthropic",
      gemini: "gemini",
      "openai-compatible": "openai-compatible",
      openrouter: "openai-compatible",
      azure: "azure",
    };

    const routes: ModelRoute[] = [];

    const targetProvider: ProviderId = providerMap[config.provider] || "openai";
    const baseUrl =
      config.provider === "openrouter"
        ? config.customBaseUrl || "https://openrouter.ai/api/v1"
        : config.customBaseUrl || undefined;

    routes.push({
      id: "primary",
      provider: targetProvider,
      model: config.model,
      apiKey: config.apiKey,
      baseUrl,
      maxRetries: 2,
      timeoutMs: 25000,
    });

    if (config.fallbackApiKey && config.fallbackProvider) {
      const fbProvider: ProviderId = providerMap[config.fallbackProvider] || "openai";
      const fbBaseUrl =
        config.fallbackProvider === "openrouter" ? "https://openrouter.ai/api/v1" : undefined;

      routes.push({
        id: "fallback",
        provider: fbProvider,
        model: config.fallbackModel || "gpt-4o-mini",
        apiKey: config.fallbackApiKey,
        baseUrl: fbBaseUrl,
        maxRetries: 2,
        timeoutMs: 25000,
      });
    }

    return new AIRouter({
      routes,
      strategy: (config.routingStrategy as any) || "priority",
    });
  }

  public async suggestReplies(
    tenantId: string,
    dto: GenerateAiSuggestionsDto,
  ): Promise<AiSuggestion[]> {
    const config = await this.getTenantAiConfig(tenantId);
    const router = this.createRouter(config);

    const systemPrompt = [
      "You are an expert customer support copilot for an omnichannel team inbox.",
      "Your task is to generate exactly 3 distinct, high-quality response suggestions for the support agent to send back to the customer.",
      config.customSystemPrompt ? `Organization Brand Guidelines:\n${config.customSystemPrompt}` : "",
      "Format your response as a valid JSON array of objects with keys: id (string), label (2-4 words summarizing intent), text (the complete message text to send), and tone ('helpful' | 'empathetic' | 'concise' | 'professional' | 'friendly').",
      "Example JSON format:",
      JSON.stringify([
        {
          id: "1",
          label: "Direct Solution",
          text: "Hi! I've checked your account and your order is scheduled for delivery tomorrow.",
          tone: "helpful",
        },
        {
          id: "2",
          label: "Empathetic Follow-up",
          text: "Thank you for reaching out! I completely understand your concern and I'm looking into this right away.",
          tone: "empathetic",
        },
        {
          id: "3",
          label: "Clarification Request",
          text: "Could you please provide your order ID so I can look up the details for you?",
          tone: "concise",
        },
      ]),
      "Output ONLY the JSON array without markdown formatting or surrounding code blocks.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const conversationHistory: ChatMessage[] = [
      { role: "system", content: systemPrompt },
    ];

    if (dto.lastMessages && dto.lastMessages.length > 0) {
      for (const msg of dto.lastMessages.slice(-10)) {
        if (!msg.text) continue;
        if (msg.direction === "in") {
          conversationHistory.push({
            role: "user",
            content: `Customer (${dto.contactName || "User"} on ${dto.channel || "chat"}): ${msg.text}`,
          });
        } else if (msg.direction === "out") {
          conversationHistory.push({
            role: "assistant",
            content: msg.text,
          });
        } else if (msg.direction === "note") {
          conversationHistory.push({
            role: "system",
            content: `Internal Team Note: ${msg.text}`,
          });
        }
      }
    } else if (dto.userPrompt) {
      conversationHistory.push({
        role: "user",
        content: `Customer message: ${dto.userPrompt}`,
      });
    }

    conversationHistory.push({
      role: "user",
      content: "Please generate the 3 smart reply suggestions as a JSON array now.",
    });

    try {
      const response = await router.complete({
        model: "primary",
        messages: conversationHistory,
        temperature: 0.7,
      });

      const rawContent = extractText(response.choices[0]?.message?.content).trim() || "[]";

      // Strip markdown code fences if LLM included them
      const cleanedJson = rawContent
        .replace(/^```(json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const parsed: AiSuggestion[] = JSON.parse(cleanedJson);
      return parsed.map((item, idx) => ({
        id: item.id || String(idx + 1),
        label: item.label || `Option ${idx + 1}`,
        text: item.text || "",
        tone: item.tone || "helpful",
      }));
    } catch (err: unknown) {
      this.logger.warn(`AI suggestion error: ${err instanceof Error ? err.message : String(err)}`);
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException("Failed to generate AI suggestions with your configured key.");
    }
  }

  public async rewriteText(
    tenantId: string,
    text: string,
    mode: AiRewriteMode,
  ): Promise<{ text: string; originalText: string; mode: AiRewriteMode }> {
    const config = await this.getTenantAiConfig(tenantId);
    const router = this.createRouter(config);

    const modeInstructions: Record<AiRewriteMode, string> = {
      professional: "Rewrite this message in a polite, polished, and professional customer support tone.",
      friendly: "Rewrite this message in a warm, friendly, and approachable conversational tone.",
      concise: "Shorten and simplify this message to be direct and concise without losing important details.",
      expand: "Expand this message to be more detailed, helpful, and thorough.",
      fix_grammar: "Fix all typos, spelling, punctuation, and grammar mistakes while preserving original meaning.",
      translate_es: "Translate this message into natural, polite Spanish.",
      translate_fr: "Translate this message into natural, polite French.",
      translate_de: "Translate this message into natural, polite German.",
      translate_ja: "Translate this message into polite Japanese.",
      translate_pt: "Translate this message into polite Portuguese.",
      translate_zh: "Translate this message into natural, polite Simplified Chinese.",
      translate_ar: "Translate this message into polite Modern Standard Arabic.",
      translate_hi: "Translate this message into polite Hindi.",
      translate_it: "Translate this message into polite Italian.",
      translate_ru: "Translate this message into polite Russian.",
      translate_ko: "Translate this message into polite Korean.",
    };

    const prompt = modeInstructions[mode] || modeInstructions.professional;

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are an AI assistant for support messaging. ${prompt}\nOutput ONLY the rewritten text without explanations, quotes, or markdown wrappers.`,
      },
      {
        role: "user",
        content: text,
      },
    ];

    try {
      const response = await router.complete({
        model: "primary",
        messages,
        temperature: 0.3,
      });

      const resultText = extractText(response.choices[0]?.message?.content).trim() || text;

      return {
        text: resultText,
        originalText: text,
        mode,
      };
    } catch (err: unknown) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException("Failed to rewrite text using configured AI key.");
    }
  }

  public async summarizeConversation(
    tenantId: string,
    dto: AiSummarizeDto,
  ): Promise<{ summary: string; sentiment: string; keyPoints: string[] }> {
    const config = await this.getTenantAiConfig(tenantId);
    const router = this.createRouter(config);

    const history = dto.messages
      .map((m) => `${m.direction.toUpperCase()}: ${m.text || "[media]"}`)
      .join("\n");

    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "Summarize this customer support conversation for an internal team handoff.\n" +
          "Return ONLY a valid JSON object with keys:\n" +
          "- 'summary' (string: 1-2 concise sentences summarizing the customer's problem and current status)\n" +
          "- 'sentiment' (string: 'positive' | 'neutral' | 'frustrated' | 'urgent')\n" +
          "- 'keyPoints' (array of strings: 2-3 bullet items)\n" +
          "Output strictly the JSON object.",
      },
      {
        role: "user",
        content: `Customer Name: ${dto.contactName || "User"}\n\nTranscript:\n${history}`,
      },
    ];

    try {
      const response = await router.complete({
        model: "primary",
        messages,
        temperature: 0.2,
      });

      const raw = extractText(response.choices[0]?.message?.content).trim() || "{}";
      const cleaned = raw.replace(/^```(json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      return JSON.parse(cleaned);
    } catch (err: unknown) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException("Failed to summarize conversation with configured AI key.");
    }
  }

  public async testConnection(
    apiKey: string,
    provider: AiProvider = "openai",
    model: string = "gpt-4o-mini",
    customBaseUrl?: string | null,
  ): Promise<{ success: boolean; model: string; message: string }> {
    const config: AiTenantConfig = { apiKey, provider, model, customBaseUrl };
    const router = this.createRouter(config);

    const messages: ChatMessage[] = [
      { role: "user", content: "Ping: Respond with exactly one word: OK" },
    ];

    try {
      const response = await router.complete({
        model: "primary",
        messages,
        max_tokens: 10,
      });

      const reply = extractText(response.choices[0]?.message?.content).trim();
      return {
        success: true,
        model,
        message: `Connected successfully to ${provider} (${model})! Response: "${reply}"`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(`AI connection test failed: ${msg}`);
    }
  }
}
