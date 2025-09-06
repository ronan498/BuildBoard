import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, Alert, ScrollView } from "react-native";
import { Colors } from "@src/theme/tokens";
import { useAuth } from "@src/store/useAuth";
import { useProfile, defaultProfile } from "@src/store/useProfile";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";


export default function PersonalInfo() {
  const { user, token } = useAuth();
  const userId = user?.id ?? 0;

  const profiles = useProfile((s) => s.profiles);
  const upsertProfile = useProfile((s) => s.upsertProfile);
  const ensureProfile = useProfile((s) => s.ensureProfile);

  const profile =
    profiles[userId] ??
    defaultProfile(userId, user?.username ?? "You", (user?.role ?? "labourer") as any);

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

  useEffect(() => {
    if (!profiles[userId]) {
      ensureProfile(userId, user?.username ?? "You", (user?.role ?? "labourer") as any, token ?? undefined);
    }
  }, [userId, profiles, user, ensureProfile]);

  useEffect(() => {
    setFullName(profile?.name ?? "");
    setPhone((profile as any)?.phone ?? "");
    setAddress((profile as any)?.address ?? "");
    setCity((profile as any)?.city ?? "");
    setPostcode((profile as any)?.postcode ?? "");
  }, [profile?.userId]);

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
      // TODO: wire to auth for real password change
    }


    upsertProfile(
      {
        ...(profile ?? defaultProfile(userId, username || "You", (user?.role ?? "labourer") as any)),
        id: userId,
        name: fullName || username || "You",
        phone,
        address,
        city,
        postcode,
        email,
        username,
      } as any,
      token ?? undefined
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          // Force the native header to be visible on this screen
          headerShown: true,
          headerTitle: "Personal information",
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back to profile"
              style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4 }}
            >
              <Ionicons name="chevron-back" size={24} color="#111" />
              <Text style={{ fontWeight: "600" }}>Back</Text>
            </Pressable>
          ),
        }}
      />

      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Account</Text>

            <Field label="Username">
              <TextInput
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                placeholder="Your username"
                autoCapitalize="none"
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
          </View>

          <View style={{ height: 16 }} />

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Contact & address</Text>

            <Field label="Full name">
              <TextInput value={fullName} onChangeText={setFullName} style={styles.input} placeholder="Your name" />
            </Field>

            <Field label="Phone">
              <TextInput
                value={phone}
                onChangeText={setPhone}
                style={styles.input}
                placeholder="+44 7..."
                keyboardType="phone-pad"
              />
            </Field>

            <Field label="Address">
              <TextInput value={address} onChangeText={setAddress} style={styles.input} placeholder="Street address" />
            </Field>

            <Field label="City">
              <TextInput value={city} onChangeText={setCity} style={styles.input} placeholder="City" />
            </Field>

            <Field label="Postcode">
              <TextInput value={postcode} onChangeText={setPostcode} style={styles.input} placeholder="Postcode" />
            </Field>
          </View>

          <View style={{ height: 16 }} />

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Change password</Text>
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
            <Text style={styles.help}>Password changes are not yet connected to auth; this only updates local state.</Text>
          </View>

          <View style={{ height: 20 }} />

          <Pressable
            disabled={!dirty}
            onPress={save}
            style={[styles.saveBtn, !dirty && { opacity: 0.5 }]}
            accessibilityRole="button"
            accessibilityLabel="Save changes"
          >
            <Text style={styles.saveText}>Save changes</Text>
          </Pressable>

          <View style={{ height: 20 }} />
        </ScrollView>
      </View>
    </>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {!!help && <Text style={styles.help}>{help}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#fff",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  label: { color: "#374151", marginBottom: 6, fontWeight: "600" },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
  },
  help: { color: "#6B7280", fontSize: 12, marginTop: 6 },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "#fff", fontWeight: "700" },
});
