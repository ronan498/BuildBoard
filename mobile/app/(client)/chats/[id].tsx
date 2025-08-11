import { useEffect, useRef, useState } from "react";
import { View, Text, FlatList, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { listMessages, sendMessage, getSocket } from "@src/lib/api";

export default function ClientChatThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chatId = Number(id);
  const [items, setItems] = useState<any[]>([]);
  const [text, setText] = useState("");
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    let mounted = true;
    listMessages(chatId).then((m) => { if (mounted) setItems(m); });
    const s = getSocket();
    if (s) {
      s.emit("join", { chatId });
      s.on("message:new", (msg) => {
        if (msg.chat_id === chatId) {
          setItems((prev) => [...prev, msg]);
          listRef.current?.scrollToEnd({ animated: true });
        }
      });
    }
    return () => { mounted = false; s?.off("message:new"); };
  }, [chatId]);

  const onSend = async () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    const msg = await sendMessage(chatId, body);
    setItems((prev) => [...prev, msg]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={84}>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(m) => String(m.id)}
        renderItem={({ item }) => (
          <View style={[styles.msg, { alignSelf: "stretch" }]}>
            <Text style={styles.meta}>{item.username} • {new Date(item.created_at).toLocaleTimeString()}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />
      <View style={styles.inputRow}>
        <TextInput value={text} onChangeText={setText} placeholder="Type a message" style={styles.input} />
        <Pressable onPress={onSend} style={styles.send}><Text style={{ color:"#fff", fontWeight:"700" }}>Send</Text></Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  msg:{ padding:10, borderRadius:10, backgroundColor:"#F3F4F6" },
  meta:{ color:"#6B7280", fontSize:12, marginBottom:2 },
  body:{ fontSize:16 },
  inputRow:{ flexDirection:"row", padding:10, gap:8, borderTopWidth:1, borderColor:"#eee", backgroundColor:"#fff" },
  input:{ flex:1, borderWidth:1, borderColor:"#e5e5e5", borderRadius:10, paddingHorizontal:12, paddingVertical:10, backgroundColor:"#fff" },
  send:{ backgroundColor:"#1f6feb", paddingHorizontal:16, borderRadius:10, alignItems:"center", justifyContent:"center" }
});
