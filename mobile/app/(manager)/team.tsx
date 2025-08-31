import { useEffect, useState } from "react";
import { View, FlatList, Text, StyleSheet, Pressable, Modal, ScrollView, Image } from "react-native";
import { listManagerJobs, type Job } from "@src/lib/api";
import TopBar from "@src/components/TopBar";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@src/theme/tokens";
import { useAuth } from "@src/store/useAuth";
import { parseWhenToDates } from "@src/lib/date";
import { CreateTaskForm } from "./create-task";

export default function ManagerTeam() {
  const { user } = useAuth();
  const ownerId = user?.id;
  const [jobs, setJobs] = useState<Job[]>([]);
  const [taskOpen, setTaskOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [activeTab, setActiveTab] = useState<"team" | "tasks">("team");

  useEffect(() => {
    if (!ownerId) return;
    listManagerJobs(ownerId).then((all) => {
      const today = new Date().toISOString().slice(0, 10);
      const current = all.filter((job) => {
        const { start, end } = parseWhenToDates(job.when);
        if (start && start > today) return false;
        if (end && end < today) return false;
        return true;
      });
      setJobs(current);
    });
  }, [ownerId]);

  const renderItem = ({ item }: { item: Job }) => {
    const thumb = item.imageUri ?? "https://via.placeholder.com/120x88?text=Job";
    return (
      <Pressable
        onPress={() => {
          setActiveJob(item);
          setActiveTab("team");
          setDetailOpen(true);
        }}
      >
        <View style={styles.tile}>
          <Image source={{ uri: thumb }} style={styles.tileImg} />
          <Text style={styles.tileTitle} numberOfLines={1} ellipsizeMode="tail">
            {item.title}
          </Text>
          <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <TopBar />
      <View style={styles.headerRow}>
         <Text style={styles.headerTitle}>Current Jobs</Text>
        <Pressable style={styles.createBtn} onPress={() => setTaskOpen(true)}>
          <Ionicons name="add" size={18} />
          <Text style={styles.createText}>Create task</Text>
        </Pressable>
      </View>
      <FlatList
        contentContainerStyle={jobs.length ? { padding:12 } : { padding:12, flexGrow:1, justifyContent:"center" }}
        data={jobs}
        keyExtractor={(j) => String(j.id)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height:12 }} />}
        ListEmptyComponent={<Text style={styles.empty}>You have no current jobs.</Text>}
      />

      <Modal
        key={activeJob?.id}
        visible={detailOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setDetailOpen(false);
          setActiveJob(null);
        }}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modalHeader}>
            <Pressable
              onPress={() => {
                setDetailOpen(false);
                setActiveJob(null);
              }}
              style={styles.modalClose}
            >
              <Ionicons name="close" size={22} />
            </Pressable>
            <Text style={styles.modalTitle}>{activeJob?.title}</Text>
            <View style={{ width:34 }} />
          </View>
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleBtn, activeTab === "team" && styles.toggleActive]}
              onPress={() => setActiveTab("team")}
            >
              <Text
                style={[styles.toggleLabel, activeTab === "team" && styles.toggleLabelActive]}
              >
                Team
              </Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, activeTab === "tasks" && styles.toggleActive]}
              onPress={() => setActiveTab("tasks")}
            >
              <Text
                style={[styles.toggleLabel, activeTab === "tasks" && styles.toggleLabelActive]}
              >
                Tasks
              </Text>
            </Pressable>
          </View>
          {activeTab === "team" ? (
            <View style={{ flex:1 }} />
          ) : (
            <View style={{ flex:1 }} />
          )}
        </View>
      </Modal>

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
  tile:{ flexDirection:"row", alignItems:"center", padding:12, borderWidth:1, borderColor: Colors.border, borderRadius:12, backgroundColor:"#fff" },
  tileImg:{ width:48, height:48, borderRadius:8, marginRight:12, backgroundColor:"#f1f5f9" },
  tileTitle:{ flex:1, fontWeight:"600", color:"#1F2937" },
  empty:{ textAlign:"center", color:"#6B7280" },
  modalWrap:{ flex:1, backgroundColor:"#fff" },
  modalHeader:{ paddingHorizontal:12, paddingTop:14, paddingBottom:8, borderBottomWidth:1, borderColor:"#eee", flexDirection:"row", alignItems:"center", justifyContent:"space-between", gap:10 },
  modalClose:{ padding:6 },
  modalTitle:{ fontWeight:"800", fontSize:18, color:"#1F2937" },
  toggleRow:{ flexDirection:"row", margin:12, borderWidth:1, borderColor: Colors.border, borderRadius:8, overflow:"hidden" },
  toggleBtn:{ flex:1, paddingVertical:8, alignItems:"center" },
  toggleActive:{ backgroundColor: Colors.primary },
  toggleLabel:{ fontWeight:"600", color: Colors.muted },
  toggleLabelActive:{ color:"#fff" }
});
