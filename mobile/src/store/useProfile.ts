import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchProfile as apiFetchProfile, saveProfile as apiSaveProfile } from "@src/lib/api";

export type RoleKey = "labourer" | "manager" | "client";

export type Qualification = {
  id: string;
  title: string;
  imageUri?: string;
  status?: "verified" | "pending";
};

export type Profile = {
  userId: number;
  name: string;
  role: RoleKey;
  headline: string;
  location: string;
  company?: string;
  jobsCompleted?: number;
  bio?: string;
  avatarUri?: string;
  bannerUri?: string;
  skills: string[];
  interests: string[];
  qualifications: Qualification[];
  endorsements: {
    id: string;
    author: string;
    authorAvatar?: string;
    jobTitle?: string;
    date?: string;
    body: string;
  }[];
};

type State = {
  profiles: Record<number, Profile>;
  ensureProfile: (
    userId: number,
    name: string,
    role: RoleKey,
    token?: string
  ) => Promise<Profile>;
  upsertProfile: (p: Profile, token?: string) => void;
  updateProfile: (
    userId: number,
    patch: Partial<Profile>,
    token?: string
  ) => void;
  addSkill: (userId: number, skill: string, token?: string) => void;
  removeSkill: (userId: number, skill: string, token?: string) => void;
  addInterest: (userId: number, interest: string, token?: string) => void;
  removeInterest: (userId: number, interest: string, token?: string) => void;
  addQualification: (userId: number, q: Qualification, token?: string) => void;
  updateQualification: (
    userId: number,
    id: string,
    patch: Partial<Qualification>,
    token?: string
  ) => void;
  removeQualification: (userId: number, id: string, token?: string) => void; // NEW
};

export const useProfile = create<State>()(
  persist(
    (set, get) => ({
      profiles: {},

      ensureProfile: async (userId, name, role, token) => {
        const existing = get().profiles[userId];
        if (existing) return existing;
        const remote = await apiFetchProfile(userId, token);
        if (remote) {
          set((s) => ({ profiles: { ...s.profiles, [userId]: remote } }));
          return remote;
        }
        const def = defaultProfile(userId, name, role);
        set((s) => ({ profiles: { ...s.profiles, [userId]: def } }));
        if (token) apiSaveProfile(def, token);
        return def;
      },

      upsertProfile: (p, token) => {
        set((s) => ({ profiles: { ...s.profiles, [p.userId]: { ...p } } }));
        if (token) apiSaveProfile(p, token);
      },

      updateProfile: (userId, patch, token) =>
        set((s) => {
          const curr = s.profiles[userId];
          if (!curr) return s;
          const next = { ...curr, ...patch };
          if (token) apiSaveProfile(next, token);
          return { profiles: { ...s.profiles, [userId]: next } };
        }),

      addSkill: (userId, skill, token) =>
        set((s) => {
          const curr = s.profiles[userId];
          if (!curr || !skill.trim()) return s;
          if (curr.skills.includes(skill)) return s;
          const next = { ...curr, skills: [...curr.skills, skill.trim()] };
          if (token) apiSaveProfile(next, token);
          return {
            profiles: {
              ...s.profiles,
              [userId]: next,
            },
          };
        }),

      removeSkill: (userId, skill, token) =>
        set((s) => {
          const curr = s.profiles[userId];
          if (!curr) return s;
          const next = { ...curr, skills: curr.skills.filter((x) => x !== skill) };
          if (token) apiSaveProfile(next, token);
          return {
            profiles: {
              ...s.profiles,
              [userId]: next,
            },
          };
        }),

      addInterest: (userId, interest, token) =>
        set((s) => {
          const curr = s.profiles[userId];
          if (!curr || !interest.trim()) return s;
          if (curr.interests.includes(interest)) return s;
          const next = {
            ...curr,
            interests: [...curr.interests, interest.trim()],
          };
          if (token) apiSaveProfile(next, token);
          return {
            profiles: {
              ...s.profiles,
              [userId]: next,
            },
          };
        }),

      removeInterest: (userId, interest, token) =>
        set((s) => {
          const curr = s.profiles[userId];
          if (!curr) return s;
          const next = {
            ...curr,
            interests: curr.interests.filter((x) => x !== interest),
          };
          if (token) apiSaveProfile(next, token);
          return {
            profiles: {
              ...s.profiles,
              [userId]: next,
            },
          };
        }),

      addQualification: (userId, q, token) =>
        set((s) => {
          const curr = s.profiles[userId];
          if (!curr) return s;
          const next = {
            ...curr,
            qualifications: [...curr.qualifications, q],
          };
          if (token) apiSaveProfile(next, token);
          return {
            profiles: {
              ...s.profiles,
              [userId]: next,
            },
          };
        }),

      updateQualification: (userId, id, patch, token) =>
        set((s) => {
          const curr = s.profiles[userId];
          if (!curr) return s;
          const next = {
            ...curr,
            qualifications: curr.qualifications.map((qq) =>
              qq.id === id ? { ...qq, ...patch } : qq
            ),
          };
          if (token) apiSaveProfile(next, token);
          return {
            profiles: {
              ...s.profiles,
              [userId]: next,
            },
          };
        }),

      removeQualification: (userId, id, token) => // NEW
        set((s) => {
          const curr = s.profiles[userId];
          if (!curr) return s;
          const next = {
            ...curr,
            qualifications: curr.qualifications.filter((q) => q.id !== id),
          };
          if (token) apiSaveProfile(next, token);
          return {
            profiles: {
              ...s.profiles,
              [userId]: next,
            },
          };
        }),
    }),
    { name: "bb-profile", storage: createJSONStorage(() => AsyncStorage), version: 1 }
  )
);

export const defaultProfile = (userId: number, name: string, role: RoleKey): Profile => ({
  userId,
  name,
  role,
  headline: "Looking for work",
  location: "Brighton, UK",
  company: "BuildMat",
  jobsCompleted: 8,
  bio:
    "Hi there! I'm Johnny, and if you think bricklaying and decorating are just about slapping mortar and paint around, well, you haven't met me yet...",
  avatarUri: undefined,
  bannerUri: undefined,
  skills: ["Bricklaying", "Decorating"],
  interests: ["Golf", "Hiking"],
  qualifications: [{ id: "cscs", title: "CSCS Labourer Card", status: "pending" }],
  endorsements: [
    {
      id: "endo1",
      author: "Mark H.",
      jobTitle: "Plaster boarding job | 5 Oct – 12 Nov",
      date: "12 Nov",
      body:
        "Johnny has worked for me many times, he is super reliable and a good laugh. Always on time and has great attention to detail. Would highly recommend Johnny!",
    },
  ],
});
