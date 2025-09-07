import { useEffect, useState } from "react";
import { View, FlatList, Text, StyleSheet, Pressable, Image } from "react-native";
import {
  listTeam,
  listConnectionRequests,
  respondConnectionRequest,
  type ConnectionRequest,
} from "@src/lib/api";
import TopBar from "@src/components/TopBar";

export default function Team() {
  const [people, setPeople] = useState<any[]>([]);
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  useEffect(() => {
    listTeam().then(setPeople);
    listConnectionRequests().then(setRequests);
  }, []);

  const handleRespond = async (id: number, accept: boolean) => {
    await respondConnectionRequest(id, accept);
    setRequests((r) => r.filter((req) => req.id !== id));
  };

  return (
    <View style={styles.container}>
      <TopBar />
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Tasks</Text>
      </View>
      {requests.length > 0 && (
        <View style={styles.reqContainer}>
          {requests.map((r) => {
            const thumb =
              r.user.avatarUri || "https://via.placeholder.com/96x96?text=User";
            return (
              <View key={r.id} style={styles.reqRow}>
                <Image source={{ uri: thumb }} style={styles.reqAvatar} />
                <Text style={styles.reqName}>{r.user.username}</Text>
                <View style={styles.reqActions}>
                  <Pressable
                    style={[styles.reqBtn, styles.accept]}
                    onPress={() => handleRespond(r.id, true)}
                  >
                    <Text style={styles.reqBtnText}>Accept</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.reqBtn, styles.decline]}
                    onPress={() => handleRespond(r.id, false)}
                  >
                    <Text style={styles.reqBtnText}>Decline</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
      <FlatList
        contentContainerStyle={{ padding:12 }}
        data={people}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.initials}>
                {item.name.split(" ").map((n:string)=>n[0]).slice(0,2).join("").toUpperCase()}
              </Text>
            </View>
            <View style={{ flex:1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.role}>{item.role}</Text>
            </View>
            <Text style={[styles.status, item.status==="online" ? styles.online : styles.offline]}>
              {item.status}
            </Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:"#fff" },
  headerRow:{ paddingHorizontal:12, paddingTop:6, paddingBottom:10, flexDirection:"row", alignItems:"center", justifyContent:"space-between" },
  headerTitle:{ fontWeight:"800", fontSize:18, color:"#1F2937" },
  reqContainer:{ paddingHorizontal:12, paddingBottom:12 },
  reqRow:{ flexDirection:"row", alignItems:"center", marginBottom:8 },
  reqAvatar:{ width:40, height:40, borderRadius:20, marginRight:12, backgroundColor:"#f1f5f9" },
  reqName:{ flex:1, fontWeight:"600" },
  reqActions:{ flexDirection:"row", gap:8 },
  reqBtn:{ paddingHorizontal:8, paddingVertical:6, borderRadius:6 },
  accept:{ backgroundColor:"#16a34a" },
  decline:{ backgroundColor:"#dc2626" },
  reqBtnText:{ color:"#fff", fontSize:12 },
  row:{ flexDirection:"row", alignItems:"center", paddingVertical:10, paddingHorizontal:12 },
  avatar:{ width:40, height:40, borderRadius:20, backgroundColor:"#f1f5f9",
           alignItems:"center", justifyContent:"center", marginRight:12, borderWidth:1, borderColor:"#eee" },
  initials:{ fontWeight:"700" },
  name:{ fontWeight:"600" },
  role:{ color:"#666", marginTop:2 },
  status:{ textTransform:"capitalize" },
  online:{ color:"#16a34a" },
  offline:{ color:"#9ca3af" },
  sep:{ height:1, backgroundColor:"#f0f0f0", marginHorizontal:12 },
  badge:{
    position:"absolute",
    top:0,
    right:0,
    backgroundColor:"#dc2626",
    borderRadius:8,
    minWidth:16,
    height:16,
    alignItems:"center",
    justifyContent:"center",
    paddingHorizontal:2,
  },
  badgeText:{
    color:"#fff",
    fontSize:10,
    fontWeight:"700",
  }
});
