"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { aiApi } from "@/modules/inbox/api/ai.api";
import type { AiProvider, AiRoutingStrategy } from "@connectme/contracts";

interface AiByokSettingsProps {
  initialConfig?: {
    configured: boolean;
    provider: string | null;
    model: string | null;
    customBaseUrl: string | null;
    customSystemPrompt: string | null;
    fallbackConfigured?: boolean;
    fallbackProvider?: string | null;
    fallbackModel?: string | null;
    routingStrategy?: string | null;
  };
  onSave: (secrets: {
    aiApiKey?: string;
    aiProvider?: string;
    aiModel?: string;
    aiCustomBaseUrl?: string;
    aiCustomSystemPrompt?: string;
    aiFallbackApiKey?: string;
    aiFallbackProvider?: string;
    aiFallbackModel?: string;
    aiRoutingStrategy?: string;
  }) => Promise<void>;
  saving: boolean;
}

const PROVIDER_MODELS: Record<
  AiProvider,
  { label: string; badge: string; defaultModel: string; models: string[] }
> = {
  openai: {
    label: "OpenAI",
    badge: "GPT-4o & o1",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o-mini", "gpt-4o", "o1-mini", "o3-mini", "gpt-3.5-turbo"],
  },
  anthropic: {
    label: "Anthropic Claude",
    badge: "Claude 3.5",
    defaultModel: "claude-3-5-haiku-20241022",
    models: ["claude-3-5-haiku-20241022", "claude-3-5-sonnet-20241022", "claude-3-opus-20240229"],
  },
  gemini: {
    label: "Google Gemini",
    badge: "1.5 Flash & Pro",
    defaultModel: "gemini-1.5-flash",
    models: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"],
  },
  openrouter: {
    label: "OpenRouter",
    badge: "DeepSeek & Llama",
    defaultModel: "deepseek/deepseek-chat",
    models: [
      "deepseek/deepseek-chat",
      "deepseek/deepseek-r1",
      "meta-llama/llama-3.3-70b-instruct",
      "anthropic/claude-3.5-sonnet",
      "mistralai/mistral-large-2407",
    ],
  },
  "openai-compatible": {
    label: "Custom / Local (Ollama, Groq, vLLM)",
    badge: "Self-Hosted",
    defaultModel: "llama3.3",
    models: ["llama3.3", "mistral", "qwen2.5", "custom"],
  },
  azure: {
    label: "Microsoft Azure OpenAI",
    badge: "Enterprise",
    defaultModel: "gpt-4o",
    models: ["gpt-4o", "gpt-4o-mini"],
  },
};

const ROUTING_STRATEGIES: { id: AiRoutingStrategy; label: string; desc: string; icon: string }[] = [
  {
    id: "priority",
    label: "Priority Fallback Chain",
    desc: "Always route to Primary provider first; seamlessly switch to Fallback if primary is rate-limited or fails.",
    icon: "🛡️",
  },
  {
    id: "balanced",
    label: "Balanced Load Sharing",
    desc: "Distribute API requests proportionally across configured providers to spread rate limits.",
    icon: "⚖️",
  },
  {
    id: "lowest_latency",
    label: "Lowest Latency First",
    desc: "Prioritize the provider with the fastest observed response times for instantaneous replies.",
    icon: "⚡",
  },
  {
    id: "lowest_cost",
    label: "Lowest Cost First",
    desc: "Optimize token spending by favoring economical models whenever possible.",
    icon: "💰",
  },
];

