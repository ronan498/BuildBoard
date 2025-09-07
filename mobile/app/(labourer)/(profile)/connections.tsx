import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Connections() {
  const insets = useSafeAreaInsets();
  const connections: { id: number; name: string }[] = [];

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Connections",
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        {connections.length === 0 ? (
          <Text style={styles.emptyText}>You have no connections yet.</Text>
        ) : (
          connections.map((c) => (
            <View key={c.id} style={styles.item}>
              <Text style={styles.name}>{c.name}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  emptyText: {
    textAlign: "center",
    color: "#6B7280",
    marginTop: 32,
  },
  item: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  name: {
    fontSize: 16,
    color: "#111827",
  },
});

