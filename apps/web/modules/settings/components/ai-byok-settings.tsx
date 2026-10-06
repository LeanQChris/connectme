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
    badge: "GPT-4o",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o-mini", "gpt-4o", "o1-mini", "o3-mini"],
  },
  anthropic: {
    label: "Anthropic Claude",
    badge: "Claude 3.5",
    defaultModel: "claude-3-5-haiku-20241022",
    models: ["claude-3-5-haiku-20241022", "claude-3-5-sonnet-20241022"],
  },
  gemini: {
    label: "Google Gemini",
    badge: "Gemini 1.5/2.0",
    defaultModel: "gemini-1.5-flash",
    models: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"],
  },
  openrouter: {
    label: "OpenRouter",
    badge: "DeepSeek / Llama",
    defaultModel: "deepseek/deepseek-chat",
    models: [
      "deepseek/deepseek-chat",
      "deepseek/deepseek-r1",
      "meta-llama/llama-3.3-70b-instruct",
      "anthropic/claude-3.5-sonnet",
    ],
  },
  "openai-compatible": {
    label: "Custom / Local",
    badge: "Ollama / Groq",
    defaultModel: "llama3.3",
    models: ["llama3.3", "mistral", "qwen2.5"],
  },
  azure: {
    label: "Azure OpenAI",
    badge: "Enterprise",
    defaultModel: "gpt-4o",
    models: ["gpt-4o", "gpt-4o-mini"],
  },
};

