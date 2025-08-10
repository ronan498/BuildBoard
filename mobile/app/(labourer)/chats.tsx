import { useEffect, useState } from "react";
import { View, FlatList, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { listChats } from "@src/lib/api";
import { router } from "expo-router";
import TopBar from "@src/components/TopBar";

export default function Chats() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { listChats().then(setItems); }, []);
  const filtered = items.filter((t:any) =>
    ((t.title ?? "") + " " + (t.lastMessage ?? "")).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <TopBar />
      <View style={{ padding:12 }}>
        <TextInput placeholder="Search chats" value={q} onChangeText={setQ} style={styles.search} />
        <FlatList
          data={filtered}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => {
            const title: string = item.title ?? "Chat";
            const initial = title.slice(0, 1).toUpperCase();
            return (
              <Pressable
                style={styles.row}
                onPress={() => router.push({ pathname: "/(labourer)/chats/[id]", params: { id: String(item.id) } })}
              >
                <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{title}</Text>
                  <Text numberOfLines={1} style={styles.preview}>{item.lastMessage ?? ""}</Text>
                </View>
                <Text style={styles.time}>{item.lastTime ?? ""}</Text>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:"#fff" },
  search:{ borderWidth:1, borderColor:"#e5e5e5", borderRadius:12, padding:10, marginBottom:8 },
  row:{ flexDirection:"row", alignItems:"center", paddingVertical:10 },
  avatar:{ width:40, height:40, borderRadius:20, alignItems:"center", justifyContent:"center",
           borderWidth:1, borderColor:"#eee", marginRight:12, backgroundColor:"#f6f8fa" },
  avatarText:{ fontWeight:"700" },
  name:{ fontWeight:"600" },
  preview:{ color:"#666", marginTop:2 },
  time:{ color:"#999", marginLeft:8 },
  sep:{ height:1, backgroundColor:"#f0f0f0" }
});
