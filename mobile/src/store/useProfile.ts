import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  upsertProfile: (p: Profile) => void;
  updateProfile: (userId: number, patch: Partial<Profile>) => void;
  addSkill: (userId: number, skill: string) => void;
  removeSkill: (userId: number, skill: string) => void;
  addInterest: (userId: number, interest: string) => void;
  removeInterest: (userId: number, interest: string) => void;
  addQualification: (userId: number, q: Qualification) => void;
  updateQualification: (userId: number, id: string, patch: Partial<Qualification>) => void;
  removeQualification: (userId: number, id: string) => void; // NEW
};

export const useProfile = create<State>()(
  persist(
    (set, get) => ({
      profiles: {},

      upsertProfile: (p) =>
        set((s) => ({ profiles: { ...s.profiles, [p.userId]: { ...p } } })),

      updateProfile: (userId, patch) =>
        set((s) => {
          const curr = s.profiles[userId];
          if (!curr) return s;
          return { profiles: { ...s.profiles, [userId]: { ...curr, ...patch } } };
        }),

      addSkill: (userId, skill) =>
        set((s) => {
          const curr = s.profiles[userId];
          if (!curr || !skill.trim()) return s;
          if (curr.skills.includes(skill)) return s;
          return {
            profiles: {
              ...s.profiles,
              [userId]: { ...curr, skills: [...curr.skills, skill.trim()] },
            },
          };
        }),

      removeSkill: (userId, skill) =>
        set((s) => {
          const curr = s.profiles[userId];
          if (!curr) return s;
          return {
            profiles: {
              ...s.profiles,
              [userId]: { ...curr, skills: curr.skills.filter((x) => x !== skill) },
            },
          };
        }),

      addInterest: (userId, interest) =>
        set((s) => {
          const curr = s.profiles[userId];
          if (!curr || !interest.trim()) return s;
          if (curr.interests.includes(interest)) return s;
          return {
            profiles: {
              ...s.profiles,
              [userId]: { ...curr, interests: [...curr.interests, interest.trim()] },
            },
          };
        }),

      removeInterest: (userId, interest) =>
        set((s) => {
          const curr = s.profiles[userId];
          if (!curr) return s;
          return {
            profiles: {
              ...s.profiles,
              [userId]: { ...curr, interests: curr.interests.filter((x) => x !== interest) },
            },
          };
        }),

      addQualification: (userId, q) =>
        set((s) => {
          const curr = s.profiles[userId];
          if (!curr) return s;
          return {
            profiles: {
              ...s.profiles,
              [userId]: { ...curr, qualifications: [...curr.qualifications, q] },
            },
          };
        }),

      updateQualification: (userId, id, patch) =>
        set((s) => {
          const curr = s.profiles[userId];
          if (!curr) return s;
          return {
            profiles: {
              ...s.profiles,
              [userId]: {
                ...curr,
                qualifications: curr.qualifications.map((qq) =>
                  qq.id === id ? { ...qq, ...patch } : qq
                ),
              },
            },
          };
        }),

      removeQualification: (userId, id) => // NEW
        set((s) => {
          const curr = s.profiles[userId];
          if (!curr) return s;
          return {
            profiles: {
              ...s.profiles,
              [userId]: {
                ...curr,
                qualifications: curr.qualifications.filter((q) => q.id !== id),
              },
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