const ROUTING_STRATEGIES: { id: AiRoutingStrategy; label: string; desc: string; icon: string }[] = [
  {
    id: "priority",
    label: "Priority Fallback",
    desc: "Route to Primary provider first; seamlessly switch to Fallback on error.",
    icon: "🛡️",
  },
  {
    id: "balanced",
    label: "Balanced Load",
    desc: "Distribute API requests proportionally to spread rate limits.",
    icon: "⚖️",
  },
  {
    id: "lowest_latency",
    label: "Lowest Latency",
    desc: "Prioritize the provider with the fastest observed response times.",
    icon: "⚡",
  },
  {
    id: "lowest_cost",
    label: "Lowest Cost",
    desc: "Optimize token spending by favoring economical models.",
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
      setTestResult({ success: false, message: "Enter an API Key to test connection." });
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
      <form onSubmit={handleSubmit} className="rounded-xl border border-hairline bg-canvas-elevated shadow-xs overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-5 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-canvas-elevated">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">AI Copilot & Router</h2>
            <p className="text-[12.5px] text-mute mt-0.5">
              Configure your model provider keys for intelligent replies and translations.
            </p>
          </div>

          <div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium ${
                isConfigured
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-surface-well text-mute border border-hairline"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isConfigured ? "bg-emerald-500" : "bg-neutral-400"}`} />
              {isConfigured ? `Connected (${initialConfig?.provider})` : "Not Configured"}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-6">
          {/* 1. Primary AI Provider Selection */}
          <div className="space-y-2.5">
            <label className="block text-[12.5px] font-medium text-ink">
              Primary AI Provider
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {(Object.keys(PROVIDER_MODELS) as AiProvider[]).map((pKey) => {
                const pInfo = PROVIDER_MODELS[pKey];
                const isSelected = provider === pKey;
                return (
                  <button
                    key={pKey}
                    type="button"
                    onClick={() => handleProviderChange(pKey)}
                    className={`flex flex-col justify-between rounded-lg p-3 text-left transition-all cursor-pointer border ${
                      isSelected
                        ? "border-ink bg-surface-well text-ink font-semibold shadow-2xs"
                        : "border-hairline bg-canvas text-body hover:border-hairline-strong hover:bg-surface-well/40 hover:text-ink"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between gap-1">
                      <span className="text-[13px] font-medium text-ink leading-tight">{pInfo.label}</span>
                      <span className="rounded bg-surface-well px-1 py-0.2 font-mono text-[9px] text-mute border border-hairline shrink-0">
                        {pInfo.badge}
                      </span>
                    </div>
                    <span className="font-mono text-[10.5px] text-mute mt-2 block truncate">
                      {pInfo.defaultModel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. API Key Input */}
          <div className="space-y-1.5">
            <label className="block text-[12.5px] font-medium text-ink">
              {PROVIDER_MODELS[provider]?.label} API Key {isConfigured && "(Encrypted at Rest)"}
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={isConfigured ? "••••••••••••••••••••••••••••••••  (Saved)" : "sk-..."}
                className="h-9 w-full rounded-lg border border-hairline bg-canvas pl-3 pr-14 font-mono text-[12.5px] text-ink placeholder:text-mute focus:border-ink focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[11px] text-mute hover:text-ink cursor-pointer px-1.5 py-0.5 rounded"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            <p className="text-[11px] text-mute">
              Encrypted using AES-256-GCM in the tenant credential vault.
            </p>
          </div>

          {/* 3. Model Identifier & Custom Endpoint */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-ink">
                Model Identifier
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. gpt-4o-mini"
                className="h-9 w-full rounded-lg border border-hairline bg-canvas px-3 font-mono text-[12.5px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
              />
              <div className="pt-0.5 flex flex-wrap gap-1">
                {PROVIDER_MODELS[provider]?.models.map((m) => {
                  const isModelActive = model === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModel(m)}
                      className={`rounded px-2 py-0.5 font-mono text-[10.5px] transition-colors cursor-pointer border ${
                        isModelActive
                          ? "bg-ink text-on-primary font-semibold border-ink"
                          : "border-hairline bg-surface-well/50 text-mute hover:border-ink hover:text-ink"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-ink">
                Custom Base URL <span className="text-mute font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={customBaseUrl}
                onChange={(e) => setCustomBaseUrl(e.target.value)}
                placeholder="https://openrouter.ai/api/v1"
                className="h-9 w-full rounded-lg border border-hairline bg-canvas px-3 font-mono text-[12.5px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
              />
              <p className="text-[11px] text-mute">
                For OpenRouter, Ollama, Groq, or local vLLM endpoints.
              </p>
            </div>
          </div>

          {/* 4. Automatic Fallback Provider */}
          <div className="rounded-lg border border-hairline bg-surface-well/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-[13px] font-semibold text-ink">
                  Automatic Fallback Chain
                </h4>
                <p className="text-[11.5px] text-mute">
                  Route to a backup provider if your primary API model experiences rate limits.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEnableFallback(!enableFallback)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                  enableFallback ? "bg-emerald-500" : "bg-surface-well border border-hairline"
                }`}
                role="switch"
                aria-checked={enableFallback}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    enableFallback ? "translate-x-4" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {enableFallback && (
              <div className="space-y-3 pt-3 border-t border-hairline">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11.5px] font-medium text-ink">
                      Fallback Provider
                    </label>
                    <select
                      value={fallbackProvider}
                      onChange={(e) => handleFallbackProviderChange(e.target.value as AiProvider)}
                      className="h-9 w-full rounded-lg border border-hairline bg-canvas px-2.5 text-[12.5px] text-ink focus:border-ink focus:outline-none"
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

                  <div className="space-y-1">
                    <label className="block text-[11.5px] font-medium text-ink">
                      Fallback Model
                    </label>
                    <input
                      type="text"
                      value={fallbackModel}
                      onChange={(e) => setFallbackModel(e.target.value)}
                      placeholder="e.g. gemini-1.5-flash"
                      className="h-9 w-full rounded-lg border border-hairline bg-canvas px-3 font-mono text-[12.5px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11.5px] font-medium text-ink">
                    Fallback Provider API Key {isFallbackConfigured && "(Saved)"}
                  </label>
                  <div className="relative">
                    <input
                      type={showFallbackKey ? "text" : "password"}
                      value={fallbackApiKey}
                      onChange={(e) => setFallbackApiKey(e.target.value)}
                      placeholder={
                        isFallbackConfigured
                          ? "••••••••••••••••••••••••••••••••  (Saved)"
                          : "sk-..."
                      }
                      className="h-9 w-full rounded-lg border border-hairline bg-canvas pl-3 pr-14 font-mono text-[12.5px] text-ink placeholder:text-mute focus:border-ink focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFallbackKey(!showFallbackKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[11px] text-mute hover:text-ink cursor-pointer px-1.5 py-0.5 rounded"
                    >
                      {showFallbackKey ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. Routing Strategy */}
          <div className="space-y-2">
            <label className="block text-[12.5px] font-medium text-ink">
              Multi-Provider Routing Strategy
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ROUTING_STRATEGIES.map((strat) => {
                const isSelected = routingStrategy === strat.id;
                return (
                  <button
                    key={strat.id}
                    type="button"
                    onClick={() => setRoutingStrategy(strat.id)}
                    className={`flex flex-col items-start rounded-lg p-3 text-left transition-all cursor-pointer border ${
                      isSelected
                        ? "border-ink bg-surface-well text-ink font-semibold shadow-2xs"
                        : "border-hairline bg-canvas text-body hover:border-hairline-strong hover:bg-surface-well/40 hover:text-ink"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{strat.icon}</span>
                      <span className="text-[12.5px] font-medium text-ink">{strat.label}</span>
                    </div>
                    <p className="text-[11px] text-mute mt-1 leading-snug">{strat.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Custom System Persona */}
          <div className="space-y-1.5">
            <label className="block text-[12.5px] font-medium text-ink">
              Brand Persona & Guidelines <span className="text-mute font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={customSystemPrompt}
              onChange={(e) => setCustomSystemPrompt(e.target.value)}
              placeholder="e.g. Always maintain a polite, friendly tone and offer helpful links from our knowledge base."
              className="w-full rounded-lg border border-hairline bg-canvas p-3 text-[12.5px] text-ink placeholder:text-mute focus:border-ink focus:outline-none leading-relaxed resize-y"
            />
          </div>

          {/* Test / Save Alerts */}
          {testResult && (
            <div
              className={`rounded-lg border p-3 text-[12.5px] flex items-center gap-2 ${
                testResult.success
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-error/20 bg-error/10 text-error"
              }`}
            >
              <span>{testResult.success ? "✓" : "!"}</span>
              <span>{testResult.message}</span>
            </div>
          )}

          {savedSuccess && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-[12.5px] text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <span>✓</span>
              <span>Configuration saved successfully!</span>
            </div>
          )}
        </div>

        {/* Card Footer Actions */}
        <div className="px-6 py-3.5 bg-surface-well/30 border-t border-hairline flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={testing || (!apiKey.trim() && !isConfigured)}
            onClick={handleTestConnection}
            className="h-8 px-3 cursor-pointer text-[12px]"
          >
            {testing ? "Testing…" : "Test Connection"}
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={saving}
            className="h-8 px-4 cursor-pointer text-[12.5px] font-medium"
          >
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
