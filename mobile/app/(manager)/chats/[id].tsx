import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  StyleSheet,
  PanResponder,
  LayoutChangeEvent,
  Animated,
  Dimensions,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@src/theme/tokens";
import {
  listMessages,
  sendMessage,
  getChat,
  getApplicationForChat,
  setApplicationStatus,
  type Message,
  type Chat,
} from "@src/lib/api";
import { useAuth } from "@src/store/useAuth";

const GO_BACK_TO = "/(manager)/chats";

export default function ManagerChatDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chatId = Number(id);
  const { user } = useAuth();
  const myName = user?.username ?? "You";

  const nav = useNavigation();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<Chat | undefined>(undefined);
  const [appStatus, setAppStatus] = useState<"pending" | "accepted" | "declined" | null>(null);
  const [input, setInput] = useState("");
  const [composerHeight, setComposerHeight] = useState(54);

  const listRef = useRef<FlatList<Message>>(null);

  const load = useCallback(async () => {
    const [data, meta, app] = await Promise.all([
      listMessages(chatId),
      getChat(chatId),
      getApplicationForChat(chatId),
    ]);
    setMessages(Array.isArray(data) ? data : []);
    setChat(meta);
    setAppStatus(app?.status ?? null);
  }, [chatId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!active) return;
        await load();
        const t = setInterval(load, 4000);
        return () => clearInterval(t);
      })();
      return () => {
        active = false;
      };
    }, [load])
  );

  useEffect(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [messages.length]);

  const onSend = useCallback(async () => {
    const body = input.trim();
    if (!body) return;
    setInput("");

    const optimistic: Message = {
      id: Date.now(),
      chat_id: chatId,
      username: myName,
      body,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      await sendMessage(chatId, body, myName);
      await load();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(body);
    }
  }, [chatId, input, myName, load]);

  // ----- Slide-to-go-back -----
  const screenW = Dimensions.get("window").width;
  const translateX = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      translateX.setValue(0);
    }, [translateX])
  );

  const goToList = useCallback(() => {
    if (nav && typeof (nav as any).canGoBack === "function" && (nav as any).canGoBack()) {
      (nav as any).goBack();
    } else {
      router.replace(GO_BACK_TO);
    }
  }, [nav]);

  const panBackResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) && g.dx > 0,
        onPanResponderMove: (_, g) => {
          if (g.dx > 0) translateX.setValue(g.dx);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dx > 80) {
            Animated.timing(translateX, {
              toValue: screenW,
              duration: 160,
              useNativeDriver: true,
            }).start(goToList);
          } else {
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          }
        },
      }),
    [goToList, screenW, translateX]
  );

  // Swipe down on composer to dismiss keyboard
  const panKeyboardResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
        onPanResponderMove: (_, g) => {
          if (g.dy > 30) Keyboard.dismiss();
        },
      }),
    []
  );

  const otherPartyName = useMemo(() => {
    const other =
      messages.find((m) => m.username !== myName && m.username !== "system")?.username ||
      chat?.title ||
      "Chat";
    return other;
  }, [messages, myName, chat]);

  const handleDecision = useCallback(
    async (decision: "accepted" | "declined") => {
      await setApplicationStatus(chatId, decision);
      setAppStatus(decision);
      await load();
    },
    [chatId, load]
  );

  const renderItem = ({ item }: { item: Message }) => {
    const isSystem = item.username === "system";
    const isMine = !isSystem && item.username === myName;

    if (isSystem) {
      return (
        <View style={styles.systemWrap}>
          <Text style={styles.systemText}>{item.body}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={[styles.text, isMine ? styles.textMine : styles.textTheirs]}>{item.body}</Text>
          {item.created_at ? (
            <Text style={[styles.time, isMine ? styles.timeMine : styles.timeTheirs]}>
              {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  const keyExtractor = (m: Message) => String(m.id);
  const onComposerLayout = (e: LayoutChangeEvent) =>
    setComposerHeight(Math.max(40, Math.round(e.nativeEvent.layout.height)));

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 5 : 0}
      >
        <Animated.View
          style={[styles.container, { transform: [{ translateX }] }]}
          {...panBackResponder.panHandlers}
        >
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
            <Pressable onPress={goToList} hitSlop={12}>
              <Text style={styles.headerBack}>‹</Text>
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {otherPartyName}
            </Text>
            <View style={{ width: 18 }} />
          </View>

          {/* Manager decision banner */}
          {appStatus === "pending" && (
            <View style={styles.banner}>
              <Text style={styles.bannerText}>Application pending</Text>
              <View style={styles.bannerBtns}>
                <Pressable
                  onPress={() => handleDecision("declined")}
                  style={({ pressed }) => [styles.declineBtn, pressed && { opacity: 0.8 }]}
                >
                  <Text style={styles.declineLabel}>Decline</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDecision("accepted")}
                  style={({ pressed }) => [styles.acceptBtn, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.acceptLabel}>Accept</Text>
                </Pressable>
              </View>
            </View>
          )}

          {appStatus && appStatus !== "pending" && (
            <View style={styles.statusRow}>
              <Text
                style={[
                  styles.statusChip,
                  appStatus === "accepted" ? styles.statusAccepted : styles.statusDeclined,
                ]}
              >
                {`Application ${appStatus}`}
              </Text>
            </View>
          )}

          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={{
              padding: 12,
              paddingBottom: composerHeight + Math.max(0, insets.bottom),
            }}
            onScrollBeginDrag={Keyboard.dismiss}
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={{ padding: 24 }}>
                <Text style={{ color: "#666" }}>No messages yet. Say hi 👋</Text>
              </View>
            }
          />

          {/* Composer */}
          <View
            onLayout={onComposerLayout}
            style={[styles.composerWrap, { paddingBottom: Math.max(0, insets.bottom * 0.1) }]}
            {...panKeyboardResponder.panHandlers}
          >
            <View style={styles.inputRow}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Type a message"
                placeholderTextColor="#999"
                style={styles.input}
                multiline
                autoCapitalize="sentences"
                returnKeyType="send"
                onSubmitEditing={onSend}
              />
              <Pressable onPress={onSend} style={({ pressed }) => [styles.sendBtn, pressed && { opacity: 0.7 }]}>
                <Text style={styles.sendLabel}>Send</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EAEAEA",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerBack: { fontSize: 26, lineHeight: 26, color: "#6B7280", paddingRight: 6 }, // grey chevron
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "600", color: "#111" },

  banner: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFF4CC",
    borderBottomColor: "#F1F2F4",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bannerText: { color: "#6B5B00", marginBottom: 8, fontWeight: "600" },
  bannerBtns: { flexDirection: "row", gap: 8 },
  declineBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F3D6D6",
  },
  declineLabel: { color: "#A03030", fontWeight: "600" },
  acceptBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  acceptLabel: { color: "#fff", fontWeight: "700" },

  statusRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomColor: "#F1F2F4",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statusChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 12,
  },
  statusAccepted: { backgroundColor: "#E9F9EE", color: "#1E7F3E" },
  statusDeclined: { backgroundColor: "#FDE7E7", color: "#A03030" },

  row: { width: "100%", marginVertical: 4, paddingHorizontal: 6, flexDirection: "row" },
  rowMine: { justifyContent: "flex-end" },
  rowTheirs: { justifyContent: "flex-start" },

  bubble: {
    maxWidth: "82%",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  bubbleMine: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: "#F0F1F3",
    borderBottomLeftRadius: 4,
  },

  text: { fontSize: 16, lineHeight: 20 },
  textMine: { color: "#fff" },
  textTheirs: { color: "#111" },

  time: { fontSize: 11, marginTop: 4 },
  timeMine: { color: "rgba(255,255,255,0.8)", textAlign: "right" },
  timeTheirs: { color: "#888" },

  systemWrap: { width: "100%", alignItems: "center", marginVertical: 6 },
  systemText: { fontSize: 12, color: "#777" },

  composerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E4E6EA",
    paddingTop: 2,
    paddingHorizontal: 10,
  },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D9DCE1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 16,
  },
  sendBtn: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  sendLabel: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
