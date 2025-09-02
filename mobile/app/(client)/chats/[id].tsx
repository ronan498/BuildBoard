import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
  Animated,
  Keyboard,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { listMessages, sendMessage, getSocket, type Message } from "@src/lib/api";
import { parseDate } from "@src/lib/date";
import { useAuth } from "@src/store/useAuth";
import { useProfile } from "@src/store/useProfile";
import { Ionicons } from "@expo/vector-icons";
import MarkdownText from "@src/components/MarkdownText";

export default function ClientChatThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chatId = Number(id);
  const { user } = useAuth();
  const myId = user?.id ?? 0;
  const myName = user?.username ?? "You";
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
          setItems((prev) => {
            const idx = prev.findIndex(
              (m) => m.id < 0 && m.body === msg.body && m.user_id === msg.user_id
            );
            if (idx !== -1) {
              const copy = prev.slice();
              copy[idx] = msg;
              return copy;
            }
            return [...prev, msg];
          });
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
    const optimistic: Message = {
      id: -Date.now(),
      chat_id: chatId,
      user_id: myId,
      username: myName,
      body,
      created_at: new Date().toISOString(),
    };
    setItems((prev) => [...prev, optimistic]);
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    try {
      await sendMessage(chatId, body);
    } catch {
      setItems((prev) => prev.filter((m) => m.id !== optimistic.id));
      setText(body);
    }
  }, [chatId, text, myId, myName]);

  useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const lastByUser = useMemo(() => {
    const map: Record<number, number> = {};
    for (let i = items.length - 1; i >= 0; i--) {
      const m = items[i];
      if (m.user_id != null && map[m.user_id] == null) {
        map[m.user_id] = m.id;
      }
    }
    return map;
  }, [items]);

  const [lastAnimatedId, setLastAnimatedId] = useState<number | null>(null);
  useEffect(() => {
    if (items.length) {
      const id = items[items.length - 1].id;
      setLastAnimatedId(id);
      const t = setTimeout(() => setLastAnimatedId(null), 250);
      return () => clearTimeout(t);
    }
  }, [items.length]);
  const AnimatedMessage = ({
    children,
    animate,
  }: {
    children: React.ReactNode;
    animate?: boolean;
  }) => {
    const opacity = useRef(new Animated.Value(animate ? 0 : 1)).current;
    const translateY = useRef(new Animated.Value(animate ? 4 : 0)).current;
    useEffect(() => {
      if (animate) {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [animate, opacity, translateY]);
    return (
      <Animated.View
        style={{ opacity, transform: [{ translateY }], maxWidth: "80%" }}
      >
        {children}
      </Animated.View>
    );
  };

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const isMine = item.user_id === myId;
    const avatarUri = profiles[item.user_id || 0]?.avatarUri;
    const showAvatar = item.user_id != null && item.id === lastByUser[item.user_id];
    const avatar = avatarUri ? (
      <Image source={{ uri: avatarUri }} style={styles.avatar} />
    ) : (
      <View style={[styles.avatar, styles.silhouette]}>
        <Ionicons name="person" size={18} color="#9CA3AF" />
      </View>
    );
    const animate = item.id === lastAnimatedId;
    return (
      <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
        {!isMine && showAvatar && avatar}
        <AnimatedMessage animate={animate}>
          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
            <MarkdownText style={styles.body}>{item.body}</MarkdownText>
            {item.created_at ? (
              <Text style={[styles.meta, isMine ? styles.metaMine : styles.metaTheirs]}>
                {parseDate(item.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            ) : null}
          </View>
        </AnimatedMessage>
        {isMine && showAvatar && avatar}
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
    maxWidth: "100%",
    minWidth: 60,
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

