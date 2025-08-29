import { useEffect, useState } from "react";
import { View, FlatList, Text, StyleSheet, Pressable, Modal, ScrollView, Share } from "react-native";
import { listTeam, createTeamInvite } from "@src/lib/api";
import TopBar from "@src/components/TopBar";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@src/theme/tokens";
import { CreateTaskForm } from "./create-task";

export default function ManagerTeam() {
  const [people, setPeople] = useState<any[]>([]);
  const [taskOpen, setTaskOpen] = useState(false);
  useEffect(() => { listTeam().then(setPeople); }, []);

  const invite = async () => {
    try {
      const { link } = await createTeamInvite();
      await Share.share({ message: link });
    } catch {}
  };

  return (
    <View style={styles.container}>
      <TopBar />
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>My Team</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable style={styles.createBtn} onPress={invite}>
            <Ionicons name="person-add" size={18} />
            <Text style={styles.createText}>Invite teammate</Text>
          </Pressable>
          <Pressable style={styles.createBtn} onPress={() => setTaskOpen(true)}>
            <Ionicons name="add" size={18} />
            <Text style={styles.createText}>Create task</Text>
          </Pressable>
        </View>
      </View>
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

      <Modal
        visible={taskOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setTaskOpen(false)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setTaskOpen(false)} style={styles.modalClose}>
              <Ionicons name="close" size={22} />
            </Pressable>
            <Text style={styles.modalTitle}>Create Task</Text>
            <View style={{ width:34 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding:16 }}>
            <CreateTaskForm onSubmit={() => setTaskOpen(false)} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:"#fff" },
  headerRow:{ paddingHorizontal:12, paddingTop:6, paddingBottom:10, flexDirection:"row", alignItems:"center", justifyContent:"space-between" },
  headerTitle:{ fontWeight:"800", fontSize:18, color:"#1F2937" },
  createBtn:{ flexDirection:"row", alignItems:"center", gap:6, borderWidth:1, borderColor: Colors.border, paddingVertical:8, paddingHorizontal:12, borderRadius:12, backgroundColor:"#fff" },
  createText:{ fontWeight:"700", color:"#1F2937" },
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
  modalWrap:{ flex:1, backgroundColor:"#fff" },
  modalHeader:{ paddingHorizontal:12, paddingTop:14, paddingBottom:8, borderBottomWidth:1, borderColor:"#eee", flexDirection:"row", alignItems:"center", justifyContent:"space-between", gap:10 },
  modalClose:{ padding:6 },
  modalTitle:{ fontWeight:"800", fontSize:18, color:"#1F2937" }
});
