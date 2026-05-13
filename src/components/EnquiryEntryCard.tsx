import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TeamRecord } from "./TeamTabsPanel";
import { ResponseResult } from "@/skills/generate-response";

interface AIConfig {
  providerType: "openai" | "anthropic" | "google" | "ollama";
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

interface Props {
  record: TeamRecord;
  index: number;
  onSendResponse?: (recordId: string) => void;
  onSaveEdit?: (recordId: string, draft: string) => void;
  onSaveManualResponse?: (recordId: string, response: string) => void;
  onGenerateResponse?: (recordId: string, response: ResponseResult) => void;
  config?: AIConfig | null;
}

const STATUS_CONFIG = {
  needs_review: {
    label: "Needs Review",
    borderColor: "border-l-amber-500",
    bgBadge: "bg-amber-500/15 text-amber-600",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
    ),
  },
  completed: {
    label: "Completed",
    borderColor: "border-l-emerald-500",
    bgBadge: "bg-emerald-500/15 text-emerald-600",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ),
  },
  error: {
    label: "Error",
    borderColor: "border-l-red-500",
    bgBadge: "bg-red-500/15 text-red-600",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="m15 9-6 6" />
        <path d="m9 9 6 6" />
      </svg>
    ),
  },
};

const TYPE_COLORS: Record<string, string> = {
  new_client: "bg-sky-500/15 text-sky-600 border-sky-200",
  support_request: "bg-violet-500/15 text-violet-600 border-violet-200",
  complaint: "bg-red-500/15 text-red-600 border-red-200",
  general_question: "bg-green-500/15 text-green-600 border-green-200",
  needs_clarification: "bg-amber-500/15 text-amber-600 border-amber-200",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-accent/20 text-accent border-accent/30",
  high: "bg-destructive/15 text-destructive border-destructive/20",
};

function getStatus(record: TeamRecord) {
  if (record.error) return "error";
  if (record.flags.needs_review) return "needs_review";
  return "completed";
}

function personalizeDraft(draft: string, senderName?: string) {
  if (senderName) return draft.replace(/\[Name\]/g, senderName);
  return draft.replace(/Dear\s+\[Name\],?/gi, "Hello,").replace(/\[Name\]/g, "there");
}

