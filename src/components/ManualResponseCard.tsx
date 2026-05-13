import { useState } from "react";
import { motion } from "framer-motion";

interface Props {
  recordId: string;
  enquiry: string;
  existingResponse?: string;
  onSave?: (recordId: string, response: string) => void;
}

export default function ManualResponseCard({ recordId, enquiry, existingResponse, onSave }: Props) {
  const [text, setText] = useState(existingResponse || "");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!text.trim() || !onSave) return;
    onSave(recordId, text.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <motion.div
      className="bg-accent/5 rounded-xl border border-accent/20 shadow-sm p-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
        <h3 className="text-sm font-semibold text-accent uppercase tracking-wide">Needs Clarification</h3>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        This enquiry is unclear or missing details. Write a manual response for the client:
      </p>

      <div className="bg-muted/40 border border-border rounded-lg p-3 mb-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Original Enquiry</p>
        <p className="text-sm text-foreground truncate">{enquiry}</p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your response asking the client for clarification..."
        className="w-full min-h-[100px] bg-card border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 resize-y mb-3"
      />

      <div className="flex items-center gap-3">
        <motion.button
          type="button"
          onClick={handleSave}
          disabled={!text.trim() || saved}
          whileHover={saved ? {} : { scale: 1.03 }}
          whileTap={saved ? {} : { scale: 0.97 }}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2 ${
            saved
              ? "bg-green-500/15 text-green-600 border border-green-500/30"
              : "bg-accent text-accent-foreground hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          }`}
        >
          {saved ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Saved
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Save Response
            </>
          )}
        </motion.button>

        {existingResponse && !saved && (
          <span className="text-xs text-muted-foreground">Previously saved response loaded</span>
        )}
      </div>
    </motion.div>
  );
}
