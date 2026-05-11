import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { aiConfigSchema, AIConfig, providerTypes } from "@/lib/ai-config-schema";

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  ollama: "Ollama (Local)",
};

const DEFAULT_MODELS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
  anthropic: ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
  google: ["gemini-1.5-flash", "gemini-1.5-pro"],
  ollama: ["llama3.2", "llama3.1", "mistral"],
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.08, ease: "easeOut" as const },
  }),
};

export default function ConfigurePage() {
  const router = useRouter();
  const [models, setModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AIConfig>({
    resolver: zodResolver(aiConfigSchema),
    defaultValues: {
      providerType: "openai",
      model: "gpt-4o-mini",
      apiKey: "",
      baseUrl: "http://localhost:11434",
    },
  });

  const providerType = watch("providerType");

  useEffect(() => {
    setModels(DEFAULT_MODELS[providerType] || []);
    setValue("model", DEFAULT_MODELS[providerType]?.[0] || "");
  }, [providerType, setValue]);

  const fetchModels = async () => {
    setFetchingModels(true);
    setFetchError("");
    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerType,
          apiKey: watch("apiKey"),
          baseUrl: watch("baseUrl"),
        }),
      });
      const data = await res.json();
      if (res.ok && data.models) {
        setModels(data.models);
        if (data.models.length > 0) {
          setValue("model", data.models[0]);
        }
      } else {
        setFetchError(data.error || "Failed to fetch models");
      }
    } catch {
      setFetchError("Network error while fetching models");
    } finally {
      setFetchingModels(false);
    }
  };

  const onSubmit = (data: AIConfig) => {
    localStorage.setItem("aiConfig", JSON.stringify(data));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  useEffect(() => {
    const saved = localStorage.getItem("aiConfig");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setValue("providerType", parsed.providerType);
        setValue("model", parsed.model);
        setValue("apiKey", parsed.apiKey || "");
        setValue("baseUrl", parsed.baseUrl || "http://localhost:11434");
      } catch {
        // ignore invalid saved config
      }
    }
  }, [setValue]);

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <motion.div
        className="max-w-2xl mx-auto space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" as const }}
      >
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <div className="flex items-center gap-3">
            <motion.div
              className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Playfair Display, serif" }}>AI Configuration</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Configure your AI provider and model settings.</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => router.push("/")} className="cursor-pointer transition-all duration-200 hover:border-primary/50">
            Back to Dashboard
          </Button>
        </motion.div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <motion.div custom={0} variants={cardVariants} initial="hidden" animate="show">
            <Card className="border-border bg-card shadow-md">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  <CardTitle>Provider</CardTitle>
                </div>
                <CardDescription>Choose the AI provider you want to use.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="providerType">Provider</Label>
                  <Controller
                    name="providerType"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="providerType">
                          <SelectValue placeholder="Select a provider" />
                        </SelectTrigger>
                        <SelectContent>
                          {providerTypes.map((p) => (
                            <SelectItem key={p} value={p}>
                              {PROVIDER_LABELS[p]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.providerType && (
                    <p className="text-sm text-destructive font-medium">{errors.providerType.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div custom={1} variants={cardVariants} initial="hidden" animate="show">
            <Card className="border-border bg-card shadow-md">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M7 7h.01" />
                    <path d="M7 12h.01" />
                    <path d="M7 17h.01" />
                    <path d="M12 7h.01" />
                    <path d="M12 12h.01" />
                    <path d="M12 17h.01" />
                    <path d="M17 7h.01" />
                    <path d="M17 12h.01" />
                    <path d="M17 17h.01" />
                  </svg>
                  <CardTitle>Model</CardTitle>
                </div>
                <CardDescription>Select the model to use for processing enquiries.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <div className="flex gap-2">
                    <Controller
                      name="model"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger id="model" className="flex-1">
                            <SelectValue placeholder="Select a model" />
                          </SelectTrigger>
                          <SelectContent>
                            {models.map((m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <motion.div whileTap={{ scale: 0.96 }}>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={fetchModels}
                        disabled={fetchingModels}
                        className="cursor-pointer transition-all duration-200"
                      >
                        {fetchingModels ? "Fetching..." : "Fetch Models"}
                      </Button>
                    </motion.div>
                  </div>
                  {fetchError && (
                    <p className="text-sm text-destructive font-medium">{fetchError}</p>
                  )}
                  {errors.model && (
                    <p className="text-sm text-destructive font-medium">{errors.model.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <AnimatePresence mode="wait">
            {providerType !== "ollama" ? (
              <motion.div
                key="api-key"
                custom={2}
                variants={cardVariants}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
              >
                <Card className="border-border bg-card shadow-md">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <CardTitle>API Key</CardTitle>
                    </div>
                    <CardDescription>
                      Your API key for {PROVIDER_LABELS[providerType]}. It is stored only in your browser.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="apiKey">API Key</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        placeholder="sk-..."
                        {...register("apiKey")}
                        className="transition-all duration-200 focus:ring-2 focus:ring-primary/30"
                      />
                      {errors.apiKey && (
                        <p className="text-sm text-destructive font-medium">{errors.apiKey.message}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="base-url"
                custom={2}
                variants={cardVariants}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
              >
                <Card className="border-border bg-card shadow-md">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <circle cx="12" cy="11" r="1" />
                        <path d="M8 11h.01" />
                        <path d="M16 11h.01" />
                      </svg>
                      <CardTitle>Base URL</CardTitle>
                    </div>
                    <CardDescription>The URL where your Ollama server is running.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="baseUrl">Base URL</Label>
                      <Input
                        id="baseUrl"
                        type="text"
                        placeholder="http://localhost:11434"
                        {...register("baseUrl")}
                        className="transition-all duration-200 focus:ring-2 focus:ring-primary/30"
                      />
                      {errors.baseUrl && (
                        <p className="text-sm text-destructive font-medium">{errors.baseUrl.message}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            className="flex items-center gap-4 pt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 cursor-pointer shadow-lg hover:shadow-xl active:translate-y-0 transition-all duration-200"
              >
                {isSubmitting ? "Saving..." : "Save Configuration"}
              </Button>
            </motion.div>
            <AnimatePresence>
              {saveSuccess && (
                <motion.span
                  initial={{ opacity: 0, x: -8, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -8, scale: 0.9 }}
                  transition={{ duration: 0.25 }}
                  className="text-sm text-primary font-semibold"
                >
                  Configuration saved successfully!
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}
