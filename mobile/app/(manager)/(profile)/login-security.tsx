import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { Colors } from "@src/theme/tokens";
import { useAuth } from "@src/store/useAuth";
import { router } from "expo-router";

export default function LoginSecurity() {
  const deleteAccount = useAuth((s) => s.deleteAccount);

  const confirmDelete = () => {
    Alert.alert("Delete account", "Are you sure you want to delete your account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteAccount();
          router.replace("/(auth)/welcome");
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Login and security</Text>
      <Text style={styles.sectionHeading}>Account</Text>
      <View style={styles.line} />
      <View style={styles.row}>
        <Text style={styles.title}>Delete your account</Text>
        <Pressable onPress={confirmDelete}>
          <Text style={styles.deleteLink}>Delete account</Text>
        </Pressable>
      </View>
      <Text style={styles.message}>This action cannot be undone</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24, gap: 12 },
  heading: { fontSize: 20, fontWeight: "700" },
  sectionHeading: { fontSize: 20, fontWeight: "700", marginTop: 12 },
  line: { height: 1, backgroundColor: Colors.border },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  title: { fontSize: 16, fontWeight: "600" },
  deleteLink: { color: Colors.text, textDecorationLine: "underline" },
  message: { color: Colors.muted },
});

