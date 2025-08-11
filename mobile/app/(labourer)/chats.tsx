import { useEffect, useState, useCallback } from "react";
import { View, FlatList, Text, Pressable, StyleSheet, Image } from "react-native";
import TopBar from "@src/components/TopBar";
import { listChats, type Chat } from "@src/lib/api";
import { useAuth } from "@src/store/useAuth";
import { useFocusEffect, router } from "expo-router";
import { useNotifications } from "@src/store/useNotifications";
import { Ionicons } from "@expo/vector-icons";
import { useProfile } from "@src/store/useProfile";

export default function Chats() {
  const { user } = useAuth();
  const userId = user?.id ?? 0;
  const [items, setItems] = useState<Chat[]>([]);
  const { clear } = useNotifications();
  const profiles = useProfile((s) => s.profiles);

  const load = async () => {
    const data = await listChats(user?.id);
    setItems(Array.isArray(data) ? data : []);
  };

  useFocusEffect(
    useCallback(() => {
      clear("labourer");
      load();
    }, [clear])
  );

  useEffect(() => {
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const renderRow = ({ item }: { item: Chat }) => {
    const otherId = item.workerId === userId ? item.managerId : item.workerId;
    const avatarUri = otherId ? profiles[otherId]?.avatarUri : undefined;

    return (
      <Pressable
        onPress={() => router.push(`/(labourer)/chats/${item.id}`)}
        style={styles.row}
      >
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.silhouette]}>
            <Ionicons name="person" size={18} color="#9CA3AF" />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{item.title || "Chat"}</Text>
          {!!item.lastMessage && (
            <Text style={styles.sub} numberOfLines={1}>{item.lastMessage}</Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <TopBar />
      <FlatList
        data={items}
        keyExtractor={(c) => String(c.id)}
        renderItem={renderRow}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        contentContainerStyle={{ padding: 12, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyBadge}>
              <Ionicons name="chatbubbles-outline" size={22} color="#6B7280" />
            </View>
            <Text style={styles.emptyTitle}>No chats yet</Text>
            <Text style={styles.emptyText}>
              Apply to a job or message a manager to start a conversation.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E5E7EB" },
  silhouette: { alignItems: "center", justifyContent: "center" },
  title: { fontWeight: "700", color: "#1F2937" },
  sub: { color: "#6B7280", marginTop: 2 },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyBadge: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: "#F3F4F6",
    alignItems: "center", justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  emptyText: { marginTop: 6, color: "#6B7280", textAlign: "center" },
});
