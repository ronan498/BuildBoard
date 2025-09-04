import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Switch } from "react-native";
import { Colors } from "@src/theme/tokens";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BraintreeDropIn from "react-native-braintree-payments-drop-in";
import { useAuth } from "@src/store/useAuth";
import { fetchSubscription, getBraintreeToken, subscribe as apiSubscribe, cancelSubscription } from "@src/lib/api";

const PROFILE_DETAILS = "/(manager)/profile" as const;
type Plan = "Free" | "Pro";

export default function Subscriptions() {
  const [plan, setPlan] = useState<Plan>("Free");
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [autoRenew, setAutoRenew] = useState(true);
  const [emailInvoices, setEmailInvoices] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const sub = await fetchSubscription(token ?? undefined);
        setPlan((sub.plan as Plan) || "Free");
        setAutoRenew(sub.autoRenew ?? true);
        setPeriod(sub.period === "yearly" ? "yearly" : "monthly");
      } catch {}
    })();
  }, [token]);

  const save = async () => {
    try {
      if (plan === "Free") {
        await cancelSubscription(token ?? undefined);
        Alert.alert("Saved", "You are now on the Free plan");
      } else {
        const clientToken = await getBraintreeToken(token ?? undefined);
        const result: any = await BraintreeDropIn.show({
          clientToken,
          applePay: true,
          googlePay: false,
          paypal: { displayName: "BuildBoard" },
          merchantIdentifier: "merchant.com.buildboard",
        });
        await apiSubscribe(period, result.nonce, autoRenew, token ?? undefined);
        Alert.alert("Saved", `Subscribed to Pro (${period === "yearly" ? "Annual" : "Monthly"})`);
      }
    } catch (e) {
      Alert.alert("Error", "Subscription update failed");
    }
  };

  const managePlan = save;

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
              style={({ pressed }) => [
                { flexDirection: "row", alignItems: "center", gap: 4, opacity: pressed ? 0.6 : 1 },
              ]}
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
              <Text style={styles.planName}>{plan}</Text>
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

          {/* Two-plan selector (Free / Pro) */}
          <View style={styles.segment}>
            <Pressable
              onPress={() => setPlan("Free")}
              style={({ pressed }) => [
                styles.segmentItem,
                plan === "Free" && styles.segmentItemActive,
                pressed && { opacity: 0.9 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: plan === "Free" }}
            >
              <Text style={[styles.segmentText, plan === "Free" && styles.segmentTextActive]}>Free</Text>
            </Pressable>
            <Pressable
              onPress={() => setPlan("Pro")}
              style={({ pressed }) => [
                styles.segmentItem,
                plan === "Pro" && styles.segmentItemActive,
                pressed && { opacity: 0.9 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: plan === "Pro" }}
            >
              <Text style={[styles.segmentText, plan === "Pro" && styles.segmentTextActive]}>Pro</Text>
            </Pressable>
          </View>

          {plan === "Pro" && (
            <View style={styles.segment}>
              <Pressable
                onPress={() => setPeriod("monthly")}
                style={({ pressed }) => [
                  styles.segmentItem,
                  period === "monthly" && styles.segmentItemActive,
                  pressed && { opacity: 0.9 },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: period === "monthly" }}
              >
                <Text style={[styles.segmentText, period === "monthly" && styles.segmentTextActive]}>Monthly (1p)</Text>
              </Pressable>
              <Pressable
                onPress={() => setPeriod("yearly")}
                style={({ pressed }) => [
                  styles.segmentItem,
                  period === "yearly" && styles.segmentItemActive,
                  pressed && { opacity: 0.9 },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: period === "yearly" }}
              >
                <Text style={[styles.segmentText, period === "yearly" && styles.segmentTextActive]}>Annual (10p)</Text>
              </Pressable>
            </View>
          )}

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