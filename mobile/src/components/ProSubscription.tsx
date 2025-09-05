import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@src/theme/tokens";
import { useAuth } from "@src/store/useAuth";

const PLAN_MONTHLY = "p3wt";
const PLAN_YEARLY = "55xy";
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

type Plan = "monthly" | "yearly";

export default function ProSubscription({ profileRoute }: { profileRoute: string }) {
  const { user, token } = useAuth();
  const [plan, setPlan] = useState<Plan>("monthly");

  useEffect(() => {
    const current = user?.subscription_plan;
    if (current === PLAN_YEARLY) setPlan("yearly");
    else if (current === PLAN_MONTHLY) setPlan("monthly");
  }, [user]);

  const checkout = () => {
    if (!token || !API_BASE) return;
    const planId = plan === "yearly" ? PLAN_YEARLY : PLAN_MONTHLY;
    Linking.openURL(`${API_BASE}/braintree/checkout?planId=${planId}&token=${token}`);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "BuildBoard Pro",
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={() => router.replace(profileRoute)}
              accessibilityRole="button"
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                opacity: pressed ? 0.6 : 1,
              })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={22} color="#111827" />
              <Text style={{ fontSize: 16 }}>Back</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Unlock all premium features</Text>

        <View style={styles.features}>
          <Feature icon="stats-chart" text="Advanced project analytics" />
          <Feature icon="headset" text="Priority support" />
          <Feature icon="people" text="Unlimited team members" />
        </View>

        <PlanOption
          label="Annual"
          price="€0.10/year"
          selected={plan === "yearly"}
          onPress={() => setPlan("yearly")}
          banner="Best value"
        />
        <PlanOption
          label="Monthly"
          price="€0.01/month"
          selected={plan === "monthly"}
          onPress={() => setPlan("monthly")}
        />

        <Pressable
          onPress={checkout}
          accessibilityRole="button"
          style={({ pressed }) => [{ ...styles.cta, opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={styles.ctaText}>Try now</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

function Feature({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.feature}>
      <Ionicons name={icon} size={24} color={Colors.primary} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

function PlanOption({
  label,
  price,
  selected,
  onPress,
  banner,
}: {
  label: string;
  price: string;
  selected: boolean;
  onPress: () => void;
  banner?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.plan,
        selected && styles.planSelected,
        pressed && { opacity: 0.9 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {banner ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{banner}</Text>
        </View>
      ) : null}
      <Text style={styles.planLabel}>{label}</Text>
      <Text style={styles.planPrice}>{price}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40, backgroundColor: "#fff" },
  heading: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
  features: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  feature: {
    width: "48%",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureText: { fontSize: 14, flex: 1 },
  plan: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    position: "relative",
  },
  planSelected: { borderColor: Colors.primary },
  planLabel: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  planPrice: { color: "#6B7280" },
  banner: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: Colors.primary,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  bannerText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  cta: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});

