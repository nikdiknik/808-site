"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import { SignInCloseButton } from "@/components/auth/sign-in-close-button";
import { SignInForm, type AuthMode } from "@/components/auth/sign-in-form";

export function SignInPanel({
  initialError,
  modal,
}: {
  initialError?: string;
  modal?: boolean;
}) {
  const [authMode, setAuthMode] = useState<AuthMode>("email");
  const isEmailMode = authMode === "email";
  const subtitle =
    authMode === "register"
      ? "Создай аккаунт: email, никнейм и пароль"
      : authMode === "password"
        ? "Введи email и пароль, чтобы войти без письма"
        : "Введи email — мы пришлём ссылку для входа";

  return (
    <section className="relative w-full max-w-[480px] rounded-[30px] border border-white/6 bg-[#1E1E1E] p-5 shadow-2xl md:p-6">
      {modal ? (
        <SignInCloseButton />
      ) : null}

      <div className="flex items-center gap-3">
        {!isEmailMode ? (
          <button
            type="button"
            onClick={() => setAuthMode("email")}
            className="inline-flex items-center text-[#78F761] transition hover:text-white"
            aria-label="Назад ко входу по email"
          >
            <ArrowLeft size={24} />
          </button>
        ) : null}
        <p className="heading-font text-[12px] uppercase text-[#78F761]">auth</p>
      </div>
      <h1 className="heading-font mt-5 pr-10 text-[30px] leading-tight text-white">Войти в 808 Демок</h1>
      <p className="mt-4 text-[17px] leading-relaxed text-[#C9C9C9]">{subtitle}</p>

      <div className="mt-6">
        <SignInForm initialError={initialError} authMode={authMode} onAuthModeChange={setAuthMode} />
      </div>
    </section>
  );
}
