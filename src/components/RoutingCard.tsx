import React from "react";
import { motion } from "framer-motion";
import { RoutingResult } from "@/skills/route-enquiry";

const PRIORITY_COLORS: Record<RoutingResult["priority"], string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-accent/20 text-accent border-accent/30",
  high: "bg-destructive/20 text-destructive border-destructive/30",
};

const PRIORITY_DOTS: Record<RoutingResult["priority"], string> = {
  low: "bg-muted-foreground",
  medium: "bg-accent",
  high: "bg-destructive",
};

interface Props {
  data: RoutingResult;
}

export default function RoutingCard({ data }: Props) {
  return (
    <motion.div
      className="bg-card rounded-xl border border-border shadow-md p-6 transition-all duration-200 hover:shadow-lg hover:border-primary/30"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide" style={{ fontFamily: "Playfair Display, serif" }}>Routing</h3>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{data.team} Team</p>
            <p className="text-xs text-muted-foreground">Assigned automatically</p>
          </div>
        </div>

        <motion.span
          className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${PRIORITY_COLORS[data.priority] || "bg-muted text-muted-foreground border-border"}`}
          whileHover={{ scale: 1.05 }}
        >
          <motion.span
            className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOTS[data.priority] || "bg-muted-foreground"}`}
            animate={data.priority === "high" ? { scale: [1, 1.3, 1], opacity: [1, 0.7, 1] } : {}}
            transition={data.priority === "high" ? { duration: 2, repeat: Infinity, ease: "easeInOut" as const } : {}}
          />
          {data.priority} priority
        </motion.span>
      </div>
    </motion.div>
  );
}
