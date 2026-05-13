import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ResponseResult } from "@/skills/generate-response";

interface Props {
  data: ResponseResult;
  onRegenerate?: () => void;
  onSendResponse?: () => void;
  sent?: boolean;
  senderName?: string;
}

function personalizeDraft(draft: string, senderName?: string) {
  if (senderName) {
    return draft.replace(/\[Name\]/g, senderName);
  }
  return draft.replace(/Dear\s+\[Name\],?/gi, "Hello,").replace(/\[Name\]/g, "there");
}

export default function ResponseCard({ data, onRegenerate, onSendResponse, sent = false, senderName }: Props) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const displayDraft = personalizeDraft(data.draft, senderName);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayDraft);
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      className="bg-card rounded-xl border border-border shadow-md p-6 transition-all duration-200 hover:shadow-lg hover:border-primary/30"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide" style={{ fontFamily: "Playfair Display, serif" }}>Suggested Response</h3>
      </div>

      <div className="bg-muted/50 border border-border rounded-xl p-4 max-h-72 overflow-y-auto mb-4">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{displayDraft}</p>
      </div>

      <div className="flex items-start gap-2 mb-5 bg-secondary/10 border border-secondary/20 rounded-lg p-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary mt-0.5 flex-shrink-0">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <div>
          <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-0.5">Recommended Action</p>
          <p className="text-sm text-foreground">{data.recommended_action}</p>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        {onSendResponse ? (
          <motion.button
            type="button"
            onClick={onSendResponse}
            disabled={sent}
            whileHover={sent ? {} : { scale: 1.03 }}
            whileTap={sent ? {} : { scale: 0.97 }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 ${
              sent
                ? "bg-muted text-muted-foreground border border-border"
                : "bg-primary text-primary-foreground hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            }`}
          >
            <AnimatePresence mode="wait">
              {sent ? (
                <motion.span
                  key="sent"
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Sent
                </motion.span>
              ) : (
                <motion.span
                  key="send"
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m22 2-7 20-4-9-9-4 20-7z" />
                  </svg>
                  Send Response
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        ) : (
          <motion.button
            type="button"
            onClick={handleCopy}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer flex items-center gap-2"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span
                  key="copied"
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Copied!
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                  Copy
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )}
        <span className="sr-only" aria-live="polite">
          {copied ? "Response copied to clipboard" : ""}
        </span>
        {onRegenerate && (
          <motion.button
            type="button"
            onClick={onRegenerate}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="px-4 py-2 text-sm font-medium bg-secondary/20 text-secondary hover:bg-secondary/30 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
            Regenerate
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
