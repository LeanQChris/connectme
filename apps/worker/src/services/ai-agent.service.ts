import { Injectable, Logger } from "@nestjs/common";
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

export interface AiAgentConfig {
  apiKey: string;
  provider: string;
  model: string;
  customBaseUrl?: string | null;
  customSystemPrompt?: string | null;
  autoReplyEnabled: boolean;
  autoReplyPrompt?: string | null;
}

export interface AiAgentHistoryMessage {
  direction: string;
  text: string | null;
}

export interface GenerateReplyInput {
  contactName?: string | null;
  channel: string;
  lastMessages: AiAgentHistoryMessage[];
}

const PROVIDER_MAP: Record<string, ProviderId> = {
  openai: "openai",
  anthropic: "anthropic",
  gemini: "gemini",
  "openai-compatible": "openai-compatible",
  openrouter: "openai-compatible",
  azure: "azure",
};

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
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);

  constructor(
    @InjectRepository(TenantCredential)
    private readonly credentialRepo: Repository<TenantCredential>,
    private readonly vault: AesVaultService,
  ) {}

  public async getConfig(tenantId: string): Promise<AiAgentConfig | null> {
    const cred = await this.credentialRepo.findOne({ where: { tenantId } });
    if (!cred || !cred.aiApiKeyEnc) return null;

    const apiKey = this.vault.decryptStrict<string>(cred.aiApiKeyEnc);

    return {
      apiKey,
      provider: cred.aiProvider || "openai",
      model: cred.aiModel || "gpt-4o-mini",
      customBaseUrl: cred.aiCustomBaseUrl,
      customSystemPrompt: cred.aiCustomSystemPrompt,
      autoReplyEnabled: Boolean(cred.aiAutoReplyEnabled),
      autoReplyPrompt: cred.aiAutoReplyPrompt,
    };
  }

  public async isAutoReplyEnabled(tenantId: string): Promise<boolean> {
    const config = await this.getConfig(tenantId);
    return config?.autoReplyEnabled ?? false;
  }

  private createRouter(config: AiAgentConfig): AIRouter {
    const targetProvider: ProviderId = PROVIDER_MAP[config.provider] || "openai";
    const baseUrl =
      config.provider === "openrouter"
        ? config.customBaseUrl || "https://openrouter.ai/api/v1"
        : config.customBaseUrl || undefined;

    const routes: ModelRoute[] = [
      {
        id: "primary",
        provider: targetProvider,
        model: config.model,
        apiKey: config.apiKey,
        baseUrl,
        maxRetries: 2,
        timeoutMs: 25000,
      },
    ];

    return new AIRouter({ routes, strategy: "priority" });
  }

  public async generateReply(
    tenantId: string,
    input: GenerateReplyInput,
  ): Promise<string | null> {
    const config = await this.getConfig(tenantId);
    if (!config) return null;

    const router = this.createRouter(config);

    const systemPrompt = [
      "You are an expert customer support agent for an omnichannel team inbox.",
      "Write ONE natural, ready-to-send reply that the customer will receive directly.",
      "Be concise, helpful, and match the customer's language. Sign off naturally when appropriate.",
      config.customSystemPrompt
        ? `Organization Brand Guidelines:\n${config.customSystemPrompt}`
        : "",
      config.autoReplyPrompt ? `Additional instructions:\n${config.autoReplyPrompt}` : "",
      "Never reveal that you are an AI unless the customer explicitly asks.",
      "Output ONLY the reply text — no quotes, no markdown formatting, no explanations.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const messages: ChatMessage[] = [{ role: "system", content: systemPrompt }];

    const history = (input.lastMessages || []).slice(-10);
    for (const msg of history) {
      if (!msg.text) continue;
      const dir = String(msg.direction || "").toLowerCase();
      if (dir === "in" || dir === "inbound") {
        messages.push({
          role: "user",
          content: `Customer (${input.contactName || "User"} on ${input.channel}): ${msg.text}`,
        });
      } else if (dir === "out" || dir === "outbound") {
        messages.push({ role: "assistant", content: msg.text });
      } else {
        messages.push({ role: "system", content: `Internal Team Note: ${msg.text}` });
      }
    }

    try {
      const response = await router.complete({
        model: "primary",
        messages,
        temperature: 0.4,
      });

      const text = extractText(response.choices[0]?.message?.content).trim();
      return text || null;
    } catch (err: unknown) {
      this.logger.warn(
        `AI auto-reply generation failed for tenant ${tenantId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    }
  }
}
