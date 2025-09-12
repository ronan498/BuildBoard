import React, { useEffect, useMemo, useState } from "react";
import { View, FlatList, Text, StyleSheet, Pressable, Image, Modal, ScrollView, Alert } from "react-native";
import TopBar from "@src/components/TopBar";
import { listJobs, type Job, applyToJob } from "@src/lib/api";
import { useSaved } from "@src/store/useSaved";
import { useAuth } from "@src/store/useAuth";
import { useNotifications } from "@src/store/useNotifications";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAppliedJobs } from "@src/store/useAppliedJobs";

function formatPay(pay?: string) {
  if (!pay) return "";
  const t = String(pay).trim();
  if (/£|\/hr|per\s*hour/i.test(t)) return t;
  if (/^\d+(\.\d+)?$/.test(t)) return `£${t}/hr`;
  return t;
}

export default function SavedJobs() {
  const [all, setAll] = useState<Job[]>([]);
  const { savedJobIds, toggleSave } = useSaved();
  const { user } = useAuth();
  const { bump } = useNotifications();
  const { setApplied } = useAppliedJobs();

  const [selected, setSelected] = useState<Job | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => { listJobs().then(setAll); }, []);
  const items = useMemo(() => all.filter(j => savedJobIds.includes(j.id)), [all, savedJobIds]);
  const empty = items.length === 0;

  const onPressCard = (job: Job) => { setSelected(job); setOpen(true); };
  const applyNow = async () => {
    if (!selected || !user) return;
    try {
      const res = await applyToJob(selected.id, user.id, user.username);
      bump("manager", 1);
      setApplied(selected.id, { chatId: res.chatId, status: "pending" });
      setOpen(false);
      router.push({ pathname: "/(labourer)/chats/[id]", params: { id: String(res.chatId) } });
    } catch (e: any) { Alert.alert("Error", e.message ?? "Failed to apply"); }
  };

  return (
    <View style={styles.container}>
      <TopBar />
      {empty ? (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={42} />
          <Text style={styles.emptyTitle}>No saved jobs yet</Text>
          <Text style={styles.emptySub}>Tap the heart on a job to save it for later.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => {
            const thumb = item.imageUri ?? "https://via.placeholder.com/120x88?text=Job";
            const pay = formatPay(item.payRate);
            return (
              <Pressable style={styles.card} onPress={() => onPressCard(item)}>
                <Image source={{ uri: thumb }} style={styles.thumb} />
                <View style={{ flex:1, gap:2 }}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.meta}>{item.site}</Text>
                  {!!item.location && (<View style={styles.row}><Ionicons name="location-outline" size={16} color="#6B7280" /><Text style={styles.meta}>{item.location}</Text></View>)}
                  <View style={styles.row}><Ionicons name="calendar-outline" size={16} color="#6B7280" /><Text style={styles.meta}>{item.when}</Text></View>
                  {!!pay && (<View style={styles.row}><Ionicons name="cash-outline" size={16} color="#6B7280" /><Text style={styles.meta}>{pay}</Text></View>)}
                </View>
                <Pressable onPress={() => toggleSave(item.id)} style={styles.saveBtn} hitSlop={10}><Ionicons name="heart" size={22} /></Pressable>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height:12 }} />}
          contentContainerStyle={{ paddingHorizontal:12, paddingBottom:12 }}
        />
      )}

      {/* Details popup */}
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={{ paddingHorizontal:12, paddingTop:14, paddingBottom:8, flexDirection:"row", alignItems:"center", justifyContent:"space-between" }}>
            <Pressable onPress={() => setOpen(false)} style={{ padding:6 }}>
              <Ionicons name="chevron-back" size={24} color="#111" />
            </Pressable>
            <Text style={{ fontWeight:"800", fontSize:18, color:"#1F2937" }}>Job details</Text>
            <View style={{ width:30 }} />
          </View>

          {selected?.imageUri ? <Image source={{ uri: selected.imageUri }} style={{ width:"100%", height:220 }} /> : null}

          <View style={{ padding:12, gap:6 }}>
            <Text style={{ fontSize:22, fontWeight:"800", color:"#1F2937" }}>{selected?.title}</Text>
            <Text style={{ color:"#6B7280" }}>{selected?.site}</Text>

            <View style={{ flexDirection:"row", alignItems:"center", gap:6, marginTop:6 }}>
              <Ionicons name="location-outline" size={16} color="#6B7280" />
              <Text style={{ color:"#6B7280" }}>{selected?.location}</Text>
            </View>
            <View style={{ flexDirection:"row", alignItems:"center", gap:6, marginTop:2 }}>
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text style={{ color:"#6B7280" }}>{selected?.when}</Text>
            </View>
            {!!selected?.payRate && (
              <View style={{ flexDirection:"row", alignItems:"center", gap:6, marginTop:2 }}>
                <Ionicons name="cash-outline" size={16} color="#6B7280" />
                <Text style={{ color:"#6B7280" }}>{formatPay(selected?.payRate)}</Text>
              </View>
            )}
            {!!(selected?.skills && selected.skills.length) && (
              <View style={{ marginTop:10 }}>
                <Text style={{ fontWeight:"700", color:"#1F2937" }}>Skills</Text>
                <View style={styles.skillChips}>
                  {selected!.skills!.map(s => (
                    <View key={s} style={[styles.skillChip, { paddingHorizontal:10 }]}>
                      <Text style={styles.skillChipText}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {!!selected?.description && (
              <View style={{ marginTop:10 }}>
                <Text style={{ fontWeight:"700", color:"#1F2937" }}>About this job</Text>
                <Text style={{ color:"#374151", marginTop:4 }}>{selected.description}</Text>
              </View>
            )}
          </View>

          <View style={{ paddingHorizontal:12, flexDirection:"row", gap:10, marginTop:6 }}>
            <Pressable style={[styles.btn, styles.btnPrimary, { flex:1 }]} onPress={applyNow}>
              <Text style={styles.btnPrimaryText}>Apply now</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:"#fff" },
  empty:{ flex:1, alignItems:"center", justifyContent:"center", padding:24, gap:8 },
  emptyTitle:{ fontWeight:"800", fontSize:18, color:"#1F2937" },
  emptySub:{ color:"#6B7280", textAlign:"center" },

  card:{ flexDirection:"row", gap:12, borderWidth:1, borderColor:"#eee", borderRadius:12, padding:12, backgroundColor:"#fff", alignItems:"center" },
  thumb:{ width:120, height:88, borderRadius:12, backgroundColor:"#eee" },

  row:{ flexDirection:"row", alignItems:"center", gap:6, marginTop:2 },
  title:{ fontWeight:"700", fontSize:16, marginBottom:2, color:"#1F2937" },
  meta:{ color:"#555" },

  saveBtn:{ width:40, height:40, borderRadius:20, alignItems:"center", justifyContent:"center", borderWidth:1, borderColor:"#eee", backgroundColor:"#fff" },

  skillChips:{ flexDirection:"row", flexWrap:"wrap", gap:8, marginTop:4 },
  skillChip:{ flexDirection:"row", alignItems:"center", gap:6, borderWidth:1, borderColor:"#E5E7EB", backgroundColor:"#fff", paddingVertical:6, paddingHorizontal:12, borderRadius:999 },
  skillChipText:{ color:"#111827", fontWeight:"600" },

  btn:{ borderRadius:12, paddingVertical:14, alignItems:"center", marginTop:12 },
  btnPrimary:{ backgroundColor: "#22c55e" },
  btnPrimaryText:{ color:"#fff", fontWeight:"800" }
});
