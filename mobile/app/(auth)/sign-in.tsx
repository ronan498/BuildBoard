import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth } from "@src/store/useAuth";
import { router } from "expo-router";

export default function SignIn() {
  const { signIn, role } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async () => {
    setErr(null);
    setLoading(true);
    try {
      const resolvedRole = await signIn(email.trim(), password);
      if (resolvedRole === "labourer") router.replace("/(labourer)/jobs");
      else if (resolvedRole === "manager") router.replace("/(manager)/projects");
      else router.replace("/(client)/projects/index");
    } catch (e: any) {
      setErr(e.message ?? "Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in as {role ?? "…"}</Text>
      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      {!!err && <Text style={styles.err}>{err}</Text>}
      <Pressable onPress={onSubmit} style={[styles.btn, loading && { opacity: 0.6 }]} disabled={loading}>
        {loading ? <ActivityIndicator /> : <Text style={styles.btnText}>Sign in</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, justifyContent:"center", padding:24, gap:12 },
  title:{ fontSize:22, fontWeight:"600", marginBottom:8 },
  input:{ borderWidth:1, borderColor:"#ddd", padding:12, borderRadius:10 },
  btn:{ backgroundColor:"#1f6feb", padding:14, borderRadius:10, alignItems:"center" },
  btnText:{ color:"#fff", fontWeight:"600" },
  err:{ color:"#b00020" }
});
