import { useEffect, useState } from "react";
import { View, FlatList, Text, StyleSheet, Pressable, Modal, Image, TextInput } from "react-native";
import {
  listManagerJobs,
  listJobWorkers,
  listConnectionRequests,
  respondConnectionRequest,
  listJobTasks,
  createTask,
  type Job,
  type ConnectionRequest,
  type Task,
} from "@src/lib/api";
import TopBar from "@src/components/TopBar";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors } from "@src/theme/tokens";
import { useAuth } from "@src/store/useAuth";
import { parseWhenToDates } from "@src/lib/date";

export default function ManagerTeam() {
  const { user } = useAuth();
  const ownerId = user?.id;
  const [jobs, setJobs] = useState<Job[]>([]);
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [activeTab, setActiveTab] = useState<"team" | "tasks">("team");
  const [workers, setWorkers] = useState<{ id: number; name: string; avatarUri?: string }[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");

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

  useEffect(() => {
    listConnectionRequests().then(setRequests);
  }, []);

  useEffect(() => {
    if (detailOpen && activeTab === "team" && activeJob?.id) {
      listJobWorkers(activeJob.id).then(setWorkers);
    }
  }, [detailOpen, activeTab, activeJob?.id]);
  
  useEffect(() => {
    if (detailOpen && activeTab === "tasks" && activeJob?.id) {
      listJobTasks(activeJob.id).then(setTasks);
    }
  }, [detailOpen, activeTab, activeJob?.id]);

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

  const renderWorker = ({ item }: { item: { id: number; name: string; avatarUri?: string } }) => {
    const thumb = item.avatarUri ?? "https://via.placeholder.com/96x96?text=User";
    return (
      <View style={styles.workerRow}>
        <Image source={{ uri: thumb }} style={styles.workerAvatar} />
        <Text style={styles.workerName}>{item.name}</Text>
      </View>
    );
  };

  const renderTask = ({ item }: { item: Task }) => (
    <View style={styles.taskRow}>
      <Text style={styles.taskTitle}>{item.title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TopBar />
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Teams</Text>
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
                    onPress={async () => {
                      await respondConnectionRequest(r.id, true);
                      setRequests((p) => p.filter((q) => q.id !== r.id));
                    }}
                  >
                    <Text style={styles.reqBtnText}>Accept</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.reqBtn, styles.decline]}
                    onPress={async () => {
                      await respondConnectionRequest(r.id, false);
                      setRequests((p) => p.filter((q) => q.id !== r.id));
                    }}
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
            <FlatList
              contentContainerStyle={workers.length ? { padding:12 } : { padding:12, flexGrow:1, justifyContent:"center" }}
              data={workers}
              keyExtractor={(w) => String(w.id)}
              renderItem={renderWorker}
              ItemSeparatorComponent={() => <View style={{ height:12 }} />}
              ListEmptyComponent={<Text style={styles.empty}>No team members.</Text>}
            />
          ) : (
                        <View style={{ flex:1 }}>
              <View style={styles.taskHeader}>
                <Pressable style={styles.createBtn} onPress={() => setTaskOpen(true)}>
                  <Ionicons name="add" size={20} color="#1F2937" />
                  <Text style={styles.createText}>Create Task</Text>
                </Pressable>
              </View>
              <FlatList
                contentContainerStyle={tasks.length ? { padding:12 } : { padding:12, flexGrow:1, justifyContent:"center" }}
                data={tasks}
                keyExtractor={(t) => String(t.id)}
                renderItem={renderTask}
                ItemSeparatorComponent={() => <View style={{ height:12 }} />}
                ListEmptyComponent={<Text style={styles.empty}>No tasks.</Text>}
              />
              <Modal
                visible={taskOpen}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setTaskOpen(false)}
              >
                <View style={styles.taskModalWrap}>
                  <View style={styles.taskModalHeader}>
                    <Pressable onPress={() => setTaskOpen(false)} style={styles.modalClose}>
                      <Ionicons name="close" size={22} />
                    </Pressable>
                    <Text style={styles.modalTitle}>New Task</Text>
                    <View style={{ width:34 }} />
                  </View>
                  <View style={{ padding:12 }}>
                    <TextInput
                      placeholder="Title"
                      value={taskTitle}
                      onChangeText={setTaskTitle}
                      style={styles.taskInput}
                      placeholderTextColor="#9CA3AF"
                    />
                    <TextInput
                      placeholder="Description"
                      value={taskDesc}
                      onChangeText={setTaskDesc}
                      style={[styles.taskInput, { height:96, textAlignVertical:"top", marginTop:12 }]}
                      placeholderTextColor="#9CA3AF"
                      multiline
                    />
                    <Pressable
                      style={styles.taskSubmit}
                      onPress={async () => {
                        if (!activeJob?.id || !taskTitle) return;
                        await createTask({ title: taskTitle, description: taskDesc, jobId: activeJob.id });
                        setTaskTitle("");
                        setTaskDesc("");
                        setTaskOpen(false);
                        const refreshed = await listJobTasks(activeJob.id);
                        setTasks(refreshed);
                      }}
                    >
                      <Text style={styles.taskSubmitText}>Create</Text>
                    </Pressable>
                  </View>
                </View>
              </Modal>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:"#fff" },
  headerRow:{ paddingHorizontal:12, paddingTop:6, paddingBottom:10, flexDirection:"row", alignItems:"center" },
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
  toggleLabelActive:{ color:"#fff" },
  workerRow:{ flexDirection:"row", alignItems:"center", padding:12, borderWidth:1, borderColor: Colors.border, borderRadius:12, backgroundColor:"#fff" },
  workerAvatar:{ width:48, height:48, borderRadius:24, marginRight:12, backgroundColor:"#f1f5f9" },
  workerName:{ fontWeight:"600", color:"#1F2937" },
  taskHeader:{ paddingHorizontal:12, paddingTop:6, paddingBottom:10, flexDirection:"row", justifyContent:"flex-end" },
  createBtn:{ flexDirection:"row", alignItems:"center", gap:6, borderWidth:1, borderColor: Colors.border, paddingVertical:8, paddingHorizontal:12, borderRadius:12, backgroundColor:"#fff" },
  createText:{ fontWeight:"700", color:"#1F2937" },
  taskRow:{ flexDirection:"row", alignItems:"center", padding:12, borderWidth:1, borderColor: Colors.border, borderRadius:12, backgroundColor:"#fff" },
  taskTitle:{ fontWeight:"600", color:"#1F2937" },
  taskModalWrap:{ flex:1, backgroundColor:"#fff" },
  taskModalHeader:{ paddingHorizontal:12, paddingTop:14, paddingBottom:8, borderBottomWidth:1, borderColor:"#eee", flexDirection:"row", alignItems:"center", justifyContent:"space-between", gap:10 },
  taskInput:{ borderWidth:1, borderColor: Colors.border, borderRadius:12, padding:12, backgroundColor:"#F3F4F6", color:"#1F2937" },
  taskSubmit:{ borderRadius:12, paddingVertical:14, alignItems:"center", marginTop:12, backgroundColor: Colors.primary },
  taskSubmitText:{ color:"#fff", fontWeight:"800" }
});
