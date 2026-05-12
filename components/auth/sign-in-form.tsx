"use client";

import { FormEvent, useState } from "react";
import { KeyRound, Loader2, Mail } from "lucide-react";

export function SignInForm({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState("");
  const [adminLogin, setAdminLogin] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState(initialError || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

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

  async function submitAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSent(false);
    setIsAdminLoading(true);

    try {
      const response = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login: adminLogin.trim(),
          password: adminPassword,
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error || "Не получилось войти");
        return;
      }

      window.location.href = "/app";
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не получилось войти");
    } finally {
      setIsAdminLoading(false);
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={submit}>
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

        <button
          type="submit"
          disabled={isLoading}
          className="mt-5 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full bg-[#78F761] px-5 text-[16px] font-bold text-[#0A0A0A] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
          {isLoading ? "Отправляем ссылку" : "Получить ссылку"}
        </button>
      </form>

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

      {isAdminOpen ? (
        <form onSubmit={submitAdmin} className="mt-3 rounded-[24px] border border-white/6 bg-[#111111] p-4">
          <div className="grid gap-3">
            <input
              type="text"
              required
              value={adminLogin}
              onChange={(event) => setAdminLogin(event.target.value)}
              placeholder="Логин"
              className="min-h-[52px] w-full rounded-[18px] border border-white/6 bg-[#303030] px-4 text-[16px] text-white outline-none placeholder:text-white/25 focus:border-[#78F761]"
            />
            <input
              type="password"
              required
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              placeholder="Пароль"
              className="min-h-[52px] w-full rounded-[18px] border border-white/6 bg-[#303030] px-4 text-[16px] text-white outline-none placeholder:text-white/25 focus:border-[#78F761]"
            />
          </div>
          <button
            type="submit"
            disabled={isAdminLoading}
            className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#303030] px-5 text-[16px] font-bold text-white transition hover:bg-[#3D3D3D] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isAdminLoading ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
            {isAdminLoading ? "Входим" : "Войти по логину"}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError("");
            setIsSent(false);
            setIsAdminOpen(true);
          }}
          className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#303030] px-5 text-[16px] font-bold text-white transition hover:bg-[#3D3D3D]"
        >
          <KeyRound size={18} />
          Войти по логину
        </button>
      )}
    </div>
  );
}
