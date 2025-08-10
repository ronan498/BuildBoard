import { View, FlatList, StyleSheet } from "react-native";
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
const styles = StyleSheet.create({ container:{ flex:1, backgroundColor:"#fff" } });
