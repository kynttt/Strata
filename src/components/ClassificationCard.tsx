import React from "react";
import { motion } from "framer-motion";
import { ClassificationResult } from "@/skills/classify-enquiry";

const TYPE_COLORS: Record<ClassificationResult["type"], string> = {
  new_client: "bg-secondary/20 text-secondary border-secondary/30",
  support_request: "bg-sky-900/30 text-sky-300 border-sky-800/40",
  complaint: "bg-destructive/20 text-destructive border-destructive/30",
  general_question: "bg-violet-900/30 text-violet-300 border-violet-800/40",
  needs_clarification: "bg-accent/20 text-accent border-accent/30",
};

const TYPE_ICONS: Record<ClassificationResult["type"], string> = {
  new_client: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  support_request: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  complaint: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  general_question: "M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z",
  needs_clarification: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
};

interface Props {
  data: ClassificationResult;
}

export default function ClassificationCard({ data }: Props) {
  return (
    <motion.div
      className="bg-card rounded-xl border border-border shadow-md p-6 transition-all duration-200 hover:shadow-lg hover:border-primary/30"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
          <path d={TYPE_ICONS[data.type]} />
        </svg>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide" style={{ fontFamily: "Playfair Display, serif" }}>Classification</h3>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${TYPE_COLORS[data.type] || "bg-muted text-muted-foreground border-border"}`}>
          {data.type.replace(/_/g, " ")}
        </span>
        <span className="text-sm font-medium text-foreground">Confidence: {(data.confidence * 100).toFixed(0)}%</span>
      </div>

      <div
        className="w-full bg-muted rounded-full h-2 mb-4"
        role="progressbar"
        aria-valuenow={Math.round(data.confidence * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Confidence: ${(data.confidence * 100).toFixed(0)}%`}
      >
        <motion.div
          className={`h-2 rounded-full ${data.confidence >= 0.7 ? "bg-primary" : "bg-accent"}`}
          initial={{ width: 0 }}
          animate={{ width: `${data.confidence * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      <p className="text-sm text-foreground leading-relaxed">{data.reasoning}</p>
    </motion.div>
  );
}
