import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { listMessages, sendMessage, getSocket, type Message } from "@src/lib/api";
import { useAuth } from "@src/store/useAuth";
import { useProfile } from "@src/store/useProfile";
import { Ionicons } from "@expo/vector-icons";

export default function ClientChatThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chatId = Number(id);
  const { user } = useAuth();
  const myId = user?.id ?? 0;
  const profiles = useProfile((s) => s.profiles);
  const [items, setItems] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    let mounted = true;
    listMessages(chatId).then((m) => {
      if (mounted) setItems(m);
    });
    const s = getSocket();
    if (s) {
      s.emit("join", { chatId });
      const handler = (msg: Message) => {
        if (msg.chat_id === chatId) {
          setItems((prev) => [...prev, msg]);
          listRef.current?.scrollToEnd({ animated: true });
        }
      };
      s.on("message:new", handler);
      return () => {
        mounted = false;
        s.off("message:new", handler);
      };
    }
    return () => {
      mounted = false;
    };
  }, [chatId]);

  const onSend = useCallback(async () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    const msg = await sendMessage(chatId, body);
    setItems((prev) => [...prev, msg]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [chatId, text]);

  const renderItem = ({ item }: { item: Message }) => {
    const isMine = item.user_id === myId;
    const avatarUri = profiles[item.user_id || 0]?.avatarUri;
    const avatar = avatarUri ? (
      <Image source={{ uri: avatarUri }} style={styles.avatar} />
    ) : (
      <View style={[styles.avatar, styles.silhouette]}>
        <Ionicons name="person" size={18} color="#9CA3AF" />
      </View>
    );
    return (
      <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
        {!isMine && avatar}
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={styles.body}>{item.body}</Text>
          {item.created_at ? (
            <Text style={[styles.meta, isMine ? styles.metaMine : styles.metaTheirs]}>
              {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          ) : null}
        </View>
        {isMine && avatar}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={84}
    >
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(m) => String(m.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />
      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message"
          style={styles.input}
        />
        <Pressable onPress={onSend} style={styles.send}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    marginVertical: 4,
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  rowMine: { justifyContent: "flex-end" },
  rowTheirs: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "80%",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  bubbleMine: {
    backgroundColor: "#1f6feb",
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: "#F3F4F6",
    borderBottomLeftRadius: 4,
  },
  body: { fontSize: 16 },
  meta: { fontSize: 11, marginTop: 4 },
  metaMine: { color: "rgba(255,255,255,0.8)", textAlign: "right" },
  metaTheirs: { color: "#6B7280" },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#E5E7EB" },
  silhouette: { alignItems: "center", justifyContent: "center" },
  inputRow: {
    flexDirection: "row",
    padding: 10,
    gap: 8,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  send: {
    backgroundColor: "#1f6feb",
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});

