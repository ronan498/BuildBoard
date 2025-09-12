import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Colors } from "@src/theme/tokens";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "@src/store/useAuth";

export default function Register() {
  const { setPendingRegistration } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [err, setErr] = useState<string | null>(null);

  const next = () => {
    if (!username || !email || password.length < 4 || password !== confirm) {
      setErr("Fill all fields; passwords must match and be 4+ chars.");
      return;
    }
    setErr(null);
    setPendingRegistration({ username, email, password });
    router.push("/(auth)/account-type");
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Ionicons name="chevron-back" size={26} />
      </Pressable>

      <Text style={styles.title}>Hello! Register to get{"\n"}started</Text>

      <TextInput placeholder="Username" value={username} onChangeText={setUsername}
        placeholderTextColor="#9CA3AF" style={styles.input} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail}
        placeholderTextColor="#9CA3AF" autoCapitalize="none" keyboardType="email-address" style={styles.input} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword}
        placeholderTextColor="#9CA3AF" secureTextEntry style={styles.input} />
      <TextInput placeholder="Confirm password" value={confirm} onChangeText={setConfirm}
        placeholderTextColor="#9CA3AF" secureTextEntry style={styles.input} />

      {!!err && <Text style={styles.err}>{err}</Text>}

      <Pressable style={[styles.btn, styles.btnGhost]} onPress={next}>
        <Text style={styles.btnGhostText}>Next</Text>
      </Pressable>

      <View style={styles.hrRow}>
        <View style={styles.hr} />
        <Text style={styles.hrText}>Or Register with</Text>
        <View style={styles.hr} />
      </View>

      <View style={styles.socialRow}>
        <Pressable style={styles.social}><Ionicons name="logo-facebook" size={22} /></Pressable>
        <Pressable style={styles.social}><Ionicons name="logo-google" size={22} /></Pressable>
        <Pressable style={styles.social}><Ionicons name="logo-apple" size={22} /></Pressable>
      </View>

      <Pressable style={{ marginTop: 18 }} onPress={() => router.replace("/(auth)/login")}>
        <Text style={{ textAlign:"center" }}>
          Already have an account? <Text style={{ fontWeight:"800" }}>Login Now</Text>
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor: Colors.bg, padding:24 },
  back:{ marginTop:8, width:36, height:36, alignItems:"center", justifyContent:"center" },
  title:{ fontSize:26, fontWeight:"800", color: Colors.text, marginTop:8, marginBottom:14 },
  input:{ borderWidth:1, borderColor: Colors.border, backgroundColor:"#F3F4F6",
          padding:14, borderRadius:12, fontSize:16, marginBottom:12 },
  btn:{ borderRadius:12, paddingVertical:16, alignItems:"center", marginTop:6 },
  btnGhost:{ borderWidth:1, borderColor: Colors.text },
  btnGhostText:{ color: Colors.text, fontWeight:"700" },
  hrRow:{ flexDirection:"row", alignItems:"center", gap:8, marginTop:20, marginBottom:10 },
  hr:{ flex:1, height:1, backgroundColor: Colors.border },
  hrText:{ color: Colors.muted, fontWeight:"600" },
  socialRow:{ flexDirection:"row", gap:16, justifyContent:"center" },
  social:{ width:56, height:56, borderRadius:12, borderWidth:1, borderColor: Colors.border,
           alignItems:"center", justifyContent:"center", backgroundColor:"#fff" },
  err:{ color:"#b00020" }
});
