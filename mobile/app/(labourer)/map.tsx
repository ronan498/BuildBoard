import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, StyleSheet, Pressable, Image, Text, Animated, Easing, Modal, ScrollView, Alert } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region, MapPressEvent } from "react-native-maps";
import TopBar from "@src/components/TopBar";
import {
  listJobLocations, listJobs, type Job,
  applyToJob, listChats, getApplicationForChat
} from "@src/lib/api";
import { useFocusEffect } from "@react-navigation/native";
import { useSaved } from "@src/store/useSaved";
import { useAuth } from "@src/store/useAuth";
import { useNotifications } from "@src/store/useNotifications";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

type MarkerLite = {
  id: number;
  coords: { latitude: number; longitude: number };
};

function formatPay(pay?: string) {
  if (!pay) return "";
  const t = String(pay).trim();
  if (/£|\/hr|per\s*hour/i.test(t)) return t;
  if (/^\d+(\.\d+)?$/.test(t)) return `£${t}/hr`;
  return t;
}

export default function LabourerMap() {
  const [markers, setMarkers] = useState<MarkerLite[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [open, setOpen] = useState(false); // job details modal
  const [appliedChatId, setAppliedChatId] = useState<number | null>(null);
  const [appliedStatus, setAppliedStatus] = useState<"pending" | "accepted" | "declined" | null>(null);
  const [checkingApplied, setCheckingApplied] = useState(false);

  const mapRef = useRef<MapView>(null);
  const sheetY = useRef(new Animated.Value(200)).current; // hidden by default

  const { isSaved, toggleSave } = useSaved();
  const { user } = useAuth();
  const { bump } = useNotifications();

  const selectedJob = useMemo(() => jobs.find(j => j.id === selectedId) || null, [jobs, selectedId]);

  const load = async () => {
    const [locs, allJobs] = await Promise.all([listJobLocations(), listJobs()]);
    setMarkers(locs as MarkerLite[]);
    setJobs(allJobs);
    // Fit to markers on first load
    if (locs?.length && mapRef.current) {
      const coords = (locs as any[]).map((m) => m.coords);
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 40, bottom: 160, left: 40 },
        animated: true
      });
    }
  };

  useFocusEffect(React.useCallback(() => { load(); }, []));

  useEffect(() => {
    Animated.timing(sheetY, {
      toValue: selectedId ? 0 : 200,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [selectedId]);

  const onMapPress = (_e: MapPressEvent) => { if (selectedId) setSelectedId(null); };
  const onMarkerPress = (id: number) => { setSelectedId(id); };

  // When opening details, check if this user has already applied (mirrors jobs.tsx flow)
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!open || !selectedJob || !user) {
        if (!cancelled) { setAppliedChatId(null); setAppliedStatus(null); }
        return;
      }
      setCheckingApplied(true);
      try {
        const chats = await listChats(user.id);
        const chat = chats.find(c => c.jobId === selectedJob.id && c.workerId === user.id);
        if (!cancelled) {
          setAppliedChatId(chat?.id ?? null);
          if (chat) {
            const app = await getApplicationForChat(chat.id);
            if (!cancelled) setAppliedStatus(app?.status ?? "pending");
          } else {
            setAppliedStatus(null);
          }
        }
      } finally {
        if (!cancelled) setCheckingApplied(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [open, selectedJob?.id, user?.id]);

  const applyNow = useCallback(async () => {
    if (!selectedJob || !user) return;
    // Already applied? go straight to chat
    if (appliedChatId) {
      setOpen(false);
      router.push({ pathname: "/(labourer)/chats/[id]", params: { id: String(appliedChatId) } });
      return;
    }
    try {
      const res = await applyToJob(selectedJob.id, user.id, user.username);
      bump("manager", 1);
      setAppliedChatId(res.chatId);
      setAppliedStatus("pending");
      setOpen(false);
      router.push({ pathname: "/(labourer)/chats/[id]", params: { id: String(res.chatId) } });
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to apply");
    }
  }, [selectedJob, user, appliedChatId]);

  const goToChat = useCallback(() => {
    if (!appliedChatId) return;
    setOpen(false);
    router.push({ pathname: "/(labourer)/chats/[id]", params: { id: String(appliedChatId) } });
  }, [appliedChatId]);

  const initial: Region = { latitude: 51.5074, longitude: -0.1278, latitudeDelta: 0.4, longitudeDelta: 0.4 };

  return (
    <View style={styles.container}>
      <TopBar />
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initial}
        onPress={onMapPress}
      >
        {markers.map((m) => (
          <Marker
            key={m.id}
            coordinate={m.coords}
            // NOTE: no title/description -> no default callout bubble
            onPress={() => onMarkerPress(m.id)}
          />
        ))}
      </MapView>

      {/* Bottom tile (Airbnb style) */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}>
        {selectedJob ? (
          <Pressable style={styles.card} onPress={() => setOpen(true)}>
            <Image
              source={{ uri: selectedJob.imageUri ?? "https://via.placeholder.com/200x140?text=Job" }}
              style={styles.thumb}
            />
            <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text numberOfLines={1} style={styles.title}>{selectedJob.title}</Text>
              <Text numberOfLines={1} style={styles.sub}>{selectedJob.site}</Text>
              {!!selectedJob.location && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <Ionicons name="location-outline" size={16} color="#6B7280" />
                  <Text style={styles.muted} numberOfLines={1}>{selectedJob.location}</Text>
                </View>
              )}
              {!!selectedJob.payRate && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <Ionicons name="cash-outline" size={16} color="#6B7280" />
                  <Text style={styles.muted}>{formatPay(selectedJob.payRate)}</Text>
                </View>
              )}
            </View>

            <Pressable
              onPress={() => toggleSave(selectedJob.id)}
              style={styles.heartBtn}
              hitSlop={10}
            >
              <Ionicons
                name={isSaved(selectedJob.id) ? "heart" : "heart-outline"}
                size={22}
              />
            </Pressable>
          </Pressable>
        ) : null}
      </Animated.View>

      {/* Job details modal (same flow/CTA as Jobs list) */}
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 12 }}>
            <Pressable onPress={() => setOpen(false)} hitSlop={10}><Ionicons name="chevron-down" size={24} color="#6B7280" /></Pressable>
            <Text style={{ fontWeight: "800", fontSize: 18, color: "#1F2937" }}>Job details</Text>
            <View style={{ width: 30 }} />
          </View>

          {selectedJob?.imageUri ? <Image source={{ uri: selectedJob.imageUri }} style={{ width: "100%", height: 220 }} /> : null}

          <View style={{ padding: 12, gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#1F2937" }}>{selectedJob?.title}</Text>
              {appliedChatId ? (
                <Text style={styles.appliedChip}>Applied{appliedStatus ? ` • ${appliedStatus}` : ""}</Text>
              ) : null}
            </View>
            <Text style={{ color: "#6B7280" }}>{selectedJob?.site}</Text>

            {!!selectedJob?.location && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                <Ionicons name="location-outline" size={16} color="#6B7280" />
                <Text style={{ color: "#6B7280" }}>{selectedJob?.location}</Text>
              </View>
            )}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text style={{ color: "#6B7280" }}>{selectedJob?.when}</Text>
            </View>
            {!!selectedJob?.payRate && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                <Ionicons name="cash-outline" size={16} color="#6B7280" />
                <Text style={{ color: "#6B7280" }}>{formatPay(selectedJob?.payRate)}</Text>
              </View>
            )}
            {!!selectedJob?.description && (
              <View style={{ marginTop: 10 }}>
                <Text style={{ fontWeight: "700", color: "#1F2937", marginBottom: 6 }}>Description</Text>
                <Text style={{ color: "#374151", lineHeight: 20 }}>{selectedJob?.description}</Text>
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              {appliedChatId ? (
                <>
                  <View style={[styles.btn, styles.btnMuted, { flex: 1 }]}>
                    <Text style={[styles.btnMutedText, { textAlign: "center" }]}>Applied</Text>
                  </View>
                  <Pressable onPress={goToChat} style={[styles.btn, styles.btnPrimary, { flex: 1 }]}>
                    <Text style={styles.btnPrimaryText}>View chat</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  style={[styles.btn, styles.btnPrimary, { flex: 1 }]}
                  onPress={applyNow}
                  disabled={checkingApplied}
                >
                  <Text style={styles.btnPrimaryText}>{checkingApplied ? "Checking." : "Apply now"}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:"#fff" },
  map:{ flex:1 },

  sheet:{
    position:"absolute",
    left:0, right:0, bottom:0,
    paddingHorizontal:12,
    paddingBottom:12,
    transform:[{ translateY: 200 }]
  },
  card:{
    flexDirection:"row",
    alignItems:"center",
    backgroundColor:"#fff",
    borderRadius:16,
    padding:8,
    shadowColor:"#000",
    shadowOpacity:0.1,
    shadowRadius:8,
    shadowOffset:{ width:0, height:2 },
    elevation:3,
  },
  thumb:{ width:120, height:90, borderRadius:12, backgroundColor:"#E5E7EB" },
  title:{ fontSize:16, fontWeight:"700", color:"#111827" },
  sub:{ fontSize:13, color:"#374151", marginTop:2 },
  muted:{ color:"#6B7280" },
  heartBtn:{ padding:8, borderRadius:999 },

  btn:{ borderRadius:12, paddingVertical:14, alignItems:"center", justifyContent:"center" },
  btnPrimary:{ backgroundColor:"#22c55e" },
  btnPrimaryText:{ color:"#fff", fontWeight:"800" },
  btnMuted:{ backgroundColor:"#F3F4F6" },
  btnMutedText:{ color:"#6B7280", fontWeight:"700" },

  appliedChip:{
    backgroundColor:"#E9F9EE",
    color:"#1E7F3E",
    paddingVertical:4,
    paddingHorizontal:10,
    borderRadius:999,
    overflow:"hidden",
    fontSize:12
  }
});