function getInitials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function EnquiryEntryCard({
  record,
  index,
  onSendResponse,
  onSaveEdit,
  onSaveManualResponse,
  onGenerateResponse,
  config,
}: Props) {
  const status = getStatus(record);
  const statusConfig = STATUS_CONFIG[status];
  const dateStr = new Date(record.timestamp).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editedDraft, setEditedDraft] = useState(
    record.response ? personalizeDraft(record.response.draft, record.sender) : ""
  );
  const [sent, setSent] = useState(record.sent || false);
  const [manualText, setManualText] = useState(record.manualResponse || "");
  const [saved, setSaved] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    if (record.response) {
      setEditedDraft(personalizeDraft(record.response.draft, record.sender));
    }
  }, [record.response, record.sender]);

  useEffect(() => {
    setSent(record.sent || false);
  }, [record.sent]);

  const handleSend = () => {
    if (!onSendResponse) return;
    onSaveEdit?.(record.id, editedDraft);
    onSendResponse(record.id);
    setSent(true);

    if (record.conversationId && editedDraft) {
      try {
        const saved = localStorage.getItem("conversations");
        if (saved) {
          const conversations = JSON.parse(saved);
          const conv = conversations.find((c: any) => c.id === record.conversationId);
          if (conv) {
            conv.messages = conv.messages || [];
            conv.messages.push({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              role: "team",
              content: editedDraft,
              timestamp: Date.now(),
            });
            localStorage.setItem("conversations", JSON.stringify(conversations));
          }
        }
      } catch {
        console.warn("Failed to update conversation with sent response");
      }
    }
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    if (editedDraft.trim()) {
      onSaveEdit?.(record.id, editedDraft);
    }
  };

  const handleSaveManual = () => {
    if (!manualText.trim() || !onSaveManualResponse) return;
    onSaveManualResponse(record.id, manualText.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleGenerateResponse = async () => {
    if (!config || !record.classification) return;
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/generate-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enquiry: record.enquiry,
          classification: record.classification.type,
          providerType: config.providerType,
          model: config.model,
          apiKey: config.apiKey || undefined,
          baseUrl: config.baseUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setGenerateError(data.error || "Failed to generate response");
        return;
      }
      if (data.response) {
        onGenerateResponse?.(record.id, data.response);
      }
    } catch {
      setGenerateError("Network error. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`group relative bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow duration-300 ${statusConfig.borderColor} border-l-[4px]`}
    >
      {/* ── Header ── */}
      <div className="px-5 py-4 bg-muted/20 rounded-t-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="min-w-0">
              {/* Sender name */}
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-accent">
                    {getInitials(record.sender)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {record.sender || "Unknown Sender"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {record.email || "No email"}
                  </p>
                </div>
              </div>

              <p className="text-sm text-foreground/80 truncate max-w-lg">
                {record.enquiry}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{dateStr}</p>
            </div>
          </div>

          <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusConfig.bgBadge}`}>
            {statusConfig.icon}
            {statusConfig.label}
          </span>
        </div>

        {/* Inline metadata row */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {record.classification && (
            <>
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${TYPE_COLORS[record.classification.type] || "bg-muted text-muted-foreground border-border"}`}>
                {record.classification.type.replace(/_/g, " ")}
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${record.classification.confidence * 100}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">{Math.round(record.classification.confidence * 100)}%</span>
              </div>
            </>
          )}

          {record.routing && (
            <>
              <span className="w-px h-3 bg-border mx-0.5" />
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${PRIORITY_COLORS[record.routing.priority] || "bg-muted text-muted-foreground border-border"}`}>
                {record.routing.team}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${PRIORITY_COLORS[record.routing.priority] || "bg-muted text-muted-foreground border-border"}`}>
                {record.routing.priority}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-5 py-5">
        {/* AI Response */}
        {record.response && (
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div
                  key="edit"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <label className="text-sm font-medium text-foreground">Edit Response</label>
                  <textarea
                    value={editedDraft}
                    onChange={(e) => setEditedDraft(e.target.value)}
                    className="w-full min-h-[120px] bg-background border border-border rounded-lg p-4 text-sm text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary shadow-inner resize-y leading-relaxed"
                  />
                  <div className="flex items-center gap-2">
                    <motion.button
                      type="button"
                      onClick={handleSaveEdit}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:shadow transition-all cursor-pointer"
                    >
                      Done Editing
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => {
                        setEditedDraft(personalizeDraft(record.response!.draft, record.sender));
                        setIsEditing(false);
                      }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="px-4 py-2 text-sm font-medium bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-all cursor-pointer"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {editedDraft}
                    </p>
                  </div>

                  {record.response.recommended_action && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary flex-shrink-0 mt-0.5">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                      {record.response.recommended_action}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    {onSendResponse && (
                      <motion.button
                        type="button"
                        onClick={handleSend}
                        disabled={sent}
                        whileHover={sent ? {} : { scale: 1.03 }}
                        whileTap={sent ? {} : { scale: 0.97 }}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                          sent
                            ? "bg-muted text-muted-foreground border border-border"
                            : "bg-primary text-primary-foreground hover:shadow"
                        }`}
                      >
                        {sent ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                            Sent
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m22 2-7 20-4-9-9-4 20-7z" />
                            </svg>
                            Send Response
                          </>
                        )}
                      </motion.button>
                    )}

                    {!sent && (
                      <motion.button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="px-4 py-2 text-sm font-medium bg-secondary/20 text-secondary rounded-lg hover:bg-secondary/30 transition-all cursor-pointer flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        </svg>
                        Edit
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Generate Response */}
        {!record.response && record.classification && record.routing && (
          <div className="space-y-3">
            <motion.button
              type="button"
              onClick={handleGenerateResponse}
              disabled={isGenerating || !config}
              whileHover={isGenerating || !config ? {} : { scale: 1.03 }}
              whileTap={isGenerating || !config ? {} : { scale: 0.97 }}
              className={`w-full px-4 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isGenerating || !config
                  ? "bg-muted text-muted-foreground border border-border"
                  : "bg-primary text-primary-foreground hover:shadow"
              }`}
            >
              {isGenerating ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
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
                  Generating response...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3v18" />
                    <path d="M3 12h18" />
                  </svg>
                  Generate Response
                </>
              )}
            </motion.button>
            {generateError && (
              <p className="text-xs text-red-600">{generateError}</p>
            )}
          </div>
        )}

        {/* Clarification draft */}
        {(record.classification?.draft || record.draft) && record.routing?.team !== "General" && (
          <div className="bg-accent/5 border border-accent/15 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
              <p className="text-sm font-semibold text-accent">Clarification needed</p>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{record.classification?.draft || record.draft}</p>
          </div>
        )}

        {/* Manual response form */}
        {record.flags.needs_review && !record.response && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Write manual response</label>
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Type your response asking the client for clarification..."
              className="w-full min-h-[100px] bg-muted/30 border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 resize-y"
            />
            <div className="flex items-center gap-3">
              <motion.button
                type="button"
                onClick={handleSaveManual}
                disabled={!manualText.trim() || saved}
                whileHover={saved ? {} : { scale: 1.03 }}
                whileTap={saved ? {} : { scale: 0.97 }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                  saved ? "bg-green-500/15 text-green-600" : "bg-accent text-accent-foreground hover:shadow"
                }`}
              >
                {saved ? "Saved" : "Save Response"}
              </motion.button>
            </div>
          </div>
        )}

        {/* Error states */}
        {record.responseError && !record.response && (
          <div className="flex items-start gap-3 text-sm text-red-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6" />
              <path d="m9 9 6 6" />
            </svg>
            <span>Response generation failed: {record.responseError}</span>
          </div>
        )}

        {record.error && (
          <div className="flex items-start gap-3 text-sm text-red-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6" />
              <path d="m9 9 6 6" />
            </svg>
            <span>Processing error: {record.error}</span>
          </div>
        )}
      </div>
    </motion.article>
  );
}
