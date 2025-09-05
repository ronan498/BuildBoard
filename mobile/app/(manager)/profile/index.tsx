import React, { useEffect } from "react";
import { View, Text, StyleSheet, Image, Pressable, Alert } from "react-native";
import TopBar from "@src/components/TopBar";
import { Colors } from "@src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@src/store/useAuth";
import { router } from "expo-router";
import { useProfile } from "@src/store/useProfile";

export default function ManagerProfile() {
  const { signOut, user, token } = useAuth();
  const userId = user?.id ?? 0;

  const profiles = useProfile((s) => s.profiles);
  const ensureProfile = useProfile((s) => s.ensureProfile);

  // ensure profile exists so avatar can be read
  useEffect(() => {
    if (user) {
      ensureProfile(user.id, user.username ?? "You", "manager", token ?? undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const avatarUri = profiles[userId]?.avatarUri;
  const name = profiles[userId]?.name || user?.username || "Your name";

  const confirmLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => { signOut(); router.replace("/(auth)/welcome"); } }
    ]);
  };

  return (
    <View style={{ flex:1, backgroundColor:"#fff" }}>
      <TopBar />
      <View style={{ padding:12, gap:12 }}>
        {/* Top tile now uses user avatar (or silhouette) and opens details */}
        <Pressable
          onPress={() => router.push("/(manager)/profile/details")}
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
          <View style={{ flex:1 }}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.sub}>Show profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </Pressable>

        <MenuItem icon="person-outline" label="Personal information" onPress={() => router.push("/(manager)/personal-info")} />
        <MenuItem icon="sync-outline" label="Subscriptions" onPress={() => router.push("/(manager)/subscriptions")} />
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

function MenuItem({ icon, label, last, onPress }:{ icon: keyof typeof Ionicons.glyphMap; label:string; last?: boolean; onPress?: () => void }) {
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
  profileCard:{ backgroundColor:"#fff", borderRadius:12, borderWidth:1, borderColor: Colors.border, padding:12, flexDirection:"row", alignItems:"center", gap:12 },
  avatar:{ width:48, height:48, borderRadius:24, backgroundColor:"#E5E7EB" },
  avatarSilhouette:{ alignItems:"center", justifyContent:"center" },
  name:{ fontSize:16, fontWeight:"700" },
  sub:{ color: "#6B7280", marginTop:2 },
  switchCard:{ backgroundColor:"#fff", borderRadius:12, borderWidth:1, borderColor: Colors.border, padding:12, flexDirection:"row", alignItems:"center", gap:12,
               shadowColor:"#000", shadowOpacity:0.05, shadowRadius:4, shadowOffset:{ width:0, height:2 } },
  switchTitle:{ fontWeight:"700", marginBottom:4 },
  switchSub:{ color:"#6B7280" },
  item:{ borderBottomWidth:1, borderColor: Colors.border, paddingVertical:14, flexDirection:"row", alignItems:"center", gap:12 },
  itemLabel:{ flex:1, fontSize:16 },
  logout:{ color:"#111827", textDecorationLine:"underline", marginTop:10 }
});