export function AiByokSettings({ initialConfig, onSave, saving }: AiByokSettingsProps) {
  const [provider, setProvider] = useState<AiProvider>(
    (initialConfig?.provider as AiProvider) || "openai",
  );
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(initialConfig?.model || "gpt-4o-mini");
  const [customBaseUrl, setCustomBaseUrl] = useState(initialConfig?.customBaseUrl || "");
  const [customSystemPrompt, setCustomSystemPrompt] = useState(
    initialConfig?.customSystemPrompt || "",
  );
  const [showKey, setShowKey] = useState(false);

  // Fallback Provider Chain
  const [enableFallback, setEnableFallback] = useState(
    Boolean(initialConfig?.fallbackConfigured || initialConfig?.fallbackProvider),
  );
  const [fallbackProvider, setFallbackProvider] = useState<AiProvider>(
    (initialConfig?.fallbackProvider as AiProvider) || "gemini",
  );
  const [fallbackApiKey, setFallbackApiKey] = useState("");
  const [fallbackModel, setFallbackModel] = useState(
    initialConfig?.fallbackModel || "gemini-1.5-flash",
  );
  const [showFallbackKey, setShowFallbackKey] = useState(false);

  // Routing Strategy
  const [routingStrategy, setRoutingStrategy] = useState<AiRoutingStrategy>(
    (initialConfig?.routingStrategy as AiRoutingStrategy) || "priority",
  );

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const isConfigured = initialConfig?.configured;
  const isFallbackConfigured = initialConfig?.fallbackConfigured;

  const handleProviderChange = (newProvider: AiProvider) => {
    setProvider(newProvider);
    setModel(PROVIDER_MODELS[newProvider]?.defaultModel || "gpt-4o-mini");
    setTestResult(null);
  };

  const handleFallbackProviderChange = (newProvider: AiProvider) => {
    setFallbackProvider(newProvider);
    setFallbackModel(PROVIDER_MODELS[newProvider]?.defaultModel || "gpt-4o-mini");
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim() && !isConfigured) {
      setTestResult({ success: false, message: "Please enter your Primary API Key to test connection." });
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await aiApi.testConnection({
        apiKey: apiKey.trim() || "EXISTING_KEY",
        provider,
        model,
        customBaseUrl: customBaseUrl.trim() || undefined,
      });
      setTestResult({ success: true, message: res.message });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection test failed.";
      setTestResult({ success: false, message: msg });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(false);
    await onSave({
      aiApiKey: apiKey.trim() || undefined,
      aiProvider: provider,
      aiModel: model.trim(),
      aiCustomBaseUrl: customBaseUrl.trim() || undefined,
      aiCustomSystemPrompt: customSystemPrompt.trim() || undefined,
      aiFallbackApiKey: enableFallback && fallbackApiKey.trim() ? fallbackApiKey.trim() : undefined,
      aiFallbackProvider: enableFallback ? fallbackProvider : undefined,
      aiFallbackModel: enableFallback ? fallbackModel.trim() : undefined,
      aiRoutingStrategy: routingStrategy,
    });
    setSavedSuccess(true);
    setApiKey("");
    setFallbackApiKey("");
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-hairline bg-canvas-elevated p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/30 text-violet-600 dark:text-violet-400 text-2xl shadow-inner">
              ✨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[16px] font-semibold text-ink">
                  AI Copilot & Multi-Provider Router (BYOK)
                </h3>
                <span className="rounded-full bg-violet-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-violet-600 dark:text-violet-400 border border-violet-500/20">
                  @ai-router-sdk/core
                </span>
              </div>
              <p className="text-[12.5px] text-mute mt-0.5">
                Bring Your Own Key (OpenAI, Anthropic, Gemini, DeepSeek via OpenRouter) to unlock instant smart replies, tone rewrites, and multi-language translations.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] font-medium shadow-2xs ${
                isConfigured
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isConfigured ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              {isConfigured ? `Active (${initialConfig?.provider})` : "Not Configured"}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-hairline bg-canvas-elevated p-6 shadow-2xs space-y-6">
        {/* Section: Primary Provider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="font-mono text-[11.5px] font-semibold uppercase tracking-wider text-ink">
              1. Primary AI Provider
            </label>
            <span className="text-[11.5px] text-mute">Default provider for all smart replies</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {(Object.keys(PROVIDER_MODELS) as AiProvider[]).map((pKey) => {
              const pInfo = PROVIDER_MODELS[pKey];
              const isSelected = provider === pKey;
              return (
                <button
                  key={pKey}
                  type="button"
                  onClick={() => handleProviderChange(pKey)}
                  className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-violet-500 bg-violet-500/10 shadow-sm text-ink ring-1 ring-violet-500/30"
                      : "border-hairline bg-canvas text-mute hover:border-ink hover:text-ink"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-[13px] font-semibold text-ink">{pInfo.label}</span>
                    <span className="rounded bg-surface-well px-1.5 py-0.2 font-mono text-[9.5px] text-mute">
                      {pInfo.badge}
                    </span>
                  </div>
                  <span className="font-mono text-[10.5px] text-mute mt-1">
                    Default: {pInfo.defaultModel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary API Key Input */}
        <div>
          <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-ink mb-1.5">
            {PROVIDER_MODELS[provider]?.label} API Key {isConfigured && "(Encrypted at Rest)"}
          </label>
          <div className="relative flex items-center">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={isConfigured ? "•••••••••••••••••••••••••••••••• (Leave blank to keep existing key)" : "sk-..."}
              className="h-10 w-full rounded-lg border border-hairline bg-canvas pl-3.5 pr-24 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none transition-colors"
            />
            <div className="absolute right-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="rounded px-2 py-1 font-mono text-[11px] text-mute hover:text-ink cursor-pointer"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <p className="mt-1 font-mono text-[10.5px] text-mute">
            Keys are AES-256-GCM encrypted in the tenant credentials vault.
          </p>
        </div>

        {/* Model Selection & Custom Endpoint */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-ink mb-1.5">
              Primary Model Identifier
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. gpt-4o-mini"
              className="h-10 w-full rounded-lg border border-hairline bg-canvas px-3.5 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none font-mono"
            />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {PROVIDER_MODELS[provider]?.models.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModel(m)}
                  className={`rounded border px-1.5 py-0.5 font-mono text-[10px] transition-colors cursor-pointer ${
                    model === m
                      ? "border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold"
                      : "border-hairline text-mute hover:text-ink"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-ink mb-1.5">
              Custom Base URL (Optional)
            </label>
            <input
              type="text"
              value={customBaseUrl}
              onChange={(e) => setCustomBaseUrl(e.target.value)}
              placeholder="https://openrouter.ai/api/v1 or http://localhost:11434/v1"
              className="h-10 w-full rounded-lg border border-hairline bg-canvas px-3.5 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none font-mono"
            />
            <p className="mt-1 font-mono text-[10.5px] text-mute">
              Use for OpenRouter, local Ollama, Groq, or vLLM endpoints.
            </p>
          </div>
        </div>

        {/* Section: Fallback Provider Chain */}
        <div className="rounded-xl border border-hairline bg-canvas p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🛡️</span>
              <div>
                <h4 className="text-[13px] font-semibold text-ink">
                  Automatic Fallback Chain (Zero-Downtime AI)
                </h4>
                <p className="text-[11.5px] text-mute">
                  Route to a backup provider if your primary model is rate-limited or unavailable.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableFallback}
                onChange={(e) => setEnableFallback(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-surface-well peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
            </label>
          </div>

          {enableFallback && (
            <div className="space-y-4 pt-3 border-t border-hairline">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-ink mb-1.5">
                    Fallback Provider
                  </label>
                  <select
                    value={fallbackProvider}
                    onChange={(e) => handleFallbackProviderChange(e.target.value as AiProvider)}
                    className="h-10 w-full rounded-lg border border-hairline bg-canvas-elevated px-3 text-[13px] text-ink focus:border-ink focus:outline-none"
                  >
                    {(Object.keys(PROVIDER_MODELS) as AiProvider[])
                      .filter((p) => p !== provider)
                      .map((p) => (
                        <option key={p} value={p}>
                          {PROVIDER_MODELS[p].label}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-ink mb-1.5">
                    Fallback Model
                  </label>
                  <input
                    type="text"
                    value={fallbackModel}
                    onChange={(e) => setFallbackModel(e.target.value)}
                    placeholder="e.g. gemini-1.5-flash"
                    className="h-10 w-full rounded-lg border border-hairline bg-canvas-elevated px-3.5 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-ink mb-1.5">
                  Fallback Provider API Key {isFallbackConfigured && "(Saved)"}
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showFallbackKey ? "text" : "password"}
                    value={fallbackApiKey}
                    onChange={(e) => setFallbackApiKey(e.target.value)}
                    placeholder={
                      isFallbackConfigured
                        ? "•••••••••••••••••••••••••••••••• (Leave blank to keep existing key)"
                        : "sk-..."
                    }
                    className="h-10 w-full rounded-lg border border-hairline bg-canvas-elevated pl-3.5 pr-24 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none transition-colors"
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowFallbackKey(!showFallbackKey)}
                      className="rounded px-2 py-1 font-mono text-[11px] text-mute hover:text-ink cursor-pointer"
                    >
                      {showFallbackKey ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section: Routing Strategy */}
        <div>
          <label className="block font-mono text-[11.5px] font-semibold uppercase tracking-wider text-ink mb-2">
            2. Multi-Provider Routing Strategy
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ROUTING_STRATEGIES.map((strat) => {
              const isSelected = routingStrategy === strat.id;
              return (
                <button
                  key={strat.id}
                  type="button"
                  onClick={() => setRoutingStrategy(strat.id)}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-violet-500 bg-violet-500/10 shadow-2xs text-ink ring-1 ring-violet-500/30"
                      : "border-hairline bg-canvas text-mute hover:border-ink hover:text-ink"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{strat.icon}</span>
                    <span className="text-[13px] font-semibold text-ink">{strat.label}</span>
                  </div>
                  <p className="text-[11px] text-mute mt-1 leading-snug">{strat.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Brand Persona / System Prompt */}
        <div>
          <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-ink mb-1.5">
            3. Brand Persona & Knowledge Guidelines (Optional)
          </label>
          <textarea
            rows={3}
            value={customSystemPrompt}
            onChange={(e) => setCustomSystemPrompt(e.target.value)}
            placeholder="e.g. You represent Acme Support. Always be friendly and courteous, greet customers by name, and mention our 30-day return policy when relevant."
            className="w-full rounded-lg border border-hairline bg-canvas p-3 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none leading-relaxed resize-y"
          />
        </div>

        {/* Test Result Alert */}
        {testResult && (
          <div
            className={`rounded-lg border p-3 text-[12.5px] flex items-center gap-2 ${
              testResult.success
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-error/30 bg-error/10 text-error"
            }`}
          >
            <span className="text-base">{testResult.success ? "✓" : "!"}</span>
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Saved Alert */}
        {savedSuccess && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-[12.5px] text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <span>✓</span>
            <span>AI BYOK multi-provider configuration saved successfully!</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-hairline">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={testing || (!apiKey.trim() && !isConfigured)}
            onClick={handleTestConnection}
            className="h-9 cursor-pointer"
          >
            {testing ? "Testing Ping…" : "⚡ Test Connection"}
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={saving}
            className="h-9 px-5 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer shadow-sm"
          >
            {saving ? "Saving…" : "Save AI Router Configuration"}
          </Button>
        </div>
      </form>
    </div>
  );
}
