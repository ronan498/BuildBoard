import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, Alert, ScrollView } from "react-native";
import TopBar from "@src/components/TopBar";
import { Colors } from "@src/theme/tokens";
import { useAuth } from "@src/store/useAuth";
import { useProfile, defaultProfile } from "@src/store/useProfile";
import { router } from "expo-router";

export default function PersonalInfo() {
  const { user } = useAuth();
  const userId = user?.id ?? 0;

  const profiles = useProfile((s) => s.profiles);
  const upsertProfile = useProfile((s) => s.upsertProfile);

  useEffect(() => {
    if (!user) return;
    if (!profiles[user.id]) {
      upsertProfile(
        defaultProfile(user.id, user.username ?? "You", (user.role ?? "labourer") as any)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const profile = profiles[userId];
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState((user as any)?.email ?? "");
  const [fullName, setFullName] = useState(profile?.name ?? "");
  const [phone, setPhone] = useState((profile as any)?.phone ?? "");
  const [address, setAddress] = useState((profile as any)?.address ?? "");
  const [city, setCity] = useState((profile as any)?.city ?? "");
  const [postcode, setPostcode] = useState((profile as any)?.postcode ?? "");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const dirty = useMemo(() => {
    return (
      username !== (user?.username ?? "") ||
      email !== ((user as any)?.email ?? "") ||
      fullName !== (profile?.name ?? "") ||
      phone !== ((profile as any)?.phone ?? "") ||
      address !== ((profile as any)?.address ?? "") ||
      city !== ((profile as any)?.city ?? "") ||
      postcode !== ((profile as any)?.postcode ?? "") ||
      !!newPw ||
      !!currentPw ||
      !!confirmPw
    );
  }, [username, email, fullName, phone, address, city, postcode, newPw, currentPw, confirmPw]);

  const save = async () => {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    if (newPw || currentPw || confirmPw) {
      if (newPw.length < 8) {
        Alert.alert("Weak password", "New password must be at least 8 characters.");
        return;
      }
      if (newPw !== confirmPw) {
        Alert.alert("Password mismatch", "New password and confirmation do not match.");
        return;
      }
      // TODO: await useAuth.getState().updatePassword(currentPw, newPw)
    }

    upsertProfile({
      ...(profile ?? defaultProfile(userId, username || "You", (user?.role ?? "labourer") as any)),
      id: userId,
      name: fullName || username || "You",
      phone,
      address,
      city,
      postcode,
      email,
      username,
    } as any);

    // TODO: update auth store/account if needed

    Alert.alert("Saved", "Your personal information has been updated.", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <TopBar />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Text style={styles.h1}>Personal information</Text>

        {/* Account */}
        <Section title="Account">
          <Field label="Username">
            <TextInput
              value={username}
              onChangeText={setUsername}
              style={styles.input}
              placeholder="Your username"
            />
          </Field>
          <Field label="Email">
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </Field>
          <View style={{ height: 8 }} />
          <Text style={styles.labelMuted}>Change password</Text>
          <TextInput
            value={currentPw}
            onChangeText={setCurrentPw}
            style={styles.input}
            placeholder="Current password"
            secureTextEntry
          />
          <TextInput
            value={newPw}
            onChangeText={setNewPw}
            style={styles.input}
            placeholder="New password"
            secureTextEntry
          />
          <TextInput
            value={confirmPw}
            onChangeText={setConfirmPw}
            style={styles.input}
            placeholder="Confirm new password"
            secureTextEntry
          />
          <Text style={styles.help}>
            Password changes are mocked in the demo. Wire to your auth API/store when ready.
          </Text>
        </Section>

        {/* Personal details */}
        <Section title="Personal details">
          <Field label="Full name">
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
              placeholder="Full name"
            />
          </Field>
          <Field label="Phone">
            <TextInput
              value={phone}
              onChangeText={setPhone}
              style={styles.input}
              placeholder="+44…"
              keyboardType="phone-pad"
            />
          </Field>
          <Field label="Address">
            <TextInput
              value={address}
              onChangeText={setAddress}
              style={styles.input}
              placeholder="Street address"
            />
          </Field>
          <Field label="City">
            <TextInput value={city} onChangeText={setCity} style={styles.input} placeholder="City/Town" />
          </Field>
          <Field label="Postcode">
            <TextInput
              value={postcode}
              onChangeText={setPostcode}
              style={styles.input}
              placeholder="Postcode"
              autoCapitalize="characters"
            />
          </Field>
        </Section>

        <Pressable
          onPress={save}
          style={[styles.saveBtn, !dirty && { opacity: 0.5 }]}
          disabled={!dirty}
          accessibilityRole="button"
        >
          <Text style={styles.saveText}>Save changes</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.h2}>{title}</Text>
      <View style={{ gap: 12 }}>{children}</View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: "700" },
  h2: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    gap: 8,
  },
  label: { fontSize: 13, color: "#111827" },
  labelMuted: { fontSize: 13, color: "#6B7280", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
  },
  help: { color: "#6B7280", fontSize: 12, marginTop: 6 },
  saveBtn: {
    backgroundColor: Colors.primary, // matches app's green
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "#fff", fontWeight: "700" },
});
