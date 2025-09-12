import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Colors } from "@src/theme/tokens";
import { useAuth } from "@src/store/useAuth";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function Login() {
  const { signIn, lastRegisteredEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [secure, setSecure] = useState(true);

  useEffect(() => {
    if (!email && lastRegisteredEmail) setEmail(lastRegisteredEmail);
  }, [lastRegisteredEmail]);

  const go = async () => {
    try {
      setErr(null);
      const role = await signIn(email.trim(), password);
      // Redirect to a *real* screen (not the group root)
      if (role === "labourer") router.replace("/(labourer)/jobs");
      else if (role === "manager") router.replace("/(manager)/projects");
      else router.replace("/(client)/projects");
    } catch (e: any) {
      setErr(e.message ?? "Sign-in failed");
    }
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Ionicons name="chevron-back" size={26} />
      </Pressable>

      <Text style={styles.title}>Welcome back! Glad{"\n"}to see you, Again!</Text>

      <View style={styles.inputWrap}>
        <TextInput
          placeholder="Enter your email"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
      </View>

      <View style={styles.inputWrap}>
        <TextInput
          placeholder="Enter your password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry={secure}
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />
        <Pressable onPress={() => setSecure(s => !s)} style={styles.eye}>
          <Ionicons name={secure ? "eye-off-outline" : "eye-outline"} size={20} color="#9CA3AF" />
        </Pressable>
      </View>

      <Pressable style={{ alignSelf: "flex-end", marginBottom: 12 }}>
        <Text style={{ color: Colors.muted, fontWeight:"600" }}>Forgot Password?</Text>
      </Pressable>

      {!!err && <Text style={styles.err}>{err}</Text>}

      <Pressable style={[styles.btn, styles.btnPrimary]} onPress={go}>
        <Text style={styles.btnPrimaryText}>Login</Text>
      </Pressable>

      <View style={styles.hrRow}>
        <View style={styles.hr} />
        <Text style={styles.hrText}>Or Login with</Text>
        <View style={styles.hr} />
      </View>

      <View style={styles.socialRow}>
        <Pressable style={styles.social}><Ionicons name="logo-facebook" size={22} /></Pressable>
        <Pressable style={styles.social}><Ionicons name="logo-google" size={22} /></Pressable>
        <Pressable style={styles.social}><Ionicons name="logo-apple" size={22} /></Pressable>
      </View>

      <Pressable style={{ marginTop: 18 }} onPress={() => router.replace("/(auth)/register")}>
        <Text style={{ textAlign:"center" }}>
          Don’t have an account? <Text style={{ fontWeight:"800" }}>Register Now</Text>
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor: Colors.bg, padding:24 },
  back:{ marginTop:8, width:36, height:36, alignItems:"center", justifyContent:"center" },
  title:{ fontSize:26, fontWeight:"800", color: Colors.text, marginTop:8, marginBottom:14 },
  inputWrap:{ position:"relative", marginBottom:12 },
  input:{ borderWidth:1, borderColor: Colors.border, backgroundColor:"#F3F4F6",
          padding:14, borderRadius:12, fontSize:16 },
  eye:{ position:"absolute", right:12, top:14, height:24, width:24, alignItems:"center", justifyContent:"center" },
  btn:{ borderRadius:12, paddingVertical:16, alignItems:"center", marginTop:6 },
  btnPrimary:{ backgroundColor: Colors.primary },
  btnPrimaryText:{ color:"#fff", fontWeight:"700" },
  hrRow:{ flexDirection:"row", alignItems:"center", gap:8, marginTop:20, marginBottom:10 },
  hr:{ flex:1, height:1, backgroundColor: Colors.border },
  hrText:{ color: Colors.muted, fontWeight:"600" },
  socialRow:{ flexDirection:"row", gap:16, justifyContent:"center" },
  social:{ width:56, height:56, borderRadius:12, borderWidth:1, borderColor: Colors.border,
           alignItems:"center", justifyContent:"center", backgroundColor:"#fff" },
  err:{ color:"#b00020", marginBottom:8 }
});
