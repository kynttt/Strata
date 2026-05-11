import { motion, AnimatePresence } from "framer-motion";
import ClassificationCard from "./ClassificationCard";
import RoutingCard from "./RoutingCard";
import ResponseCard from "./ResponseCard";
import ClarificationCard from "./ClarificationCard";
import { ClassificationResult } from "@/skills/classify-enquiry";
import { RoutingResult } from "@/skills/route-enquiry";
import { ResponseResult } from "@/skills/generate-response";

export interface TeamRecord {
  id: string;
  timestamp: number;
  enquiry: string;
  classification?: ClassificationResult;
  routing?: RoutingResult;
  response?: ResponseResult;
  flags: { needs_review: boolean; reason: string | null };
  error?: string;
  routingError?: string;
  responseError?: string;
  draft?: string | null;
  sent?: boolean;
}

interface Props {
  teamHistory: Record<string, TeamRecord[]>;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSendResponse?: (recordId: string) => void;
}

const TABS = ["Sales", "Technical Support", "Complaints", "General", "Unassigned"];

export default function TeamTabsPanel({ teamHistory, activeTab, onTabChange, onSendResponse }: Props) {
  const records = teamHistory[activeTab] || [];

  return (
    <motion.div
      className="bg-card rounded-xl border border-border shadow-md overflow-hidden flex flex-col"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay: 0.18, ease: "easeOut" as const }}
    >
      <div className="flex border-b border-border">
        {TABS.map((tab) => {
          const count = (teamHistory[tab] || []).length;
          const isActive = activeTab === tab;
          return (
            <motion.button
              key={tab}
              onClick={() => onTabChange(tab)}
              whileTap={{ scale: 0.98 }}
              className={`relative flex-1 py-3 text-sm font-medium transition-colors cursor-pointer ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                {tab}
                {count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary/20 text-primary font-semibold">
                    {count}
                  </span>
                )}
              </span>
              {isActive && (
                <motion.div
                  className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"
                  layoutId="activeTab"
                  transition={{ duration: 0.25, ease: "easeOut" as const }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="p-4 overflow-y-auto max-h-[calc(100vh-14rem)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" as const }}
            className="space-y-5"
          >
            {records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <motion.div
                  className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </motion.div>
                <p className="text-sm font-semibold text-foreground">No enquiries yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">Process a client enquiry to see it routed here.</p>
              </div>
            ) : (
              records.map((record, i) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.06, ease: "easeOut" as const }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                    <span className="font-medium">{new Date(record.timestamp).toLocaleString()}</span>
                    <span className="text-border">•</span>
                    <span className="truncate max-w-xs">{record.enquiry}</span>
                  </div>

                  {record.classification && <ClassificationCard data={record.classification} />}
                  {record.routing && <RoutingCard data={record.routing} />}

                  {record.responseError && !record.response && (
                    <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-destructive text-sm flex items-start gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m15 9-6 6" />
                        <path d="m9 9 6 6" />
                      </svg>
                      <div>
                        <p className="font-semibold">Response generation failed</p>
                        <p className="mt-0.5">{record.responseError}</p>
                      </div>
                    </div>
                  )}

                  {record.draft && <ClarificationCard draft={record.draft} />}
                  {record.response && (
                    <ResponseCard
                      data={record.response}
                      sent={record.sent}
                      onSendResponse={onSendResponse ? () => onSendResponse(record.id) : undefined}
                    />
                  )}

                  {record.error && (
                    <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-destructive text-sm flex items-start gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m15 9-6 6" />
                        <path d="m9 9 6 6" />
                      </svg>
                      <div>
                        <p className="font-semibold">Error</p>
                        <p className="mt-0.5">{record.error}</p>
                      </div>
                    </div>
                  )}

                  {i < records.length - 1 && (
                    <div className="border-b border-border/50 my-2" />
                  )}
                </motion.div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
