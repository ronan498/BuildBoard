import { useEffect, useState } from "react";
import { View, FlatList, Text, StyleSheet } from "react-native";
import { listTeam } from "@src/lib/api";
import TopBar from "@src/components/TopBar";

export default function ManagerTeam() {
  const [people, setPeople] = useState<any[]>([]);
  useEffect(() => { listTeam().then(setPeople); }, []);

  return (
    <View style={styles.container}>
      <TopBar />
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
  row:{ flexDirection:"row", alignItems:"center", paddingVertical:10, paddingHorizontal:12 },
  avatar:{ width:40, height:40, borderRadius:20, backgroundColor:"#f1f5f9",
           alignItems:"center", justifyContent:"center", marginRight:12, borderWidth:1, borderColor:"#eee" },
  initials:{ fontWeight:"700" },
  name:{ fontWeight:"600" },
  role:{ color:"#666", marginTop:2 },
  status:{ textTransform:"capitalize" },
  online:{ color:"#16a34a" },
  offline:{ color:"#9ca3af" },
  sep:{ height:1, backgroundColor:"#f0f0f0", marginHorizontal:12 }
});
