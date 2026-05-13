import React from "react";
import { motion } from "framer-motion";

export interface EnquiryItem {
  id: string;
  sender: string;
  email: string;
  subject: string;
  snippet: string;
  timestamp: string;
  read: boolean;
  starred: boolean;
  category?: "received" | "processed" | "flagged" | "archived";
  hasAttachment?: boolean;
  status?: "pending" | "processing" | "completed" | "error";
  classification?: { type: string; confidence: number; reasoning: string };
  routing?: { team: string; priority: string };
  response?: { draft: string; recommended_action: string };
  error?: string;
  responseRevealed?: boolean;
}

interface Props {
  items: EnquiryItem[];
  selectedIds?: string[];
  onSelect?: (id: string) => void;
  onSelectAll?: (ids: string[]) => void;
  onStar?: (id: string) => void;
  activeCategory?: string;
  onCategoryChange?: (category: string) => void;
  onProcess?: (ids: string[]) => void;
  processingIds?: string[];
  onRowClick?: (item: EnquiryItem) => void;
}

const CATEGORIES = [
  { key: "received", label: "Received", color: "bg-primary" },
  { key: "processed", label: "Processed", color: "bg-green-500" },
  { key: "flagged", label: "Flagged", color: "bg-orange-500" },
  { key: "archived", label: "Archived", color: "bg-gray-500" },
];

const TEAM_COLORS: Record<string, string> = {
  Sales: "bg-blue-500/15 text-blue-600 border-blue-200",
  "Technical Support": "bg-purple-500/15 text-purple-600 border-purple-200",
  Complaints: "bg-red-500/15 text-red-600 border-red-200",
  General: "bg-orange-500/15 text-orange-600 border-orange-200",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-green-500/15 text-green-600",
  medium: "bg-yellow-500/15 text-yellow-600",
  high: "bg-red-500/15 text-red-600",
};

export default function GmailInbox({
  items,
  selectedIds = [],
  onSelect,
  onSelectAll,
  onStar,
  activeCategory = "received",
  onCategoryChange,
  onProcess,
  processingIds = [],
  onRowClick,
}: Props) {
  const allSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-card rounded-xl border border-border shadow-md overflow-hidden flex flex-col"
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectAll?.(allSelected ? [] : items.map((i) => i.id))}
            className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
              allSelected ? "bg-primary/10" : "hover:bg-muted"
            }`}
            aria-label={allSelected ? "Deselect all" : "Select all"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={allSelected ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={allSelected ? "text-primary" : "text-muted-foreground"}
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
            </svg>
          </button>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors cursor-pointer"
            aria-label="Refresh"
          >
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
              className="text-muted-foreground"
            >
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
          </button>
        </div>
        <div className="h-5 w-px bg-border mx-1" />
        {selectedIds.length > 0 && (
          <>
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              type="button"
              onClick={() => onProcess?.(selectedIds)}
              disabled={processingIds.length > 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processingIds.length > 0 ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
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
                    width="14"
                    height="14"
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
              <span className="px-1.5 py-0.5 rounded-full bg-primary-foreground/20 text-[10px]">
                {processingIds.length > 0 ? processingIds.length : selectedIds.length}
              </span>
            </motion.button>
            <div className="h-5 w-px bg-border mx-1" />
          </>
        )}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors cursor-pointer"
            aria-label="More actions"
          >
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
              className="text-muted-foreground"
            >
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </button>
        </div>
        <div className="ml-auto text-xs text-muted-foreground font-medium">
          {items.length} enquiries
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-border">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          const count = items.filter((i) => i.category === cat.key).length;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => onCategoryChange?.(cat.key)}
              className={`relative flex-1 py-3 text-sm font-medium transition-colors cursor-pointer ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                {cat.label}
                {count > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      isActive
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </span>
              {isActive && (
                <motion.div
                  className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full"
                  layoutId="inboxActiveTab"
                  transition={{ duration: 0.25, ease: "easeOut" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Email Rows */}
      <div className="overflow-y-auto max-h-[500px]">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-foreground">No enquiries yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Client enquiries will appear here once processed.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {items.map((item, index) => {
              const isSelected = selectedIds.includes(item.id);
              const isUnread = !item.read;
              const isProcessing = processingIds.includes(item.id);
              return (
                <div key={item.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.03 }}
                    onClick={() => {
                      if (item.status === "completed" || item.status === "error") {
                        onRowClick?.(item);
                      }
                    }}
                    className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? "bg-primary/5"
                        : "hover:bg-muted/40 hover:shadow-sm"
                    } ${isUnread ? "bg-muted/20" : ""}`}
                  >
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect?.(item.id);
                      }}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
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

                    {/* Star */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStar?.(item.id);
                      }}
                      className="w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-muted"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill={item.starred ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`transition-colors ${
                          item.starred
                            ? "text-yellow-500"
                            : "text-muted-foreground group-hover:text-muted-foreground"
                        }`}
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>

                    {/* Sender Avatar */}
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-accent">
                        {item.sender
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex items-center gap-4">
                      <span
                        className={`text-sm flex-shrink-0 w-32 truncate ${
                          item.status === "completed" || item.status === "error"
                            ? "font-medium text-foreground/80"
                            : "font-bold text-foreground"
                        }`}
                      >
                        {item.sender}
                      </span>

                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span
                          className={`text-sm truncate ${
                            item.status === "completed" || item.status === "error"
                              ? "text-foreground/70 font-normal"
                              : "text-foreground font-semibold"
                          }`}
                        >
                          {item.subject}
                        </span>
                        <span className="text-sm text-muted-foreground truncate hidden sm:block">
                          — {item.snippet}
                        </span>
                      </div>

                      {/* Status badges */}
                      {isProcessing && (
                        <span className="flex items-center gap-1 text-xs text-primary font-medium flex-shrink-0">
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
                          Processing
                        </span>
                      )}

                      {item.status === "completed" && item.routing && (
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold border flex-shrink-0 ${TEAM_COLORS[item.routing.team] || "bg-emerald-500/10 text-emerald-600 border-emerald-200"}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 14h6v6H4z" />
                            <path d="M4 4h6v6H4z" />
                            <path d="M14 4h6v6h-6z" />
                            <path d="M14 14h6v6h-6z" />
                          </svg>
                          Routed to {item.routing.team}
                        </span>
                      )}

                      {item.status === "completed" && !item.routing && (
                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                          Done
                        </span>
                      )}

                      {item.status === "error" && (
                        <span className="flex items-center gap-1 text-xs text-destructive font-medium flex-shrink-0">
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
                            <circle cx="12" cy="12" r="10" />
                            <path d="m15 9-6 6" />
                            <path d="m9 9 6 6" />
                          </svg>
                          Error
                        </span>
                      )}

                      {/* Attachment indicator */}
                      {item.hasAttachment && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-muted-foreground flex-shrink-0"
                        >
                          <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        </svg>
                      )}
                    </div>

                    {/* Timestamp */}
                    <span
                      className={`text-xs flex-shrink-0 ${
                        item.status === "completed" || item.status === "error"
                          ? "text-muted-foreground"
                          : "font-bold text-primary"
                      }`}
                    >
                      {item.timestamp}
                    </span>
                  </motion.div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
