import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Layout from "@/components/Layout";
import ChatThread, { ChatMessage } from "@/components/ChatThread";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ClassificationResult } from "@/skills/classify-enquiry";
import { RoutingResult } from "@/skills/route-enquiry";
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
  flags: { needs_review: boolean; reason: string | null };
  error?: string;
  routingError?: string;
  sender?: string;
  email?: string;
}

interface Conversation {
  id: string;
  sender: string;
  email: string;
  subject: string;
  messages: ChatMessage[];
  timestamp?: number;
  draft?: string;
  status?: "pending" | "processing" | "completed" | "error";
  error?: string;
  classification?: ClassificationResult;
  routing?: RoutingResult;
  flags?: { needs_review: boolean; reason: string | null };
}

const STATIC_TIMESTAMP = 1715587200000;

const SAMPLE_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1",
    sender: "Sarah Thompson",
    email: "sarah.t@example.com",
    subject: "Strata management services inquiry",
    messages: [
      { id: "m1", role: "client", content: "I am interested in your strata management services. Can we book a consultation?", timestamp: STATIC_TIMESTAMP - 3600000 },
    ],
    status: "pending",
  },
  {
    id: "conv-2",
    sender: "Michael Chen",
    email: "m.chen@example.com",
    subject: "Complaint about slow response",
    messages: [
      { id: "m2", role: "client", content: "I am very unhappy with the slow response from your support team. This is unacceptable.", timestamp: STATIC_TIMESTAMP - 7200000 },
    ],
    status: "pending",
  },
  {
    id: "conv-3",
    sender: "James Wilson",
    email: "j.wilson@example.com",
    subject: "Pricing options for small buildings",
    messages: [
      { id: "m3", role: "client", content: "What are your pricing options for small buildings? We have a 12-unit complex.", timestamp: STATIC_TIMESTAMP - 86400000 },
    ],
    status: "pending",
  },
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function ConversationPage() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"conversation" | "inbox">("conversation");
  const [inboxCategory, setInboxCategory] = useState("received");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [activeJobIds, setActiveJobIds] = useState<(string | number)[]>([]);
  const [drawerItem, setDrawerItem] = useState<import("@/components/GmailInbox").EnquiryItem | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem("conversations");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore corrupted data
    }
    return SAMPLE_CONVERSATIONS;
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem("activeConversationId");
      if (saved) return saved;
    } catch {
      // ignore
    }
    return SAMPLE_CONVERSATIONS[0]?.id || null;
  });
  const [selectedConversationIds, setSelectedConversationIds] = useState<string[]>([]);

  const SAMPLE_ENQUIRIES: import("@/components/GmailInbox").EnquiryItem[] = [
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
  ];

  const [demoEnquiries, setDemoEnquiries] = useState<import("@/components/GmailInbox").EnquiryItem[]>(() => {
    try {
      const saved = localStorage.getItem("demoEnquiries");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore corrupted data
    }
    return SAMPLE_ENQUIRIES;
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

  useEffect(() => {
    try {
      localStorage.setItem("conversations", JSON.stringify(conversations));
    } catch {
      console.warn("Failed to persist conversations");
    }
  }, [conversations]);

  useEffect(() => {
    if (activeConversationId) {
      localStorage.setItem("activeConversationId", activeConversationId);
    } else {
      localStorage.removeItem("activeConversationId");
    }
  }, [activeConversationId]);

  useEffect(() => {
    try {
      localStorage.setItem("demoEnquiries", JSON.stringify(demoEnquiries));
    } catch {
      console.warn("Failed to persist demo enquiries");
    }
  }, [demoEnquiries]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const handleSubmit = async () => {
    if (loading || !activeConversationId) return;

    const conv = conversations.find((c) => c.id === activeConversationId);
    if (!conv) return;

    const enquiryText = conv.draft || "";
    if (!enquiryText.trim()) return;

    if (!config) {
      setConfigError("No AI configuration found. Please configure your provider first.");
      return;
    }

    setLoading(true);
    setConfigError(null);

    const clientMsg: ChatMessage = {
      id: makeId(),
      role: "client",
      content: enquiryText,
      timestamp: Date.now(),
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? { ...c, messages: [...c.messages, clientMsg], draft: "", status: "processing" as const }
          : c
      )
    );

    let processed: ProcessResponse | null = null;

    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enquiry: enquiryText,
          providerType: config.providerType,
          model: config.model,
          apiKey: config.apiKey || undefined,
          baseUrl: config.baseUrl || undefined,
          sender: conv.sender || undefined,
          email: conv.email || undefined,
        }),
      });
      const data = await res.json();
      const result = data as ProcessResponse;
      processed = result;

      if (!res.ok) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversationId
              ? {
                  ...c,
                  messages: [
                    ...c.messages,
                    {
                      id: makeId(),
                      role: "team",
                      content: processed?.error || "Failed to process enquiry. Please try again.",
                      timestamp: Date.now(),
                    },
                  ],
                  status: "error" as const,
                  error: processed?.error || "Processing failed",
                }
              : c
          )
        );
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversationId
              ? {
                  ...c,
                  status: "completed" as const,
                  classification: result.classification,
                  routing: result.routing,
                  flags: result.flags,
                }
              : c
          )
        );

        try {
          const stored = localStorage.getItem("teamHistory");
          const history = stored ? (JSON.parse(stored) as Record<string, TeamRecord[]>) : {};
          const team = result.routing?.team || "General";
          if (!history[team]) history[team] = [];
          const record: TeamRecord = {
            id: makeId(),
            timestamp: Date.now(),
            enquiry: enquiryText,
            classification: result.classification,
            routing: result.routing,
            flags: result.flags,
            sender: conv.sender,
            email: conv.email,
            conversationId: conv.id,
          };
          history[team].push(record);
          localStorage.setItem("teamHistory", JSON.stringify(history));
        } catch {
          console.warn("Failed to persist team history");
        }
      }
    } catch {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? {
                ...c,
                messages: [
                  ...c.messages,
                  {
                    id: makeId(),
                    role: "team",
                    content: "Failed to connect to the server. Please try again.",
                    timestamp: Date.now(),
                  },
                ],
                status: "error" as const,
                error: "Network error",
              }
            : c
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllConversations = (ids: string[]) => {
    setSelectedConversationIds(ids);
  };

  const handleProcessSelectedConversations = async (ids: string[]) => {
    if (!config) {
      setConfigError("No AI configuration found. Please configure your provider first.");
      return;
    }
    if (ids.length === 0) return;

    for (const id of ids) {
      const conv = conversations.find((c) => c.id === id);
      if (!conv) continue;
      const lastClientMsg = conv.messages.filter((m) => m.role === "client").pop();
      const snippet = lastClientMsg?.content || conv.draft || "";
      if (!snippet.trim()) continue;

      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, status: "processing" as const } : c)));
      setLoading(true);

      try {
        const res = await fetch("/api/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enquiry: snippet,
            providerType: config.providerType,
            model: config.model,
            apiKey: config.apiKey || undefined,
            baseUrl: config.baseUrl || undefined,
            sender: conv.sender || undefined,
            email: conv.email || undefined,
          }),
        });
        const data = await res.json();
        const processed = data as ProcessResponse;

        if (!res.ok) {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === id
                ? { ...c, status: "error" as const, error: processed?.error || "Processing failed" }
                : c
            )
          );
        } else {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === id
                ? {
                    ...c,
                    status: "completed" as const,
                    classification: processed.classification,
                    routing: processed.routing,
                    flags: processed.flags,
                  }
                : c
            )
          );

          try {
            const stored = localStorage.getItem("teamHistory");
            const history = stored ? (JSON.parse(stored) as Record<string, TeamRecord[]>) : {};
            const team = processed.routing?.team || "General";
            if (!history[team]) history[team] = [];
            const record: TeamRecord = {
              id: makeId(),
              timestamp: Date.now(),
              enquiry: snippet,
              classification: processed.classification,
              routing: processed.routing,
              flags: processed.flags,
              sender: processed.sender || conv.sender || undefined,
              email: processed.email || conv.email || undefined,
              conversationId: conv.id,
            };
            history[team].push(record);
            localStorage.setItem("teamHistory", JSON.stringify(history));
          } catch {
            console.warn("Failed to persist team history");
          }
        }
      } catch {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: "error" as const, error: "Network error" } : c))
        );
      } finally {
        setLoading(false);
      }
    }

    setSelectedConversationIds([]);
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
                      response: undefined,
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
            Chats
            {conversations.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary/20 text-primary font-semibold">
                {conversations.length}
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
            Emails
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
              className="flex gap-4 h-[calc(100vh-14rem)]"
            >
              {!mounted ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  Loading conversations...
                </div>
              ) : (
                <>
                  {/* Left sidebar */}
                  <div className="w-80 flex-shrink-0 bg-card rounded-xl border border-border shadow-md overflow-hidden flex flex-col">
                {/* Toolbar */}
                <div className="px-3 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectAllConversations(
                        selectedConversationIds.length === conversations.length ? [] : conversations.map((c) => c.id)
                      )
                    }
                    className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                      selectedConversationIds.length === conversations.length && conversations.length > 0
                        ? "bg-primary/10"
                        : "hover:bg-muted"
                    }`}
                    aria-label="Select all"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill={selectedConversationIds.length === conversations.length && conversations.length > 0 ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={
                        selectedConversationIds.length === conversations.length && conversations.length > 0
                          ? "text-primary"
                          : "text-muted-foreground"
                      }
                    >
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                    </svg>
                  </button>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {selectedConversationIds.length > 0
                      ? `${selectedConversationIds.length} selected`
                      : `${conversations.length} conversations`}
                  </span>
                  <div className="ml-auto">
                    {selectedConversationIds.length > 0 && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        type="button"
                        onClick={() => handleProcessSelectedConversations(selectedConversationIds)}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="animate-spin"
                            >
                              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                            Processing...
                          </>
                        ) : (
                          <>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M5 12h14" />
                              <path d="m12 5 7 7-7 7" />
                            </svg>
                            Process Selected
                          </>
                        )}
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Conversation list */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {mounted && conversations.map((conv, index) => {
                    const isActive = activeConversationId === conv.id;
                    const isSelected = selectedConversationIds.includes(conv.id);
                    const lastMsg = conv.messages[conv.messages.length - 1];
                    const initials = conv.sender
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();
                    return (
                      <motion.div
                        key={conv.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                        onClick={() => setActiveConversationId(conv.id)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                          isActive
                            ? "bg-primary/10 border border-primary/20 shadow-sm"
                            : "hover:bg-muted/40 border border-transparent"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectConversation(conv.id);
                          }}
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                            isSelected
                              ? "bg-primary border-primary"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          {isSelected && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-primary-foreground"
                            >
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          )}
                        </button>

                        <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-accent">{initials}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-sm font-semibold text-foreground truncate">
                              {conv.sender}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-1">
                              {mounted
                                ? (lastMsg
                                    ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                    : new Date(conv.messages[0]?.timestamp || conv.timestamp || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
                                : " "}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {lastMsg?.content || conv.subject}
                          </p>
                        </div>

                        {conv.status === "completed" && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                        )}
                        {conv.status === "error" && (
                          <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                        )}
                        {conv.status === "processing" && (
                          <span className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Right panel */}
              <div className="flex-1 bg-card rounded-xl border border-border shadow-md overflow-hidden flex flex-col">
                {activeConversation ? (
                  <>
                    {/* Header */}
                    <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-muted/20">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center">
                          <span className="text-sm font-bold text-accent">
                            {activeConversation.sender
                              .split(" ")
                              .map((w) => w[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">
                            {activeConversation.sender}
                          </h3>
                          <p className="text-xs text-muted-foreground">{activeConversation.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        {activeConversation.status === "completed" && (
                          <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-600 text-xs font-bold rounded-full border border-emerald-200">
                            Routed
                          </span>
                        )}
                        {activeConversation.status === "processing" && (
                          <span className="px-2.5 py-1 bg-primary/15 text-primary text-xs font-bold rounded-full border border-primary/20 flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                            Processing
                          </span>
                        )}
                        {activeConversation.classification && activeConversation.routing && (
                          <p className="text-[10px] text-muted-foreground font-medium">
                            {activeConversation.classification.type.replace(/_/g, " ")} · {activeConversation.routing.team} · {activeConversation.routing.priority} · {Math.round((activeConversation.classification.confidence || 0) * 100)}% confidence
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Chat */}
                    <div className="flex-1 overflow-hidden">
                      <ChatThread
                        messages={activeConversation.messages}
                        value={activeConversation.draft || ""}
                        onChange={(val) => {
                          setConversations((prev) =>
                            prev.map((c) => (c.id === activeConversationId ? { ...c, draft: val } : c))
                          );
                        }}
                        onSubmit={handleSubmit}
                        loading={loading}
                        senderName={activeConversation.sender}
                        onSenderNameChange={(val) => {
                          setConversations((prev) =>
                            prev.map((c) => (c.id === activeConversationId ? { ...c, sender: val } : c))
                          );
                        }}
                        senderEmail={activeConversation.email}
                        onSenderEmailChange={(val) => {
                          setConversations((prev) =>
                            prev.map((c) => (c.id === activeConversationId ? { ...c, email: val } : c))
                          );
                        }}
                        showHeader={false}
                        showSenderFields={false}
                        showInput={false}
                        className="border-0 shadow-none rounded-none h-full"
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-20">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-foreground">Select a conversation</p>
                    <p className="text-xs text-muted-foreground mt-1">Choose a chat from the list to view and respond.</p>
                  </div>
                )}
              </div>
                </>
              )}
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
