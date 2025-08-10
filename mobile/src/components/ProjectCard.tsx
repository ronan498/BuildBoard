import { View, Text, StyleSheet } from "react-native";

export function ProjectCard({ project }: { project: any }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{project.title}</Text>
      <Text>Budget £{project.budget}</Text>
      <Text>Status {project.status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card:{ padding:14, borderWidth:1, borderColor:"#eee", borderRadius:12, marginBottom:12, backgroundColor:"#fff" },
  title:{ fontSize:16, fontWeight:"600", marginBottom:4 }
});
