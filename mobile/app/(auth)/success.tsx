import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Colors } from "@src/theme/tokens";

export default function Success() {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={{ fontSize:42 }}>✅</Text>
      </View>
      <Text style={styles.title}>Account Created Successfully</Text>
      <Text style={styles.copy}>Your account has been made, go back to the login page to sign in.</Text>

      <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => router.replace("/(auth)/login")}>
        <Text style={styles.btnPrimaryText}>Back to Login</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  container:{ flex:1, alignItems:"center", justifyContent:"center", padding:24, backgroundColor: Colors.bg },
  badge:{ width:96, height:96, borderRadius:48, backgroundColor:"#E6F7EF",
          alignItems:"center", justifyContent:"center", marginBottom:16 },
  title:{ fontSize:22, fontWeight:"800", color: Colors.text, textAlign:"center", marginBottom:8 },
  copy:{ color: Colors.muted, textAlign:"center", marginBottom:16 },
  btn:{ borderRadius:12, paddingVertical:14, paddingHorizontal:18 },
  btnPrimary:{ backgroundColor: Colors.primary },
  btnPrimaryText:{ color:"#fff", fontWeight:"700" }
});
