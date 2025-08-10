import { useEffect, useMemo, useState } from "react";
import { View, FlatList, StyleSheet, Text, Pressable, Modal, TextInput, ScrollView, Alert, Image } from "react-native";
import TopBar from "@src/components/TopBar";
import { listManagerJobs, createJob, updateJob, deleteJob, type CreateJobInput, type Job } from "@src/lib/api";
import { useAuth } from "@src/store/useAuth";
import { Colors } from "@src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

function formatPay(pay?: string) {
  if (!pay) return "";
  const t = String(pay).trim();
  if (/£|\/hr|per\s*hour/i.test(t)) return t;
  if (/^\d+(\.\d+)?$/.test(t)) return `£${t}/hr`;
  return t;
}

export default function ManagerProjects() {
  const { user, token } = useAuth();
  const ownerId = user?.id;

  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<Job | null>(null);

  // form state
  const [title, setTitle] = useState("");
  const [site, setSite] = useState("");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [payRate, setPayRate] = useState("");
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const refresh = async () => { const mine = await listManagerJobs(ownerId); setMyJobs(mine); };
  useEffect(() => { refresh(); }, [ownerId]);

  const current = myJobs.filter(j => j.status !== "completed");
  const previous = myJobs.filter(j => j.status === "completed");

  const resetForm = () => {
    setTitle(""); setSite(""); setLocation(""); setStart(""); setEnd("");
    setPayRate(""); setDescription(""); setImageUri(undefined); setSkills([]); setSkillInput(""); setEditingId(null);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "We need access to your library to pick a photo."); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!res.canceled && res.assets?.[0]?.uri) setImageUri(res.assets[0].uri);
  };

  const submit = async () => {
    if (!title || !site || !location || !start || !end) { Alert.alert("Missing info", "Please fill Title, Site, Location and Dates."); return; }
    const input: CreateJobInput = { title, site, location, start, end, payRate: payRate || undefined, description: description || undefined, imageUri, skills };
    try {
      if (editingId) {
        await updateJob(editingId, { title, site, location, when: `${new Date(start).toLocaleDateString("en-GB", { day:"2-digit", month:"short" })} - ${new Date(end).toLocaleDateString("en-GB", { day:"2-digit", month:"short" })}`, payRate, description, imageUri, skills }, token || undefined);
        Alert.alert("Updated", "Your job listing was updated.");
      } else {
        await createJob(input, token || undefined, ownerId);
        Alert.alert("Created", "Your job listing is now live.");
      }
      setOpen(false);
      resetForm();
      await refresh();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? (editingId ? "Failed to update job" : "Failed to create job"));
    }
  };

  const openDetails = (job: Job) => { setSelected(job); setDetailsOpen(true); };
  const startEdit = () => {
    if (!selected) return;
    setDetailsOpen(false);
    setEditingId(selected.id);
    setTitle(selected.title); setSite(selected.site); setLocation(selected.location || "");
    // derive an approximate start/end from "when" only for demo safety
    const parts = (selected.when || "").split(" - ");
    setStart(parts[0] ? new Date(parts[0] + " 2025").toISOString().slice(0,10) : "");
    setEnd(parts[1] ? new Date(parts[1] + " 2025").toISOString().slice(0,10) : "");
    setPayRate(selected.payRate || ""); setDescription(selected.description || ""); setImageUri(selected.imageUri); setSkills(selected.skills || []);
    setOpen(true);
  };
  const confirmDelete = () => {
    if (!selected) return;
    Alert.alert("Delete job", "Are you sure you want to delete this listing?", [
      { text:"Cancel", style:"cancel" },
      { text:"Delete", style:"destructive", onPress: async () => {
          await deleteJob(selected.id, token || undefined);
          setDetailsOpen(false);
          await refresh();
        } }
    ]);
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (!s) return;
    if (!skills.includes(s)) setSkills([...skills, s]);
    setSkillInput("");
  };
  const removeSkill = (s: string) => setSkills(skills.filter(x => x !== s));

  return (
    <View style={styles.container}>
      <TopBar />

      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>My Jobs</Text>
        <Pressable style={styles.createBtn} onPress={() => { resetForm(); setOpen(true); }}>
          <Ionicons name="add" size={18} />
          <Text style={styles.createText}>Create listing</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20 }}>
        <SectionTitle text="Current Job" />
        {current.length ? (
          <FlatList
            data={current}
            keyExtractor={(i) => String(i.id)}
            renderItem={({ item }) => <JobRow job={item} onPress={() => openDetails(item)} />}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            scrollEnabled={false}
          />
        ) : (
          <Text style={styles.empty}>You have no current jobs.</Text>
        )}

        <View style={styles.sectionDivider} />

        <SectionTitle text="Current Applications" />
        <Text style={styles.empty}>No applications yet.</Text>

        <View style={styles.sectionDivider} />

        <SectionTitle text="Previous Jobs" />
        {previous.length ? (
          <FlatList
            data={previous}
            keyExtractor={(i) => String(i.id)}
            renderItem={({ item }) => <JobRow job={item} onPress={() => openDetails(item)} />}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            scrollEnabled={false}
          />
        ) : (
          <Text style={styles.empty}>Once jobs complete, they’ll appear here.</Text>
        )}
      </ScrollView>

      {/* Create/Edit Listing Modal */}
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => { setOpen(false); }} style={styles.modalClose}>
              <Ionicons name="close" size={22} />
            </Pressable>
            <Text style={styles.modalTitle}>{editingId ? "Update Job" : "Create a Job Listing"}</Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            <LabeledInput label="Title" value={title} onChangeText={setTitle} placeholder="e.g., Extension and refurb" />
            <LabeledInput label="Site / Company" value={site} onChangeText={setSite} placeholder="e.g., Hangleton Homemakers Ltd" />
            <LabeledInput label="Location" value={location} onChangeText={setLocation} placeholder="e.g., Brighton, UK" />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <LabeledInput style={{ flex:1 }} label="Start (YYYY-MM-DD)" value={start} onChangeText={setStart} placeholder="2025-07-10" />
              <LabeledInput style={{ flex:1 }} label="End (YYYY-MM-DD)" value={end} onChangeText={setEnd} placeholder="2025-10-20" />
            </View>
            <LabeledInput label="Pay Rate (optional)" value={payRate} onChangeText={setPayRate} placeholder="£18/hr" />
            <LabeledInput
              label="Description (optional)"
              value={description}
              onChangeText={setDescription}
              placeholder="Brief details about the work…"
              multiline
            />

            {/* Skills chips */}
            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Skills</Text>
              <View style={{ flexDirection:"row", gap:8 }}>
                <TextInput
                  value={skillInput}
                  onChangeText={setSkillInput}
                  placeholder="Add a skill"
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, { flex:1 }]}
                />
                <Pressable style={[styles.btn, styles.btnOutline]} onPress={addSkill}>
                  <Text style={styles.btnOutlineText}>Add</Text>
                </Pressable>
              </View>
              <View style={styles.chips}>
                {skills.map(s => (
                  <Pressable key={s} onPress={() => removeSkill(s)} style={styles.chip}>
                    <Text style={styles.chipText}>{s}</Text>
                    <Ionicons name="close" size={14} color="#6B7280" />
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Image picker */}
            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Photo (optional)</Text>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.preview} />
              ) : (
                <View style={styles.previewPlaceholder}>
                  <Ionicons name="image-outline" size={24} color="#9CA3AF" />
                  <Text style={{ color:"#9CA3AF" }}>No photo added</Text>
                </View>
              )}
              <Pressable style={[styles.btn, styles.btnOutline]} onPress={pickImage}>
                <Text style={styles.btnOutlineText}>{imageUri ? "Change Photo" : "Add Photo"}</Text>
              </Pressable>
            </View>

            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={submit}>
              <Text style={styles.btnPrimaryText}>{editingId ? "Save changes" : "Publish Listing"}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* Details modal (tile press) */}
      <Modal visible={detailsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDetailsOpen(false)}>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={{ paddingHorizontal:12, paddingTop:14, paddingBottom:8, flexDirection:"row", alignItems:"center", justifyContent:"space-between" }}>
            <Pressable onPress={() => setDetailsOpen(false)} style={{ padding:6 }}><Ionicons name="chevron-back" size={24} /></Pressable>
            <Text style={{ fontWeight:"800", fontSize:18 }}>Job details</Text>
            <View style={{ width:30 }} />
          </View>

          {selected?.imageUri ? <Image source={{ uri: selected.imageUri }} style={{ width:"100%", height:220 }} /> : null}

          <View style={{ padding:12, gap:6 }}>
            <Text style={{ fontSize:22, fontWeight:"800" }}>{selected?.title}</Text>
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
                <Text style={{ fontWeight:"700" }}>Skills</Text>
                <View style={styles.chips}>
                  {selected!.skills!.map(s => (
                    <View key={s} style={[styles.chip, { paddingHorizontal:10 }]}>
                      <Text style={styles.chipText}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {!!selected?.description && (
              <View style={{ marginTop:10 }}>
                <Text style={{ fontWeight:"700" }}>About this job</Text>
                <Text style={{ color:"#374151", marginTop:4 }}>{selected.description}</Text>
              </View>
            )}
          </View>

          <View style={{ paddingHorizontal:12, flexDirection:"row", gap:10, marginTop:6 }}>
            <Pressable style={[styles.btn, styles.btnOutline, { flex:1 }]} onPress={startEdit}>
              <Text style={styles.btnOutlineText}>Edit</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnDanger, { flex:1 }]} onPress={confirmDelete}>
              <Text style={{ color:"#fff", fontWeight:"800" }}>Delete</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

function SectionTitle({ text }: { text: string }) { return <Text style={styles.sectionTitle}>{text}</Text>; }

function JobRow({ job, onPress }: { job: Job; onPress: () => void }) {
  const thumb = job.imageUri ?? "https://via.placeholder.com/120x88?text=Job";
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image source={{ uri: thumb }} style={styles.thumb} />
      <View style={{ flex:1, gap:2 }}>
        <Text style={styles.jobTitle}>{job.title}</Text>
        <Text style={styles.meta}>{job.site}</Text>
        {!!job.location && (<View style={styles.row}><Ionicons name="location-outline" size={16} color="#6B7280" /><Text style={styles.meta}>{job.location}</Text></View>)}
        <View style={styles.row}><Ionicons name="calendar-outline" size={16} color="#6B7280" /><Text style={styles.meta}>{job.when}</Text></View>
        {!!job.payRate && (<View style={styles.row}><Ionicons name="cash-outline" size={16} color="#6B7280" /><Text style={styles.meta}>{formatPay(job.payRate)}</Text></View>)}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </Pressable>
  );
}

