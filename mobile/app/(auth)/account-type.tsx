import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Colors } from "@src/theme/tokens";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "@src/store/useAuth";

type Choice = "labourer" | "manager" | "client";

export default function AccountType() {
  const { setRole } = useAuth();
  const [selected, setSelected] = useState<Choice | null>(null);

  const choose = (c: Choice) => {
    setSelected(c);
    setRole(c);
  };

  const submit = () => {
    if (!selected) return;
    router.push("/(auth)/terms");
  };

  const Card = ({
    label, icon, value
  }: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    value: Choice;
  }) => {
    const active = selected === value;
    return (
      <Pressable
        onPress={() => choose(value)}
        style={[styles.card, active && styles.cardSelected]}
      >
        <Ionicons name={icon} size={28} color={active ? "#156C3F" : "#111"} />
        <Text style={[styles.cardLabel, active && styles.cardLabelSelected]}>{label}</Text>
      </Pressable>
    );
  };

  const canRegister = !!selected;

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Ionicons name="chevron-back" size={26} />
      </Pressable>

      <Text style={styles.title}>Choose your{"\n"}account type…</Text>

      <View style={styles.grid}>
        <Card label="Worker"     icon="construct-outline"     value="labourer" />
        <Card label="Contractor" icon="clipboard-outline"     value="manager" />
        <Card label="Customer"   icon="person-circle-outline" value="client" />
      </View>

      <Pressable
        disabled={!canRegister}
        onPress={submit}
        style={[styles.btn, canRegister ? styles.btnPrimary : styles.btnDisabled]}
      >
        <Text style={canRegister ? styles.btnPrimaryText : styles.btnDisabledText}>
          Next
        </Text>
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

  grid:{ flexDirection:"row", flexWrap:"wrap", gap:12, marginTop:6 },
  card:{
    width:"48%",
    aspectRatio:1.4,
    borderRadius:12,
    borderWidth:1,
    borderColor: Colors.border,
    alignItems:"center",
    justifyContent:"center",
    backgroundColor:"#F9FAFB",
    transform:[{ scale: 1 }],
  },
  cardSelected:{
    borderColor: Colors.primary,
    backgroundColor:"#E9F7EF",
    transform:[{ scale: 1.03 }],
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }
  },
  cardLabel:{ marginTop:8, fontWeight:"700", color: "#111" },
  cardLabelSelected:{ color:"#156C3F" },

  btn:{ borderRadius:12, paddingVertical:16, alignItems:"center", marginTop:18 },
  btnPrimary:{ backgroundColor: Colors.primary },
  btnPrimaryText:{ color:"#fff", fontWeight:"700" },
  btnDisabled:{ backgroundColor:"#E5E7EB" },
  btnDisabledText:{ color:"#9CA3AF", fontWeight:"700" },

  hrRow:{ flexDirection:"row", alignItems:"center", gap:8, marginTop:20, marginBottom:10 },
  hr:{ flex:1, height:1, backgroundColor: Colors.border },
  hrText:{ color: Colors.muted, fontWeight:"600" },
  socialRow:{ flexDirection:"row", gap:16, justifyContent:"center" },
  social:{ width:56, height:56, borderRadius:12, borderWidth:1, borderColor: Colors.border,
           alignItems:"center", justifyContent:"center", backgroundColor:"#fff" }
});
