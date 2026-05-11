import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface Props {
  draft: string;
}

export default function ClarificationCard({ draft }: Props) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      className="bg-card rounded-xl border border-accent/40 shadow-md p-6 transition-all duration-200 hover:shadow-lg hover:border-accent/60"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
        <h3 className="text-sm font-semibold text-accent uppercase tracking-wide" style={{ fontFamily: "Playfair Display, serif" }}>Clarification Draft</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-4">The enquiry was vague or missing details. Send this follow-up to the client:</p>

      <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 max-h-72 overflow-y-auto mb-4">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{draft}</p>
      </div>

      <div className="flex gap-2 items-center">
        <motion.button
          type="button"
          onClick={handleCopy}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="px-4 py-2 text-sm font-medium bg-accent/20 text-accent hover:bg-accent/30 rounded-lg transition-colors duration-200 cursor-pointer flex items-center gap-2"
        >
          {copied ? (
            <>
              <motion.svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <path d="M20 6 9 17l-5-5" />
              </motion.svg>
              Copied!
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
              Copy to clipboard
            </>
          )}
        </motion.button>
        <span className="sr-only" aria-live="polite">
          {copied ? "Clarification draft copied to clipboard" : ""}
        </span>
      </div>
    </motion.div>
  );
}
