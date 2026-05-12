import React, { ReactNode } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

export default function Layout({ children }: Props) {
  const router = useRouter();
  const activeRoute = router.pathname;

  return (
    <div className="min-h-screen bg-background">
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" as const }}
        className="border-b border-border"
      >
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-wide" style={{ fontFamily: "Playfair Display, serif" }}>
              Strata Enquiry Processor
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={activeRoute === "/" ? "secondary" : "ghost"}
              onClick={() => router.push("/")}
              className="cursor-pointer"
            >
              Dashboard
            </Button>
            <Button
              variant={activeRoute === "/conversation" ? "secondary" : "ghost"}
              onClick={() => router.push("/conversation")}
              className="cursor-pointer"
            >
              Conversation
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/configure")}
              className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50"
            >
              Configure AI
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
