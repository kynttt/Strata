import React, { useState, useEffect, useRef } from "react";

export interface Settings {
  providerType: "openai" | "anthropic" | "google" | "ollama";
  model: string;
  apiKey: string;
  baseUrl: string;
}

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
}

const PROVIDER_MODELS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
  anthropic: ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
  google: ["gemini-1.5-flash", "gemini-1.5-pro"],
  ollama: ["llama3.2", "llama3.1", "mistral"],
};

export default function SettingsPanel({ settings, onChange, onClose }: Props) {
  const [local, setLocal] = useState(settings);
  const [models, setModels] = useState<string[]>(PROVIDER_MODELS[settings.providerType]);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const defaultModels = PROVIDER_MODELS[local.providerType];
    setModels(defaultModels);
    setLocal((prev) => ({ ...prev, model: defaultModels[0] }));
  }, [local.providerType]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const handleSave = () => {
    onChange(local);
    onClose();
  };

  const fetchModels = async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setFetching(true);
    setFetchError("");
    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerType: local.providerType,
          apiKey: local.apiKey,
          baseUrl: local.baseUrl,
        }),
        signal: abortRef.current.signal,
      });
      const data = await res.json();
      if (res.ok && data.models) {
        setModels(data.models);
      } else {
        setFetchError(data.error || "Failed to fetch models");
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setFetchError("Network error");
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div id="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title" className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 id="settings-title" className="text-lg font-semibold">AI Provider Settings</h2>
          <button aria-label="Close settings" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
            <select
              id="provider"
              className="w-full border border-gray-300 rounded-md p-2"
              value={local.providerType}
              onChange={(e) => setLocal({ ...local, providerType: e.target.value as Settings["providerType"] })}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
              <option value="ollama">Ollama (Local)</option>
            </select>
          </div>
          <div>
            <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <div className="flex gap-2">
              <select
                id="model"
                className="flex-1 border border-gray-300 rounded-md p-2"
                value={local.model}
                onChange={(e) => setLocal({ ...local, model: e.target.value })}
              >
                {models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <button
                onClick={fetchModels}
                disabled={fetching}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm disabled:opacity-50"
              >
                {fetching ? "..." : "Fetch"}
              </button>
            </div>
            {fetchError && <p aria-live="polite" className="text-xs text-red-600 mt-1">{fetchError}</p>}
          </div>
          {local.providerType !== "ollama" && (
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <input
                id="apiKey"
                type="password"
                className="w-full border border-gray-300 rounded-md p-2"
                value={local.apiKey}
                onChange={(e) => setLocal({ ...local, apiKey: e.target.value })}
                placeholder="sk-..."
              />
            </div>
          )}
          {local.providerType === "ollama" && (
            <div>
              <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
              <input
                id="baseUrl"
                type="text"
                className="w-full border border-gray-300 rounded-md p-2"
                value={local.baseUrl}
                onChange={(e) => setLocal({ ...local, baseUrl: e.target.value })}
                placeholder="http://localhost:11434"
              />
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
