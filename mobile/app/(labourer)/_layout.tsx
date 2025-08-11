import { Tabs, Redirect } from "expo-router";
import { useAuth } from "@src/store/useAuth";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@src/theme/tokens";
import { useNotifications } from "@src/store/useNotifications";

export default function LabourerTabs() {
  const { signedIn } = useAuth();
  const unread = useNotifications((s) => s.unread.labourer);
  if (!signedIn) return <Redirect href="/(auth)/welcome" />;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarLabelStyle: { fontSize: 12 },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarIcon: ({ focused, size, color }) => {
          let name: keyof typeof Ionicons.glyphMap = "chatbubbles-outline";
          if (route.name === "chats") name = focused ? "chatbubbles" : "chatbubbles-outline";
          if (route.name === "jobs")  name = focused ? "briefcase" : "briefcase-outline";
          if (route.name === "map")   name = focused ? "map" : "map-outline";
          if (route.name === "team")  name = focused ? "people" : "people-outline";
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      {/* hidden / non-tab routes */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="chats/[id]" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="profileDetails" options={{ href: null }} />
      <Tabs.Screen name="saved" options={{ href: null }} />

      {/* visible tabs */}
      <Tabs.Screen
        name="chats"
        options={{
          title: "Chats",
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
      <Tabs.Screen name="jobs"  options={{ title: "Jobs" }} />
      <Tabs.Screen name="map"   options={{ title: "Map" }} />
      <Tabs.Screen name="team"  options={{ title: "Team" }} />
    </Tabs>
  );
}
