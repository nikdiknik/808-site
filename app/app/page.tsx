import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import clsx from "clsx";

type FeatureTileData = {
  title: string;
  description: string;
  cta: string;
  icon: string;
  enabled: boolean;
  href?: string;
};

const featureTiles: FeatureTileData[] = [
  {
    title: "Трекер прогресса по демкам",
    description: "Следи за всеми треками в одном месте: что уже готово, где залип и что нужно доделать",
    cta: "Перейти в трекер",
    icon: "/assets/icon-tracker.svg",
    href: "#",
    enabled: true,
  },
  {
    title: "Творческий перезапуск",
    description:
      "Чувствуешь ступор? Ответь на несколько вопросов, а сервис подберёт методику, чтобы сдвинуть трек с места",
    cta: "Перезапуститься",
    icon: "/assets/icon-restart.svg",
    href: "/restart",
    enabled: true,
  },
  {
    title: "Карта скиллов",
    description: "Отслеживай, какие музыкальные навыки уже прокачаны, а какие ещё стоит подтянуть",
    cta: "Скоро будет доступно",
    icon: "/assets/icon-skills.svg",
    enabled: false,
  },
  {
    title: "Генератор идей",
    description:
      "Нет идей? Дадим точку старта. Настроение трека, слова, визуальные рефы и неожиданный совет: всё, чтобы легче начать писать новый шедевр",
    cta: "Скоро будет доступно",
    icon: "/assets/icon-ideas.svg",
    enabled: false,
  },
];

function FeatureTile({ tile, index }: { tile: FeatureTileData; index: number }) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex size-12 items-center justify-center rounded-[18px] bg-[#303030]">
          <Image src={tile.icon} alt="" width={24} height={24} />
        </div>
        <span className="heading-font text-[13px] text-[#78F761]">{String(index + 1).padStart(2, "0")}</span>
      </div>

      <div className="mt-7">
        <h2 className="heading-font text-[24px] leading-tight text-white md:text-[28px]">{tile.title}</h2>
        <p className="mt-4 min-h-[96px] text-[17px] leading-relaxed text-[#C9C9C9]">{tile.description}</p>
      </div>

      <div
        className={clsx(
          "mt-7 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full px-5 text-[16px] font-bold transition md:w-auto md:min-w-[210px]",
          tile.enabled
            ? "bg-[#78F761] text-[#0A0A0A] hover:brightness-110"
            : "cursor-not-allowed bg-[#303030] text-[#838383] opacity-40",
        )}
      >
        {tile.cta}
        {tile.enabled ? <ArrowRight size={18} /> : null}
      </div>
    </>
  );

  return tile.enabled && tile.href ? (
    <Link href={tile.href} className="block rounded-[28px] border border-white/6 bg-[#111111] p-5 md:p-6">
      {content}
    </Link>
  ) : (
    <article className="rounded-[28px] border border-white/6 bg-[#111111] p-5 md:p-6">{content}</article>
  );
}

export default function AppDashboardPage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="noise-layer pointer-events-none absolute inset-0 opacity-50" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1180px] flex-col py-3">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/app"
            className="flex items-center gap-3 rounded-full bg-[#1E1E1E] py-2 pl-2 pr-5 text-white transition hover:bg-[#303030]"
          >
            <span className="relative flex size-11 overflow-hidden rounded-full bg-[#0A0A0A]">
              <Image
                src="/assets/hero-smile.png"
                alt=""
                fill
                sizes="44px"
                className="translate-y-[2px] scale-[1.55] object-contain"
                priority
              />
            </span>
            <span className="heading-font text-[15px] uppercase text-[#78F761]">808 Демок</span>
          </Link>

          <button
            type="button"
            aria-label="Войти"
            className="flex size-12 items-center justify-center rounded-full bg-[#1E1E1E] transition hover:bg-[#303030] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78F761]"
          >
            <Image src="/assets/login.svg" alt="" width={24} height={24} />
          </button>
        </header>

        <section className="mt-10 rounded-[30px] border border-white/6 bg-[#111111]/92 p-5 shadow-2xl backdrop-blur md:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(240px,360px)] lg:items-stretch">
            <div className="min-w-0">
              <p className="heading-font inline-flex text-[12px] uppercase text-[#78F761]">Дэшборд</p>
              <h1 className="heading-font mt-5 w-full text-[34px] leading-[1.08] text-white sm:text-[48px] lg:text-[60px]">
                Привет! Что&nbsp;делаем с&nbsp;треком сегодня?
              </h1>
              <p className="mt-5 w-full text-[18px] leading-relaxed text-[#C9C9C9] md:text-[20px]">
                Нужен творческий перезапуск или будем вести прогресс по демкам?
              </p>
            </div>

            <div className="relative aspect-square w-full justify-self-end overflow-hidden rounded-[28px] bg-[#050505] lg:h-full lg:w-auto lg:min-w-[240px] lg:max-w-[360px]">
              <div className="absolute left-8 top-10 heading-font text-[96px] leading-none text-[#78F761] opacity-20 blur-[5px]">
                8
              </div>
              <div className="absolute bottom-8 right-6 heading-font text-[110px] leading-none text-[#D621D7] opacity-20 blur-[6px]">
                8
              </div>
              <Image
                src="/assets/hero-smile.png"
                alt="808 Демок"
                fill
                sizes="(min-width: 1024px) 360px, 100vw"
                className="scale-[1.18] object-contain"
                priority
              />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {featureTiles.map((tile, index) => (
            <FeatureTile key={tile.title} tile={tile} index={index} />
          ))}
        </section>
      </div>
    </main>
  );
}
