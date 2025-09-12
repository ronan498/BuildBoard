import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Image, Alert } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors } from "@src/theme/tokens";
import { router, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@src/store/useAuth";
import { useProfile } from "@src/store/useProfile";

type Props = { overlay?: boolean };

export default function TopBar({ overlay }: Props) {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const group = (segments?.[0] || "(labourer)") as "(labourer)" | "(client)" | "(manager)";

  const { user, token } = useAuth();
  const userId = user?.id ?? 0;

  const profiles = useProfile((s) => s.profiles);
  const ensureProfile = useProfile((s) => s.ensureProfile);

  // Ensure profile exists so avatar can be read anywhere
  useEffect(() => {
    if (user) {
      ensureProfile(user.id, user.username ?? "You", (user.role ?? "labourer") as any, token ?? undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const avatarUri = profiles[userId]?.avatarUri;

  // Only treat the user as "in profile" when the current route is the profile index.
  // Other screens inside the `(profile)` group such as `saved` should still allow
  // navigation back to the profile page via the avatar button.
  const inProfile = segments[segments.length - 1] === "(profile)";
  const goProfile = () => router.push(`/${group}/(profile)` as const);
  const onSearch = () => Alert.alert("Search", "Search coming soon.");

  const onSaved = () => {
    if (group === "(labourer)") {
      // Saved jobs live inside the profile group for labourers
      router.push("/(labourer)/(profile)/saved" as const);
    } else {
      Alert.alert("Saved", "Saved items coming soon.");
    }
  };

  const wrapStyle = [
    styles.wrap,
    overlay ? [styles.overlay, { top: (insets.top || 0) + 8 }] : { paddingTop: (insets.top || 0) + 6 },
  ];

  return (
    <View style={wrapStyle}>
      <Pressable onPress={onSearch} style={styles.search}>
        <Ionicons name="search" size={18} color="#9CA3AF" />
        <Text style={styles.searchText}>Search</Text>
      </Pressable>

      <View style={styles.actions}>
        {group !== "(client)" && (
          <Pressable onPress={onSaved} style={styles.iconBtn} accessibilityLabel="Saved">
            <Ionicons name="heart-outline" size={22} />
          </Pressable>
        )}

        <Pressable
          onPress={inProfile ? undefined : goProfile}
          style={styles.avatarBtn}
          accessibilityLabel="Open profile"
          accessibilityState={{ disabled: inProfile }}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.silhouette]}>
              <Ionicons name="person" size={20} color="#9CA3AF" />
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: Colors.bg,
  },
  overlay: {
    position: "absolute",
    left: 8,
    right: 8,
    zIndex: 10,
    borderRadius: 12,
    backgroundColor: "#ffffffcc",
    padding: 8,
  },
  search: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#F3F4F6",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  searchText: { color: "#9CA3AF", fontWeight: "600" },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#fff",
  },
  avatar: { width: "100%", height: "100%" },
  silhouette: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },
});
