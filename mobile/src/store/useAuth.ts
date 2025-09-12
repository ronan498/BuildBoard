import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { deleteAccount as apiDeleteAccount } from "@src/lib/account";
import { useAppliedJobs } from "./useAppliedJobs";

type Role = "client" | "manager" | "labourer";
type PendingReg = { username: string; email: string; password: string } | null;
type User = {
  id: number;
  email: string;
  username: string;
  role: Role;
  subscription_plan?: string | null;
  subscription_status?: string | null;
};

type State = {
  role: Role | null;
  signedIn: boolean;
  token: string | null;
  user: User | null;

  pendingRegistration: PendingReg;
  lastRegisteredEmail: string | null;

  setRole: (r: Role) => void;
  setPendingRegistration: (p: PendingReg) => void;

  signIn: (email: string, password: string) => Promise<Role>;
  signInGuest: (role: Role) => Promise<Role>;
  completeRegistration: () => Promise<void>;
  signOut: () => void;
  deleteAccount: () => Promise<void>;
  refresh: () => Promise<void>;
};

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

export const useAuth = create<State>()(
  persist(
    (set, get) => ({
      role: null,
      signedIn: false,
      token: null,
      user: null,

      pendingRegistration: null,
      lastRegisteredEmail: null,

      setRole: (r) => set({ role: r }),
      setPendingRegistration: (p) => set({ pendingRegistration: p }),

      async signIn(email, password) {
        let resolvedRole: Role;

        if (API_BASE) {
          const r = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
          });
          if (!r.ok) throw new Error("Invalid credentials");
          const data = await r.json();
          const user = data.user as User;
          resolvedRole = (user?.role ?? get().role ?? "client") as Role;
          set({ signedIn: true, token: data.token, role: resolvedRole, user });
        } else {
          if (!email.includes("@") || password.length < 4) {
            throw new Error("Enter a valid email and 4+ char password");
          }
          resolvedRole = (get().role ?? "client") as Role;
          const demoUser: User = {
            id: 0,
            email,
            username: email.split("@")[0] || "Demo User",
            role: resolvedRole,
            subscription_plan: null,
            subscription_status: null,
          };
          set({ signedIn: true, token: "demo", role: resolvedRole, user: demoUser });
        }

        return resolvedRole;
      },

      async signInGuest(role) {
        const demoUser: User = {
          id: 0,
          email: `${role}@guest.local`,
          username: `Guest ${role.charAt(0).toUpperCase()}${role.slice(1)}`,
          role,
          subscription_plan: null,
          subscription_status: null,
        };
        set({ role, signedIn: true, token: "guest", user: demoUser });
        return role;
      },

      async completeRegistration() {
        const reg = get().pendingRegistration;
        const role = get().role;
        if (!reg || !role) throw new Error("Missing registration info or role");

        if (API_BASE) {
          const r = await fetch(`${API_BASE}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: reg.email,
              username: reg.username,
              password: reg.password,
              role
            })
          });
          if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            throw new Error(err?.error ?? "Registration failed");
          }
        } else {
          await new Promise((res) => setTimeout(res, 250));
        }

        set({ pendingRegistration: null, lastRegisteredEmail: reg.email });
      },

      signOut() {
        useAppliedJobs.getState().clear();
        set({ signedIn: false, role: null, token: null, user: null });
      },

      async deleteAccount() {
        const token = get().token ?? undefined;
        try {
          await apiDeleteAccount(token);
        } catch {
          // ignore errors; we'll still clear local state
        }
        set({ signedIn: false, role: null, token: null, user: null });
        useAppliedJobs.getState().clear();
      },

      async refresh() {
        const token = get().token;
        if (!API_BASE || !token) return;
        const r = await fetch(`${API_BASE}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.ok) {
          const data = await r.json();
          set({ user: data.user });
        }
      }
    }),
    {
      name: "buildboard-auth",
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
      migrate: (state: any, fromVersion) => {
        // keep prior migration behavior; ensure user exists or null
        if (fromVersion < 3) {
          return { ...state, signedIn: false, token: null, role: null, user: null };
        }
        return { user: null, ...state } as State;
      }
    }
  )
);
