"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });

    router.push("/app");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="mt-6 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full bg-[#78F761] px-5 text-[16px] font-bold text-[#0A0A0A] transition hover:brightness-110 md:w-auto md:min-w-[220px]"
    >
      <LogOut size={18} />
      Выйти
    </button>
  );
}
