import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppliedInfo = { chatId: number; status: "pending" | "accepted" | "declined" };

interface AppliedState {
  applied: Record<number, AppliedInfo>;
  setApplied: (jobId: number, info: AppliedInfo) => void;
  setMany: (infos: Record<number, AppliedInfo>) => void;
  removeApplied: (jobId: number) => void;
  clear: () => void;
}

export const useAppliedJobs = create<AppliedState>()(
  persist(
    (set) => ({
      applied: {},
      setApplied: (jobId, info) =>
        set((s) => ({ applied: { ...s.applied, [jobId]: info } })),
      setMany: (infos) =>
        set((s) => ({ applied: { ...s.applied, ...infos } })),
      removeApplied: (jobId) =>
        set((s) => {
          const { [jobId]: _removed, ...rest } = s.applied;
          return { applied: rest };
        }),
      clear: () => set({ applied: {} }),
    }),
    { name: "bb-applied", storage: createJSONStorage(() => AsyncStorage), version: 1 }
  )
);
