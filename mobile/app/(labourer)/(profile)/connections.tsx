import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  Alert,
  FlatList,
} from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  listConnections,
  sendConnectionRequest,
  deleteConnection,
  type ConnectionUser,
} from "@src/lib/api";
import { Swipeable } from "react-native-gesture-handler";
import { useAuth } from "@src/store/useAuth";

export default function Connections() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [connections, setConnections] = useState<ConnectionUser[]>([]);
  const [email, setEmail] = useState("");

  useEffect(() => {
    listConnections().then(setConnections);
  }, []);

  const handleInvite = async () => {
    if (!email) return;
    const res = await sendConnectionRequest(email.trim());
    if (res.ok) {
      Alert.alert("Request sent");
      setEmail("");
    } else if (res.error) {
      Alert.alert(res.error);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert("Remove connection?", "This will delete for both users.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setConnections((prev) => prev.filter((c) => c.id !== id));
          await deleteConnection(id);
        },
      },
    ]);
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
      <FlatList
        data={connections}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: insets.bottom + 24 },
        ]}
        ListHeaderComponent={
          <View style={styles.searchHeader}>
            <View style={styles.searchRow}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Search by email"
                placeholderTextColor="#6B7280"
                style={styles.searchInput}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Pressable style={styles.searchBtn} onPress={handleInvite}>
                <Ionicons name="send" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>
        }
        stickyHeaderIndices={[0]}
        renderItem={({ item }) => {
          const thumb =
            item.avatarUri || "https://via.placeholder.com/96x96?text=User";
          const profilePath =
            user?.role === "manager"
              ? "/(manager)/(profile)/view-profile"
              : "/(labourer)/(profile)/profileDetails";
          return (
            <Swipeable
              renderRightActions={() => (
                <Pressable
                  style={styles.delete}
                  onPress={() => handleDelete(item.id)}
                >
                  <Ionicons name="trash" size={20} color="#fff" />
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              )}
            >
              <Pressable
                style={styles.row}
                onPress={() =>
                  router.push({
                    pathname: profilePath,
                    params: {
                      userId: String(item.id),
                      role: item.role,
                    },
                  })
                }
              >
                <Image source={{ uri: thumb }} style={styles.avatar} />
                <Text style={styles.name}>{item.username}</Text>
              </Pressable>
            </Swipeable>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={<Text style={styles.emptyText}>You have no connections yet.</Text>}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  searchHeader: {
    backgroundColor: "#fff",
    paddingBottom: 16,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
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
    backgroundColor: "#9CA3AF",
    padding: 10,
    borderRadius: 8,
  },
  emptyText: {
    textAlign: "center",
    color: "#6B7280",
    marginTop: 32,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E5E7EB",
  },
  name: {
    fontSize: 16,
    color: "#111827",
  },
  delete: {
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    width: 72,
    borderRadius: 12,
    marginLeft: 8,
  },
  deleteText: {
    color: "#fff",
    fontWeight: "600",
    marginTop: 4,
  },
});

