import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, FlatList, Text, StyleSheet, Pressable, Image, Modal, ScrollView, Alert } from "react-native";
import { listJobs, type Job, applyToJob, listChats, getApplicationForChat } from "@src/lib/api";
import TopBar from "@src/components/TopBar";
import { useSaved } from "@src/store/useSaved";
import { useAuth } from "@src/store/useAuth";
import { useNotifications } from "@src/store/useNotifications";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

type Filter = "all" | "open" | "in_progress" | "completed";

function formatPay(pay?: string) {
  if (!pay) return "";
  const t = String(pay).trim();
  if (/£|\/hr|per\s*hour/i.test(t)) return t;
  if (/^\d+(\.\d+)?$/.test(t)) return `£${t}/hr`;
  return t;
}

export default function Jobs() {
  const [items, setItems] = useState<Job[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const { isSaved, toggleSave } = useSaved();
  const { user } = useAuth();
  const { bump } = useNotifications();

  const [selected, setSelected] = useState<Job | null>(null);
  const [open, setOpen] = useState(false);

  // Applied state for the selected job
  const [appliedChatId, setAppliedChatId] = useState<number | null>(null);
  const [appliedStatus, setAppliedStatus] = useState<"pending" | "accepted" | "declined" | null>(null);
  const [checkingApplied, setCheckingApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [localApplied, setLocalApplied] = useState<Record<number, { chatId: number; status: "pending" | "accepted" | "declined" }>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const jobs = await listJobs();
      if (user) {
        try {
          const chats = await listChats(user.id);
          const apps = await Promise.all(chats.map((c) => getApplicationForChat(c.id)));
          const declined = apps
            .filter((a) => a && a.status === "declined")
            .map((a) => a!.jobId);
          if (!cancelled) {
            setItems(jobs.filter((j) => !declined.includes(j.id)));
          }
        } catch {
          if (!cancelled) setItems(jobs);
        }
      } else {
        if (!cancelled) setItems(jobs);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((j) => j.status === filter)),
    [items, filter]
  );

  const onPressCard = (job: Job) => {
    setSelected(job);
    setOpen(true);
  };

  // Check if this user has already applied to the selected job
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!open || !selected || !user) {
        setAppliedChatId(null);
        setAppliedStatus(null);
        return;
      }

      // populate from local cache immediately so the Apply button is hidden
      const cached = localApplied[selected.id];
      if (cached) {
        setAppliedChatId(cached.chatId);
        setAppliedStatus(cached.status);
      } else {
        setAppliedChatId(null);
        setAppliedStatus(null);
      }

      setCheckingApplied(true);
      try {
        const chats = await listChats(user.id);
        const chat = chats.find((c) => c.jobId === selected.id && c.workerId === user.id);
        if (!chat) {
          if (!cancelled) {
            setAppliedChatId(null);
            setAppliedStatus(null);
          }
          return;
        }
        if (!cancelled) setAppliedChatId(chat.id);
        const app = await getApplicationForChat(chat.id);
        if (!cancelled) {
          const status = app?.status ?? "pending";
          setAppliedStatus(status);
          setLocalApplied((prev) => ({ ...prev, [selected.id]: { chatId: chat.id, status } }));
          if (status === "declined") {
            setOpen(false);
            setItems((prev) => prev.filter((j) => j.id !== selected.id));
          }
        }
      } finally {
        if (!cancelled) setCheckingApplied(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selected?.id, user?.id]);

  const applyNow = useCallback(async () => {
    if (!selected || !user || applying) return;
    // If already applied, just take them to the chat
    if (appliedChatId) {
      setOpen(false);
      router.push({ pathname: "/(labourer)/chats/[id]", params: { id: String(appliedChatId) } });
      return;
    }
    setApplying(true);
    try {
      const res = await applyToJob(selected.id, user.id, user.username);
      // notify manager (badge)
      bump("manager", 1);
      // Remember this is now applied and go to chat
      setAppliedChatId(res.chatId);
      setAppliedStatus("pending");
      setLocalApplied((prev) => ({ ...prev, [selected.id]: { chatId: res.chatId, status: "pending" } }));
      setOpen(false);
      router.push({ pathname: "/(labourer)/chats/[id]", params: { id: String(res.chatId) } });
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to apply");
    } finally {
      setApplying(false);
    }
  }, [selected, user, appliedChatId, applying]);

  const goToChat = useCallback(() => {
    if (!appliedChatId) return;
    setOpen(false);
    router.push({ pathname: "/(labourer)/chats/[id]", params: { id: String(appliedChatId) } });
  }, [appliedChatId]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <TopBar />
      {/* Filters */}
      <View style={styles.filters}>
        {(["all", "open", "in_progress", "completed"] as Filter[]).map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipActive]}>
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f.replace("_", " ")}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => {
          const saved = isSaved(item.id);
          const thumb = item.imageUri ?? "https://via.placeholder.com/120x88?text=Job";
          const pay = formatPay(item.payRate);
          return (
            <Pressable style={styles.card} onPress={() => onPressCard(item)}>
              <Image source={{ uri: thumb }} style={styles.thumb} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.meta}>{item.site}</Text>
                {!!item.location && (
                  <View style={styles.row}>
                    <Ionicons name="location-outline" size={16} color="#6B7280" />
                    <Text style={styles.meta}>{item.location}</Text>
                  </View>
                )}
                <View style={styles.row}>
                  <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                  <Text style={styles.meta}>{item.when}</Text>
                </View>
                {!!pay && (
                  <View style={styles.row}>
                    <Ionicons name="cash-outline" size={16} color="#6B7280" />
                    <Text style={styles.meta}>{pay}</Text>
                  </View>
                )}
              </View>
              <Pressable
                onPress={() => toggleSave(item.id)}
                style={styles.saveBtn}
                hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
              >
                <Ionicons name={saved ? "heart" : "heart-outline"} size={22} />
              </Pressable>
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12 }}
      />

      {/* Details popup */}
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 12,
              paddingVertical: 12,
            }}
          >
            <Pressable onPress={() => setOpen(false)} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
              <Ionicons name="chevron-down" size={24} color="#6B7280" />
            </Pressable>
            <Text style={{ fontWeight: "800", fontSize: 18, color: "#1F2937" }}>Job details</Text>
            <View style={{ width: 30 }} />
          </View>

          {selected?.imageUri ? <Image source={{ uri: selected.imageUri }} style={{ width: "100%", height: 220 }} /> : null}

          <View style={{ padding: 12, gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#1F2937" }}>{selected?.title}</Text>
              {appliedChatId ? (
                <Text style={styles.appliedChip}>
                  Applied{appliedStatus ? ` • ${appliedStatus}` : ""}
                </Text>
              ) : null}
            </View>
            <Text style={{ color: "#6B7280" }}>{selected?.site}</Text>

            {!!selected?.location && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                <Ionicons name="location-outline" size={16} color="#6B7280" />
                <Text style={{ color: "#6B7280" }}>{selected?.location}</Text>
              </View>
            )}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text style={{ color: "#6B7280" }}>{selected?.when}</Text>
            </View>
            {!!selected?.payRate && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                <Ionicons name="cash-outline" size={16} color="#6B7280" />
                <Text style={{ color: "#6B7280" }}>{formatPay(selected?.payRate)}</Text>
              </View>
            )}

            {!!selected?.description && (
              <View style={{ marginTop: 10 }}>
                <Text style={{ fontWeight: "700", color: "#1F2937", marginBottom: 6 }}>Description</Text>
                <Text style={{ color: "#374151", lineHeight: 20 }}>{selected?.description}</Text>
              </View>
            )}

            {/* Footer Actions */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              {appliedChatId ? (
                <>
                  <View style={[styles.btn, styles.btnMuted, { flex: 1 }]}>
                    <Text style={[styles.btnMutedText, { textAlign: "center" }]}>Applied{appliedStatus ? ` • ${appliedStatus}` : ""}</Text>
                  </View>
                  <Pressable onPress={goToChat} style={[styles.btn, styles.btnPrimary, { flex: 1 }]}>
                    <Text style={styles.btnPrimaryText}>View chat</Text>
                  </Pressable>
                </>
              ) : applying ? (
                <View style={[styles.btn, styles.btnMuted, { flex: 1 }]}>
                  <Text style={[styles.btnMutedText, { textAlign: "center" }]}>Applying...</Text>
                </View>
              ) : (
                <Pressable
                  style={[styles.btn, styles.btnPrimary, { flex: 1 }]}
                  onPress={applyNow}
                  disabled={checkingApplied || applying}
                >
                  <Text style={styles.btnPrimaryText}>{checkingApplied ? "Checking..." : "Apply now"}</Text>
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
  container: { flex: 1, backgroundColor: "#fff" },
  filters: { flexDirection: "row", gap: 8, margin: 12, flexWrap: "wrap" },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: "#e6e6e6" },
  chipActive: { backgroundColor: "#1f6feb", borderColor: "#1f6feb" },
  chipText: { color: "#1F2937" },
  chipTextActive: { color: "#fff" },

  card: {
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  thumb: { width: 120, height: 88, borderRadius: 12, backgroundColor: "#eee" },

  row: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  title: { fontWeight: "700", fontSize: 16, marginBottom: 2, color: "#1F2937" },
  meta: { color: "#555" },

  saveBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },

  btn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnPrimary: { backgroundColor: "#22c55e" },
  btnPrimaryText: { color: "#fff", fontWeight: "800" },
  btnMuted: { backgroundColor: "#F3F4F6" },
  btnMutedText: { color: "#6B7280", fontWeight: "700" },

  // Header chip stays green and shows status text, e.g. "Applied • accepted"
  appliedChip: {
    backgroundColor: "#E9F9EE",
    color: "#1E7F3E",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    overflow: "hidden",
    fontSize: 12,
  },
});
