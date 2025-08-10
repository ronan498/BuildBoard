import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type SavedState = {
  savedJobIds: number[];
  toggleSave: (id: number) => void;
  isSaved: (id: number) => boolean;
  clearSaved: () => void;
};

export const useSaved = create<SavedState>()(
  persist(
    (set, get) => ({
      savedJobIds: [],
      toggleSave: (id) =>
        set((s) => ({
          savedJobIds: s.savedJobIds.includes(id)
            ? s.savedJobIds.filter((x) => x !== id)
            : [...s.savedJobIds, id],
        })),
      isSaved: (id) => get().savedJobIds.includes(id),
      clearSaved: () => set({ savedJobIds: [] }),
    }),
    {
      name: "buildboard-saved",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);
