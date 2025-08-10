import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Colors } from "@src/theme/tokens";

export default function Welcome() {
  const goLogin = () => router.push("/(auth)/login");
  const goRegister = () => router.push("/(auth)/register");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to BuildBoard</Text>
      <Text style={styles.sub}>Choose an option to continue</Text>

      <Pressable style={[styles.btn, styles.primary]} onPress={goLogin}>
        <Text style={styles.primaryText}>Login</Text>
      </Pressable>

      <Pressable style={[styles.btn, styles.ghost]} onPress={goRegister}>
        <Text style={styles.ghostText}>Register</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor: Colors.bg, padding:24, justifyContent:"center" },
  title:{ fontSize:28, fontWeight:"800", color: Colors.text, marginBottom:4, textAlign:"center" },
  sub:{ color: Colors.muted, textAlign:"center", marginBottom:16 },
  btn:{ borderRadius:12, paddingVertical:16, alignItems:"center", marginTop:10 },
  primary:{ backgroundColor: Colors.primary },
  primaryText:{ color:"#fff", fontWeight:"700" },
  ghost:{ borderWidth:1, borderColor: Colors.text, backgroundColor:"#fff" },
  ghostText:{ color: Colors.text, fontWeight:"700" }
});
