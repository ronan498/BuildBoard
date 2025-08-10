import { useEffect, useRef, useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { listJobLocations } from "@src/lib/api";
import TopBar from "@src/components/TopBar";
import { useFocusEffect } from "@react-navigation/native";

export default function ClientMap() {
  const [markers, setMarkers] = useState<any[]>([]);
  const mapRef = useRef<MapView>(null);

  const load = async () => {
    const m = await listJobLocations();
    setMarkers(m);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  useEffect(() => {
    if (markers.length && mapRef.current) {
      mapRef.current.fitToCoordinates(markers.map(m => m.coords), {
        edgePadding: { top: 80, right: 40, bottom: 40, left: 40 },
        animated: true
      });
    }
  }, [markers]);

  const initial: Region = { latitude: 51.5074, longitude: -0.1278, latitudeDelta: 0.4, longitudeDelta: 0.4 };

  return (
    <View style={styles.container}>
      <TopBar />
      <MapView ref={mapRef} style={styles.map} provider={PROVIDER_GOOGLE} initialRegion={initial}>
        {markers.map((m) => (
          <Marker key={m.id} coordinate={m.coords} title={m.title} description={m.site} />
        ))}
      </MapView>
    </View>
  );
}
const styles = StyleSheet.create({ container:{ flex:1, backgroundColor:"#fff" }, map:{ flex:1 } });
