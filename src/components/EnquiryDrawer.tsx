import { motion, AnimatePresence } from "framer-motion";
import { EnquiryItem } from "./GmailInbox";

interface Props {
  item: EnquiryItem | null;
  onClose: () => void;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; border: string; icon: string }> = {
  new_client: { label: "New Client", color: "text-sky-600 bg-sky-500/10", border: "border-sky-200", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" },
  support_request: { label: "Support", color: "text-violet-600 bg-violet-500/10", border: "border-violet-200", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4" },
  complaint: { label: "Complaint", color: "text-red-600 bg-red-500/10", border: "border-red-200", icon: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01" },
  general_question: { label: "General", color: "text-emerald-600 bg-emerald-500/10", border: "border-emerald-200", icon: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3 M12 17h.01" },
  needs_clarification: { label: "Needs Clarification", color: "text-amber-600 bg-amber-500/10", border: "border-amber-200", icon: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M8 15h8 M9 9h.01 M15 9h.01" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; border: string }> = {
  low: { label: "Low Priority", color: "text-emerald-600 bg-emerald-500/10", border: "border-emerald-200" },
  medium: { label: "Medium", color: "text-amber-600 bg-amber-500/10", border: "border-amber-200" },
  high: { label: "High Priority", color: "text-red-600 bg-red-500/10", border: "border-red-200" },
};

function StatusBadge({ status }: { status?: string }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-200/60">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        Completed
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-500/15 text-red-600 border border-red-200/60">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="m15 9-6 6" />
          <path d="m9 9 6 6" />
        </svg>
        Failed
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-primary/15 text-primary border border-primary/20">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        Processing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border">
      Pending
    </span>
  );
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
          <path d={icon} />
        </svg>
      </div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{children}</p>
    </div>
  );
}

function useMatchingTeamRecord(item: EnquiryItem | null) {
  if (!item) return null;
  try {
    const stored = localStorage.getItem("teamHistory");
    if (!stored) return null;
    const history = JSON.parse(stored) as Record<string, Array<{ enquiry: string; sender?: string; email?: string; response?: { draft: string }; sent?: boolean }>>;
    for (const team of Object.keys(history)) {
      const match = history[team].find(
        (r) =>
          r.enquiry === item.snippet &&
          (r.sender === item.sender || r.email === item.email)
      );
      if (match && match.sent && match.response?.draft) return match.response.draft;
    }
  } catch {
    // ignore lookup errors
  }
  return null;
}

export default function EnquiryDrawer({ item, onClose }: Props) {
  const open = !!item;
  const sentResponse = useMatchingTeamRecord(item);

  return (
    <AnimatePresence>
      {open && item && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed top-0 right-0 h-full w-full max-w-lg bg-background border-l border-border shadow-2xl z-50 overflow-y-auto"
          >
            {/* Header band */}
            <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                    <path d="M16 13H8" />
                    <path d="M16 17H8" />
                    <path d="M10 9H8" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground tracking-tight">Enquiry Details</h2>
                  <p className="text-[11px] text-muted-foreground font-medium">ID: {item.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors cursor-pointer"
                aria-label="Close drawer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Status */}
              <div className="flex items-center justify-between">
                <StatusBadge status={item.status} />
                <span className="text-xs text-muted-foreground font-medium tabular-nums">{item.timestamp}</span>
              </div>

              {/* Sender Card */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <SectionTitle icon="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z">Sender</SectionTitle>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent/30 to-accent/60 flex items-center justify-center flex-shrink-0 shadow-inner">
                    <span className="text-sm font-black text-accent-foreground tracking-tight">
                      {item.sender.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-foreground truncate">{item.sender}</p>
                    <p className="text-sm text-muted-foreground font-medium truncate">{item.email}</p>
                  </div>
                </div>
              </div>

              {/* Message Content */}
              <div>
                <SectionTitle icon="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z">Message Content</SectionTitle>
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Subject</p>
                    <p className="text-sm font-bold text-foreground leading-snug">{item.subject}</p>
                  </div>
                  <div className="h-px bg-border" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Body</p>
                    <p className="text-sm text-foreground/80 leading-relaxed">{item.snippet}</p>
                  </div>

                  {sentResponse && (
                    <>
                      <div className="h-px bg-border" />
                      <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                            <path d="M4 14h6v6H4z" />
                            <path d="M4 4h6v6H4z" />
                            <path d="M14 4h6v6h-6z" />
                            <path d="M14 14h6v6h-6z" />
                          </svg>
                          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">Sent Response</p>
                        </div>
                        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{sentResponse}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* AI Processing Results */}
              {(item.classification || item.routing) && (
                <div>
                  <SectionTitle icon="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4">AI Processing Results</SectionTitle>

                  <div className="space-y-4">
                    {/* Classification */}
                    {item.classification && (
                      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-foreground">Classification</span>
                          {(() => {
                            const cfg = TYPE_CONFIG[item.classification.type];
                            return (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${cfg ? `${cfg.color} ${cfg.border}` : "bg-muted text-muted-foreground border-border"}`}>
                                {cfg && (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d={cfg.icon} />
                                  </svg>
                                )}
                                {(cfg?.label || item.classification.type).replace(/_/g, " ")}
                              </span>
                            );
                          })()}
                        </div>

                        {/* Confidence */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">Confidence Score</span>
                            <span className="text-xl font-black text-primary tabular-nums tracking-tight">
                              {Math.round(item.classification.confidence * 100)}%
                            </span>
                          </div>

                          <div className="relative w-full h-6 bg-muted rounded-full overflow-hidden shadow-inner border border-border/40">
                            <motion.div
                              key={`bar-${item.id}`}
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: 1 }}
                              transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
                              style={{
                                originX: 0,
                                width: `${Math.max(item.classification.confidence * 100, 3)}%`,
                              }}
                              className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-primary via-primary to-emerald-400"
                            />
                            {/* Percentage inside bar */}
                            <div className="absolute inset-0 flex items-center justify-end px-3 pointer-events-none">
                              <span className="text-[11px] font-bold text-white/90 drop-shadow tabular-nums">
                                {Math.round(item.classification.confidence * 100)}%
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-between text-[10px] text-muted-foreground font-semibold tabular-nums px-1">
                            <span>0%</span>
                            <span>25%</span>
                            <span>50%</span>
                            <span>75%</span>
                            <span>100%</span>
                          </div>
                        </div>

                        {item.classification.reasoning && (
                          <div className="bg-muted/40 border border-border/60 rounded-xl p-3.5">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Reasoning</p>
                            <p className="text-sm text-foreground/80 leading-relaxed">{item.classification.reasoning}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Routing */}
                    {item.routing && (
                      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm font-bold text-foreground">Routing Decision</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-muted/40 border border-border/60 rounded-xl p-3.5">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Assigned Team</p>
                            {(() => {
                              const cfg = TYPE_CONFIG[item.routing.team];
                              return (
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border ${cfg ? `${cfg.color} ${cfg.border}` : "bg-muted text-muted-foreground border-border"}`}>
                                  {cfg && (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <path d={cfg.icon} />
                                    </svg>
                                  )}
                                  {item.routing.team}
                                </span>
                              );
                            })()}
                          </div>
                          <div className="bg-muted/40 border border-border/60 rounded-xl p-3.5">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Priority</p>
                            {(() => {
                              const cfg = PRIORITY_CONFIG[item.routing.priority];
                              return (
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border ${cfg ? `${cfg.color} ${cfg.border}` : "bg-muted text-muted-foreground border-border"}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    item.routing.priority === "high" ? "bg-red-500" :
                                    item.routing.priority === "medium" ? "bg-amber-500" : "bg-emerald-500"
                                  }`} />
                                  {(cfg?.label || item.routing.priority).replace(/_/g, " ")}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error */}
              {item.status === "error" && item.error && (
                <div className="bg-red-500/8 border border-red-500/25 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m15 9-6 6" />
                        <path d="m9 9 6 6" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-red-600 mb-1">Processing Error</p>
                      <p className="text-sm text-red-500/80 leading-relaxed">{item.error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
