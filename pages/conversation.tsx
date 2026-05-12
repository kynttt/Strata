import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Layout from "@/components/Layout";
import ChatThread, { ChatMessage } from "@/components/ChatThread";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ClassificationResult } from "@/skills/classify-enquiry";
import { RoutingResult } from "@/skills/route-enquiry";
import { ResponseResult } from "@/skills/generate-response";
import GmailInbox from "@/components/GmailInbox";
import EnquiryDrawer from "@/components/EnquiryDrawer";
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
  sender?: string;
  email?: string;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function ConversationPage() {
  const [enquiry, setEnquiry] = useState("");
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"conversation" | "inbox">("conversation");
  const [inboxCategory, setInboxCategory] = useState("received");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [activeJobIds, setActiveJobIds] = useState<(string | number)[]>([]);
  const [drawerItem, setDrawerItem] = useState<import("@/components/GmailInbox").EnquiryItem | null>(null);
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");

  const [demoEnquiries, setDemoEnquiries] = useState<import("@/components/GmailInbox").EnquiryItem[]>([
    {
      id: "1",
      sender: "Sarah Thompson",
      email: "sarah.t@example.com",
      subject: "Strata management services inquiry",
      snippet: "I am interested in your strata management services. Can we book a consultation?",
      timestamp: "10:42 AM",
      read: false,
      starred: true,
      category: "received",
      hasAttachment: false,
    },
    {
      id: "2",
      sender: "Michael Chen",
      email: "m.chen@example.com",
      subject: "Complaint about slow response",
      snippet: "I am very unhappy with the slow response from your support team. This is unacceptable.",
      timestamp: "9:15 AM",
      read: false,
      starred: false,
      category: "received",
      hasAttachment: false,
    },
    {
      id: "3",
      sender: "Property Weekly",
      email: "newsletter@propertyweekly.com",
      subject: "This week's property market update",
      snippet: "Market trends show a 5% increase in strata property values across the region.",
      timestamp: "Yesterday",
      read: true,
      starred: false,
      category: "flagged",
      hasAttachment: true,
    },
    {
      id: "4",
      sender: "LinkedIn",
      email: "notifications@linkedin.com",
      subject: "New connection request",
      snippet: "Emma Wilson wants to connect with you on LinkedIn.",
      timestamp: "Yesterday",
      read: true,
      starred: false,
      category: "processed",
      hasAttachment: false,
    },
    {
      id: "5",
      sender: "Strata NSW",
      email: "updates@strata.nsw.gov.au",
      subject: "New legislation updates for 2026",
      snippet: "Important changes to the Strata Schemes Management Act will take effect next month.",
      timestamp: "May 10",
      read: true,
      starred: true,
      category: "archived",
      hasAttachment: true,
    },
    {
      id: "6",
      sender: "James Wilson",
      email: "j.wilson@example.com",
      subject: "Pricing options for small buildings",
      snippet: "What are your pricing options for small buildings? We have a 12-unit complex.",
      timestamp: "May 9",
      read: true,
      starred: false,
      category: "received",
      hasAttachment: false,
    },
  ]);

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
    if (loading || !enquiry.trim()) return;

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

    let processed: ProcessResponse | null = null;

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
          sender: senderName || undefined,
          email: senderEmail || undefined,
        }),
      });
      const data = await res.json();
      processed = data as ProcessResponse;

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: "team",
            content: processed?.error || "Failed to process enquiry. Please try again.",
            timestamp: Date.now(),
          },
        ]);
      } else {
        const draft = processed.response?.draft ?? processed.draft;
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

    if (processed) {
      try {
        const stored = localStorage.getItem("teamHistory");
        const history = stored ? (JSON.parse(stored) as Record<string, TeamRecord[]>) : {};
        const team = processed.routing?.team || "General";
        if (!history[team]) history[team] = [];
        const record: TeamRecord = {
          ...processed,
          id: makeId(),
          timestamp: Date.now(),
          enquiry,
          sender: processed.sender || senderName || undefined,
          email: processed.email || senderEmail || undefined,
        };
        history[team].push(record);
        localStorage.setItem("teamHistory", JSON.stringify(history));
      } catch {
        console.warn("Failed to persist team history");
      }
    }
  };

  const handleFinalizePreview = () => {
    if (!previewId) return;
    setMessages((prev) =>
      prev.map((msg) => (msg.id === previewId ? { ...msg, preview: false } : msg))
    );
    setPreviewId(null);

    try {
      const stored = localStorage.getItem("teamHistory");
      if (!stored) return;
      const history = JSON.parse(stored) as Record<string, TeamRecord[]>;
      let lastRecord: TeamRecord | null = null;
      let lastTeam: string | null = null;
      for (const team of Object.keys(history)) {
        const records = history[team];
        if (!Array.isArray(records) || records.length === 0) continue;
        const last = records[records.length - 1];
        if (!lastRecord || last.timestamp > lastRecord.timestamp) {
          lastRecord = last;
          lastTeam = team;
        }
      }
      if (lastRecord && lastTeam) {
        lastRecord.sent = true;
        localStorage.setItem("teamHistory", JSON.stringify(history));
      }
    } catch {
      console.warn("Failed to update team history sent state");
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (ids: string[]) => {
    setSelectedIds(ids);
  };

  const handleProcessSelected = async (ids: string[]) => {
    if (!config) {
      setConfigError("No AI configuration found. Please configure your provider first.");
      return;
    }
    if (ids.length === 0) return;

    setProcessingIds(ids);
    setDemoEnquiries((prev) =>
      prev.map((e) => (ids.includes(e.id) ? { ...e, status: "processing" as const } : e))
    );

    try {
      const items = ids
        .map((id) => demoEnquiries.find((e) => e.id === id))
        .filter(Boolean)
        .map((item) => ({ id: item!.id, snippet: item!.snippet }));

      const res = await fetch("/api/process-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          providerType: config.providerType,
          model: config.model,
          apiKey: config.apiKey || undefined,
          baseUrl: config.baseUrl || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setDemoEnquiries((prev) =>
          prev.map((e) =>
            ids.includes(e.id)
              ? { ...e, status: "error" as const, error: data?.error || "Batch enqueue failed" }
              : e
          )
        );
        setProcessingIds([]);
        setSelectedIds([]);
        return;
      }

      const data = await res.json();
      setActiveJobIds(data.jobIds);
    } catch {
      setDemoEnquiries((prev) =>
        prev.map((e) =>
          ids.includes(e.id)
            ? { ...e, status: "error" as const, error: "Network error. Please try again." }
            : e
        )
      );
      setProcessingIds([]);
      setSelectedIds([]);
    }
  };

  const handleRowClick = (item: import("@/components/GmailInbox").EnquiryItem) => {
    setDrawerItem(item);
  };

  useEffect(() => {
    if (activeJobIds.length === 0) return;

    const poll = async () => {
      try {
        const res = await fetch("/api/job-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobIds: activeJobIds }),
        });
        if (!res.ok) return;

        const data = await res.json();
        const statuses = data.statuses as Array<{
          id: string | number;
          state: string;
          data: { itemId: string };
          result?: { itemId: string; result: ProcessResponse };
          failedReason?: string;
        }>;

        let allDone = true;
        for (const status of statuses) {
          const itemId = status.data.itemId;
          if (status.state === "completed" && status.result) {
            const processed = status.result.result;
            const item = demoEnquiries.find((e) => e.id === itemId);
            setDemoEnquiries((prev) =>
              prev.map((e) =>
                e.id === itemId
                  ? {
                      ...e,
                      status: "completed" as const,
                      category: "processed" as const,
                      responseRevealed: false,
                      classification: processed.classification
                        ? {
                            type: processed.classification.type,
                            confidence: processed.classification.confidence,
                            reasoning: processed.classification.reasoning,
                          }
                        : undefined,
                      routing: processed.routing
                        ? {
                            team: processed.routing.team,
                            priority: processed.routing.priority,
                          }
                        : undefined,
                      response: processed.response
                        ? {
                            draft: processed.response.draft,
                            recommended_action: processed.response.recommended_action,
                          }
                        : processed.draft
                          ? {
                              draft: processed.draft,
                              recommended_action: "",
                            }
                          : undefined,
                    }
                  : e
              )
            );

            if (item) {
              try {
                const stored = localStorage.getItem("teamHistory");
                const history = stored ? (JSON.parse(stored) as Record<string, TeamRecord[]>) : {};
                const team = processed.routing?.team || "General";
                if (!history[team]) history[team] = [];
                const record: TeamRecord = {
                  ...processed,
                  id: makeId(),
                  timestamp: Date.now(),
                  enquiry: item.snippet,
                  sender: item.sender,
                  email: item.email,
                };
                history[team].push(record);
                localStorage.setItem("teamHistory", JSON.stringify(history));
              } catch {
                console.warn("Failed to persist team history");
              }
            }

            setProcessingIds((prev) => prev.filter((id) => id !== itemId));
            setActiveJobIds((prev) => prev.filter((jid) => jid !== status.id));
          } else if (status.state === "failed") {
            setDemoEnquiries((prev) =>
              prev.map((e) =>
                e.id === itemId
                  ? {
                      ...e,
                      status: "error" as const,
                      error: status.failedReason || "Processing failed",
                    }
                  : e
              )
            );

            setProcessingIds((prev) => prev.filter((id) => id !== itemId));
            setActiveJobIds((prev) => prev.filter((jid) => jid !== status.id));
          } else {
            allDone = false;
          }
        }

        if (allDone) {
          setActiveJobIds([]);
          setProcessingIds([]);
          setSelectedIds([]);
        }
      } catch {
        console.warn("Failed to poll job status");
      }
    };

    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [activeJobIds]);

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

      <div className="max-w-6xl mx-auto">
        {/* Tab Switcher */}
        <div className="flex items-center gap-1 mb-6 bg-muted/30 rounded-xl p-1.5 border border-border">
          <button
            type="button"
            onClick={() => setActiveTab("conversation")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === "conversation"
                ? "bg-card text-foreground shadow-sm border border-border/50"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Client Conversation
            {messages.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary/20 text-primary font-semibold">
                {messages.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("inbox")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === "inbox"
                ? "bg-card text-foreground shadow-sm border border-border/50"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            Enquiries
            {demoEnquiries.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary/20 text-primary font-semibold">
                {demoEnquiries.length}
              </span>
            )}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "conversation" ? (
            <motion.div
              key="conversation"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <ChatThread
                messages={messages}
                value={enquiry}
                onChange={setEnquiry}
                onSubmit={handleSubmit}
                loading={loading}
                senderName={senderName}
                onSenderNameChange={setSenderName}
                senderEmail={senderEmail}
                onSenderEmailChange={setSenderEmail}
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
            </motion.div>
          ) : (
            <motion.div
              key="inbox"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <GmailInbox
                items={demoEnquiries}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onSelectAll={handleSelectAll}
                activeCategory={inboxCategory}
                onCategoryChange={setInboxCategory}
                onProcess={handleProcessSelected}
                onRowClick={handleRowClick}
                processingIds={processingIds}
              />
              <EnquiryDrawer
                item={drawerItem}
                onClose={() => setDrawerItem(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
