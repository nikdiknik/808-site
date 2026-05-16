"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useState } from "react";

import { PremiumLimitModal } from "@/components/premium/premium-limit-modal";

type AddDemoButtonProps = {
  canCreate: boolean;
  className?: string;
};

export function AddDemoButton({ canCreate, className }: AddDemoButtonProps) {
  const [premiumOpen, setPremiumOpen] = useState(false);

  if (canCreate) {
    return (
      <Link href="/app/tracks/new" className={className}>
        <Plus size={18} />
        Добавить демку
      </Link>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setPremiumOpen(true)} className={className}>
        <Plus size={18} />
        Добавить демку
      </button>
      {premiumOpen ? <PremiumLimitModal variant="tracks" onClose={() => setPremiumOpen(false)} /> : null}
    </>
  );
}
