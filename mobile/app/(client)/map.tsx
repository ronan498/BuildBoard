import { View, StyleSheet } from "react-native";
import TopBar from "@src/components/TopBar";

export default function ClientDiscover() {
  return (
    <View style={styles.container}>
      <TopBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
});
