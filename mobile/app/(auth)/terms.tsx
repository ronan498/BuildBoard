import { useState } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors } from "@src/theme/tokens";
import { useAuth } from "@src/store/useAuth";
import { TERMS } from "@/constants/terms";

export default function Terms() {
  const { completeRegistration } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!accepted) return;
    setBusy(true);
    setErr(null);
    try {
      await completeRegistration();
      router.replace("/(auth)/success");
    } catch (e: any) {
      setErr(e.message ?? "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Ionicons name="chevron-back" size={26} />
      </Pressable>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Terms & Conditions</Text>
        <Text style={styles.text}>{TERMS}</Text>
      </ScrollView>

      <View style={styles.checkboxRow}>
        <Pressable
          onPress={() => setAccepted(a => !a)}
          style={[styles.checkbox, accepted && styles.checkboxChecked]}
        >
          {accepted && <Ionicons name="checkmark" size={16} color="#fff" />}
        </Pressable>
        <Text style={styles.checkboxLabel}>I accept the Terms & Conditions</Text>
      </View>

      {!!err && <Text style={{ color:"#b00020", marginBottom:8 }}>{err}</Text>}

      <Pressable
        disabled={!accepted || busy}
        onPress={submit}
        style={[styles.btn, (!accepted || busy) ? styles.btnDisabled : styles.btnPrimary]}
      >
        <Text style={(!accepted || busy) ? styles.btnDisabledText : styles.btnPrimaryText}>
          {busy ? "Registering…" : "Accept & Register"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor: Colors.bg, padding:24 },
  back:{ marginTop:8, width:36, height:36, alignItems:"center", justifyContent:"center" },
  scroll:{ flex:1, marginTop:8, marginBottom:16 },
  scrollContent:{ paddingBottom:24 },
  title:{ fontSize:26, fontWeight:"800", color: Colors.text, marginBottom:12 },
  text:{ color: Colors.text, lineHeight:20 },
  checkboxRow:{ flexDirection:"row", alignItems:"center", marginBottom:12 },
  checkbox:{ width:24, height:24, borderRadius:4, borderWidth:1, borderColor: Colors.border, alignItems:"center", justifyContent:"center", marginRight:8 },
  checkboxChecked:{ backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkboxLabel:{ flex:1, color: Colors.text },
  btn:{ borderRadius:12, paddingVertical:16, alignItems:"center" },
  btnPrimary:{ backgroundColor: Colors.primary },
  btnPrimaryText:{ color:"#fff", fontWeight:"700" },
  btnDisabled:{ backgroundColor:"#E5E7EB" },
  btnDisabledText:{ color:"#9CA3AF", fontWeight:"700" }
});
