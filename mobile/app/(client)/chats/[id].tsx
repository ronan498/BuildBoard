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
  LayoutAnimation,
  UIManager,
  StyleSheet,
  PanResponder,
  LayoutChangeEvent,
  Animated,
  Dimensions,
  BackHandler,
  Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@src/theme/tokens";
import {
  listMessages,
  sendMessage,
  getChat,
  getApplicationForChat,
  type Message,
  type Chat,
  getSocket,
  fetchProfile,
} from "@src/lib/api";
import { useAuth } from "@src/store/useAuth";
import { useNotifications } from "@src/store/useNotifications";
import { useChatBadge } from "@src/store/useChatBadge";
import { useProfile } from "@src/store/useProfile";
import Ionicons from "@expo/vector-icons/Ionicons";
import MarkdownText from "@src/components/MarkdownText";
import { parseDate } from "@src/lib/date";

export default function ClientChatDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chatId = Number(id);
  const { user, token } = useAuth();
  const myId = user?.id ?? 0;
  const myName = user?.username ?? "You";
  const profiles = useProfile((s) => s.profiles);
  const upsertProfile = useProfile((s) => s.upsertProfile);

  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<Chat | undefined>(undefined);
  const [appStatus, setAppStatus] = useState<"pending" | "accepted" | "declined" | null>(null);
  const [input, setInput] = useState("");
  const [composerHeight, setComposerHeight] = useState(54);

  const listRef = useRef<FlatList<Message>>(null);
  const initialScroll = useRef(true);
  const [ready, setReady] = useState(false);
  const [listHeight, setListHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const contentFitsRef = useRef(true);
  const contentFits = contentHeight <= listHeight;
  useEffect(() => {
    contentFitsRef.current = contentFits;
  }, [contentFits]);

  const load = useCallback(async (id: number = chatId) => {
    const [data, meta, app] = await Promise.all([
      listMessages(id),
      getChat(id),
      getApplicationForChat(id),
    ]);
    if (id !== chatId) return;
    setMessages(Array.isArray(data) ? data : []);
    setChat(meta);
    setAppStatus(app?.status ?? null);
    if (data.length) {
      const last = data[data.length - 1].created_at;
      useChatBadge.getState().markChatSeen(id, last);
    }
  }, [chatId]);

  useFocusEffect(
    useCallback(() => {
      load(chatId);
    }, [chatId, load])
  );

  useEffect(() => {
    if (!listHeight || !contentHeight) return;
    requestAnimationFrame(() => {
      if (initialScroll.current) {
        if (!contentFitsRef.current && messages.length) {
          const padding = composerHeight + Math.max(0, insets.bottom);
          listRef.current?.scrollToIndex({
            index: messages.length - 1,
            viewPosition: 1,
            viewOffset: padding,
            animated: false,
          });
        }
        setReady(true);
        initialScroll.current = false;
      }
    });
  }, [messages.length, listHeight, contentHeight, composerHeight, insets.bottom]);

  useEffect(() => {
    initialScroll.current = true;
    setReady(false);
  }, [chatId]);

  useEffect(() => {
    const s = getSocket();
    if (s) {
      s.emit("join", { chatId });
      const handler = (msg: Message) => {
        if (msg.chat_id === chatId) {
          setMessages((prev) => {
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
          if (!contentFitsRef.current) {
            listRef.current?.scrollToEnd({ animated: true });
          }
          useChatBadge.getState().markChatSeen(chatId, msg.created_at);
        }
      };
      s.on("message:new", handler);
      return () => {
        s.off("message:new", handler);
      };
    }
  }, [chatId]);

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

  // Load the other party's profile so we can display their name
  useEffect(() => {
    if (!chat || !token) return;
    const otherId =
      chat.memberIds?.find((id) => id !== myId) ??
      (myId === chat.managerId ? chat.workerId : chat.managerId);
    if (!otherId) return;
    const existing = profiles[otherId];
    if (existing && existing.name !== "Manager" && existing.name !== "Labourer") return;
    (async () => {
      const remote = await fetchProfile(otherId, token);
      if (remote) upsertProfile(remote);
    })();
  }, [chat, myId, token, profiles, upsertProfile]);


  const onSend = useCallback(async () => {
    const body = input.trim();
    if (!body) return;
    setInput("");

    const optimistic: Message = {
      id: -Date.now(),
      chat_id: chatId,
      user_id: myId,
      username: myName,
      body,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      await sendMessage(chatId, body, myName);
      useNotifications.getState().bumpMany(["manager", "labourer"]);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(body);
    }
  }, [chatId, input, myName, myId]);

  // ----- Always go back -----
  const goBack = useCallback(() => {
    router.back();
  }, []);

  // Android hardware back -> go back
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.back();
        return true;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => sub.remove();
    }, [])
  );

  // ----- Slide-to-go-back -----
  const screenW = Dimensions.get("window").width;
  const translateX = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      translateX.setValue(0);
    }, [translateX])
  );

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
            }).start(goBack);
          } else {
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          }
        },
      }),
    [goBack, screenW, translateX]
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

  const otherPartyId = useMemo(() => {
    if (!chat) return undefined;
    const fromMembers = chat.memberIds?.find((id) => id !== myId);
    if (fromMembers) return fromMembers;
    return myId === chat.managerId ? chat.workerId : chat.managerId;
  }, [chat, myId]);

  const otherProfile = otherPartyId ? profiles[otherPartyId] : undefined;

  const otherPartyName = useMemo(() => {
    const name = otherProfile?.name;
    if (name && name !== "Manager" && name !== "Labourer") return name;
    const msgName = messages.find(
      (m) => m.user_id !== myId && m.username !== "system"
    )?.username;
    if (msgName && msgName !== "Manager" && msgName !== "Labourer") return msgName;
    const title = chat?.title;
    if (title && !title.startsWith("Job:")) return title;
    return "Chat";
  }, [otherProfile, messages, myId, chat]);

  const goToProfile = useCallback(() => {
    if (!otherPartyId) return;
    const role = otherPartyId === chat?.managerId ? "manager" : "labourer";
    router.push({
      pathname: "/(client)/chats/profileDetails",
      params: {
        userId: String(otherPartyId),
        from: "chat",
        role,
        chatId: String(chatId),
        viewer: "client",
      },
    });
  }, [otherPartyId, chatId, chat]);

  const lastByUser = useMemo(() => {
    const map: Record<number, number> = {};
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.user_id != null && m.username !== "system" && map[m.user_id] == null) {
        map[m.user_id] = m.id;
      }
    }
    return map;
  }, [messages]);

  const [lastAnimatedId, setLastAnimatedId] = useState<number | null>(null);
  useEffect(() => {
    if (messages.length) {
      const id = messages[messages.length - 1].id;
      setLastAnimatedId(id);
      const t = setTimeout(() => setLastAnimatedId(null), 250);
      return () => clearTimeout(t);
    }
  }, [messages]);

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
        style={{ opacity, transform: [{ translateY }], maxWidth: "82%" }}
      >
        {children}
      </Animated.View>
    );
  };
  const renderItem = ({ item }: { item: Message; index: number }) => {
    const isSystem = item.username === "system";
    const isMine = !isSystem && item.user_id === myId;
    const avatarUri = profiles[item.user_id || 0]?.avatarUri;
    const showAvatar = !isSystem && item.id === lastByUser[item.user_id || 0];

    if (isSystem) {
      return (
        <View style={styles.systemWrap}>
          <MarkdownText style={styles.systemText}>{item.body}</MarkdownText>
        </View>
      );
    }

    const avatar = avatarUri ? (
      <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : item.user_id === 0 ? (
      <Image
        source={require("../../../assets/images/ConstructionAI.png")}
        style={styles.avatar}
      />
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
            <MarkdownText style={[styles.text, isMine ? styles.textMine : styles.textTheirs]}>
              {item.body}
            </MarkdownText>
            {item.created_at ? (
              <Text style={[styles.time, isMine ? styles.timeMine : styles.timeTheirs]}>
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

  const keyExtractor = (m: Message) => String(m.id);
  const onComposerLayout = (e: LayoutChangeEvent) =>
    setComposerHeight(Math.max(40, Math.round(e.nativeEvent.layout.height)));

  return (
    <>
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
            <Pressable onPress={goBack} hitSlop={12}>
              <Ionicons name="chevron-back" size={24} color="#111" />
            </Pressable>
            {otherPartyId ? (
              <Pressable onPress={goToProfile} hitSlop={12}>
                {otherProfile?.avatarUri ? (
                  <Image source={{ uri: otherProfile.avatarUri }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.silhouette]}>
                    <Ionicons name="person" size={18} color="#9CA3AF" />
                  </View>
                )}
              </Pressable>
            ) : (
              <View style={[styles.avatar, styles.silhouette]}>
                <Ionicons name="person" size={18} color="#9CA3AF" />
              </View>
            )}
            <Pressable
              onPress={goToProfile}
              disabled={!otherPartyId}
              style={{ flex: 1 }}
              hitSlop={12}
            >
              <Text style={styles.headerTitle} numberOfLines={1}>
                {otherPartyName}
              </Text>
            </Pressable>
            <View style={{ width: 18 }} />
          </View>

          {/* Status chip */}
          {appStatus && (
            <View style={styles.statusRow}>
              <Text
                style={[
                  styles.statusChip,
                  appStatus === "accepted"
                    ? styles.statusAccepted
                    : appStatus === "declined"
                    ? styles.statusDeclined
                    : styles.statusPending,
                ]}
              >
                {appStatus === "pending" ? "Application pending" : `Application ${appStatus}`}
              </Text>
            </View>
          )}

            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: messages.length === 0 ? "center" : "flex-start",
                padding: 12,
                paddingBottom: composerHeight + Math.max(0, insets.bottom),
              }}
              onContentSizeChange={(_, h) => setContentHeight(h)}
              onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
              onScrollBeginDrag={Keyboard.dismiss}
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              keyboardShouldPersistTaps="handled"
              onScrollToIndexFailed={() => {
                listRef.current?.scrollToEnd({ animated: false });
              }}
              style={{ opacity: ready ? 1 : 0 }}
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "600", color: "#111" },

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
    overflow: "hidden",
  },
  statusPending: { backgroundColor: "#FFF4CC", color: "#8A6A00" },
  statusAccepted: { backgroundColor: "#E9F9EE", color: "#1E7F3E" },
  statusDeclined: { backgroundColor: "#FDE7E7", color: "#A03030" },

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

  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#E5E7EB" },
  silhouette: { alignItems: "center", justifyContent: "center" },

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