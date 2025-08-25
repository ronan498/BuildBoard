import { View, Text, StyleSheet } from "react-native";
import TopBar from "@src/components/TopBar";

export default function CreateTask() {
  return (
    <View style={styles.container}>
      <TopBar />
      <View style={styles.content}>
        <Text style={styles.title}>Create Task</Text>
        <Text>Task creation form coming soon.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 12 },
  title: { fontWeight: "800", fontSize: 18, color: "#1F2937", marginBottom: 8 },
});