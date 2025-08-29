import { Redirect } from "expo-router";
import { useAuth } from "@src/store/useAuth";
import { useEffect, useState } from "react";
import { View } from "react-native";
import * as Linking from "expo-linking";
import { useInviteToken } from "@src/store/useInviteToken";
import { acceptTeamInvite } from "@src/lib/api";

export default function Index() {
  // Wait for persisted state to hydrate
  const [ready, setReady] = useState<boolean>(
    useAuth.persist?.hasHydrated?.() ?? false
  );

  useEffect(() => {
    const unsub = useAuth.persist?.onFinishHydration?.(() => setReady(true));
    if (!unsub) setReady(true);
    return () => unsub?.();
  }, []);

  useEffect(() => {
    const handle = (url: string) => {
      const match = /invite\/([^/?]+)/.exec(url);
      if (match) useInviteToken.getState().setToken(match[1]);
    };
    Linking.getInitialURL().then((url) => url && handle(url));
    const sub = Linking.addEventListener("url", (e) => handle(e.url));
    return () => sub.remove();
  }, []);
  const { signedIn, role } = useAuth();
  const token = useInviteToken((s) => s.token);
  const clear = useInviteToken((s) => s.clear);

  useEffect(() => {
    if (signedIn && token) {
      acceptTeamInvite(token).finally(() => clear());
    }
  }, [signedIn, token]);

  if (!ready) return <View />;

  if (!signedIn) return <Redirect href="/(auth)/welcome" />;

  // Go to concrete screens that actually exist
  if (role === "labourer") return <Redirect href="/(labourer)/jobs" />;
  if (role === "manager") return <Redirect href="/(manager)/projects" />;
  return <Redirect href="/(client)/projects/index" />;
}
