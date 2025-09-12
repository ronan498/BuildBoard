import { Tabs, Redirect } from "expo-router";
import { useAuth } from "@src/store/useAuth";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors } from "@src/theme/tokens";
import { useNotifications } from "@src/store/useNotifications";
import { useEffect, useState } from "react";
import { listConnectionRequests } from "@src/lib/api";

export default function ManagerTabs() {
  const { signedIn } = useAuth();
  const unread = useNotifications((s) => s.unread.manager);
  const [reqCount, setReqCount] = useState(0);
  useEffect(() => {
    const load = () =>
      listConnectionRequests().then((r) => setReqCount(r.length));
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);
  if (!signedIn) return <Redirect href="/(auth)/welcome" />;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarLabelStyle: { fontSize: 12 },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarIcon: ({ focused, size, color }) => {
          let name: keyof typeof Ionicons.glyphMap = "chatbubble-ellipses-outline";
          if (route.name === "chats")
            name = focused
              ? "chatbubble-ellipses"
              : "chatbubble-ellipses-outline";
          if (route.name === "projects") name = focused ? "briefcase" : "briefcase-outline";
          if (route.name === "map")      name = focused ? "map" : "map-outline";
          if (route.name === "team")     name = focused ? "people" : "people-outline";
          return <Ionicons name={name} size={size} color={color} />;
        }
      })}
    >
      {/* hidden routes */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="(profile)" options={{ href: null }} />

      {/* visible tabs */}
      <Tabs.Screen
        name="chats"
        options={{
          title: "Chats",
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
      <Tabs.Screen name="projects" options={{ title: "Jobs" }} />
      <Tabs.Screen name="map"   options={{ title: "Map" }} />
      <Tabs.Screen
        name="team"
        options={{
          title: "Team",
          tabBarBadge: reqCount > 0 ? reqCount : undefined,
        }}
      />
    </Tabs>
  );
}
