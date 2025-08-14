import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Chat } from "@src/lib/api";
import { parseDate } from "@src/lib/date";

type State = {
  lastSeenByChat: Record<number, string>;
  markChatSeen: (chatId: number, iso?: string) => void;
  markChatsListSeen: (chats: Chat[]) => void;
  unreadCount: (chats: Chat[]) => number;
};

export const useChatBadge = create<State>()(
  persist(
    (set, get) => ({
      lastSeenByChat: {},

      markChatSeen: (chatId, iso) =>
        set((s) => ({
          lastSeenByChat: {
            ...s.lastSeenByChat,
            [chatId]: (iso ? parseDate(iso) : new Date()).toISOString(),
          },
        })),

      // When the user opens the chats list, treat all currently listed chats as read
      markChatsListSeen: (chats) =>
        set((s) => {
          const next = { ...s.lastSeenByChat };
          chats.forEach((c) => {
            if (c.lastTime) next[c.id] = parseDate(c.lastTime).toISOString();
          });
          return { lastSeenByChat: next };
        }),

      // Badge = number of chats with activity after lastSeen
      unreadCount: (chats) => {
        const map = get().lastSeenByChat;
        let count = 0;
        for (const c of chats) {
          if (!c.lastTime) continue;
          const seen = map[c.id];
          if (!seen || parseDate(seen) < parseDate(c.lastTime)) count += 1;
        }
        return count;
      },
    }),
    {
      name: "buildboard-chat-badges",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);
