import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import EnquiryEntryCard from "./EnquiryEntryCard";
import EnquiryRow from "./EnquiryRow";
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
  manualResponse?: string;
  sender?: string;
  email?: string;
  conversationId?: string;
}

interface AIConfig {
  providerType: "openai" | "anthropic" | "google" | "ollama";
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

interface Props {
  teamHistory: Record<string, TeamRecord[]>;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSendResponse?: (recordId: string) => void;
  onSaveEdit?: (recordId: string, draft: string) => void;
  onSaveManualResponse?: (recordId: string, response: string) => void;
  onGenerateResponse?: (recordId: string, response: ResponseResult) => void;
  config?: AIConfig | null;
}

const TABS = ["Sales", "Technical Support", "Complaints", "General"];

export default function TeamTabsPanel({ teamHistory, activeTab, onTabChange, onSendResponse, onSaveEdit, onSaveManualResponse, onGenerateResponse, config }: Props) {
  const records = teamHistory[activeTab] || [];
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const selectedRecord = selectedRecordId ? records.find((r) => r.id === selectedRecordId) || null : null;

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
              <div className="space-y-3">
                {records.map((record, i) => (
                  <EnquiryRow
                    key={record.id}
                    record={record}
                    index={i}
                    onClick={() => setSelectedRecordId(record.id)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedRecord && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40"
              onClick={() => setSelectedRecordId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto pointer-events-auto">
                <EnquiryEntryCard
                  record={selectedRecord}
                  index={0}
                  config={config}
                  onSendResponse={(id) => {
                    onSendResponse?.(id);
                    setSelectedRecordId(null);
                  }}
                  onSaveEdit={onSaveEdit}
                  onSaveManualResponse={onSaveManualResponse}
                  onGenerateResponse={(id, response) => {
                    onGenerateResponse?.(id, response);
                  }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
