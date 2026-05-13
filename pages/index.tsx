import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Layout from "@/components/Layout";
import TeamTabsPanel, { TeamRecord } from "@/components/TeamTabsPanel";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ResponseResult } from "@/skills/generate-response";

interface AIConfig {
  providerType: "openai" | "anthropic" | "google" | "ollama";
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

const TEAMS = ["Sales", "Technical Support", "Complaints", "General"];

export default function Home() {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [activeTeamTab, setActiveTeamTab] = useState("Sales");
  const [teamHistory, setTeamHistory] = useState<Record<string, TeamRecord[]>>({
    Sales: [],
    "Technical Support": [],
    Complaints: [],
    General: [],
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

    const savedHistory = localStorage.getItem("teamHistory");
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        const normalized: Record<string, TeamRecord[]> = {};
        for (const team of TEAMS) {
          normalized[team] = Array.isArray(parsed[team]) ? parsed[team] : [];
        }
        setTeamHistory(normalized);
      } catch {
        // Ignore corrupted history
      }
    }
  }, []);

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
            role="alert"
            className="mb-8 bg-card border border-accent/30 rounded-xl p-5 flex items-center justify-between shadow-md"
          >
            <div className="flex items-center gap-3">
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent flex-shrink-0">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
              <div>
                <p className="text-sm text-foreground font-semibold">Configuration Required</p>
                <p className="text-xs text-muted-foreground mt-0.5">{configError}</p>
              </div>
            </div>
            <Link
              href="/configure"
              className={cn(buttonVariants({ variant: "secondary" }), "cursor-pointer transition-all duration-200")}
            >
              Go to Configuration
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <TeamTabsPanel
        teamHistory={teamHistory}
        activeTab={activeTeamTab}
        onTabChange={setActiveTeamTab}
        config={config}
        onSendResponse={(recordId) => {
          setTeamHistory((prev) => {
            const next: Record<string, TeamRecord[]> = {};
            for (const team of Object.keys(prev)) {
              next[team] = prev[team].map((r) =>
                r.id === recordId ? { ...r, sent: true } : r
              );
            }
            localStorage.setItem("teamHistory", JSON.stringify(next));
            return next;
          });
        }}
        onSaveEdit={(recordId, draft) => {
          setTeamHistory((prev) => {
            const next: Record<string, TeamRecord[]> = {};
            for (const team of Object.keys(prev)) {
              next[team] = prev[team].map((r) =>
                r.id === recordId && r.response
                  ? { ...r, response: { ...r.response, draft } }
                  : r
              );
            }
            localStorage.setItem("teamHistory", JSON.stringify(next));
            return next;
          });
        }}
        onSaveManualResponse={(recordId, response) => {
          setTeamHistory((prev) => {
            const next: Record<string, TeamRecord[]> = {};
            for (const team of Object.keys(prev)) {
              next[team] = prev[team].map((r) =>
                r.id === recordId ? { ...r, manualResponse: response } : r
              );
            }
            localStorage.setItem("teamHistory", JSON.stringify(next));
            return next;
          });
        }}
        onGenerateResponse={(recordId, response) => {
          setTeamHistory((prev) => {
            const next: Record<string, TeamRecord[]> = {};
            for (const team of Object.keys(prev)) {
              next[team] = prev[team].map((r) =>
                r.id === recordId ? { ...r, response } : r
              );
            }
            localStorage.setItem("teamHistory", JSON.stringify(next));
            return next;
          });
        }}
      />
    </Layout>
  );
}
