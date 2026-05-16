import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { z } from "zod";

import type { ExperienceId } from "@/lib/options";
import { dawOptions, genreOptions, roleOptions } from "@/lib/profile-options";
import type { AppUser } from "@/lib/supabase/server";

export const profileUpdateSchema = z.object({
  name: z.string().trim().max(80).optional(),
  roles: z.array(z.enum(roleOptions)).optional(),
  experience: z.union([z.enum(["newbie", "middle", "advanced", "pro"]), z.literal("")]).optional(),
  genres: z.array(z.enum(genreOptions)).optional(),
  daw: z.array(z.enum(dawOptions)).optional(),
});

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  isPremium: boolean;
  restartCount: number;
  createdAt: string;
  roles: Array<(typeof roleOptions)[number]>;
  experience: ExperienceId | "";
  genres: Array<(typeof genreOptions)[number]>;
  daw: Array<(typeof dawOptions)[number]>;
  demos: string[];
};

type UsersData = {
  users: Record<string, UserProfile>;
};

const defaultUsersData: UsersData = {
  users: {},
};

function getUsersPath(): string {
  const volumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH;
  const rawPath = volumePath ? path.join(volumePath, "users.json") : process.env.USERS_PATH || "data/users.json";
  return path.isAbsolute(rawPath) ? rawPath : path.join(process.cwd(), rawPath);
}

async function loadUsers(): Promise<UsersData> {
  try {
    const raw = await readFile(getUsersPath(), "utf8");
    return { ...defaultUsersData, ...JSON.parse(raw) } as UsersData;
  } catch {
    return structuredClone(defaultUsersData);
  }
}

async function saveUsers(data: UsersData): Promise<void> {
  const usersPath = getUsersPath();
  await mkdir(path.dirname(usersPath), { recursive: true });
  await access(path.dirname(usersPath), constants.W_OK);
  await writeFile(usersPath, JSON.stringify(data, null, 2), "utf8");
}

function createAvatarUrl(userId: string) {
  return `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(userId)}`;
}

function createDefaultProfile(user: AppUser): UserProfile {
  return {
    id: user.id,
    email: user.email,
    name: "",
    avatarUrl: createAvatarUrl(user.id),
    isPremium: false,
    restartCount: 0,
    createdAt: new Date().toISOString(),
    roles: [],
    experience: "",
    genres: [],
    daw: [],
    demos: [],
  };
}

export async function ensureUserProfile(user: AppUser): Promise<UserProfile> {
  const data = await loadUsers();
  const existingProfile = data.users[user.id];

  if (existingProfile) {
    const normalizedProfile = {
      ...createDefaultProfile(user),
      ...existingProfile,
      id: user.id,
      email: user.email,
      avatarUrl: existingProfile.avatarUrl || createAvatarUrl(user.id),
    };
    data.users[user.id] = normalizedProfile;
    await saveUsers(data);
    return normalizedProfile;
  }

  const profile = createDefaultProfile(user);
  data.users[user.id] = profile;
  await saveUsers(data);
  return profile;
}

export async function updateUserProfile(user: AppUser, update: z.infer<typeof profileUpdateSchema>): Promise<UserProfile> {
  const data = await loadUsers();
  const currentProfile = data.users[user.id] || createDefaultProfile(user);
  const nextProfile: UserProfile = {
    ...currentProfile,
    id: user.id,
    email: user.email,
    name: update.name ?? currentProfile.name,
    roles: update.roles ?? currentProfile.roles,
    experience: update.experience ?? currentProfile.experience,
    genres: update.genres ?? currentProfile.genres,
    daw: update.daw ?? currentProfile.daw,
  };

  data.users[user.id] = nextProfile;
  await saveUsers(data);
  return nextProfile;
}

export async function addUserDemo(user: AppUser, trackId: string): Promise<void> {
  const data = await loadUsers();
  const profile = data.users[user.id] || createDefaultProfile(user);
  profile.demos = Array.from(new Set([...profile.demos, trackId]));
  data.users[user.id] = profile;
  await saveUsers(data);
}

export async function removeUserDemo(user: AppUser, trackId: string): Promise<void> {
  const data = await loadUsers();
  const profile = data.users[user.id] || createDefaultProfile(user);
  profile.demos = profile.demos.filter((demoId) => demoId !== trackId);
  data.users[user.id] = profile;
  await saveUsers(data);
}

export async function incrementUserRestartCount(user: AppUser): Promise<void> {
  try {
    const data = await loadUsers();
    const profile = data.users[user.id] || createDefaultProfile(user);
    profile.restartCount += 1;
    data.users[user.id] = profile;
    await saveUsers(data);
  } catch (error) {
    console.warn("User restart count write failed", error);
  }
}
