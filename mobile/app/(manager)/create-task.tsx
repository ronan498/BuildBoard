import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import TopBar from "@src/components/TopBar";
import { Colors } from "@src/theme/tokens";

export function CreateTaskForm({ onSubmit }: { onSubmit?: () => void }) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignee, setAssignee] = useState("");

  const submit = () => {
    Alert.alert("Task info", `Title: ${title}\nDue date: ${dueDate}\nAssignee: ${assignee}`);
    onSubmit?.();
  };

  return (
    <View>
      <TextInput
        placeholder="Task title"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />
      <TextInput
        placeholder="Due date"
        value={dueDate}
        onChangeText={setDueDate}
        style={styles.input}
      />
      <TextInput
        placeholder="Assignee"
        value={assignee}
        onChangeText={setAssignee}
        style={styles.input}
      />
      <Pressable onPress={submit} style={styles.submitBtn} accessibilityRole="button">
        <Text style={styles.submitText}>Create Task</Text>
      </Pressable>
    </View>
  );
}

export default function CreateTask() {
  return (
    <View style={styles.container}>
      <TopBar />
      <View style={styles.content}>
        <Text style={styles.title}>Create Task</Text>
        <CreateTaskForm />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 12 },
  title: { fontWeight: "800", fontSize: 18, color: "#1F2937", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "600" },
});