import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import ClassificationCard from "./ClassificationCard";
import RoutingCard from "./RoutingCard";
import ResponseCard from "./ResponseCard";
import ClarificationCard from "./ClarificationCard";
import { ClassificationResult } from "@/skills/classify-enquiry";
import { RoutingResult } from "@/skills/route-enquiry";
import { ResponseResult } from "@/skills/generate-response";

interface Props {
  classification?: ClassificationResult;
  routing?: RoutingResult;
  response?: ResponseResult;
  flags: { needs_review: boolean; reason: string | null };
  error?: string;
  responseError?: string;
  draft?: string | null;
  onRegenerate?: () => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, delay: i * 0.1, ease: "easeOut" as const },
  }),
};

const alertVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.2 } },
};

export default function ResultsPanel({ classification, routing, response, flags, error, responseError, draft, onRegenerate }: Props) {
  let delayIndex = 0;

  return (
    <div className="space-y-5">
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key="error"
            role="alert"
            aria-live="assertive"
            variants={alertVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="bg-destructive/10 border border-destructive/30 rounded-xl p-5 text-destructive text-sm flex items-start gap-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6" />
              <path d="m9 9 6 6" />
            </svg>
            <div>
              <p className="font-semibold">Error</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {flags.needs_review && (
          <motion.div
            key="review"
            role="alert"
            aria-live="polite"
            variants={alertVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="bg-accent/10 border border-accent/30 rounded-xl p-5 flex items-start gap-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
            <div>
              <h3 className="text-sm text-accent font-semibold">Needs Human Review</h3>
              <p className="text-xs text-accent/70 mt-1">{flags.reason}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {classification && (
          <motion.div
            key="classification"
            custom={delayIndex++}
            variants={cardVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
          >
            <ClassificationCard data={classification} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {routing && (
          <motion.div
            key="routing"
            custom={delayIndex++}
            variants={cardVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
          >
            <RoutingCard data={routing} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {responseError && !response && (
          <motion.div
            key="response-error"
            role="alert"
            variants={alertVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="bg-destructive/10 border border-destructive/30 rounded-xl p-5 text-destructive text-sm flex items-start gap-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6" />
              <path d="m9 9 6 6" />
            </svg>
            <div>
              <p className="font-semibold">Response generation failed</p>
              <p className="mt-0.5">{responseError}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {draft && (
          <motion.div
            key="draft"
            custom={delayIndex++}
            variants={cardVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
          >
            <ClarificationCard draft={draft} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {response && (
          <motion.div
            key="response"
            custom={delayIndex++}
            variants={cardVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
          >
            <ResponseCard data={response} onRegenerate={onRegenerate} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
