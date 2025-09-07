import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  Alert,
} from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  listConnections,
  sendConnectionRequest,
  type ConnectionUser,
} from "@src/lib/api";

export default function Connections() {
  const insets = useSafeAreaInsets();
  const [connections, setConnections] = useState<ConnectionUser[]>([]);
  const [email, setEmail] = useState("");

  useEffect(() => {
    listConnections().then(setConnections);
  }, []);

  const handleInvite = async () => {
    if (!email) return;
    await sendConnectionRequest(email.trim());
    Alert.alert("Request sent");
    setEmail("");
  };

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
        <View style={styles.searchRow}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Search by email"
            style={styles.searchInput}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Pressable style={styles.searchBtn} onPress={handleInvite}>
            <Ionicons name="send" size={20} color="#fff" />
          </Pressable>
        </View>
        {connections.length === 0 ? (
          <Text style={styles.emptyText}>You have no connections yet.</Text>
        ) : (
          connections.map((c) => {
            const thumb =
              c.avatarUri || "https://via.placeholder.com/96x96?text=User";
            return (
              <View key={c.id} style={styles.item}>
                <Image source={{ uri: thumb }} style={styles.avatar} />
                <Text style={styles.name}>{c.username}</Text>
              </View>
            );
          })
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
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchBtn: {
    marginLeft: 8,
    backgroundColor: "#1D4ED8",
    padding: 10,
    borderRadius: 8,
  },
  emptyText: {
    textAlign: "center",
    color: "#6B7280",
    marginTop: 32,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: "#f1f5f9",
  },
  name: {
    fontSize: 16,
    color: "#111827",
  },
});

