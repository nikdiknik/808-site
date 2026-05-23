"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PremiumToggle({ userId, initialValue }: { userId: string; initialValue: boolean }) {
  const router = useRouter();
  const [isPremium, setIsPremium] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function togglePremium() {
    const nextValue = !isPremium;
    setError("");
    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/premium`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPremium: nextValue }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error || "Не получилось обновить");
        return;
      }

      setIsPremium(nextValue);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не получилось обновить");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={togglePremium}
        disabled={isSaving}
        aria-pressed={isPremium}
        className={`relative h-6 w-[48px] rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50 ${
          isPremium ? "border-[#78F761]/60 bg-[#78F761]/20" : "border-white/10 bg-[#303030]"
        }`}
      >
        <span
          className={`absolute top-[3px] h-[18px] w-[18px] rounded-full transition ${
            isPremium ? "left-[25px] bg-[#78F761]" : "left-[3px] bg-[#838383]"
          }`}
        />
        <span className="sr-only">{isPremium ? "Выключить Premium" : "Включить Premium"}</span>
      </button>
      {error ? <span className="max-w-[120px] text-[12px] text-[#FFD8FF]">{error}</span> : null}
    </div>
  );
}
