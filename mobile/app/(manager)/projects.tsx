import { useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Image,
  Keyboard,
  Dimensions,
}
 from "react-native";
import TopBar from "@src/components/TopBar";
import { listManagerJobs, createJob, updateJob, deleteJob, type CreateJobInput, type Job } from "@src/lib/api";
import { useAuth } from "@src/store/useAuth";
import DateRangeSheet from "@src/components/DateRangeSheet";
import { Colors } from "@src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { parseWhenToDates } from "@src/lib/date";

/* Map + geocoding */
import MapView, { Region } from "react-native-maps";
import * as Location from "expo-location";

function formatPay(pay?: string) {
  if (!pay) return "";
  const t = String(pay).trim();
  if (/£|\/hr|per\s*hour/i.test(t)) return t;
  if (/^\d+(\.\d+)?$/.test(t)) return `£${t}/hr`;
  return t;
}

const DEFAULT_REGION: Region = {
  latitude: 51.5074,
  longitude: -0.1278,
  latitudeDelta: 0.3,
  longitudeDelta: 0.3
};

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
  const [payRate, setPayRate] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  // date range sheet state
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [start, setStart] = useState<string>(""); // ISO "YYYY-MM-DD"
  const [end, setEnd] = useState<string>("");     // ISO "YYYY-MM-DD"

  // coords to persist with the job
  const [geoLat, setGeoLat] = useState<number | undefined>(undefined);
  const [geoLng, setGeoLng] = useState<number | undefined>(undefined);

  // in-modal map overlay state
  const [mapSheetOpen, setMapSheetOpen] = useState(false);
  const [mapSearch, setMapSearch] = useState("");
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | null>(null);

  const refresh = useCallback(async () => { const mine = await listManagerJobs(ownerId); setMyJobs(mine); }, [ownerId]);
  useEffect(() => { refresh(); }, [refresh]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming: Job[] = [];
  const current: Job[] = [];
  const previous: Job[] = [];
  myJobs.forEach(j => {
    const { start, end } = parseWhenToDates(j.when);
    if (end && end < today) previous.push(j);
    else if (start && start > today) upcoming.push(j);
    else current.push(j);
  });

  const resetForm = () => {
    setTitle(""); setSite(""); setLocation(""); setStart(""); setEnd("");
    setPayRate(""); setDescription(""); setIsPrivate(false); setImageUri(undefined); setSkills([]); setSkillInput(""); setEditingId(null);
    setGeoLat(undefined); setGeoLng(undefined);
    setMapSheetOpen(false);
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo access to add a job image.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: false
    });
    if (!res.canceled && res.assets?.[0]?.uri) setImageUri(res.assets[0].uri);
  };

  const submit = async () => {
    if (!title || !site || !start || !end) {
      Alert.alert("Missing fields", "Please add dates.");
      return;
    }

    // Build input (CreateJobInput doesn’t take lat/lng)
    const input: CreateJobInput = {
      title, site, location, start, end,
      payRate: payRate || undefined,
      description: description || undefined,
      imageUri, skills, isPrivate,
    };

    try {
      if (editingId) {
        const when = `${new Date(start).toLocaleString("en-GB", { day:"2-digit", month:"short" })} - ${new Date(end).toLocaleString("en-GB", { day:"2-digit", month:"short" })}`;

        const changes: any = { title, site, location, when, payRate, description, imageUri, skills, isPrivate };
        if (geoLat != null && geoLng != null) {
          changes.lat = geoLat;
          changes.lng = geoLng;
        }

        await updateJob(editingId, changes, token || undefined);
        Alert.alert("Updated", "Your job listing was updated.");
      } else {
        const created = await createJob(input, token || undefined, ownerId);

        // IMPORTANT: always patch coords if we have them (override mock heuristics)
        if (created?.id && geoLat != null && geoLng != null) {
          await updateJob(created.id, { lat: geoLat, lng: geoLng } as any, token || undefined);
        }

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
    const { start, end } = parseWhenToDates(selected.when);
    setStart(start); setEnd(end);
    setPayRate(selected.payRate || ""); setDescription(selected.description || "");
    setIsPrivate(selected.isPrivate);
    setImageUri(selected.imageUri); setSkills(selected.skills || []);

    // prefill coords if present
    setGeoLat((selected as any).lat);
    setGeoLng((selected as any).lng);

    setOpen(true);
  };
  const confirmDelete = () => {
    if (!selected) return;
    Alert.alert("Delete job", "Are you sure you want to delete this listing?", [
      { text:"Cancel", style:"cancel" },
      { text:"Delete", style:"destructive", onPress: async () => {
        try {
          await deleteJob(selected.id, token || undefined);
          setDetailsOpen(false);
          await refresh();
        } catch (e:any) {
          Alert.alert("Error", e.message || "Failed to delete job");
        }
      } }
    ]);
  };
  const removeSkill = (s: string) => setSkills(skills.filter(x => x !== s));

  // open map overlay (no second Modal, no permission prompt here)
  const openMapPicker = () => {
    Keyboard.dismiss();  // ← keep keyboard from overlapping when map opens
    setMapSearch(location);
    const initial = (geoLat != null && geoLng != null) ? toRegion(geoLat, geoLng) : DEFAULT_REGION;
    setMapRegion(initial);
    setMapCenter({ latitude: initial.latitude, longitude: initial.longitude });
    setMapSheetOpen(true);

    // try to geocode whatever the user typed, without blocking UI
    (async () => {
      try {
        const typed = location.trim();
        if (!typed) return;
        const hits = await Location.geocodeAsync(typed);
        if (hits && hits[0]) {
          const r = toRegion(hits[0].latitude, hits[0].longitude);
          setMapRegion(r);
          setMapCenter({ latitude: r.latitude, longitude: r.longitude });
        }
      } catch { /* ignore */ }
    })();
  };

  const mapSearchGo = async () => {
    const q = mapSearch.trim();
    if (!q) return;
    try {
      const hits = await Location.geocodeAsync(q);
      if (hits && hits[0]) {
        const r = toRegion(hits[0].latitude, hits[0].longitude);
        setMapRegion(r);
        setMapCenter({ latitude: r.latitude, longitude: r.longitude });
      } else {
        Alert.alert("No results", "Try a different place or postcode.");
      }
    } catch {
      Alert.alert("Search failed", "Please try again.");
    }
  };

  const mapUseMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Enable location access in Settings to use your current location.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const r = toRegion(pos.coords.latitude, pos.coords.longitude);
      setMapRegion(r);
      setMapCenter({ latitude: r.latitude, longitude: r.longitude });
      try {
        const rev = await Location.reverseGeocodeAsync({ latitude: r.latitude, longitude: r.longitude });
        if (rev && rev[0]) setMapSearch(composeAddress(rev[0]));
      } catch {}
    } catch {
      Alert.alert("Couldn’t get location");
    }
  };

  const saveLocationFromMap = async () => {
    if (!mapCenter) { setMapSheetOpen(false); return; }
    let label = `${mapCenter.latitude.toFixed(5)}, ${mapCenter.longitude.toFixed(5)}`;
    try {
      const rev = await Location.reverseGeocodeAsync({ latitude: mapCenter.latitude, longitude: mapCenter.longitude });
      if (rev && rev[0]) label = composeAddress(rev[0]);
    } catch {}
    setLocation(label);
    setGeoLat(mapCenter.latitude);
    setGeoLng(mapCenter.longitude);
    setMapSheetOpen(false);
  };

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function formatRangeLabel(startISO: string, endISO: string) {
    const s = new Date(startISO);
    const e = new Date(endISO);
    const sStr = `${String(s.getDate()).padStart(2,"0")} ${MONTHS[s.getMonth()]}`;
    const eStr = `${String(e.getDate()).padStart(2,"0")} ${MONTHS[e.getMonth()]}`;
    return `${sStr} — ${eStr}`;
  }

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
        <Text style={styles.sectionTitle}>Upcoming Jobs</Text>
        {upcoming.length ? (
          <FlatList
            data={upcoming}
            keyExtractor={(i) => String(i.id)}
            renderItem={({ item }) => <JobRow job={item} onPress={() => openDetails(item)} />}
            horizontal
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            contentContainerStyle={{ paddingRight: 12 }}
            showsHorizontalScrollIndicator={false}
          />
        ) : (
          <Text style={styles.empty}>You have no upcoming jobs.</Text>
        )}

        <View style={styles.sectionDivider} />

        <Text style={styles.sectionTitle}>Current Jobs</Text>
        {current.length ? (
          <FlatList
            data={current}
            keyExtractor={(i) => String(i.id)}
            renderItem={({ item }) => <JobRow job={item} onPress={() => openDetails(item)} />}
            horizontal
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            contentContainerStyle={{ paddingRight: 12 }}
            showsHorizontalScrollIndicator={false}
          />
        ) : (
          <Text style={styles.empty}>You have no current jobs.</Text>
        )}

        <View style={styles.sectionDivider} />

        <Text style={styles.sectionTitle}>Previous Jobs</Text>
        {previous.length ? (
          <FlatList
            data={previous}
            keyExtractor={(i) => String(i.id)}
            renderItem={({ item }) => <JobRow job={item} onPress={() => openDetails(item)} />}
            horizontal
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            contentContainerStyle={{ paddingRight: 12 }}
            showsHorizontalScrollIndicator={false}
          />
        ) : (
          <Text style={styles.empty}>Once jobs complete, they’ll appear here.</Text>
        )}
      </ScrollView>

      {/* Create/Edit Listing Modal */}
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setOpen(false); setMapSheetOpen(false); }}
      >
        {/* No KeyboardAvoidingView — eliminates white bar */}
        <View style={{ flex: 1 }}>
          <View style={styles.modalWrap}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => { setOpen(false); setMapSheetOpen(false); }} style={styles.modalClose}>
                <Ionicons name="close" size={22} />
              </Pressable>

              <Text style={styles.modalTitle}>{editingId ? "Update Job" : "Create a Job Listing"}</Text>

              <Pressable onPress={submit} hitSlop={8} style={{ padding: 6 }}>
                <Text style={{ color: "#22C55E", fontWeight: "600" }}>publish</Text>
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
            >
              
              {/* Visibility segmented toggle */}
              <View style={styles.segmentWrap}>
                <Pressable
                  onPress={() => setIsPrivate(false)}
                  style={[styles.segment, !isPrivate && styles.segmentActive]}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: !isPrivate }}
                >
                  <Text style={[styles.segmentText, !isPrivate && styles.segmentTextActive]}>Public</Text>
                </Pressable>
                <Pressable
                  onPress={() => setIsPrivate(true)}
                  style={[styles.segment, isPrivate && styles.segmentActive]}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isPrivate }}
                >
                  <Text style={[styles.segmentText, isPrivate && styles.segmentTextActive]}>Private</Text>
                </Pressable>
              </View>
