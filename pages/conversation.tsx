import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import ChatThread, { ChatMessage } from "@/components/ChatThread";
import { Button } from "@/components/ui/button";
import { ClassificationResult } from "@/skills/classify-enquiry";
import { RoutingResult } from "@/skills/route-enquiry";
import { ResponseResult } from "@/skills/generate-response";
import { TeamRecord } from "@/components/TeamTabsPanel";

interface AIConfig {
  providerType: "openai" | "anthropic" | "google" | "ollama";
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

interface ProcessResponse {
  classification?: ClassificationResult;
  routing?: RoutingResult;
  response?: ResponseResult;
  flags: { needs_review: boolean; reason: string | null };
  error?: string;
  routingError?: string;
  responseError?: string;
  draft?: string | null;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function ConversationPage() {
  const router = useRouter();
  const [enquiry, setEnquiry] = useState("");
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("aiConfig");
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch {
        setConfigError("Invalid saved configuration. Please reconfigure.");
      }
    } else {
      setConfigError("No AI configuration found. Please configure your provider first.");
    }
  }, []);

  const handleSubmit = async () => {
    if (!config) {
      setConfigError("No AI configuration found. Please configure your provider first.");
      return;
    }

    setLoading(true);
    setConfigError(null);

    const clientMsg: ChatMessage = {
      id: makeId(),
      role: "client",
      content: enquiry,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, clientMsg]);

    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enquiry,
          providerType: config.providerType,
          model: config.model,
          apiKey: config.apiKey || undefined,
          baseUrl: config.baseUrl || undefined,
        }),
      });
      const data = await res.json();
      const processed = data as ProcessResponse;

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: "team",
            content: processed.error || "Failed to process enquiry. Please try again.",
            timestamp: Date.now(),
          },
        ]);
      } else {
        const draft = processed.response?.draft || processed.draft;
        if (draft && !processed.flags.needs_review) {
          const previewMsg: ChatMessage = {
            id: makeId(),
            role: "team",
            content: draft,
            timestamp: Date.now(),
            preview: true,
          };
          setMessages((prev) => [...prev, previewMsg]);
          setPreviewId(previewMsg.id);
        }

        const record: TeamRecord = {
          ...processed,
          id: makeId(),
          timestamp: Date.now(),
          enquiry,
        };
        const stored = localStorage.getItem("teamHistory");
        const history = stored ? JSON.parse(stored) : {};
        const team = processed.routing?.team || "Unassigned";
        if (!history[team]) history[team] = [];
        history[team].push(record);
        localStorage.setItem("teamHistory", JSON.stringify(history));
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "team",
          content: "Failed to connect to the server. Please try again.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
      setEnquiry("");
    }
  };

  const handleFinalizePreview = () => {
    if (!previewId) return;
    setMessages((prev) =>
      prev.map((msg) => (msg.id === previewId ? { ...msg, preview: false } : msg))
    );
    setPreviewId(null);
  };

  return (
    <Layout>
      <AnimatePresence mode="wait">
        {configError && (
          <motion.div
            key="config-error"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="mb-8 bg-card border border-accent/30 rounded-xl p-5 flex items-center justify-between shadow-md"
          >
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent flex-shrink-0">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
              <div>
                <p className="text-sm text-foreground font-semibold">Configuration Required</p>
                <p className="text-xs text-muted-foreground mt-0.5">{configError}</p>
              </div>
            </div>
            <Button variant="secondary" onClick={() => router.push("/configure")} className="cursor-pointer transition-all duration-200">
              Go to Configuration
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-3xl mx-auto">
        <ChatThread
          messages={messages}
          value={enquiry}
          onChange={setEnquiry}
          onSubmit={handleSubmit}
          loading={loading}
        />

        <AnimatePresence>
          {previewId && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.3 }}
              className="mt-4 flex justify-end"
            >
              <Button
                onClick={handleFinalizePreview}
                className="cursor-pointer shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Send Response
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
