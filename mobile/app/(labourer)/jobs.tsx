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
  Dimensions,
} from "react-native";
import { listJobs, type Job, applyToJob, listChats, getApplicationForChat } from "@src/lib/api";
import TopBar from "@src/components/TopBar";
import { useSaved } from "@src/store/useSaved";
import { useAuth } from "@src/store/useAuth";
import { useNotifications } from "@src/store/useNotifications";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useProfile } from "@src/store/useProfile";
import { useAppliedJobs } from "@src/store/useAppliedJobs";

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

function getStartDate(job: Job): Date | null {
  if (!job.when) return null;
  
  const normalized = job.when.replace(/[–—]/g, "-");
  const first = normalized.split(/-|to/i)[0].trim();

  // First try ISO format
  const iso = first.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const [, y, m, d] = iso;
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    date.setHours(0, 0, 0, 0);
    return date;
  }

  // Remove ordinal suffixes (1st, 2nd, etc.)
  const cleaned = first.replace(/(\d{1,2})(st|nd|rd|th)/i, "$1");
  const m = cleaned.match(/(\d{1,2})\s+([A-Za-z]{3,})(?:\s+(\d{4}))?/);
  if (!m) return null;

  const day = parseInt(m[1], 10);
  const monthStr = m[2].slice(0, 3).toLowerCase();
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const month = months.indexOf(monthStr);
  if (month === -1) return null;

  const year = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
  const date = new Date(year, month, day);
  if (isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function Jobs() {
  const [items, setItems] = useState<Job[]>([]);
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
        pathname: "/(labourer)/profile/details",
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
  }, [user, setMany]);

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

  const completedJobs = useMemo(() => items.filter((j) => j.status === "completed"), [items]);

  const featuredJobs = useMemo(() => {
    if (!items.length) return [] as Job[];
    const sorted = items
      .map((j) => ({ job: j, pay: parsePay(j.payRate) }))
      .sort((a, b) => b.pay - a.pay);
    const topCount = Math.ceil(sorted.length * 0.25);
    const top = sorted.slice(0, topCount).map((x) => x.job);
    return shuffle(top).slice(0, 5);
  }, [items]);

  const recommendedJobs = useMemo(() => {
    const labourerSkills = user ? profiles[user.id]?.skills ?? [] : [];
    if (!labourerSkills.length) return [] as Job[];
    return items
      .map((j) => {
        const text = ((j.skills || []).join(" ") + " " + (j.description || "")).toLowerCase();
        const score = labourerSkills.filter((s) => text.includes(s.toLowerCase())).length;
        return { job: j, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((x) => x.job);
  }, [items, user, profiles]);

  const startingSoonJobs = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const week = new Date(today);
    week.setDate(today.getDate() + 7);
    const soon = items.filter((j) => {
      const start = getStartDate(j);
      return start && start >= today && start <= week;
    });
    return shuffle(soon).slice(0, 10);
  }, [items]);

  const onPressCard = (job: Job) => {
    setSelected(job);
    setOpen(true);
    setCheckingApplied(true);
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
  }, [open, selected, user, appliedJobs, setApplied]);

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

  const renderCard = ({ item }: { item: Job }) => {
    const saved = isSaved(item.id);
    const thumb = item.imageUri ?? "https://via.placeholder.com/120x88?text=Job";
    const pay = formatPay(item.payRate);
    return (
      <Pressable style={styles.card} onPress={() => onPressCard(item)}>
        <Image source={{ uri: thumb }} style={styles.thumb} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            {item.title}
          </Text>
          <Text style={styles.meta} numberOfLines={1} ellipsizeMode="tail">
            {item.site}
          </Text>
          {!!item.location && (
            <View style={styles.row}>
              <Ionicons name="location-outline" size={16} color="#6B7280" />
              <Text style={styles.meta} numberOfLines={1} ellipsizeMode="tail">
                {item.location}
              </Text>
            </View>
          )}
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.meta} numberOfLines={1} ellipsizeMode="tail">
              {item.when}
            </Text>
          </View>
          {!!pay && (
            <View style={styles.row}>
              <Ionicons name="cash-outline" size={16} color="#6B7280" />
              <Text style={styles.meta} numberOfLines={1} ellipsizeMode="tail">
                {pay}
              </Text>
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
  };

  const renderSection = (
    title: string,
    data: Job[],
    showDivider = false,
    emptyText?: string
  ) => (
    <View key={title}>
      {showDivider && <View style={styles.sectionDivider} />}
      <Text style={styles.sectionTitle}>{title}</Text>
      {data.length ? (
        <FlatList
          data={data}
          keyExtractor={(i) => String(i.id)}
          renderItem={renderCard}
          horizontal
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          contentContainerStyle={{ paddingRight: 12 }}
          showsHorizontalScrollIndicator={false}
        />
      ) : emptyText ? (
        <Text style={styles.empty}>{emptyText}</Text>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <TopBar />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}>
        {renderSection("Featured Jobs", featuredJobs)}
        {renderSection("Recommended for You", recommendedJobs, true)}
        {renderSection("Starting Soon", startingSoonJobs, true)}
        {renderSection("Nearby Jobs", items, true)}
        {renderSection(
          "Completed Jobs",
          completedJobs,
          true,
          "Once jobs complete, they'll appear here."
        )}
      </ScrollView>

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

            {!!(selected?.skills && selected.skills.length) && (
              <View style={{ marginTop: 10 }}>
                <Text style={{ fontWeight: "700", color: "#1F2937" }}>Skills</Text>
                <View style={styles.chips}>
                  {selected!.skills!.map((s) => (
                    <View key={s} style={[styles.chip, { paddingHorizontal: 10 }]}> 
                      <Text style={styles.chipText}>{s}</Text>
                    </View>
                  ))}
                </View>
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

const CARD_WIDTH = Dimensions.get("window").width - 24;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  sectionTitle: { color: "#6B7280", fontWeight: "800", marginTop: 6, marginBottom: 8 },
  sectionDivider: { height: 1, backgroundColor: "#eee", marginVertical: 8 },
  empty: { color: "#6B7280", marginBottom: 8 },

  card: {
    width: CARD_WIDTH,
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "space-between",
  },
  thumb: { width: 120, height: 88, borderRadius: 12, backgroundColor: "#eee" },

  row: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  title: { fontWeight: "700", fontSize: 16, marginBottom: 2, color: "#1F2937" },
  meta: { color: "#555", flexShrink: 1 },

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

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  chipText: { color: "#111827", fontWeight: "600" },

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

