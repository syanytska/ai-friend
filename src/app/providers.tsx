"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import type { Session } from "next-auth";

export function Providers({ children, session }: { children: React.ReactNode; session?: Session | null }) {
  // Log when the providers mount so we can confirm the provider renders.
  useEffect(() => {
    // This log helps diagnose whether the client provider actually mounts.
    console.log("Providers mounted");
  }, []);

  // Pass the server session into the client SessionProvider so the context is initialized
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
