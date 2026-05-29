"use client";

import { Loader2, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UserDeleteButton({
  userId,
  userLabel,
}: {
  userId: string;
  userLabel: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  async function deleteUser() {
    setError("");
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error || "Не получилось удалить");
        return;
      }

      setIsOpen(false);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не получилось удалить");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={userId === "admin"}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#303030] text-[#838383] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Удалить пользователя"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
          <div className="w-full max-w-[560px] rounded-[28px] border border-white/10 bg-[#1E1E1E] p-6 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="heading-font text-[12px] uppercase text-[#78F761]">Admin</p>
                <h2 className="heading-font mt-4 text-[34px] leading-tight">Удалить пользователя?</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#303030] text-white"
                aria-label="Закрыть"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <p className="mt-5 text-[18px] leading-relaxed text-[#C9C9C9]">
              Профиль {userLabel}, парольный вход и все демки этого пользователя будут удалены из JSON
            </p>
            {error ? <p className="mt-4 rounded-[18px] border border-[#8A2B8F] bg-[#351736] p-4 text-[#FFD8FF]">{error}</p> : null}
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={deleteUser}
                disabled={isDeleting}
                className="inline-flex min-h-[54px] items-center justify-center rounded-full bg-[#303030] px-5 text-[18px] text-white transition hover:bg-[#3A3A3A] disabled:cursor-wait disabled:opacity-60"
              >
                {isDeleting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Удалить
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isDeleting}
                className="inline-flex min-h-[54px] items-center justify-center rounded-full bg-[#78F761] px-5 text-[18px] text-black transition hover:bg-[#8DFF79] disabled:opacity-60"
              >
                Оставить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
