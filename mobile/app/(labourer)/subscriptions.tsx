import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Switch, Linking } from "react-native";
import { Colors } from "@src/theme/tokens";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@src/store/useAuth";

const PLAN_MONTHLY = "p3wt";
const PLAN_YEARLY = "55xy";
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

const PROFILE_DETAILS = "/(labourer)/profile" as const;
type Plan = "free" | "monthly" | "yearly";

export default function Subscriptions() {
  const { user, token } = useAuth();
  const [plan, setPlan] = useState<Plan>("free");
  const [autoRenew, setAutoRenew] = useState(true);
  const [emailInvoices, setEmailInvoices] = useState(true);

  useEffect(() => {
    const current = user?.subscription_plan;
    if (current === PLAN_MONTHLY) setPlan("monthly");
    else if (current === PLAN_YEARLY) setPlan("yearly");
    else setPlan("free");
  }, [user]);

  const managePlan = async () => {
    if (!token || !API_BASE) return;
    if (plan === "free") {
      await fetch(`${API_BASE}/braintree/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert("Subscription", "Cancelled subscription");
    } else {
      const planId = plan === "monthly" ? PLAN_MONTHLY : PLAN_YEARLY;
      Linking.openURL(`${API_BASE}/braintree/checkout?planId=${planId}&token=${token}`);
    }
  };

  const save = () => {
    Alert.alert(
      "Saved",
      `Plan: ${plan}\nAuto-renew: ${autoRenew ? "On" : "Off"}\nEmail invoices: ${emailInvoices ? "On" : "Off"}`
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Subscriptions",
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={() => router.replace(PROFILE_DETAILS)}
              accessibilityRole="button"
              accessibilityLabel="Back to profile"
              style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 4, opacity: pressed ? 0.6 : 1 }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={22} color="#111827" />
              <Text style={{ fontSize: 16 }}>Back</Text>
            </Pressable>
          ),
        }}
      />

      <View style={styles.container}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.title}>Manage your plan</Text>

          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.planLabel}>Current plan</Text>
              <Text style={styles.planName}>
                {plan === "free" ? "Free" : plan === "monthly" ? "Pro Monthly" : "Pro Yearly"}
              </Text>
              <Text style={styles.planHelp}>
                Upgrade to <Text style={{ fontWeight: "700" }}>Pro</Text> to unlock more features and priority support.
              </Text>
            </View>
            <Pressable
              onPress={managePlan}
              accessibilityRole="button"
              style={({ pressed }) => [{ ...styles.ctaBtn, opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={styles.ctaText}>Change plan</Text>
            </Pressable>
          </View>

          {/* Plan selector (Free / Monthly / Yearly) */}
          <View style={styles.segment}>
            <Pressable
              onPress={() => setPlan("free")}
              style={({ pressed }) => [
                styles.segmentItem,
                plan === "free" && styles.segmentItemActive,
                pressed && { opacity: 0.9 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: plan === "free" }}
            >
              <Text style={[styles.segmentText, plan === "free" && styles.segmentTextActive]}>Free</Text>
            </Pressable>
            <Pressable
              onPress={() => setPlan("monthly")}
              style={({ pressed }) => [
                styles.segmentItem,
                plan === "monthly" && styles.segmentItemActive,
                pressed && { opacity: 0.9 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: plan === "monthly" }}
            >
              <Text style={[styles.segmentText, plan === "monthly" && styles.segmentTextActive]}>Pro Monthly</Text>
            </Pressable>
            <Pressable
              onPress={() => setPlan("yearly")}
              style={({ pressed }) => [
                styles.segmentItem,
                plan === "yearly" && styles.segmentItemActive,
                pressed && { opacity: 0.9 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: plan === "yearly" }}
            >
              <Text style={[styles.segmentText, plan === "yearly" && styles.segmentTextActive]}>Pro Yearly</Text>
            </Pressable>
          </View>

          <Field label="Auto-renew">
            <Switch value={autoRenew} onValueChange={setAutoRenew} />
          </Field>

          <Field
            label="Email invoices"
            help="Receive an email copy of every invoice and receipt."
          >
            <Switch value={emailInvoices} onValueChange={setEmailInvoices} />
          </Field>

          <View style={{ height: 12 }} />

          <Pressable
            onPress={save}
            accessibilityRole="button"
            style={({ pressed }) => [{ ...styles.saveBtn, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.saveText}>Save changes</Text>
          </Pressable>
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
    <View style={styles.field}>
      <View style={{ flex: 1 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {help ? <Text style={styles.help}>{help}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },

  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  planLabel: { color: "#6B7280", fontSize: 12, marginBottom: 4 },
  planName: { fontSize: 18, fontWeight: "700" },
  planHelp: { color: "#6B7280", marginTop: 4 },
  ctaBtn: {
    backgroundColor: "#111827",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  ctaText: { color: "#fff", fontWeight: "700" },

  segment: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 12,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  segmentItemActive: {
    backgroundColor: "#111827",
  },
  segmentText: { fontSize: 16, fontWeight: "600", color: "#111827" },
  segmentTextActive: { color: "#fff" },

  field: {
    borderBottomWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  fieldLabel: { flex: 1, fontSize: 16 },
  help: { color: "#6B7280", fontSize: 12, marginTop: 4 },

  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "#fff", fontWeight: "700" },
});