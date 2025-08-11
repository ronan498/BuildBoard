import { View, Text, StyleSheet, Image, Pressable, Alert } from "react-native";
import TopBar from "@src/components/TopBar";
import { Colors } from "@src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@src/store/useAuth";
import { router } from "expo-router";

export default function LabourerProfile() {
  const { signOut, user } = useAuth();
  const name = user?.username || "Your name";

  const confirmLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => {
          signOut();
          router.replace("/(auth)/welcome");
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <TopBar />
      <View style={{ padding: 12, gap: 12 }}>
        {/* Show profile tile (now pressable) */}
        <Pressable
          onPress={() => router.push("/(labourer)/profileDetails")}
          style={styles.profileCard}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Image source={require("../../assets/images/avatar.png")} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.sub}>Show profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </Pressable>

        <View style={styles.switchCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Switch to contractor</Text>
            <Text style={styles.switchSub}>Simple and easy, switch today to start employing</Text>
          </View>
          <Ionicons name="business-outline" size={28} color="#6B7280" />
        </View>

        <MenuItem icon="person-outline" label="Personal information" />
        <MenuItem icon="sync-outline" label="Subscriptions" />
        <MenuItem icon="shield-checkmark-outline" label="Login and security" />
        <MenuItem icon="notifications-outline" label="Notifications" />
        <MenuItem icon="help-circle-outline" label="Help" last />

        <Pressable onPress={confirmLogout}>
          <Text style={styles.logout}>Log out</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.item, last && { borderBottomWidth: 0 }]}>
      <Ionicons name={icon} size={22} color="#111" />
      <Text style={styles.itemLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </View>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  name: { fontSize: 16, fontWeight: "700" },
  sub: { color: "#6B7280", marginTop: 2 },

  switchCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  switchTitle: { fontWeight: "700", marginBottom: 4 },
  switchSub: { color: "#6B7280" },

  item: {
    borderBottomWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemLabel: { flex: 1, fontSize: 16 },
  logout: { color: "#111827", textDecorationLine: "underline", marginTop: 10 },
});
