"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Keeps Now/Next accurate without a manual refresh — re-renders the server component roughly once a minute. */
export function LiveRefresher() {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(id);
  }, [router]);
  return null;
}
