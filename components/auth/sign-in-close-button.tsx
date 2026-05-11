"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";

export function SignInCloseButton() {
  const router = useRouter();

  function closeModal() {
    router.back();

    window.setTimeout(() => {
      router.replace("/app");
    }, 120);
  }

  return (
    <button
      type="button"
      aria-label="Закрыть"
      onClick={closeModal}
      className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-[#303030] text-white transition hover:bg-[#3D3D3D]"
    >
      <X size={20} />
    </button>
  );
}
