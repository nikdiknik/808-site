"use client";

import { FormEvent, useState } from "react";
import { Loader2, Mail } from "lucide-react";

export function SignInForm({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(initialError || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSent(false);

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error || "Не получилось отправить ссылку");
        return;
      }

      setIsSent(true);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не получилось отправить ссылку");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full">
      <label className="block">
        <span className="heading-font text-[12px] uppercase text-[#78F761]">email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@email.com"
          className="mt-3 min-h-[56px] w-full rounded-[18px] border border-white/6 bg-[#303030] px-4 text-[17px] text-white outline-none placeholder:text-white/25 focus:border-[#78F761]"
        />
      </label>

      {error ? (
        <p className="mt-4 rounded-[18px] border border-[#D621D7]/30 bg-[#D621D7]/10 p-4 text-[15px] leading-relaxed text-[#FFD8FF]">
          {error}
        </p>
      ) : null}

      {isSent ? (
        <p className="mt-4 rounded-[18px] border border-[#78F761]/25 bg-[#78F761]/10 p-4 text-[15px] leading-relaxed text-[#D8D8D8]">
          Ссылка отправлена. Проверь почту
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="mt-5 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full bg-[#78F761] px-5 text-[16px] font-bold text-[#0A0A0A] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
        {isLoading ? "Отправляем ссылку" : "Получить ссылку"}
      </button>
    </form>
  );
}
