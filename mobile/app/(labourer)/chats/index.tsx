import { useEffect, useState, useCallback } from "react";
import { View, FlatList, Text, Pressable, StyleSheet, Image, Alert } from "react-native";
import TopBar from "@src/components/TopBar";
import { listChats, type Chat, deleteChat } from "@src/lib/api";
import { parseDate } from "@src/lib/date";
import { useAuth } from "@src/store/useAuth";
import { useFocusEffect, router } from "expo-router";
import { useNotifications } from "@src/store/useNotifications";
import { Ionicons } from "@expo/vector-icons";
import { useProfile } from "@src/store/useProfile";
import { useChatBadge } from "@src/store/useChatBadge";
import { Swipeable } from "react-native-gesture-handler";

export default function Chats() {
  const { user } = useAuth();
  const userId = user?.id ?? 0;
  const [items, setItems] = useState<Chat[]>([]);
  const { clear } = useNotifications();
  const profiles = useProfile((s) => s.profiles);
  const lastSeen = useChatBadge((s) => s.lastSeenByChat);

  const load = useCallback(async () => {
    const data = await listChats(user?.id);
    setItems(Array.isArray(data) ? data : []);
  }, [user?.id]);

  const handleDelete = (id: number) => {
    Alert.alert("Delete chat?", "Are you sure you want to delete chat?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (id === 0) {
            await deleteChat(0);
            load();
          } else {
            setItems((prev) => prev.filter((c) => c.id !== id));
            await deleteChat(id);
          }
        },
      },
    ]);
  };

  useFocusEffect(
    useCallback(() => {
      clear("labourer");
      load();
    }, [clear, load])
  );

  useEffect(() => {
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const renderRow = ({ item }: { item: Chat }) => {
    const otherId = item.memberIds?.find((id) => id !== userId) ??
      (item.workerId === userId ? item.managerId : item.workerId);
    const avatarUri = otherId ? profiles[otherId]?.avatarUri : undefined;
    const seen = lastSeen[item.id];
    const isUnread = item.lastTime
      ? !seen || parseDate(seen) < parseDate(item.lastTime)
      : false;

    return (
      <Swipeable
        renderRightActions={() => (
          <Pressable style={styles.delete} onPress={() => handleDelete(item.id)}>
            <Ionicons name="trash" size={20} color="#fff" />
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        )}
      >
        <Pressable
          onPress={() => router.push(`/(labourer)/chats/${item.id}`)}
          style={styles.row}
        >
          {item.id === 0 ? (
            <Image
              source={require("../../../assets/images/ConstructionAI.png")}
              style={styles.avatar}
            />
          ) : avatarUri ? (
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

          <View style={styles.right}>
            {isUnread && <View style={styles.unread} />}
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </View>
        </Pressable>
      </Swipeable>
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
  delete: {
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    width: 72,
    borderRadius: 12,
    marginLeft: 8,
  },
  deleteText: { color: "#fff", fontWeight: "600", marginTop: 4 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E5E7EB" },
  silhouette: { alignItems: "center", justifyContent: "center" },
  title: { fontWeight: "700", color: "#1F2937" },
  sub: { color: "#6B7280", marginTop: 2 },

  right: { flexDirection: "row", alignItems: "center", gap: 6 },
  unread: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#16A34A" },

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
