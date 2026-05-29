import { existsSync } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
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
  isPremium: z.boolean().optional(),
});

export type UserProfile = {
  id: string;
  email: string;
  login: string;
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

type PasswordCredential = {
  userId: string;
  login: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
};

type UsersData = {
  users: Record<string, UserProfile>;
  credentials: Record<string, PasswordCredential>;
};

export type UserMergeResult = {
  email: string;
  targetUserId: string;
  mergedUserIds: string[];
};

export type UsersStorageInfo = {
  usersPath: string;
  fileExists: boolean;
  directoryWritable: boolean;
};

const defaultUsersData: UsersData = {
  users: {},
  credentials: {},
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

async function canWriteDirectory(directory: string): Promise<boolean> {
  try {
    await mkdir(directory, { recursive: true });
    await access(directory, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function createAvatarUrl(userId: string) {
  return `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(userId)}`;
}

function createDefaultProfile(user: AppUser): UserProfile {
  return {
    id: user.id,
    email: user.email,
    login: user.email,
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

function normalizeProfile(profile: UserProfile): UserProfile {
  return {
    ...profile,
    login: profile.login || profile.email,
    avatarUrl: profile.avatarUrl || createAvatarUrl(profile.id),
    roles: profile.roles || [],
    genres: profile.genres || [],
    daw: profile.daw || [],
    demos: profile.demos || [],
  };
}

function mergeArrays<T>(...arrays: T[][]) {
  return Array.from(new Set(arrays.flat()));
}

function choosePrimaryProfile(profiles: UserProfile[], credentialUserId?: string) {
  return [...profiles].sort((first, second) => {
    const demoDiff = (second.demos?.length || 0) - (first.demos?.length || 0);
    if (demoDiff) return demoDiff;

    if (first.isPremium !== second.isPremium) return first.isPremium ? -1 : 1;

    if (first.id === credentialUserId && second.id !== credentialUserId) return -1;
    if (second.id === credentialUserId && first.id !== credentialUserId) return 1;

    return Date.parse(first.createdAt || "") - Date.parse(second.createdAt || "");
  })[0];
}

function mergeProfileGroup(
  data: UsersData,
  email: string,
  profiles: UserProfile[],
  credential?: PasswordCredential,
  nextName?: string,
  options: { deleteSources?: boolean } = {},
): UserMergeResult | null {
  if (!profiles.length) return null;

  const normalizedProfiles = profiles.map(normalizeProfile);
  const targetProfile = normalizeProfile(choosePrimaryProfile(normalizedProfiles, credential?.userId));
  const sourceProfiles = normalizedProfiles.filter((profile) => profile.id !== targetProfile.id);
  const mergedUserIds = sourceProfiles.map((profile) => profile.id);
  const earliestCreatedAt = normalizedProfiles
    .map((profile) => profile.createdAt)
    .filter(Boolean)
    .sort((first, second) => Date.parse(first) - Date.parse(second))[0];

  const mergedProfile: UserProfile = {
    ...targetProfile,
    email,
    login: email,
    name: nextName?.trim() || targetProfile.name || normalizedProfiles.find((profile) => profile.name)?.name || "",
    avatarUrl: targetProfile.avatarUrl || createAvatarUrl(targetProfile.id),
    isPremium: normalizedProfiles.some((profile) => profile.isPremium),
    restartCount: normalizedProfiles.reduce((sum, profile) => sum + (profile.restartCount || 0), 0),
    createdAt: earliestCreatedAt || targetProfile.createdAt,
    roles: mergeArrays(...normalizedProfiles.map((profile) => profile.roles || [])),
    experience: targetProfile.experience || normalizedProfiles.find((profile) => profile.experience)?.experience || "",
    genres: mergeArrays(...normalizedProfiles.map((profile) => profile.genres || [])),
    daw: mergeArrays(...normalizedProfiles.map((profile) => profile.daw || [])),
    demos: mergeArrays(...normalizedProfiles.map((profile) => profile.demos || [])),
  };

  data.users[targetProfile.id] = mergedProfile;
  if (options.deleteSources ?? true) {
    for (const profile of sourceProfiles) {
      delete data.users[profile.id];
    }
  }

  return {
    email,
    targetUserId: targetProfile.id,
    mergedUserIds,
  };
}

function getProfilesByEmail(data: UsersData, email: string) {
  return Object.values(data.users).filter((profile) => normalizeEmail(profile.email || profile.login || "") === email);
}

function normalizeCredentialsForEmail(data: UsersData, email: string, targetUserId: string, credential?: PasswordCredential) {
  for (const [key, existingCredential] of Object.entries(data.credentials)) {
    if (normalizeEmail(existingCredential.email || existingCredential.login || key) === email) {
      delete data.credentials[key];
    }
  }

  if (credential) {
    data.credentials[email] = {
      ...credential,
      userId: targetUserId,
      login: email,
      email,
    };
  }
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
      login: existingProfile.login || user.email,
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

export async function getUserProfilesSnapshot(): Promise<UserProfile[]> {
  const data = await loadUsers();
  return Object.values(data.users).map((profile) => ({
    ...profile,
    login: profile.login || profile.email,
    avatarUrl: profile.avatarUrl || createAvatarUrl(profile.id),
    roles: profile.roles || [],
    genres: profile.genres || [],
    daw: profile.daw || [],
    demos: profile.demos || [],
  }));
}

export async function mergeDuplicateUserProfilesByEmail(): Promise<UserMergeResult[]> {
  const data = await loadUsers();
  const emails = new Set(
    [
      ...Object.values(data.users).map((profile) => normalizeEmail(profile.email || profile.login || "")),
      ...Object.values(data.credentials).map((credential) => normalizeEmail(credential.email || credential.login || "")),
    ].filter(Boolean),
  );
  const results: UserMergeResult[] = [];
  let changed = false;

  for (const email of emails) {
    const profiles = getProfilesByEmail(data, email);
    const credential = Object.values(data.credentials).find((item) => normalizeEmail(item.email || item.login) === email);
    if (profiles.length <= 1) {
      if (profiles[0] && credential?.userId !== profiles[0].id) {
        normalizeCredentialsForEmail(data, email, profiles[0].id, credential);
        changed = true;
      }
      continue;
    }

    const result = mergeProfileGroup(data, email, profiles, credential, undefined, { deleteSources: false });
    if (!result) continue;
    normalizeCredentialsForEmail(data, email, result.targetUserId, credential);
    results.push(result);
    changed = true;
  }

  if (changed) {
    await saveUsers(data);
  }

  return results;
}

export async function deleteUserProfilesById(userIds: string[]): Promise<void> {
  if (!userIds.length) return;

  const data = await loadUsers();
  let changed = false;

  for (const userId of userIds) {
    if (!data.users[userId]) continue;
    delete data.users[userId];
    changed = true;
  }

  if (changed) {
    await saveUsers(data);
  }
}

export async function deleteUserAccountById(userId: string): Promise<UserProfile | null> {
  const data = await loadUsers();
  const profile = data.users[userId];
  if (!profile) return null;

  delete data.users[userId];
  for (const [credentialKey, credential] of Object.entries(data.credentials)) {
    if (credential.userId === userId) {
      delete data.credentials[credentialKey];
    }
  }

  await saveUsers(data);
  return normalizeProfile(profile);
}

export async function getUsersStorageInfo(): Promise<UsersStorageInfo> {
  const usersPath = getUsersPath();
  return {
    usersPath,
    fileExists: existsSync(usersPath),
    directoryWritable: await canWriteDirectory(path.dirname(usersPath)),
  };
}

export async function updateUserProfile(user: AppUser, update: z.infer<typeof profileUpdateSchema>): Promise<UserProfile> {
  const data = await loadUsers();
  const currentProfile = data.users[user.id] || createDefaultProfile(user);
  const nextProfile: UserProfile = {
    ...currentProfile,
    id: user.id,
    email: user.email,
    login: currentProfile.login || user.email,
    name: update.name ?? currentProfile.name,
    roles: update.roles ?? currentProfile.roles,
    experience: update.experience ?? currentProfile.experience,
    genres: update.genres ?? currentProfile.genres,
    daw: update.daw ?? currentProfile.daw,
    isPremium: user.role === "admin" && typeof update.isPremium === "boolean" ? update.isPremium : currentProfile.isPremium,
  };

  data.users[user.id] = nextProfile;
  await saveUsers(data);
  return nextProfile;
}

export async function setUserPremiumById(userId: string, isPremium: boolean): Promise<UserProfile | null> {
  const data = await loadUsers();
  const profile = data.users[userId];
  if (!profile) return null;

  const nextProfile: UserProfile = {
    ...profile,
    isPremium,
  };
  data.users[userId] = nextProfile;
  await saveUsers(data);
  return nextProfile;
}

function normalizeLogin(value: string) {
  return value.trim().toLowerCase();
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  return {
    salt,
    hash: scryptSync(password, salt, 64).toString("hex"),
  };
}

function verifyPassword(password: string, salt: string, expectedHash: string) {
  const hash = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, "hex");
  return expected.length === hash.length && timingSafeEqual(hash, expected);
}

export async function registerPasswordUser({
  email,
  name,
  password,
}: {
  email: string;
  name: string;
  password: string;
}): Promise<{ profile: UserProfile; mergedUserIds: string[] }> {
  const data = await loadUsers();
  const normalizedEmail = normalizeEmail(email);

  const existingCredential = Object.values(data.credentials).find((credential) => credential.login === normalizedEmail || credential.email === normalizedEmail);
  const profiles = getProfilesByEmail(data, normalizedEmail);
  if (existingCredential && !profiles.length) {
    const error = new Error("USER_EXISTS");
    error.name = "USER_EXISTS";
    throw error;
  }

  const now = new Date().toISOString();
  const { salt, hash } = hashPassword(password);
  let targetProfile: UserProfile;
  let mergedUserIds: string[] = [];

  if (profiles.length) {
    const mergeResult = mergeProfileGroup(data, normalizedEmail, profiles, existingCredential, name, { deleteSources: false });
    const targetUserId = mergeResult?.targetUserId || profiles[0].id;
    targetProfile = {
      ...normalizeProfile(data.users[targetUserId]),
      email: normalizedEmail,
      login: normalizedEmail,
      name: name.trim(),
    };
    data.users[targetUserId] = targetProfile;
    mergedUserIds = mergeResult?.mergedUserIds || [];
  } else {
    const userId = `local_${randomBytes(12).toString("hex")}`;
    targetProfile = createDefaultProfile({ id: userId, email: normalizedEmail, role: "user" });
    targetProfile.login = normalizedEmail;
    targetProfile.name = name.trim();
    targetProfile.createdAt = now;
    data.users[userId] = targetProfile;
  }

  normalizeCredentialsForEmail(data, normalizedEmail, targetProfile.id, {
    userId: targetProfile.id,
    login: normalizedEmail,
    email: normalizedEmail,
    passwordHash: hash,
    passwordSalt: salt,
    createdAt: now,
  });
  await saveUsers(data);
  return { profile: targetProfile, mergedUserIds };
}

export async function verifyPasswordUser(loginOrEmail: string, password: string): Promise<UserProfile | null> {
  const data = await loadUsers();
  const normalizedValue = normalizeLogin(loginOrEmail);
  const credential = Object.values(data.credentials).find(
    (item) => item.login === normalizedValue || item.email === normalizedValue,
  );
  if (!credential || !verifyPassword(password, credential.passwordSalt, credential.passwordHash)) return null;

  return data.users[credential.userId] || null;
}

export async function getPasswordUserById(userId: string): Promise<UserProfile | null> {
  const data = await loadUsers();
  const credential = Object.values(data.credentials).find((item) => item.userId === userId);
  if (!credential) return null;
  return data.users[userId] || null;
}

export async function getPasswordUserByEmail(email: string): Promise<UserProfile | null> {
  const data = await loadUsers();
  const normalizedEmail = normalizeEmail(email);
  const credential = Object.values(data.credentials).find((item) => item.email === normalizedEmail);
  if (!credential) return null;
  return data.users[credential.userId] || null;
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
