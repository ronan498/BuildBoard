import React from "react";
import { View, Text, ScrollView, StyleSheet, Image } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors } from "@src/theme/tokens";
import type { Profile } from "@src/store/useProfile";

export default function Endorsements({ endorsements }: { endorsements: Profile["endorsements"] }) {
  if (!endorsements.length) {
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Endorsements</Text>
        <Text style={styles.emptyText}>No endorsements yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Endorsements</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {endorsements.map((e) => (
          <View key={e.id} style={styles.tile}>
            <Text style={styles.bodyText}>{e.body}</Text>
            <View style={styles.authorRow}>
              {e.authorAvatar ? (
                <Image source={{ uri: e.authorAvatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={16} color="#9CA3AF" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.author}>{e.author}</Text>
                {e.jobTitle && <Text style={styles.jobTitle}>{e.jobTitle}</Text>}
                {e.date && <Text style={styles.date}>{e.date}</Text>}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 12,
    marginTop: 10,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ececec",
  },
  sectionTitle: { fontWeight: "800", fontSize: 16, color: "#1F2937" },
  emptyText: { color: "#6B7280", marginTop: 8 },
  scrollContent: { gap: 12, paddingTop: 8 },
  tile: {
    width: 260,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff",
  },
  bodyText: { color: "#374151", lineHeight: 20, marginBottom: 12 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#E5E7EB" },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  author: { fontWeight: "700", color: "#111" },
  jobTitle: { color: "#6B7280", fontSize: 12 },
  date: { color: "#6B7280", fontSize: 12, marginTop: 2 },
});

