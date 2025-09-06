import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { Colors } from "@src/theme/tokens";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function SwitchToContractor() {
  const startSwitch = () => {
    // TODO: wire to your role-switch backend flow (or Stripe/portal if applicable)
    Alert.alert("Switch started", "We’ll guide you through setting up your contractor account.");
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Switch to contractor",
          headerShadowVisible: false,
        }}
      />

      <View style={styles.container}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.title}>Run jobs and hire your team</Text>

          <View style={styles.card}>
            <Bullet icon="person-outline" text="Keep your labourer profile and history." />
            <Bullet icon="people-outline" text="Create a contractor profile to post jobs." />
            <Bullet icon="card-outline" text="Manage payouts and invoices." />
            <Bullet icon="shield-checkmark-outline" text="Enhanced security for your business." />
          </View>

          <View style={{ height: 12 }} />

          <Pressable
            onPress={startSwitch}
            accessibilityRole="button"
            style={({ pressed }) => [{ ...styles.primaryBtn, opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={styles.primaryText}>Start switch</Text>
          </Pressable>

          <Pressable
            onPress={() => Alert.alert("Learn more", "Link this to your docs or marketing page.")}
            accessibilityRole="button"
            style={({ pressed }) => [{ ...styles.secondaryBtn, opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={styles.secondaryText}>Learn more</Text>
          </Pressable>
        </ScrollView>
      </View>
    </>
  );
}

function Bullet({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>["name"]; text: string }) {
  return (
    <View style={styles.bullet}>
      <Ionicons name={icon} size={20} color="#111827" />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },

  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#fff",
    marginBottom: 12,
  },

  bullet: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  bulletText: { flex: 1, fontSize: 16 },

  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontWeight: "700" },

  secondaryBtn: {
    marginTop: 10,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryText: { color: "#111827", fontWeight: "700" },
});
