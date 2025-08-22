import { View, Text, Pressable, StyleSheet, Image } from "react-native";
import { router } from "expo-router";
import { Colors } from "@src/theme/tokens";

export default function Welcome() {
  const goLogin = () => router.push("/(auth)/login");
  const goRegister = () => router.push("/(auth)/register");

  return (
    <View style={styles.container}>
      {/* Top logo */}
      <Image
        source={require("../../assets/images/login.png")}
        style={styles.logo}
        resizeMode="contain"
        accessible
        accessibilityLabel="BuildBoard logo"
      />

      <Image
        source={require("../../assets/images/graphic.png")}
        style={styles.graphic}
        resizeMode="contain"
        accessible
        accessibilityLabel="Construction networking graphic"
      />

      <Text style={styles.title}>Welcome to your construction network</Text>
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
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    padding: 24,
    justifyContent: "center",
  },
  logo: {
    width: "100%",
    height: 80,
    alignSelf: "center",
    marginBottom: 40, // reduced so the graphic sits closer
  },
  graphic: {
    width: "90%",
    height: 300, // tweak as needed
    alignSelf: "center",
    marginBottom: 50,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 6,
    textAlign: "center",
  },
  sub: {
    color: Colors.muted,
    textAlign: "center",
    marginBottom: 16,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  primaryText: {
    color: "#fff",
    fontWeight: "700",
  },
  ghost: {
    borderWidth: 1,
    borderColor: Colors.text,
    backgroundColor: "#fff",
  },
  ghostText: {
    color: Colors.text,
    fontWeight: "700",
  },
});