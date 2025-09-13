import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, Image, Alert, Modal } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Swipeable } from "react-native-gesture-handler";
import {
  listJobWorkers,
  removeJobWorker,
  listConnections,
  addJobWorker,
  type ConnectionUser,
} from "@src/lib/api";

export default function JobWorkers() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const id = Number(jobId);
  const [workers, setWorkers] = useState<ConnectionUser[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [connections, setConnections] = useState<ConnectionUser[]>([]);

  const refresh = () => {
    if (id) listJobWorkers(id).then(setWorkers);
  };
  useEffect(refresh, [id]);

  const handleDelete = (workerId: number) => {
    Alert.alert("Remove worker?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await removeJobWorker(id, workerId);
          setWorkers((w) => w.filter((x) => x.id !== workerId));
        },
      },
    ]);
  };

  const openAdd = async () => {
    const all = await listConnections();
    const available = all.filter((c) => !workers.some((w) => w.id === c.id));
    setConnections(available);
    setAddOpen(true);
  };

  const handleAdd = async (userId: number) => {
    await addJobWorker(id, userId);
    setAddOpen(false);
    refresh();
  };

  const renderWorker = ({ item }: { item: ConnectionUser }) => {
    const thumb = item.avatarUri || "https://via.placeholder.com/96x96?text=User";
    return (
      <Swipeable
        renderRightActions={() => (
          <Pressable style={styles.delete} onPress={() => handleDelete(item.id)}>
            <Ionicons name="trash" size={20} color="#fff" />
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        )}
      >
        <View style={styles.row}>
          <Image source={{ uri: thumb }} style={styles.avatar} />
          <Text style={styles.name}>{item.username}</Text>
        </View>
      </Swipeable>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: "Workers",
          headerRight: () => (
            <Pressable onPress={openAdd} style={{ paddingRight: 8 }}>
              <Ionicons name="person-add" size={22} color="#111827" />
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={workers}
        keyExtractor={(w) => String(w.id)}
        contentContainerStyle={workers.length ? { padding: 16 } : { padding: 16, flexGrow: 1, justifyContent: "center" }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={renderWorker}
        ListEmptyComponent={<Text style={styles.empty}>No workers yet.</Text>}
      />
      <Modal visible={addOpen} animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setAddOpen(false)} style={{ padding: 12 }}>
              <Ionicons name="close" size={20} />
            </Pressable>
            <Text style={styles.modalTitle}>Add worker</Text>
            <View style={{ width: 32 }} />
          </View>
          <FlatList
            data={connections}
            keyExtractor={(c) => String(c.id)}
            contentContainerStyle={connections.length ? { padding: 16 } : { padding: 16, flexGrow: 1, justifyContent: "center" }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => {
              const thumb = item.avatarUri || "https://via.placeholder.com/96x96?text=User";
              return (
                <Pressable style={styles.row} onPress={() => handleAdd(item.id)}>
                  <Image source={{ uri: thumb }} style={styles.avatar} />
                  <Text style={styles.name}>{item.username}</Text>
                </Pressable>
              );
            }}
            ListEmptyComponent={<Text style={styles.empty}>No available connections.</Text>}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
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
  deleteText: { color: "#fff", fontSize: 12 },
  empty: { textAlign: "center", color: "#6B7280" },
  modalWrap: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    paddingBottom: 4,
    paddingHorizontal: 16,
  },
  modalTitle: { fontWeight: "700", fontSize: 16 },
});
