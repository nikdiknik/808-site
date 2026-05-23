"use client";

import { ExternalLink, Lock, X } from "lucide-react";
import { useState } from "react";

type PremiumLimitModalProps = {
  variant: "tracks" | "restarts";
  onClose: () => void;
};

const modalText = {
  tracks: {
    title: "Разблокируй больше демок",
  },
  restarts: {
    title: "Разблокируй больше перезапусков",
  },
};

const subtitle =
  "В Free доступна одна демка и базовые перезапуски. В благодарность за поддержку от 99 ₽ откроем Premium: больше демок и перезапусков";

const benefits = [
  "Несколько демок в трекере",
  "Больше перезапусков",
  "Расширенный набор методик",
  "Ранний доступ к генератору идей и карте скиллов",
];

export function PremiumLimitModal({ variant, onClose }: PremiumLimitModalProps) {
  const text = modalText[variant];
  const [step, setStep] = useState<"offer" | "vk">("offer");
  const title = step === "vk" ? "Как открыть Premium" : text.title;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="w-full max-w-[520px] rounded-[28px] border border-white/8 bg-[#1E1E1E] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="heading-font text-[12px] uppercase text-[#78F761]">Premium</p>
            <h2 className="heading-font mt-3 text-[26px] leading-tight text-white">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#303030] text-white"
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>
        {step === "offer" ? (
          <>
            <p className="mt-5 text-[17px] leading-relaxed text-[#C9C9C9]">{subtitle}</p>
            <ul className="mt-5 space-y-3 text-[16px] text-[#D8D8D8]">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex gap-3">
                  <span className="mt-2 size-2 shrink-0 rounded-full bg-[#78F761]" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={onClose}
                className="flex min-h-[54px] items-center justify-center rounded-full bg-[#303030] px-5 text-[16px] font-bold text-white transition hover:bg-[#3D3D3D]"
              >
                Пока не нужно
              </button>
              <button
                type="button"
                onClick={() => setStep("vk")}
                className="flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-[#78F761] px-5 text-[16px] font-normal text-[#0A0A0A] transition hover:brightness-110"
              >
                <Lock size={18} />
                Поддержать от 99 ₽
              </button>
            </div>
          </>
        ) : (
          <>
            <ol className="mt-5 space-y-3 text-[16px] text-[#D8D8D8]">
              {[
                "Перейди в сообщество 808 Демок в VK",
                "Отправь VK Donut от 99 ₽",
                "Premium откроется через некоторое время",
              ].map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="heading-font flex size-7 shrink-0 items-center justify-center rounded-full bg-[#303030] text-[12px] text-[#78F761]">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
            <a
              href="https://vk.com/demos_808"
              target="_blank"
              rel="noreferrer"
              className="mt-6 flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-[#78F761] px-5 text-[16px] font-normal text-[#0A0A0A] no-underline transition hover:brightness-110"
            >
              <ExternalLink size={18} />
              <span>Перейти в VK</span>
            </a>
          </>
        )}
      </div>
    </div>
  );
}
