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
      <Text style={styles.heading}>Account</Text>
      <Text style={styles.title}>Delete your account</Text>
      <Text style={styles.message}>This action cannot be undone</Text>
      <Pressable style={styles.button} onPress={confirmDelete}>
        <Text style={styles.buttonText}>Delete account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24, gap: 12 },
  heading: { fontSize: 20, fontWeight: "700" },
  title: { fontSize: 16, fontWeight: "600", marginTop: 12 },
  message: { color: Colors.muted },
  button: {
    marginTop: 20,
    backgroundColor: "#DC2626",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700" },
});

