import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import ChatThread, { ChatMessage } from "@/components/ChatThread";
import TeamTabsPanel, { TeamRecord } from "@/components/TeamTabsPanel";
import { Button } from "@/components/ui/button";
import { ClassificationResult } from "@/skills/classify-enquiry";
import { RoutingResult } from "@/skills/route-enquiry";
import { ResponseResult } from "@/skills/generate-response";

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

const TEAMS = ["Sales", "Technical Support", "Complaints", "General", "Unassigned"];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function Home() {
  const router = useRouter();
  const [enquiry, setEnquiry] = useState("");
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [activeTeamTab, setActiveTeamTab] = useState("Sales");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [teamHistory, setTeamHistory] = useState<Record<string, TeamRecord[]>>({
    Sales: [],
    "Technical Support": [],
    Complaints: [],
    General: [],
    Unassigned: [],
  });

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

      const record: TeamRecord = {
        ...processed,
        id: makeId(),
        timestamp: Date.now(),
        enquiry,
      };

      if (!res.ok) {
        setTeamHistory((prev) => ({
          ...prev,
          Unassigned: [...prev.Unassigned, record],
        }));
        setActiveTeamTab("Unassigned");
      } else {
        const team = processed.routing?.team;
        if (team && TEAMS.includes(team)) {
          setTeamHistory((prev) => ({
            ...prev,
            [team]: [...prev[team], record],
          }));
          setActiveTeamTab(team);
        } else {
          setTeamHistory((prev) => ({
            ...prev,
            Unassigned: [...prev.Unassigned, record],
          }));
          setActiveTeamTab("Unassigned");
        }
      }
    } catch {
      const record: TeamRecord = {
        flags: { needs_review: true, reason: "Network error" },
        error: "Failed to connect to the server. Please try again.",
        id: makeId(),
        timestamp: Date.now(),
        enquiry,
      };
      setTeamHistory((prev) => ({
        ...prev,
        Unassigned: [...prev.Unassigned, record],
      }));
      setActiveTeamTab("Unassigned");
    } finally {
      setLoading(false);
      setEnquiry("");
    }
  };

  const handleSendResponse = (recordId: string) => {
    let targetTeam = "";
    let record: TeamRecord | null = null;

    for (const team of Object.keys(teamHistory)) {
      const r = teamHistory[team].find((x) => x.id === recordId);
      if (r) {
        record = r;
        targetTeam = team;
        break;
      }
    }

    if (!record || !record.response) return;

    setMessages((prev) => [
      ...prev,
      {
        id: makeId(),
        role: "team",
        content: record.response!.draft,
        timestamp: Date.now(),
        team: targetTeam,
      },
    ]);

    setTeamHistory((prev) => ({
      ...prev,
      [targetTeam]: prev[targetTeam].map((r) =>
        r.id === recordId ? { ...r, sent: true } : r
      ),
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" as const }}
        className="border-b border-border"
      >
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-wide" style={{ fontFamily: "Playfair Display, serif" }}>Strata Enquiry Processor</h1>
          </div>
          <Button variant="outline" onClick={() => router.push("/configure")} className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50">
            Configure AI
          </Button>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-6 py-8">
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <motion.div
            className="lg:col-span-5"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" as const }}
          >
            <ChatThread
              messages={messages}
              value={enquiry}
              onChange={setEnquiry}
              onSubmit={handleSubmit}
              loading={loading}
            />
          </motion.div>

          <motion.div
            className="lg:col-span-7"
            aria-live="polite"
            aria-atomic="true"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.18, ease: "easeOut" as const }}
          >
            <TeamTabsPanel
              teamHistory={teamHistory}
              activeTab={activeTeamTab}
              onTabChange={setActiveTeamTab}
              onSendResponse={handleSendResponse}
            />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
