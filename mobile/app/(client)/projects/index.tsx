import { View, FlatList, StyleSheet, Text } from "react-native";
import TopBar from "@src/components/TopBar";
import { useEffect, useState } from "react";
import { listProjects } from "@src/lib/api";
import { ProjectCard } from "@src/components/ProjectCard";

export default function ClientProjects() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { listProjects().then(setItems); }, []);

  return (
    <View style={styles.container}>
      <TopBar />
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>My Jobs</Text>
      </View>
      <FlatList
        contentContainerStyle={{ padding:12 }}
        data={items}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => <ProjectCard project={item} />}
        ItemSeparatorComponent={() => <View style={{ height:12 }} />}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:"#fff" },
  headerRow:{ paddingHorizontal:12, paddingTop:6, paddingBottom:10, flexDirection:"row", alignItems:"center", justifyContent:"space-between" },
  headerTitle:{ fontWeight:"800", fontSize:18, color:"#1F2937" }
});
