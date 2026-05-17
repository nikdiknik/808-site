"use client";

import { FormEvent, useState } from "react";
import { KeyRound, Loader2, Mail } from "lucide-react";

export function SignInForm({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [registerLogin, setRegisterLogin] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerPasswordAgain, setRegisterPasswordAgain] = useState("");
  const [error, setError] = useState(initialError || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [passwordMode, setPasswordMode] = useState<"login" | "register">("login");

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

  async function submitPasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSent(false);
    setIsPasswordLoading(true);

    try {
      const response = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login: login.trim(),
          password,
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
      setIsPasswordLoading(false);
    }
  }

  async function submitRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSent(false);
    setIsRegisterLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login: registerLogin.trim(),
          email: registerEmail.trim(),
          password: registerPassword,
          passwordAgain: registerPasswordAgain,
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error || "Не получилось зарегистрироваться");
        return;
      }

      window.location.href = "/app";
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не получилось зарегистрироваться");
    } finally {
      setIsRegisterLoading(false);
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
          {isLoading ? "Отправляем ссылку" : "Войти по email"}
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

      {isPasswordOpen ? (
        <div className="mt-3 rounded-[24px] border border-white/6 bg-[#111111] p-4">
          {passwordMode === "login" ? (
            <form onSubmit={submitPasswordLogin}>
              <div className="grid gap-3">
                <input
                  type="text"
                  required
                  value={login}
                  onChange={(event) => setLogin(event.target.value)}
                  placeholder="Логин или email"
                  className="min-h-[52px] w-full rounded-[18px] border border-white/6 bg-[#303030] px-4 text-[16px] text-white outline-none placeholder:text-white/25 focus:border-[#78F761]"
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Пароль"
                  className="min-h-[52px] w-full rounded-[18px] border border-white/6 bg-[#303030] px-4 text-[16px] text-white outline-none placeholder:text-white/25 focus:border-[#78F761]"
                />
              </div>
              <button
                type="submit"
                disabled={isPasswordLoading}
                className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#303030] px-5 text-[16px] font-bold text-white transition hover:bg-[#3D3D3D] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isPasswordLoading ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
                {isPasswordLoading ? "Входим" : "Войти по логину"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setPasswordMode("register");
                }}
                className="mt-3 flex min-h-[52px] w-full items-center justify-center rounded-full bg-[#303030] px-5 text-[16px] font-bold text-white transition hover:bg-[#3D3D3D]"
              >
                Зарегистрироваться
              </button>
            </form>
          ) : (
            <form onSubmit={submitRegister}>
              <div className="grid gap-3">
                <input
                  type="text"
                  required
                  value={registerLogin}
                  onChange={(event) => setRegisterLogin(event.target.value)}
                  placeholder="Логин"
                  className="min-h-[52px] w-full rounded-[18px] border border-white/6 bg-[#303030] px-4 text-[16px] text-white outline-none placeholder:text-white/25 focus:border-[#78F761]"
                />
                <input
                  type="email"
                  required
                  value={registerEmail}
                  onChange={(event) => setRegisterEmail(event.target.value)}
                  placeholder="Email"
                  className="min-h-[52px] w-full rounded-[18px] border border-white/6 bg-[#303030] px-4 text-[16px] text-white outline-none placeholder:text-white/25 focus:border-[#78F761]"
                />
                <input
                  type="password"
                  required
                  value={registerPassword}
                  onChange={(event) => setRegisterPassword(event.target.value)}
                  placeholder="Пароль"
                  className="min-h-[52px] w-full rounded-[18px] border border-white/6 bg-[#303030] px-4 text-[16px] text-white outline-none placeholder:text-white/25 focus:border-[#78F761]"
                />
                <input
                  type="password"
                  required
                  value={registerPasswordAgain}
                  onChange={(event) => setRegisterPasswordAgain(event.target.value)}
                  placeholder="Пароль ещё раз"
                  className="min-h-[52px] w-full rounded-[18px] border border-white/6 bg-[#303030] px-4 text-[16px] text-white outline-none placeholder:text-white/25 focus:border-[#78F761]"
                />
              </div>
              <button
                type="submit"
                disabled={isRegisterLoading}
                className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#78F761] px-5 text-[16px] font-bold text-[#0A0A0A] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isRegisterLoading ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
                {isRegisterLoading ? "Регистрируем" : "Зарегистрироваться"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setPasswordMode("login");
                }}
                className="mt-3 flex min-h-[52px] w-full items-center justify-center rounded-full bg-[#303030] px-5 text-[16px] font-bold text-white transition hover:bg-[#3D3D3D]"
              >
                Назад ко входу
              </button>
            </form>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError("");
            setIsSent(false);
            setIsPasswordOpen(true);
            setPasswordMode("login");
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
