"use client";

import { useRouter } from "next/navigation";

import { PremiumLimitModal } from "@/components/premium/premium-limit-modal";

export function TrackLimitModal() {
  const router = useRouter();

  return <PremiumLimitModal variant="tracks" onClose={() => router.push("/app/tracks")} />;
}
