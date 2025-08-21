import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { listJobs, type Job, applyToJob, listChats, getApplicationForChat } from "@src/lib/api";
import TopBar from "@src/components/TopBar";
import { useSaved } from "@src/store/useSaved";
import { useAuth } from "@src/store/useAuth";
import { useNotifications } from "@src/store/useNotifications";
import { Colors } from "@src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useProfile } from "@src/store/useProfile";
import { useAppliedJobs } from "@src/store/useAppliedJobs";

type Filter = "all" | "open" | "in_progress" | "completed";

function formatPay(pay?: string) {
  if (!pay) return "";
  const t = String(pay).trim();
  if (/£|\/hr|per\s*hour/i.test(t)) return t;
  if (/^\d+(\.\d+)?$/.test(t)) return `£${t}/hr`;
  return t;
}

function parsePay(pay?: string) {
  if (!pay) return 0;
  const m = String(pay).match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseStart(when?: string): Date | null {
  if (!when) return null;
  const m = when.match(/^(\d{1,2})\s+([A-Za-z]{3})/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = m[2];
  const year = new Date().getFullYear();
  const d = new Date(`${day} ${month} ${year}`);
  return isNaN(d.getTime()) ? null : d;
}

function matchScore(job: Job, skills: string[]) {
  if (!skills.length) return 0;
  const jobSkills = (job.skills || []).map((s) => s.toLowerCase());
  const desc = (job.description || "").toLowerCase();
  let score = 0;
  skills.forEach((s) => {
    const sl = s.toLowerCase();
    if (jobSkills.includes(sl)) score += 2;
    if (desc.includes(sl)) score += 1;
  });
  return score;
}

export default function Jobs() {
  const [items, setItems] = useState<Job[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [featured, setFeatured] = useState<Job[]>([]);
  const [recommended, setRecommended] = useState<Job[]>([]);
  const [startingSoon, setStartingSoon] = useState<Job[]>([]);
  const { isSaved, toggleSave } = useSaved();
  const { user } = useAuth();
  const { bump } = useNotifications();
  const profiles = useProfile((s) => s.profiles);
  const { jobId: jobParam } = useLocalSearchParams<{ jobId?: string }>();

  const [selected, setSelected] = useState<Job | null>(null);
  const [open, setOpen] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<{ userId: number; jobId: number } | null>(null);

  // Applied state for the selected job
  const [appliedChatId, setAppliedChatId] = useState<number | null>(null);
  const [appliedStatus, setAppliedStatus] = useState<"pending" | "accepted" | "declined" | null>(null);
  const [checkingApplied, setCheckingApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const { applied: appliedJobs, setApplied, setMany } = useAppliedJobs();

  useEffect(() => {
    if (!open && pendingProfile) {
      const { userId, jobId } = pendingProfile;
      setPendingProfile(null);
      router.push({
        pathname: "/(labourer)/profileDetails",
        params: { userId: String(userId), jobId: String(jobId), from: "jobs" },
      });
    }
  }, [open, pendingProfile]);

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
          const appliedMap: Record<number, { chatId: number; status: "pending" | "accepted" | "declined" }> = {};
          apps.forEach((a) => {
            if (a) appliedMap[a.jobId] = { chatId: a.chatId, status: a.status };
          });
          if (!cancelled) {
            setItems(jobs.filter((j) => !declined.includes(j.id)));
            setMany(appliedMap);
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

  useEffect(() => {
    const jp = Array.isArray(jobParam) ? jobParam[0] : jobParam;
    const id = jp ? parseInt(jp, 10) : NaN;
    if (!isNaN(id)) {
      const job = items.find((j) => j.id === id);
      if (job) {
        setSelected(job);
        setOpen(true);
      }
    }
  }, [jobParam, items]);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((j) => j.status === filter)),
    [items, filter]
  );

  const onPressCard = (job: Job) => {
    setSelected(job);
    setOpen(true);
    setCheckingApplied(true);
  };

  // Categorize jobs into sections
  useEffect(() => {
    if (!items.length) {
      setFeatured([]);
      setRecommended([]);
      setStartingSoon([]);
      return;
    }
    // Featured jobs: top 25% pay, pick 5 random
    const withPay = items.map((j) => ({ job: j, pay: parsePay(j.payRate) }));
    const sorted = withPay.sort((a, b) => b.pay - a.pay);
    const topCount = Math.ceil(sorted.length * 0.25);
    const top = sorted.slice(0, topCount).map((x) => x.job);
    setFeatured(shuffle(top).slice(0, 5));

    // Recommended jobs based on skills
    const profile = user ? profiles[user.id] : undefined;
    const skills = profile?.skills ?? [];
    if (skills.length) {
      const recs = items
        .map((j) => ({ job: j, score: matchScore(j, skills) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map((x) => x.job);
      setRecommended(recs);
    } else {
      setRecommended([]);
    }

    // Starting soon: within next week
    const now = new Date();
    const soon = items.filter((j) => {
      const start = parseStart(j.when);
      if (!start) return false;
      const diff = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    });
    setStartingSoon(shuffle(soon).slice(0, 10));
  }, [items, profiles, user]);

  // Check if this user has already applied to the selected job
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!open || !selected || !user) {
        setAppliedChatId(null);
        setAppliedStatus(null);
        return;
      }

      setCheckingApplied(true);

      const cached = appliedJobs[selected.id];
      if (cached) {
        setAppliedChatId(cached.chatId);
        setAppliedStatus(cached.status);
        try {
          const app = await getApplicationForChat(cached.chatId);
          if (!cancelled && app) {
            const status = app.status;
            setAppliedStatus(status);
            if (cached.status !== status) {
              setApplied(selected.id, { chatId: cached.chatId, status });
            }
            if (status === "declined") {
              setOpen(false);
              setItems((prev) => prev.filter((j) => j.id !== selected.id));
            }
          }
        } finally {
          if (!cancelled) setCheckingApplied(false);
        }
        return;
      }

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
        if (!cancelled && app) {
          const status = app.status;
          setAppliedStatus(status);
          setApplied(selected.id, { chatId: chat.id, status });
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
  }, [open, selected?.id, user?.id, appliedJobs, setApplied]);

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
      setApplied(selected.id, { chatId: res.chatId, status: "pending" });
      setOpen(false);
      router.push({ pathname: "/(labourer)/chats/[id]", params: { id: String(res.chatId) } });
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to apply");
    } finally {
      setApplying(false);
    }
    }, [selected, user, appliedChatId, applying, bump, setApplied]);

  const goToChat = useCallback(() => {
    if (!appliedChatId) return;
    setOpen(false);
    router.push({ pathname: "/(labourer)/chats/[id]", params: { id: String(appliedChatId) } });
  }, [appliedChatId]);

  const renderCard = useCallback(
    (item: Job, extraStyle?: any) => {
      const saved = isSaved(item.id);
      const thumb = item.imageUri ?? "https://via.placeholder.com/120x88?text=Job";
      const pay = formatPay(item.payRate);
      return (
        <Pressable key={item.id} style={[styles.card, extraStyle]} onPress={() => onPressCard(item)}>
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
    },
    [isSaved, toggleSave, onPressCard]
  );

  const renderSection = (title: string, data: Job[]) => {
    if (!data.length) return null;
    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sectionScroll}
        >
          {data.map((j) => renderCard(j, styles.horizontalCard))}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <TopBar />
      <FlatList
        data={filtered}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => renderCard(item)}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12 }}
        ListHeaderComponent={
          <View style={{ paddingBottom: 12 }}>
            {renderSection("Featured jobs", featured)}
            {renderSection("Recommended for you", recommended)}
            {renderSection("Starting soon", startingSoon)}
            <View style={styles.filters}>
              {(["all", "open", "in_progress", "completed"] as Filter[]).map((f) => (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  style={[styles.chip, filter === f && styles.chipActive]}
                >
                  <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
                    {f.replace("_", " ")}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
      />

      {/* Details popup */}
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
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
            {selected ? (
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                <Pressable
                  disabled={selected.ownerId == null}
                  onPress={() => {
                    if (selected.ownerId == null) return;
                    router.setParams({ jobId: undefined });
                    setPendingProfile({ userId: selected.ownerId, jobId: selected.id });
                    setOpen(false);
                  }}
                  style={{ marginRight: 8 }}
                >
                  {selected.ownerId != null && profiles[selected.ownerId]?.avatarUri ? (
                    <Image
                      source={{ uri: profiles[selected.ownerId]!.avatarUri }}
                      style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#E5E7EB" }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: "#E5E7EB",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="person" size={18} color="#9CA3AF" />
                    </View>
                  )}
                </Pressable>
                <Text style={{ color: "#6B7280" }}>
                  Posted by {selected.ownerId != null
                    ? profiles[selected.ownerId]?.name?.split(" ")[0] || "Manager"
                    : "Manager"}
                </Text>
              </View>
            ) : null}
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
                    <Text style={[styles.btnMutedText, { textAlign: "center" }]}>Applied</Text>
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
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary},
  chipText: { color: "#1F2937" },
  chipTextActive: { color: "#fff" },

  sectionTitle: {
    fontWeight: "800",
    fontSize: 18,
    marginLeft: 12,
    marginBottom: 8,
    color: "#1F2937",
  },
  sectionScroll: { paddingHorizontal: 12, gap: 12 },
  horizontalCard: { width: 260 },

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
