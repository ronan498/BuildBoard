import { useEffect, useRef, useState } from "react";
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, Keyboard, PanResponder
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import TopBar from "@src/components/TopBar";
import {
  getChat, listMessages, sendMessage,
  getApplicationForChat, setApplicationStatus,
  type Message, type Application
} from "@src/lib/api";
import { useNotifications } from "@src/store/useNotifications";

export default function ChatThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chatId = Number(id);

  const [title, setTitle] = useState<string>("Chat");
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [app, setApp] = useState<Application | undefined>(undefined);
  const { bump } = useNotifications();

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
      onPanResponderMove: (_e, g) => { if (g.dy > 12 && g.vy > 0) Keyboard.dismiss(); },
      onPanResponderRelease: (_e, g) => { if (g.dy > 12 && g.vy > 0) Keyboard.dismiss(); }
    })
  ).current;

  const load = async () => {
    const c = await getChat(chatId);
    if (c?.title) setTitle(c.title);
    const m = await listMessages(chatId);
    setMsgs(m);
    const a = await getApplicationForChat(chatId);
    setApp(a);
  };

  useEffect(() => { load(); }, [chatId]);

  const onSend = async () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    const temp: Message = { id: Date.now(), chat_id: chatId, username: "You", body, created_at: new Date().toISOString() };
    setMsgs(prev => [...prev, temp]);
    await sendMessage(chatId, body, "You");
    load();
  };

  const accept = async () => {
    await setApplicationStatus(chatId, "accepted");
    bump("labourer", 1); // notify worker (badge)
    load();
  };
  const decline = async () => {
    await setApplicationStatus(chatId, "declined");
    load();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex:1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 56 : 0}
    >
      <View style={{ flex:1, backgroundColor:"#fff" }}>
        <TopBar />
        <Text style={styles.header}>{title}</Text>

        {app?.status === "pending" && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>Application is pending</Text>
            <View style={{ flexDirection:"row", gap:8 }}>
              <Pressable onPress={decline} style={[styles.actionBtn, { backgroundColor:"#ef4444" }]}>
                <Text style={{ color:"#fff", fontWeight:"800" }}>Decline</Text>
              </Pressable>
              <Pressable onPress={accept} style={[styles.actionBtn, { backgroundColor:"#22c55e" }]}>
                <Text style={{ color:"#fff", fontWeight:"800" }}>Accept</Text>
              </Pressable>
            </View>
          </View>
        )}

        {app?.status && app.status !== "pending" && (
          <View style={[styles.banner, { backgroundColor: app.status === "accepted" ? "#DCFCE7" : "#FEE2E2" }]}>
            <Text style={[styles.bannerText, { color:"#1F2937" }]}>Application {app.status}</Text>
          </View>
        )}

        <FlatList
          data={msgs}
          keyExtractor={(m) => String(m.id)}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.username === "You" ? styles.me : item.username === "system" ? styles.system : styles.them
              ]}
            >
              <Text style={styles.msg}>{item.body}</Text>
            </View>
          )}
          contentContainerStyle={{ padding:12, gap:8 }}
          onScrollBeginDrag={() => Keyboard.dismiss()}
          keyboardShouldPersistTaps="handled"
        />

        <View style={styles.inputRow} {...pan.panHandlers}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message..."
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            returnKeyType="send"
            onSubmitEditing={onSend}
          />
          <Pressable onPress={onSend} style={styles.send}>
            <Text style={{ color:"#fff", fontWeight:"800" }}>Send</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header:{ fontWeight:"800", fontSize:18, paddingHorizontal:12, paddingTop:6, color:"#1F2937" },
  banner:{ marginHorizontal:12, marginTop:8, marginBottom:4, padding:10, borderRadius:12, backgroundColor:"#F3F4F6", flexDirection:"row", alignItems:"center", justifyContent:"space-between" },
  bannerText:{ color:"#1F2937", fontWeight:"700" },
  actionBtn:{ paddingVertical:8, paddingHorizontal:12, borderRadius:10 },

  bubble:{ padding:10, borderRadius:10, maxWidth:"85%" },
  me:{ backgroundColor:"#DCFCE7", alignSelf:"flex-end" },
  them:{ backgroundColor:"#F3F4F6", alignSelf:"flex-start" },
  system:{ backgroundColor:"#EEE", alignSelf:"center" },
  msg:{ color:"#1F2937" },

  inputRow:{
    flexDirection:"row", gap:8, paddingHorizontal:12, paddingVertical:10,
    borderTopWidth:1, borderColor:"#eee", backgroundColor:"#fff"
  },
  input:{
    flex:1, borderWidth:1, borderColor:"#e5e7eb", borderRadius:12,
    paddingHorizontal:12, paddingVertical:10, backgroundColor:"#F9FAFB", color:"#1F2937"
  },
  send:{ backgroundColor:"#22c55e", paddingHorizontal:16, borderRadius:12, justifyContent:"center" }
});
