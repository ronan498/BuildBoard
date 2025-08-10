import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { listProjects } from "@src/lib/api";

export default function ProjectDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [proj, setProj] = useState<any | null>(null);

  useEffect(() => {
    listProjects().then(all => setProj(all.find(p => String(p.id) === String(id)) ?? null));
  }, [id]);

  if (!proj) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: proj.title }} />
      <View style={{ padding:16 }}>
        <Text style={styles.h1}>{proj.title}</Text>
        <Text style={styles.kv}>Budget: £{proj.budget}</Text>
        <Text style={styles.kv}>Status: {proj.status}</Text>
        <Text style={{ marginTop:12 }}>Description coming soon…</Text>
      </View>
    </>
  );
}
const styles = StyleSheet.create({
  center:{ flex:1, alignItems:"center", justifyContent:"center" },
  h1:{ fontSize:20, fontWeight:"700", marginBottom:8 },
  kv:{ fontSize:16, marginTop:2 }
});
