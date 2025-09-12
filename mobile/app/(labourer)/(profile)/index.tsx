import { View, Text, StyleSheet, Image, Pressable, Alert } from "react-native";
import TopBar from "@src/components/TopBar";
import { Colors } from "@src/theme/tokens";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "@src/store/useAuth";
import { useProfile } from "@src/store/useProfile";
import React, { useEffect } from "react";
import { router } from "expo-router";

export default function LabourerProfile() {
  const { signOut, user, token } = useAuth();
  const userId = user?.id ?? 0;

  const profiles = useProfile((s) => s.profiles);
  const ensureProfile = useProfile((s) => s.ensureProfile);

  useEffect(() => {
    if (user) {
      ensureProfile(user.id, user.username ?? "You", (user.role ?? "labourer") as any, token ?? undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const avatarUri = profiles[userId]?.avatarUri;
  const name = profiles[userId]?.name || user?.username || "Your name";

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
        {/* Show profile tile (pressable) */}
        <Pressable
          onPress={() => router.push("/(labourer)/(profile)/profileDetails")}
          style={styles.profileCard}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarSilhouette]}>
              <Ionicons name="person" size={24} color="#9CA3AF" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.sub}>Show profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </Pressable>

        <Pressable onPress={() => router.push("/(labourer)/(profile)/switch-to-contractor")} accessibilityRole="button" accessibilityLabel="Switch to contractor" style={({ pressed }) => [styles.switchCard, pressed && { opacity: 0.8 }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Switch to contractor</Text>
            <Text style={styles.switchSub}>Simple and easy, switch today to start employing</Text>
          </View>
          <Ionicons name="briefcase-outline" size={28} color="#6B7280" />
        </Pressable>


        <MenuItem icon="person-outline" label="Personal information" onPress={() => router.push("/(labourer)/(profile)/personal-info")}/>
        <MenuItem icon="sync-outline" label="Subscriptions" onPress={() => router.push("/(labourer)/(profile)/subscriptions")}/>
        <MenuItem icon="shield-checkmark-outline" label="Login and security" onPress={() => router.push("/(labourer)/(profile)/login-security")} />
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
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  last?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={({ pressed }) => [
        styles.item,
        last && { borderBottomWidth: 0 },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Ionicons name={icon} size={22} color="#111" />
      <Text style={styles.itemLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </Pressable>
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
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#E5E7EB" },
  avatarSilhouette: { alignItems: "center", justifyContent: "center" },
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
