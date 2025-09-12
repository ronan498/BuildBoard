import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors } from "@src/theme/tokens";
import { useAuth } from "@src/store/useAuth";
import { useProfile, type RoleKey } from "@src/store/useProfile";
import { uploadAvatar, uploadBanner } from "@src/lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";


export default function LabourerProfileDetails() {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const authUserId = user?.id ?? 0;
  const params = useLocalSearchParams<{
    userId?: string;
    jobId?: string;
    from?: string;
    role?: string;
  }>();
  const viewUserId = params.userId
    ? parseInt(Array.isArray(params.userId) ? params.userId[0] : params.userId, 10)
    : authUserId;
  const backJobId = params.jobId
    ? Array.isArray(params.jobId) ? params.jobId[0] : params.jobId
    : undefined;
  const from = params.from
    ? Array.isArray(params.from)
      ? params.from[0]
      : params.from
    : undefined;
  const viewRole = (params.role
    ? Array.isArray(params.role)
      ? params.role[0]
      : params.role
    : "manager") as RoleKey;
  const isOwn = viewUserId === authUserId;

  const profiles = useProfile((s) => s.profiles);
  const ensureProfile = useProfile((s) => s.ensureProfile);
  const updateProfile = useProfile((s) => s.updateProfile);
  const addSkill = useProfile((s) => s.addSkill);
  const removeSkill = useProfile((s) => s.removeSkill);
  const addInterest = useProfile((s) => s.addInterest);
  const removeInterest = useProfile((s) => s.removeInterest);
  const addQualification = useProfile((s) => s.addQualification);
  const updateQualification = useProfile((s) => s.updateQualification);
  const removeQualification = useProfile((s) => s.removeQualification);

  useEffect(() => {
    if (!profiles[viewUserId]) {
      if (isOwn && user) {
        ensureProfile(
          viewUserId,
          user.username ?? "You",
          (user.role ?? "labourer") as RoleKey,
          token ?? undefined
        );
      } else {
        ensureProfile(
          viewUserId,
          viewRole === "labourer" ? "Labourer" : "Manager",
          viewRole,
          token ?? undefined
        );
      }
    }
  }, [viewUserId, profiles, isOwn, user, ensureProfile, viewRole, token]);

  const profile = profiles[viewUserId];

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(
    profile?.name ?? (isOwn ? user?.username ?? "You" : "Name")
  );
  const [headline, setHeadline] = useState(profile?.headline ?? "Looking for work");
  const [location, setLocation] = useState(profile?.location ?? "Brighton, UK");
  const [company, setCompany] = useState(profile?.company ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");

  const [newSkill, setNewSkill] = useState("");
  const [newInterest, setNewInterest] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setHeadline(profile.headline ?? "Looking for work");
      setLocation(profile.location ?? "");
      setCompany(profile.company ?? "");
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  useEffect(() => {
    if (!isOwn) setEditing(false);
  }, [isOwn, viewUserId]);

  const save = () => {
    if (!user || !isOwn) return;
    updateProfile(
      viewUserId,
      {
        name: name.trim(),
        headline: headline.trim(),
        location: location.trim(),
        company: company.trim() || undefined,
        bio: bio.trim() || undefined,
      },
      token ?? undefined
    );
    setEditing(false);
  };

  const pickImage = async (field: "avatarUri" | "bannerUri") => {
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!res.canceled && res.assets?.length) {
      const localUri = res.assets[0].uri;
      updateProfile(viewUserId, { [field]: localUri } as any);
      if (token) {
        try {
          const url =
            field === "avatarUri"
              ? await uploadAvatar(viewUserId, localUri, token)
              : await uploadBanner(viewUserId, localUri, token);
          updateProfile(viewUserId, { [field]: url } as any);
        } catch (err) {
          console.warn(err);
        }
      }
    }
  };

  const pickImageForQual = async (id: string) => {
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!res.canceled && res.assets?.length) {
      updateQualification(viewUserId, id, { imageUri: res.assets[0].uri }, token ?? undefined);
    }
  };

  const addQual = () => {
    addQualification(
      viewUserId,
      {
        id: String(Date.now()),
        title: "New Qualification",
        status: "pending",
      },
      token ?? undefined
    );
  };

  if (!profile) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Loading profile…</Text>
      </View>
    );
  }

  const hasBio = !!profile.bio?.trim();
  const hasCompany = !!profile.company?.toString().trim();
  const hasLocation = !!profile.location?.toString().trim();
  const showHeadlineRow = !!profile.headline?.trim();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "#fff" }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <View style={{ flex: 1 }}>
          {/* FIXED Top bar (outside the ScrollView) */}
          <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
            <Pressable
              onPress={() => {
                if (from === "chat") {
                  router.back();
                } else if (backJobId) {
                  const dest = from === "jobs" ? "/(labourer)/jobs" : "/(labourer)/map";
                  router.replace({ pathname: dest, params: { jobId: String(backJobId) } });
                } else {
                  router.back();
                }
              }}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={24} color="#111" />
            </Pressable>

            <Text style={styles.topTitle}>Profile</Text>

            {isOwn ? (
              <Pressable onPress={() => setEditing((e) => !e)} hitSlop={12}>
                <Ionicons name={editing ? "close" : "pencil"} size={22} color="#6B7280" />
              </Pressable>
            ) : (
              <View style={{ width: 22 }} />
            )}
          </View>

          <ScrollView
            contentContainerStyle={{
              paddingBottom: Math.max(insets.bottom, 16) + 24,
            }}
            keyboardShouldPersistTaps="handled"
          >
          {/* Banner */}
          <View style={styles.bannerContainer}>
            <Pressable
              onPress={() => editing && pickImage("bannerUri")}
              disabled={!editing}
            >
              <Image
                source={{
                  uri:
                    profile.bannerUri ??
                    "https://images.unsplash.com/photo-1503264116251-35a269479413?q=80&w=1200&auto=format&fit=crop",
                }}
                style={styles.banner}
              />
            </Pressable>

            {/* Avatar with silhouette fallback */}
            <View style={styles.avatarWrap}>
              <Pressable
                onPress={() => editing && pickImage("avatarUri")}
                disabled={!editing}
              >
                {profile.avatarUri ? (
                  <Image source={{ uri: profile.avatarUri }} style={styles.avatar} />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      {
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#E5E7EB",
                      },
                    ]}
                  >
                    <Ionicons name="person" size={28} color="#9CA3AF" />
                  </View>
                )}
              </Pressable>
            </View>
            {isOwn && (
              <Pressable
                onPress={() => router.push("/(labourer)/(profile)/connections")}
                style={({ pressed }) => [
                  styles.connectionsButton,
                  pressed && { opacity: 0.8 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Connections"
              >
                <Ionicons name="people" size={16} color="#111827" />
                <Text style={styles.connectionsText}>Connections</Text>
              </Pressable>
            )}
          </View>

          {/* Identity */}
          <View style={styles.card}>
              {editing ? (
                <>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                    placeholder="Name"
                  />
                  <TextInput
                    value={headline}
                    onChangeText={setHeadline}
                    style={styles.input}
                    placeholder="Headline"
                  />
                </>
              ) : (
                <>
                  <Text style={styles.name}>{profile.name}</Text>
                  {showHeadlineRow && (
                    <View style={styles.rowCenter}>
                      <Text style={styles.headline}>{profile.headline}</Text>
                      <View style={styles.dotOnline} />
                    </View>
                  )}
                </>
              )}

              <View style={styles.metaGrid}>
                <Meta
                  icon="location-outline"
                  label="Based in"
                  value={!editing && hasLocation ? profile.location : undefined}
                />
                <Meta
                  icon="briefcase-outline"
                  label="Company"
                  value={!editing && hasCompany ? profile.company : undefined}
                />
                <Meta
                  icon="construct-outline"
                  label="Jobs Completed"
                  value={String(profile.jobsCompleted ?? 0)}
                />
                <Meta icon="person-outline" label="Role" value="Labourer" />
              </View>

              {editing && (
                <>
                  <TextInput
                    value={location}
                    onChangeText={setLocation}
                    style={styles.input}
                    placeholder="Location"
                  />
                  <TextInput
                    value={company}
                    onChangeText={setCompany}
                    style={styles.input}
                    placeholder="Company"
                  />
                </>
              )}
            </View>

            {/* About */}
            {(editing || hasBio) && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>About</Text>
                {editing ? (
                  <TextInput
                    multiline
                    value={bio}
                    onChangeText={setBio}
                    style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]}
                    placeholder="Tell people about yourself"
                  />
                ) : (
                  <Text style={styles.bodyText}>{profile.bio}</Text>
                )}
              </View>
            )}

            {/* Qualifications */}
            {(editing || profile.qualifications.length > 0) && (
              <View style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.sectionTitle}>Qualifications</Text>
                  {editing && (
                    <Pressable onPress={addQual} style={[styles.btnSm, styles.btnGhost]}>
                      <Ionicons name="add" size={18} />
                      <Text style={styles.btnGhostText}>Add</Text>
                    </Pressable>
                  )}
                </View>

                {profile.qualifications.map((q) => (
                  <View key={q.id} style={styles.qualRow}>
                    <Pressable
                      onPress={() => editing && pickImageForQual(q.id)}
                      disabled={!editing}
                      style={styles.qualImgWrap}
                    >
                      {q.imageUri ? (
                        <Image source={{ uri: q.imageUri }} style={styles.qualImg} />
                      ) : (
                        <View style={[styles.qualImg, styles.qualPlaceholder]}>
                          <Ionicons name="add" size={22} color="#6B7280" />
                        </View>
                      )}
                    </Pressable>

                    <View style={{ flex: 1 }}>
                      {editing ? (
                        <TextInput
                          value={q.title}
                          onChangeText={(t) =>
                            updateQualification(viewUserId, q.id, { title: t }, token ?? undefined)
                          }
                          style={styles.input}
                          placeholder="Title"
                        />
                      ) : (
                        <Text style={styles.qualTitle}>{q.title}</Text>
                      )}
                      <Text
                        style={[
                          styles.badge,
                          q.status === "verified"
                            ? styles.badgeVerified
                            : styles.badgePending,
                        ]}
                      >
                        {q.status === "verified"
                          ? "Verified"
                          : "Pending verification"}
                      </Text>
                    </View>

                    {editing ? (
                      <Pressable
                        onPress={() => removeQualification(viewUserId, q.id, token ?? undefined)}
                        style={[styles.btnIcon, { borderColor: "#ef4444" }]}
                        hitSlop={6}
                      >
                        <Ionicons name="trash" size={18} color="#ef4444" />
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
            )}

            {/* Skills */}
            {(editing || profile.skills.length > 0) && (
              <ChipsSection
                title="Skills"
                items={profile.skills}
                editing={editing}
                newValue={newSkill}
                onChangeNew={setNewSkill}
                onAdd={() => {
                  if (!newSkill.trim()) return;
                  addSkill(viewUserId, newSkill.trim(), token ?? undefined);
                  setNewSkill("");
                }}
                onRemove={(s) => removeSkill(viewUserId, s, token ?? undefined)}
              />
            )}

            {/* Interests */}
            {(editing || profile.interests.length > 0) && (
              <ChipsSection
                title="Interests"
                items={profile.interests}
                editing={editing}
                newValue={newInterest}
                onChangeNew={setNewInterest}
                onAdd={() => {
                  if (!newInterest.trim()) return;
                  addInterest(viewUserId, newInterest.trim(), token ?? undefined);
                  setNewInterest("");
                }}
                onRemove={(s) => removeInterest(viewUserId, s, token ?? undefined)}
              />
            )}

            {/* Save inside the scroll */}
            {editing && (
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingTop: 8,
                  paddingBottom: Math.max(insets.bottom, 8),
                }}
              >
                <Pressable onPress={save} style={[styles.btn, styles.btnPrimary]}>
                  <Text style={styles.btnPrimaryText}>Save changes</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

function Meta({ icon, label, value }: { icon: any; label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={16} color="#6B7280" />
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function ChipsSection({
  title,
  items,
  editing,
  newValue,
  onChangeNew,
  onAdd,
  onRemove,
}: {
  title: string;
  items: string[];
  editing: boolean;
  newValue: string;
  onChangeNew: (s: string) => void;
  onAdd: () => void;
  onRemove: (s: string) => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {items.map((s) => (
          <View key={s} style={styles.chip}>
            <Text style={styles.chipText}>{s}</Text>
            {editing && (
              <Pressable onPress={() => onRemove(s)} hitSlop={6}>
                <Ionicons name="close" size={14} color="#6B7280" />
              </Pressable>
            )}
          </View>
        ))}
      </View>
      {editing && (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          <TextInput
            value={newValue}
            onChangeText={onChangeNew}
            placeholder={`Add ${title.slice(0, -1).toLowerCase()}`}
            style={[styles.input, { flex: 1 }]}
          />
          <Pressable onPress={onAdd} style={[styles.btn, styles.btnGhost]}>
            <Ionicons name="add" size={18} />
            <Text style={styles.btnGhostText}>Add</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 12,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topTitle: { fontWeight: "800", fontSize: 18, color: "#1F2937" },

  bannerContainer: { position: "relative", marginBottom: 40 },
  banner: { width: "100%", height: 140, backgroundColor: "#ddd" },
  connectionsButton: {
    position: "absolute",
    right: 12,
    bottom: -41,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  connectionsText: { color: "#111827", fontWeight: "600" },
  avatarWrap: { position: "absolute", left: 12, bottom: -34 },
  avatar: { width: 68, height: 68, borderRadius: 34, borderWidth: 3, borderColor: "#fff" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 12,
    marginTop: 10,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ececec",
  },

  name: { fontSize: 20, fontWeight: "800", color: "#111" },
  headline: { color: "#374151", fontWeight: "600" },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  dotOnline: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#22c55e" },

  metaGrid: { marginTop: 10, gap: 8 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaLabel: { color: "#6B7280" },
  metaValue: { color: "#111", fontWeight: "600" },

  sectionTitle: { fontWeight: "800", fontSize: 16, color: "#1F2937" },
  bodyText: { color: "#374151", lineHeight: 20 },

  qualRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  qualImgWrap: { borderRadius: 8, overflow: "hidden" },
  qualImg: { width: 110, height: 70, borderRadius: 8, backgroundColor: "#eee" },
  qualPlaceholder: { alignItems: "center", justifyContent: "center" },
  qualTitle: { fontWeight: "700", color: "#111", marginBottom: 4 },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  chipText: { color: "#111", fontWeight: "600" },

  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  btn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  btnPrimary: { backgroundColor: Colors.primary },
  btnPrimaryText: { color: "#fff", fontWeight: "800" },
  btnGhost: { backgroundColor: "#fff", borderWidth: StyleSheet.hairlineWidth, borderColor: "#e5e7eb" },
  btnGhostText: { fontWeight: "700", color: "#111" },
  btnSm: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  btnIcon: { padding: 8, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: "#e5e7eb" },

  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 12,
    overflow: "hidden",
  },
  badgeVerified: { backgroundColor: "#E9F9EE", color: "#1E7F3E" },
  badgePending: { backgroundColor: "#FFF4CC", color: "#8A6A00" },
});
