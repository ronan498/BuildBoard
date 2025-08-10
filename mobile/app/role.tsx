import { Link } from "expo-router";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAuth } from "@src/store/useAuth";

const roles = ["client", "manager", "labourer"] as const;

export default function Role() {
  const setRole = useAuth((s) => s.setRole);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose your role</Text>
      {roles.map((r) => (
        <Pressable key={r} style={styles.btn} onPress={() => setRole(r)}>
          <Text style={styles.btnText}>{r.toUpperCase()}</Text>
        </Pressable>
      ))}
      <Link href="/sign-in" style={styles.link}>Continue</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, justifyContent:"center", alignItems:"center", padding:24 },
  title:{ fontSize:24, fontWeight:"600", marginBottom:16 },
  btn:{ padding:14, borderRadius:10, backgroundColor:"#1f6feb", marginVertical:6, width:"80%", alignItems:"center" },
  btnText:{ color:"#fff", fontSize:16, fontWeight:"600" },
  link:{ marginTop:16, fontSize:16 }
});