<LabeledInput label="Title" value={title} onChangeText={setTitle} placeholder="e.g., Extension and refurb" />
              <LabeledInput label="Site / Company" value={site} onChangeText={setSite} placeholder="e.g., Hangleton Homemakers Ltd" />

              {/* Location with inline 'edit location' */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.label}>Location</Text>
                <Pressable
                  onPress={openMapPicker}
                  hitSlop={8}
                  style={{ alignSelf: "flex-start", marginTop: 6 }}
                >
                  <Text style={styles.editLocLink}>
                    {location ? location : "add location"}
                  </Text>
                </Pressable>
              </View>

              {/* When row (date range opener) */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.label}>Dates</Text>
                <Pressable
                  onPress={() => setDateSheetOpen(true)}
                  hitSlop={8}
                  style={{ alignSelf: "flex-start", marginTop: 6 }}
                >
                  <Text style={styles.editLocLink}>
                    {start && end ? formatRangeLabel(start, end) : "add dates"}
                  </Text>
                </Pressable>
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
                <View>
                  <TextInput
                    value={skillInput}
                    onChangeText={setSkillInput}
                    placeholder="Add a skill"
                    placeholderTextColor="#9CA3AF"
                    style={[styles.input]}
                    returnKeyType="done"
                    blurOnSubmit
                    onSubmitEditing={(e) => {
                      const t = (e.nativeEvent.text || "").trim();
                      if (!t) return;
                      if (!skills.includes(t)) setSkills([...skills, t]);
                      setSkillInput("");
                    }}
                  />
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

              {/* Image picker (tap area) */}
              <View style={{ gap: 8 }}>
                <Text style={styles.label}>Photo (optional)</Text>
                <Pressable onPress={pickImage} style={imageUri ? styles.previewPress : styles.previewPlaceholderPress}>
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={[styles.preview]} />
                  ) : (
                    <View style={styles.previewPlaceholderInner}>
                      <Ionicons name="image-outline" size={24} color="#9CA3AF" />
                      <Text style={{ color:"#9CA3AF" }}>Add photo</Text>
                    </View>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>

          {/* Map overlay SIBLING (not affected by keyboard) */}
          {mapSheetOpen && (
            <View style={styles.mapOverlay}>
              <View style={styles.mapHeader}>
                <Pressable onPress={() => setMapSheetOpen(false)} style={{ padding: 6 }}>
                  <Ionicons name="close" size={22} />
                </Pressable>
                <Text style={styles.mapHeaderTitle}>Choose location</Text>
                <View style={{ width: 28 }} />
              </View>

              <View style={styles.mapSearchRow}>
                <TextInput
                  value={mapSearch}
                  onChangeText={setMapSearch}
                  placeholder="Search town or postcode"
                  placeholderTextColor="#9CA3AF"
                  style={styles.mapInput}
                  returnKeyType="search"
                  onSubmitEditing={mapSearchGo}
                  autoCapitalize="none"
                />
                <Pressable onPress={mapUseMyLocation} style={styles.mapPill}>
                  <Ionicons name="locate" size={16} />
                  <Text style={styles.mapPillText}>My location</Text>
                </Pressable>
              </View>

              <View style={{ flex: 1 }}>
                <MapView
                  key={`${mapRegion.latitude}-${mapRegion.longitude}`}
                  style={{ flex: 1 }}
                  initialRegion={mapRegion}
                  onRegionChangeComplete={(r) => setMapCenter({ latitude: r.latitude, longitude: r.longitude })}
                />
                {/* Center pin */}
                <View pointerEvents="none" style={styles.centerPin}>
                  <Ionicons name="location-sharp" size={28} color={Colors.primary} />
                </View>

                {/* Centered wide Apply button */}
                <View style={styles.mapFooter}>
                  <Pressable onPress={saveLocationFromMap} style={styles.mapUseBtn}>
                    <Text style={styles.mapUseBtnText}>Apply</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          {/* Date range sheet */}
          <DateRangeSheet
            visible={dateSheetOpen}
            initialStart={start || null}
            initialEnd={end || null}
            onClose={() => setDateSheetOpen(false)}
            onSave={({ start: s, end: e }) => {
              setStart(s);
              setEnd(e);
              setDateSheetOpen(false);
            }}
          />
        </View>
      </Modal>

      {/* Details modal (tile press) */}
      <Modal visible={detailsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDetailsOpen(false)}>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={{ paddingHorizontal:12, paddingTop:14, paddingBottom:8, flexDirection:"row", alignItems:"center", justifyContent:"space-between" }}>
            <Pressable onPress={() => setDetailsOpen(false)} style={{ padding:6 }}><Ionicons name="chevron-back" size={24} /></Pressable>
            <Text style={{ fontWeight:"800", fontSize:18, color:"#1F2937" }}>Job details</Text>
            <View style={{ width:30 }} />
          </View>

          {selected?.imageUri ? <Image source={{ uri: selected.imageUri }} style={{ width:"100%", height:220 }} /> : null}

          <View style={{ padding:12, gap:6 }}>
            <Text style={{ fontSize:22, fontWeight:"800", color:"#1F2937" }}>{selected?.title}</Text>
            <Text style={{ color:"#6B7280" }}>{selected?.site}</Text>

            {!!selected?.location && (<View style={{ flexDirection:"row", alignItems:"center", gap:6, marginTop:6 }}><Ionicons name="location-outline" size={16} color="#6B7280" /><Text style={{ color:"#6B7280" }}>{selected.location}</Text></View>)}
            <View style={{ flexDirection:"row", alignItems:"center", gap:6, marginTop:2 }}><Ionicons name="calendar-outline" size={16} color="#6B7280" /><Text style={{ color:"#6B7280" }}>{selected?.when}</Text></View>
            {!!selected?.payRate && (<View style={{ flexDirection:"row", alignItems:"center", gap:6, marginTop:2 }}><Ionicons name="cash-outline" size={16} color="#6B7280" /><Text style={{ color:"#6B7280" }}>{formatPay(selected?.payRate)}</Text></View>)}

            {selected?.isPrivate && (
              <View style={{ flexDirection:"row", alignItems:"center", gap:6, marginTop:2 }}>
                <Ionicons name="lock-closed-outline" size={16} color="#6B7280" />
                <Text style={{ color:"#6B7280" }}>Private job</Text>
              </View>
            )}

            {!!(selected?.skills && selected.skills.length) && (
              <View style={{ marginTop:10 }}>
                <Text style={{ fontWeight:"700", color:"#1F2937" }}>Skills</Text>
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
                <Text style={{ fontWeight:"700", color:"#1F2937" }}>About this job</Text>
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

function JobRow({ job, onPress }: { job: Job; onPress: () => void }) {
  const thumb = job.imageUri ?? "https://via.placeholder.com/120x88?text=Job";
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image source={{ uri: thumb }} style={styles.thumb} />
      <View style={{ flex:1, gap:2 }}>
        <Text style={styles.jobTitle} numberOfLines={1} ellipsizeMode="tail">{job.title}</Text>
        <Text style={styles.meta} numberOfLines={1} ellipsizeMode="tail">{job.site}</Text>
        {!!job.location && (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={16} color="#6B7280" />
            <Text style={styles.meta} numberOfLines={1} ellipsizeMode="tail">{job.location}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={16} color="#6B7280" />
          <Text style={styles.meta} numberOfLines={1} ellipsizeMode="tail">{job.when}</Text>
        </View>
        {!!job.payRate && (
          <View style={styles.row}>
            <Ionicons name="cash-outline" size={16} color="#6B7280" />
            <Text style={styles.meta} numberOfLines={1} ellipsizeMode="tail">{formatPay(job.payRate)}</Text>
          </View>
        )}
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

function toRegion(latitude: number, longitude: number): Region {
  return { latitude, longitude, latitudeDelta: 0.12, longitudeDelta: 0.12 };
}
function composeAddress(r: Location.LocationGeocodedAddress): string {
  const bits = [r.city || r.subregion || r.region, r.country];
  return bits.filter(Boolean).join(", ");
}

const CARD_WIDTH = Dimensions.get("window").width - 24;

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:"#fff" },
  headerRow:{ paddingHorizontal:12, paddingTop:6, paddingBottom:10, flexDirection:"row", alignItems:"center", justifyContent:"space-between" },
  headerTitle:{ fontWeight:"800", fontSize:18, color:"#1F2937" },
  createBtn:{ flexDirection:"row", alignItems:"center", gap:6, borderWidth:1, borderColor: Colors.border, paddingVertical:8, paddingHorizontal:12, borderRadius:12, backgroundColor:"#fff" },
  createText:{ fontWeight:"700", color:"#1F2937" },

  sectionTitle:{ color:"#6B7280", fontWeight:"800", marginTop:6, marginBottom:8 },
  sectionDivider:{ height:1, backgroundColor:"#eee", marginVertical:8 },
  empty:{ color:"#6B7280", marginBottom:8 },

  card:{ width: CARD_WIDTH, borderWidth:1, borderColor:"#eee", backgroundColor:"#fff", borderRadius:12, padding:12, flexDirection:"row", alignItems:"center", gap:12, justifyContent:"space-between" },
  thumb:{ width:120, height:88, borderRadius:12, backgroundColor:"#eee" },
  row:{ flexDirection:"row", alignItems:"center", gap:6, marginTop:2 },
  jobTitle:{ fontWeight:"700", fontSize:16, marginBottom:2, color:"#1F2937" },
  meta:{ color:"#6B7280", flexShrink:1 },

  modalWrap:{ flex:1, backgroundColor:"#fff" },
  modalHeader:{ paddingHorizontal:12, paddingTop:14, paddingBottom:8, borderBottomWidth:1, borderColor:"#eee", flexDirection:"row", alignItems:"center", justifyContent:"space-between", gap:10 },
  modalClose:{ padding:6 },
  modalTitle:{ fontWeight:"800", fontSize:18, color:"#1F2937" },

  label:{ fontWeight:"700", marginBottom:6, color:"#1F2937" },
  editLocLink:{ color:"#22C55E", fontWeight:"600" },
  input:{ borderWidth:1, borderColor: Colors.border, borderRadius:12, padding:12, backgroundColor:"#F3F4F6", color:"#1F2937" },
  // segmented control for Public/Private
  segmentWrap:{ flexDirection:"row", alignSelf:"center", backgroundColor:"#F3F4F6", borderRadius:14, padding:4, marginBottom:4 },
  segment:{ paddingVertical:8, paddingHorizontal:12, borderRadius:10 },
  segmentActive:{ backgroundColor:"#fff", borderWidth:1, borderColor: Colors.border, shadowColor:"#000", shadowOpacity:0.05, shadowRadius:4, elevation:1 },
  segmentText:{ fontWeight:"600", color:"#6B7280" },
  segmentTextActive:{ color:"#111827" },


  btn:{ borderRadius:12, paddingVertical:14, alignItems:"center", marginTop:12, flexDirection:"row", gap:6, justifyContent:"center" },
  btnPrimary:{ backgroundColor: Colors.primary },
  btnPrimaryText:{ color:"#fff", fontWeight:"800" },
  btnOutline:{ borderWidth:1, borderColor: Colors.border, backgroundColor:"#fff" },
  btnOutlineText:{ fontWeight:"800", color:"#111827" },
  btnDanger:{ backgroundColor:"#dc2626", borderRadius:12, paddingVertical:14, alignItems:"center" },

  // image picker
  preview:{ width:"100%", height:220, borderRadius:12, backgroundColor:"#eee" },
  previewPress:{ borderRadius:12, overflow:"hidden" },
  previewPlaceholderPress:{ borderRadius:12, borderWidth:1, borderColor: Colors.border, backgroundColor:"#F9FAFB" },
  previewPlaceholderInner:{ width:"100%", height:220, alignItems:"center", justifyContent:"center", gap:6 },

  // chips
  chips:{ flexDirection:"row", flexWrap:"wrap", gap:8, marginTop:4 },
  chip:{ flexDirection:"row", alignItems:"center", gap:6, borderWidth:1, borderColor: Colors.border, backgroundColor:"#fff", paddingVertical:6, paddingHorizontal:12, borderRadius:999 },
  chipText:{ color:"#111827", fontWeight:"600" },

  /* overlay */
  mapOverlay:{ position:"absolute", left:0, right:0, top:0, bottom:0, backgroundColor:"#fff" },
  mapHeader:{ paddingHorizontal:12, paddingTop:14, paddingBottom:8, borderBottomWidth:1, borderColor:"#eee", flexDirection:"row", alignItems:"center", justifyContent:"space-between", backgroundColor:"#fff" },
  mapHeaderTitle:{ fontWeight:"800", fontSize:18, color:"#1F2937" },
  mapSearchRow:{ flexDirection:"row", alignItems:"center", paddingHorizontal:12, paddingVertical:8, gap:8, backgroundColor:"#fff", borderBottomWidth:1, borderColor:"#eee" },
  mapInput:{ flex:1, backgroundColor:"#F3F4F6", borderRadius:12, paddingHorizontal:12, paddingVertical:10, color:"#111827", borderWidth:1, borderColor: Colors.border },
  mapPill:{ flexDirection:"row", alignItems:"center", gap:6, borderRadius:999, paddingHorizontal:12, paddingVertical:10, backgroundColor:"#fff", borderWidth:1, borderColor: Colors.border },
  mapPillText:{ fontWeight:"700", color:"#111827" },
  centerPin:{ position:"absolute", top:"50%", left:"50%", marginLeft:-14, marginTop:-28 },
  mapFooter:{ alignItems:"center", justifyContent:"center", paddingHorizontal:12, paddingTop:14, paddingBottom:24, borderTopWidth:1, borderColor:"#eee", backgroundColor:"#fff" },
  mapUseBtn:{ backgroundColor: Colors.primary, paddingVertical:14, borderRadius:12, alignSelf:"center", width:"92%" },
  mapUseBtnText:{ color:"#fff", fontWeight:"800", textAlign:"center" }
});
