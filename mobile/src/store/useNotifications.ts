import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type RoleKey = "labourer" | "manager" | "client";

type State = {
  unread: Record<RoleKey, number>;
  bump: (role: RoleKey, amt?: number) => void;
  clear: (role: RoleKey) => void;
};

export const useNotifications = create<State>()(
  persist(
    (set, get) => ({
      unread: { labourer: 0, manager: 0, client: 0 },
      bump: (role, amt = 1) => {
        const curr = get().unread[role] ?? 0;
        set({ unread: { ...get().unread, [role]: curr + amt } });
      },
      clear: (role) => set({ unread: { ...get().unread, [role]: 0 } })
    }),
    { name: "bb-notify", storage: createJSONStorage(() => AsyncStorage), version: 1 }
  )
);