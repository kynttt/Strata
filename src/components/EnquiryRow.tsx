import { motion } from "framer-motion";
import { TeamRecord } from "./TeamTabsPanel";

interface Props {
  record: TeamRecord;
  index: number;
  onClick: () => void;
}

function getInitials(name?: string) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function getStatus(record: TeamRecord) {
  if (record.error) return "error";
  if (record.flags.needs_review) return "needs_review";
  return "completed";
}

const STATUS_STYLES: Record<string, { label: string; dot: string; badge: string }> = {
  needs_review: {
    label: "Needs Review",
    dot: "bg-amber-500",
    badge: "bg-amber-500/15 text-amber-600 border-amber-200",
  },
  completed: {
    label: "Completed",
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/15 text-emerald-600 border-emerald-200",
  },
  error: {
    label: "Error",
    dot: "bg-red-500",
    badge: "bg-red-500/15 text-red-600 border-red-200",
  },
};

const TEAM_COLORS: Record<string, string> = {
  Sales: "bg-sky-500/15 text-sky-600 border-sky-200",
  "Technical Support": "bg-violet-500/15 text-violet-600 border-violet-200",
  Complaints: "bg-red-500/15 text-red-600 border-red-200",
  General: "bg-orange-500/15 text-orange-600 border-orange-200",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-emerald-500/15 text-emerald-600 border-emerald-200",
  medium: "bg-amber-500/15 text-amber-600 border-amber-200",
  high: "bg-red-500/15 text-red-600 border-red-200",
};

export default function EnquiryRow({ record, index, onClick }: Props) {
  const status = getStatus(record);
  const statusStyle = STATUS_STYLES[status];
  const dateStr = new Date(record.timestamp).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      onClick={onClick}
      className="group flex items-center gap-3 px-4 py-3 bg-card rounded-xl border border-border hover:border-primary/40 hover:shadow-sm transition-all duration-200 cursor-pointer"
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-accent">{getInitials(record.sender)}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-sm truncate ${record.sent ? "font-medium text-foreground/80" : "font-bold text-foreground"}`}>
            {record.sender || "Unknown Sender"}
          </span>
          {record.email && (
            <span className="text-xs text-muted-foreground truncate hidden sm:inline">
              {record.email}
            </span>
          )}
        </div>
        <p className={`text-sm truncate ${record.sent ? "text-foreground/60 font-normal" : "text-foreground font-semibold"}`}>
          {record.enquiry}
        </p>
      </div>

      {/* Meta */}
      <div className="hidden md:flex items-center gap-2 flex-shrink-0">
        {record.classification && (
          <div className="flex items-center gap-1.5">
            <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${record.classification.confidence * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground font-semibold tabular-nums">
              {Math.round(record.classification.confidence * 100)}%
            </span>
          </div>
        )}

        {record.routing && (
          <>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${TEAM_COLORS[record.routing.team] || "bg-muted text-muted-foreground border-border"}`}
            >
              {record.routing.team}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${PRIORITY_COLORS[record.routing.priority] || "bg-muted text-muted-foreground border-border"}`}
            >
              {record.routing.priority}
            </span>
          </>
        )}

      </div>

      {/* Status / Responded + Timestamp */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0 min-w-[80px]">
        {record.sent ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border bg-emerald-500/15 text-emerald-700 border-emerald-300 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Responded
          </span>
        ) : status !== "completed" ? (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusStyle.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
            {statusStyle.label}
          </span>
        ) : null}
        <span className="text-[10px] text-muted-foreground font-medium">{dateStr}</span>
      </div>
    </motion.div>
  );
}
