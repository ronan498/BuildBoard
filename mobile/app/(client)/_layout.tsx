import { Tabs, Redirect } from "expo-router";
import { useAuth } from "@src/store/useAuth";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@src/theme/tokens";
import { useNotifications } from "@src/store/useNotifications";

export default function ClientTabs() {
  const { signedIn } = useAuth();
  const unread = useNotifications((s) => s.unread.client);
  if (!signedIn) return <Redirect href="/(auth)/welcome" />;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarLabelStyle: { fontSize: 12 },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarIcon: ({ focused, size, color }) => {
          const name = (() => {
            switch (route.name) {
              case "chats":
                return focused ? "chatbubbles" : "chatbubbles-outline";
              case "projects/index":
                return focused ? "briefcase" : "briefcase-outline";
              case "map":
                return focused ? "map" : "map-outline";
              default:
                return "ellipse-outline";
            }
          })();
          return <Ionicons name={name as any} size={size} color={color} />;
        },
      })}
    >
      {/* hidden routes */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="projects/[id]" options={{ href: null }} />
      <Tabs.Screen name="(profile)" options={{ href: null }} />

      {/* visible tabs */}
      <Tabs.Screen
        name="chats"
        options={{ title: "Chats", tabBarBadge: unread > 0 ? unread : undefined }}
      />
      <Tabs.Screen name="projects/index" options={{ title: "Projects" }} />
      <Tabs.Screen name="map" options={{ title: "Map" }} />
    </Tabs>
  );
}
