"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RealtimeBills() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // 1. Subscribe to ANY change in the 'individual_bills' table
    const channel = supabase
      .channel("realtime-bills")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "individual_bills" },
        (payload) => {
          console.log("Change detected!", payload);
          // 2. Refresh the current route to fetch the new data
          router.refresh();
        }
      )
      .subscribe();

    // Cleanup when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  return null; // This component renders nothing visible
}
