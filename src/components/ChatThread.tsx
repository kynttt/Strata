import React, { useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  role: "client" | "team";
  content: string;
  timestamp: number;
  team?: string;
  preview?: boolean;
}

interface Props {
  messages: ChatMessage[];
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  loading: boolean;
  senderName?: string;
  onSenderNameChange?: (val: string) => void;
  senderEmail?: string;
  onSenderEmailChange?: (val: string) => void;
  showHeader?: boolean;
  showSenderFields?: boolean;
  showInput?: boolean;
  className?: string;
}

const DEFAULT_SENDER_NAME = "Sarah Thompson";
const DEFAULT_SENDER_INITIALS = "ST";

const SAMPLES = [
  "I am interested in your strata management services. Can we book a consultation?",
  "I am very unhappy with the slow response from your support team. This is unacceptable.",
  "What are your pricing options for small buildings?",
];

function formatTime(ts: number) {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${hh}:${mm} ${ampm}`;
}

export default function ChatThread({ messages, value, onChange, onSubmit, loading, senderName, onSenderNameChange, senderEmail, onSenderEmailChange, showHeader = true, showSenderFields = true, showInput = true, className }: Props) {
  const id = useId();
  const displayName = senderName?.trim() || DEFAULT_SENDER_NAME;
  const displayInitials = displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <motion.div
      className={cn("bg-card rounded-xl border border-border shadow-md flex flex-col overflow-hidden", className)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" as const }}
    >
      {showHeader && (
        <div className="p-5 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide font-heading">Client Conversation</h3>
            <p className="text-xs text-muted-foreground">{messages.length} message{messages.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-[180px] max-h-[calc(100vh-24rem)]">
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full py-8 text-center"
            >
              <motion.div
                className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </motion.div>
              <p className="text-sm font-medium text-muted-foreground">No conversation yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">Type a client enquiry below to start.</p>
            </motion.div>
          ) : (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.3, ease: "easeOut" as const }}
                className={`flex items-start gap-2.5 ${msg.role === "team" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    msg.role === "client"
                      ? "bg-accent/20 text-accent"
                      : "bg-primary/20 text-primary"
                  }`}
                  aria-hidden="true"
                >
                  {msg.role === "client" ? (
                    displayInitials
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                  )}
                </div>

                <div className={`max-w-[85%] flex flex-col ${msg.role === "team" ? "items-end" : ""}`}>
                  <p className="text-[11px] text-muted-foreground mb-0.5 font-medium">
                    {msg.role === "client" ? displayName : `${msg.team || "Team"} Team`}
                  </p>
                  <motion.div
                    className={`px-4 py-2.5 rounded-2xl border ${
                      msg.role === "client"
                        ? "bg-accent/10 border-accent/20 rounded-tl-sm"
                        : msg.preview
                          ? "bg-primary/5 border-primary/30 border-dashed rounded-tr-sm opacity-80"
                          : "bg-primary/10 border-primary/20 rounded-tr-sm"
                    }`}
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.15 }}
                  >
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </motion.div>
                  <p className="text-[10px] text-muted-foreground mt-1">{formatTime(msg.timestamp)}</p>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {showInput && (
      <div className="p-5 pt-0 space-y-4 border-t border-border" aria-live="polite" aria-busy={loading}>
        {showSenderFields && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${id}-name`} className="text-sm font-medium text-foreground mb-1 block">Sender Name</label>
              <input
                id={`${id}-name`}
                type="text"
                value={senderName || ""}
                onChange={(e) => onSenderNameChange?.(e.target.value)}
                placeholder="e.g. John Smith"
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-50"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor={`${id}-email`} className="text-sm font-medium text-foreground mb-1 block">Sender Email</label>
              <input
                id={`${id}-email`}
                type="email"
                value={senderEmail || ""}
                onChange={(e) => onSenderEmailChange?.(e.target.value)}
                placeholder="e.g. john@example.com"
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-50"
                disabled={loading}
              />
            </div>
          </div>
        )}

        <div className="relative">
          <label htmlFor={id} className="text-sm font-medium text-foreground mb-1 block">Client enquiry</label>
          <textarea
            id={id}
            name={id}
            className="w-full h-32 p-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground resize-y transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-50 mt-4"
            placeholder="Paste a client enquiry here..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (value.trim() && !loading) onSubmit();
              }
            }}
          />
          {loading && (
            <motion.div
              className="absolute inset-0 bg-background/50 rounded-xl backdrop-blur-[1px] mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="stepper"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25, ease: "easeOut" as const }}
              className="flex flex-col items-center py-4 gap-3"
            >
              <div className="relative w-12 h-12">
                <motion.div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" as const }}
                />
              </div>
              <p className="text-sm font-semibold text-foreground">Processing enquiry...</p>
              <div className="flex items-center gap-3">
                {["Classify", "Route", "Respond"].map((step, i) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <motion.div
                        className="w-2 h-2 rounded-full bg-primary"
                        animate={{
                          scale: [1, 1.4, 1],
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.3,
                          ease: "easeInOut" as const,
                        }}
                      />
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{step}</span>
                    </div>
                    {i < 2 && <div className="w-6 h-px bg-border" />}
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="actions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25, ease: "easeOut" as const }}
              className="flex items-center justify-between"
            >
              <div className="flex gap-2">
                {SAMPLES.map((s, i) => (
                  <motion.button
                    key={i}
                    type="button"
                    onClick={() => onChange(s)}
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    className="text-xs px-3 py-1.5 bg-secondary/20 hover:bg-secondary/30 text-secondary rounded-lg transition-colors duration-200 cursor-pointer font-medium"
                  >
                    Sample {i + 1}
                  </motion.button>
                ))}
              </div>

              <motion.button
                onClick={onSubmit}
                disabled={loading || !value.trim()}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97 }}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg transition-shadow duration-200 cursor-pointer"
              >
                Process Enquiry
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      )}
    </motion.div>
  );
}
