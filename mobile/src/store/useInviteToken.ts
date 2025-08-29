import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type State = {
  token: string | null;
  setToken: (t: string | null) => void;
  clear: () => void;
};

export const useInviteToken = create<State>()(
  persist(
    (set) => ({
      token: null,
      setToken: (t) => set({ token: t }),
      clear: () => set({ token: null }),
    }),
    {
      name: "invite-token",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

