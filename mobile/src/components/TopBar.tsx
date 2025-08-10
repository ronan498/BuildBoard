import { View, Text, StyleSheet, Pressable, Image, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@src/theme/tokens";
import { router, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = { overlay?: boolean };

export default function TopBar({ overlay }: Props) {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const group = (segments?.[0] || "(labourer)") as "(labourer)" | "(client)" | "(manager)";

  const goProfile = () => router.push(`/${group}/profile` as const);
  const onSearch = () => Alert.alert("Search", "Search coming soon.");

  const onSaved = () => {
    if (group === "(labourer)") {
      router.push("/(labourer)/saved");
    } else {
      Alert.alert("Saved", "Saved items coming soon.");
    }
  };

  const wrapStyle = [
    styles.wrap,
    overlay
      ? [styles.overlay, { top: (insets.top || 0) + 8 }]
      : { paddingTop: (insets.top || 0) + 6 }
  ];

  return (
    <View style={wrapStyle}>
      <Pressable onPress={onSearch} style={styles.search}>
        <Ionicons name="search" size={18} color="#9CA3AF" />
        <Text style={styles.searchText}>Search</Text>
      </Pressable>

      <View style={styles.actions}>
        <Pressable onPress={onSaved} style={styles.iconBtn}>
          <Ionicons name="heart-outline" size={22} />
        </Pressable>

        <Pressable onPress={goProfile} style={styles.avatarBtn}>
          <Image source={require("../../assets/images/avatar.png")} style={styles.avatar} />
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
    backgroundColor: Colors.bg
  },
  overlay: {
    position: "absolute",
    left: 8, right: 8, zIndex: 10,
    borderRadius: 12,
    backgroundColor: "#ffffffcc",
    padding: 8
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
    borderRadius: 12
  },
  searchText: { color: "#9CA3AF", fontWeight: "600" },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#fff", borderWidth: 1, borderColor: Colors.border
  },
  avatarBtn: { width: 40, height: 40, borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  avatar: { width: "100%", height: "100%" }
});
