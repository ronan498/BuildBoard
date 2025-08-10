import { useEffect, useState, useCallback } from "react";
import { View, FlatList, Text, Pressable, StyleSheet } from "react-native";
import TopBar from "@src/components/TopBar";
import { listChats, type Chat } from "@src/lib/api";
import { useAuth } from "@src/store/useAuth";
import { useFocusEffect, router } from "expo-router";
import { useNotifications } from "@src/store/useNotifications";
import { Ionicons } from "@expo/vector-icons";

export default function Chats() {
  const { user } = useAuth();
  const [items, setItems] = useState<Chat[]>([]);
  const { clear } = useNotifications();

  const load = async () => {
    const data = await listChats(user?.id);
    setItems(data);
  };

  useFocusEffect(useCallback(() => {
    clear("labourer");
    load();
  }, [user?.id]));

  useEffect(() => { load(); }, []);

  return (
    <View style={{ flex:1, backgroundColor:"#fff" }}>
      <TopBar />
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push({ pathname: "/(labourer)/chats/[id]", params: { id: String(item.id) } })}>
            <Ionicons name="chatbubbles-outline" size={22} />
            <View style={{ flex:1 }}>
              <Text style={styles.title}>{item.title}</Text>
              {!!item.lastMessage && <Text style={styles.sub}>{item.lastMessage}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height:8 }} />}
        contentContainerStyle={{ padding:12 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row:{ flexDirection:"row", alignItems:"center", gap:10, padding:12, borderWidth:1, borderColor:"#eee", borderRadius:12, backgroundColor:"#fff" },
  title:{ fontWeight:"700", color:"#1F2937" },
  sub:{ color:"#6B7280", marginTop:2 }
});
