import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@src/theme/tokens";
import { View, Text } from "react-native";
import { useNotifications } from "@src/store/useNotifications";

function ChatsIcon() {
  const { unread } = useNotifications();
  const count = unread.manager || 0;
  return (
    <View>
      <Ionicons name="chatbubbles-outline" size={22} />
      {count > 0 && (
        <View style={{ position:"absolute", right:-8, top:-6, backgroundColor:"#ef4444", minWidth:16, height:16, borderRadius:8, alignItems:"center", justifyContent:"center", paddingHorizontal:3 }}>
          <Text style={{ color:"#fff", fontSize:10, fontWeight:"800" }}>{count}</Text>
        </View>
      )}
    </View>
  );
}

export default function Layout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: Colors.primary, headerShown: false }}>
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="chats" options={{ title: "Chats", tabBarIcon: ChatsIcon }} />
      <Tabs.Screen name="projects" options={{ title: "Projects", tabBarIcon: ({color}) => <Ionicons name="briefcase-outline" size={22} color={color} /> }} />
      <Tabs.Screen name="map" options={{ title: "Map", tabBarIcon: ({color}) => <Ionicons name="map-outline" size={22} color={color} /> }} />
      <Tabs.Screen name="team" options={{ title: "Team", tabBarIcon: ({color}) => <Ionicons name="people-outline" size={22} color={color} /> }} />
      <Tabs.Screen name="chats/[id]" options={{ href: null }} />
    </Tabs>
  );
}