function LabeledInput(props: any) {
  const { label, style, ...rest } = props;
  return (
    <View style={[style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...rest}
        style={[styles.input, rest.multiline ? { height: 96, textAlignVertical: "top" } : null]}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:"#fff" },

  headerRow:{ paddingHorizontal:12, paddingTop:6, paddingBottom:10, flexDirection:"row", alignItems:"center", justifyContent:"space-between" },
  headerTitle:{ fontWeight:"800", fontSize:18 },
  createBtn:{ flexDirection:"row", alignItems:"center", gap:6, borderWidth:1, borderColor: Colors.border, paddingVertical:8, paddingHorizontal:12, borderRadius:12, backgroundColor:"#fff" },
  createText:{ fontWeight:"700" },

  sectionTitle:{ color:"#6B7280", fontWeight:"800", marginTop:6, marginBottom:8 },
  sectionDivider:{ height:1, backgroundColor:"#eee", marginVertical:8 },
  sep:{ height:12 },
  empty:{ color:"#6B7280", marginBottom:8 },

  card:{ borderWidth:1, borderColor:"#eee", backgroundColor:"#fff", borderRadius:12, padding:12, flexDirection:"row", alignItems:"center", gap:12, justifyContent:"space-between" },
  thumb:{ width:120, height:88, borderRadius:12, backgroundColor:"#eee" },
  row:{ flexDirection:"row", alignItems:"center", gap:6, marginTop:2 },
  jobTitle:{ fontWeight:"700", fontSize:16, marginBottom:2 },
  meta:{ color:"#6B7280" },

  modalWrap:{ flex:1, backgroundColor:"#fff" },
  modalHeader:{ paddingHorizontal:12, paddingTop:14, paddingBottom:8, borderBottomWidth:1, borderColor:"#eee", flexDirection:"row", alignItems:"center", gap:10 },
  modalClose:{ padding:6 },
  modalTitle:{ fontWeight:"800", fontSize:18 },

  label:{ fontWeight:"700", marginBottom:6 },
  input:{ borderWidth:1, borderColor: Colors.border, borderRadius:12, padding:12, backgroundColor:"#F3F4F6" },

  btn:{ borderRadius:12, paddingVertical:14, alignItems:"center", marginTop:12 },
  btnPrimary:{ backgroundColor: Colors.primary },
  btnPrimaryText:{ color:"#fff", fontWeight:"800" },
  btnOutline:{ borderWidth:1, borderColor: Colors.border, backgroundColor:"#fff" },
  btnOutlineText:{ fontWeight:"800", color:"#111827" },
  btnDanger:{ backgroundColor:"#dc2626", borderRadius:12, paddingVertical:14, alignItems:"center" },

  preview:{ width:"100%", height:160, borderRadius:12, backgroundColor:"#eee" },
  previewPlaceholder:{ width:"100%", height:160, borderRadius:12, borderWidth:1, borderColor: Colors.border, backgroundColor:"#F9FAFB", alignItems:"center", justifyContent:"center", gap:6 },

  chips:{ flexDirection:"row", flexWrap:"wrap", gap:8, marginTop:4 },
  chip:{ flexDirection:"row", alignItems:"center", gap:6, borderWidth:1, borderColor: Colors.border, backgroundColor:"#fff", paddingVertical:6, paddingHorizontal:12, borderRadius:999 },
  chipText:{ color:"#111827", fontWeight:"600" }
});
