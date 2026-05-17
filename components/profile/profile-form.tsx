"use client";

import { FormEvent, ReactNode, useState } from "react";
import Image from "next/image";
import { Check, Loader2 } from "lucide-react";

import { experienceLabels, experienceOptions } from "@/lib/options";
import { dawOptions, genreOptions, roleOptions } from "@/lib/profile-options";
import type { UserProfile } from "@/lib/users";

type ProfileFormProps = {
  profile: UserProfile;
  isAdmin?: boolean;
  actions?: ReactNode;
};

function formatDate(value: string) {
  if (!value) return "Не заполнено";
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ReadOnlyCard({ label, value }: { label: string; value: string | number | boolean }) {
  return (
    <section className="rounded-[22px] bg-[#1E1E1E] p-4">
      <p className="heading-font text-[12px] uppercase text-[#78F761]">{label}</p>
      <p className="mt-3 break-all text-[17px] leading-relaxed text-[#D8D8D8]">{String(value)}</p>
    </section>
  );
}

function TagButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[42px] rounded-full px-4 text-[15px] font-bold transition ${
        selected ? "bg-[#78F761] text-[#0A0A0A]" : "bg-[#303030] text-[#D8D8D8] hover:bg-[#3D3D3D]"
      }`}
    >
      {label}
    </button>
  );
}

export function ProfileForm({ profile, isAdmin = false, actions }: ProfileFormProps) {
  const [name, setName] = useState(profile.name);
  const [roles, setRoles] = useState<UserProfile["roles"]>(profile.roles);
  const [experience, setExperience] = useState(profile.experience);
  const [genres, setGenres] = useState<UserProfile["genres"]>(profile.genres);
  const [daw, setDaw] = useState<UserProfile["daw"]>(profile.daw);
  const [savedProfile, setSavedProfile] = useState(profile);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isNameSaving, setIsNameSaving] = useState(false);
  const [isPremiumSaving, setIsPremiumSaving] = useState(false);
  const [isEditingName, setIsEditingName] = useState(!profile.name);

  const tagsChanged =
    experience !== savedProfile.experience ||
    JSON.stringify(roles) !== JSON.stringify(savedProfile.roles) ||
    JSON.stringify(genres) !== JSON.stringify(savedProfile.genres) ||
    JSON.stringify(daw) !== JSON.stringify(savedProfile.daw);

  function toggleValue<T extends string>(values: T[], value: T) {
    return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
  }

  async function patchProfile(update: Partial<Pick<UserProfile, "name" | "roles" | "experience" | "genres" | "daw" | "isPremium">>) {
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(update),
    });
    const result = (await response.json()) as { profile?: UserProfile; error?: string };

    if (!response.ok || !result.profile) {
      throw new Error(result.error || "Не получилось сохранить профиль");
    }

    return result.profile;
  }

  async function saveName() {
    setStatus("");
    setError("");
    setIsNameSaving(true);

    try {
      const nextProfile = await patchProfile({ name });
      setSavedProfile(nextProfile);
      setName(nextProfile.name);
      setIsEditingName(!nextProfile.name);
      setStatus("Имя сохранено");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не получилось сохранить имя");
    } finally {
      setIsNameSaving(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tagsChanged) return;
    setStatus("");
    setError("");
    setIsSaving(true);

    try {
      const nextProfile = await patchProfile({ roles, experience, genres, daw });
      setSavedProfile(nextProfile);
      setStatus("Профиль сохранён");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не получилось сохранить профиль");
    } finally {
      setIsSaving(false);
    }
  }

  async function togglePremium() {
    if (!isAdmin) return;
    setStatus("");
    setError("");
    setIsPremiumSaving(true);

    try {
      const nextProfile = await patchProfile({ isPremium: !savedProfile.isPremium });
      setSavedProfile(nextProfile);
      setStatus(nextProfile.isPremium ? "Premium включён" : "Premium выключен");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не получилось обновить Premium");
    } finally {
      setIsPremiumSaving(false);
    }
  }

  return (
    <form onSubmit={saveProfile} className="mt-6 space-y-5">
      <section className="flex flex-col gap-4 rounded-[26px] bg-[#1E1E1E] p-5 md:flex-row md:items-center">
        <div
          aria-label="Аватар"
          className="size-24 shrink-0 rounded-[26px] bg-[#0A0A0A] bg-cover bg-center"
          style={{ backgroundImage: `url(${savedProfile.avatarUrl})` }}
        />
        <div className="min-w-0 flex-1">
          <p className="heading-font text-[12px] uppercase text-[#78F761]">зовите меня</p>
          {isEditingName ? (
            <div className="mt-3 flex gap-3">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Как тебя называть"
                className="min-h-[56px] min-w-0 flex-1 rounded-[18px] border border-white/6 bg-[#303030] px-4 text-[24px] font-bold text-white outline-none placeholder:text-white/25 focus:border-[#78F761]"
              />
              <button
                type="button"
                onClick={saveName}
                disabled={isNameSaving}
                aria-label="Сохранить имя"
                className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#78F761] text-[#0A0A0A] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isNameSaving ? <Loader2 size={20} className="animate-spin" /> : <Check size={22} />}
              </button>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-3">
              <p className="min-w-0 flex-1 break-words text-[28px] font-bold leading-tight text-white">{savedProfile.name}</p>
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                aria-label="Редактировать имя"
                className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#303030] text-white transition hover:bg-[#3D3D3D]"
              >
                <Image src="/assets/edit.svg" alt="" width={20} height={20} />
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-8 rounded-[26px] bg-[#1E1E1E] p-5">
        <div>
          <p className="heading-font text-[12px] uppercase text-[#78F761]">музыкальная роль</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {roleOptions.map((option) => (
              <TagButton key={option} label={option} selected={roles.includes(option)} onClick={() => setRoles(toggleValue(roles, option))} />
            ))}
          </div>
        </div>

        <div>
          <p className="heading-font text-[12px] uppercase text-[#78F761]">опыт</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {experienceOptions.map((option) => (
              <TagButton
                key={option.id}
                label={experienceLabels[option.id]}
                selected={experience === option.id}
                onClick={() => setExperience(experience === option.id ? "" : option.id)}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="heading-font text-[12px] uppercase text-[#78F761]">жанры</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {genreOptions.map((option) => (
              <TagButton key={option} label={option} selected={genres.includes(option)} onClick={() => setGenres(toggleValue(genres, option))} />
            ))}
          </div>
        </div>

        <div>
          <p className="heading-font text-[12px] uppercase text-[#78F761]">daw</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {dawOptions.map((option) => (
              <TagButton key={option} label={option} selected={daw.includes(option)} onClick={() => setDaw(toggleValue(daw, option))} />
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving || !tagsChanged}
          className="mt-10 flex min-h-[56px] w-full items-center justify-center rounded-full bg-[#78F761] px-5 text-[16px] font-bold text-[#0A0A0A] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : null}
          {isSaving ? "Сохраняем" : "Сохранить"}
        </button>
      </section>

      {status ? <p className="rounded-[18px] border border-[#78F761]/25 bg-[#78F761]/10 p-4 text-[#D8D8D8]">{status}</p> : null}
      {error ? <p className="rounded-[18px] border border-[#D621D7]/30 bg-[#D621D7]/10 p-4 text-[#FFD8FF]">{error}</p> : null}

      <div className="grid gap-3 md:grid-cols-2">
        <ReadOnlyCard label="id" value={savedProfile.id} />
        <ReadOnlyCard label="email / логин" value={savedProfile.email} />
        {isAdmin ? (
          <section className="rounded-[22px] bg-[#1E1E1E] p-4">
            <p className="heading-font text-[12px] uppercase text-[#78F761]">premium</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-[17px] leading-relaxed text-[#D8D8D8]">{savedProfile.isPremium ? "Включён" : "Выключен"}</p>
              <button
                type="button"
                onClick={togglePremium}
                disabled={isPremiumSaving}
                className="flex min-h-[42px] items-center justify-center rounded-full bg-[#303030] px-4 text-[15px] font-bold text-white transition hover:bg-[#3D3D3D] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isPremiumSaving ? <Loader2 size={16} className="animate-spin" /> : savedProfile.isPremium ? "Сделать Free" : "Включить Premium"}
              </button>
            </div>
          </section>
        ) : (
          <ReadOnlyCard label="premium" value={savedProfile.isPremium ? "Да" : "Нет"} />
        )}
        <ReadOnlyCard label="перезапусков" value={savedProfile.restartCount} />
        <ReadOnlyCard label="создан" value={formatDate(savedProfile.createdAt)} />
        <ReadOnlyCard label="демки" value={savedProfile.demos.length ? savedProfile.demos.length : "Пока пусто"} />
      </div>

      {actions ? <div className="flex flex-col gap-3 md:flex-row">{actions}</div> : null}
    </form>
  );
}
