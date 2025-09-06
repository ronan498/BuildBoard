import { Redirect } from "expo-router";
import { useAuth } from "@src/store/useAuth";
import { useEffect, useState } from "react";
import { View } from "react-native";

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

  const { signedIn, role } = useAuth();

  if (!ready) return <View />;

  if (!signedIn) return <Redirect href="/(auth)/welcome" />;

  // Go to concrete screens that actually exist
  if (role === "labourer") return <Redirect href="/(labourer)/jobs" />;
  if (role === "manager")  return <Redirect href="/(manager)/projects" />;
  return <Redirect href="/(client)/projects" />;
}
