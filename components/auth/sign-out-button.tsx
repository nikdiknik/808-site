"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export function SignOutButton({ variant = "primary" }: { variant?: "primary" | "secondary" }) {
  const router = useRouter();
  const className =
    variant === "secondary"
      ? "flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full bg-[#303030] px-5 text-[16px] font-bold text-white transition hover:bg-[#3D3D3D] md:w-auto md:min-w-[220px]"
      : "flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full bg-[#78F761] px-5 text-[16px] font-bold text-[#0A0A0A] transition hover:brightness-110 md:w-auto md:min-w-[220px]";

  async function signOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });

    router.push("/app");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className={className}
    >
      <Image src="/assets/logout.svg" alt="" width={22} height={22} />
      Выйти
    </button>
  );
}
