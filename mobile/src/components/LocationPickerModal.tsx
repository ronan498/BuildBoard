import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Modal, Pressable, TextInput, StyleSheet, Platform, ActivityIndicator, Keyboard, Linking } from "react-native";
import MapView, { Region } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@src/theme/tokens";

type SaveResult = { label: string; latitude: number; longitude: number };

type Props = {
  visible: boolean;
  initialQuery?: string; // e.g., "Brighton, UK"
  onClose: () => void;
  onSave: (r: SaveResult) => void;
};

const DEFAULT_REGION: Region = {
  latitude: 51.5074,
  longitude: -0.1278,
  latitudeDelta: 0.3,
  longitudeDelta: 0.3
};

export default function LocationPickerModal({ visible, initialQuery, onClose, onSave }: Props) {
  const mapRef = useRef<MapView | null>(null);

  // We'll keep our own "idea" of the center, but let the Map control its region internally.
  const [center, setCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [initialRegion, setInitialRegion] = useState<Region>(DEFAULT_REGION);

  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>(initialQuery || "");
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [servicesOn, setServicesOn] = useState<boolean>(true);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setSearch(initialQuery || "");
    // Reset keyboard (prevents layout pop on open)
    Keyboard.dismiss();

    (async () => {
      setLoading(true);
      try {
        // Check if location services are enabled (GPS/network). If off, we still show the map at default and guide user.
        const services = await Location.hasServicesEnabledAsync();
        setServicesOn(services);

        // Ask foreground permission (all we need). "Always allow" on Android is OK; on iOS choose "Allow While Using App".
        const { status } = await Location.requestForegroundPermissionsAsync();
        const granted = status === "granted";
        setPermissionGranted(granted);

        // If user typed a place already, try that first (works even without permission)
        if (initialQuery && initialQuery.trim().length > 0) {
          const r = await geocodeToRegion(initialQuery.trim());
          if (r) {
            setInitialRegion(r);
            setCenter({ latitude: r.latitude, longitude: r.longitude });
            // let map settle, then animate
            setTimeout(() => mapRef.current?.animateToRegion(r, 400), 0);
            setLoading(false);
            return;
          }
        }

        // If we have permission + services, center to current location
        if (granted && services) {
          const pos = await Location.getCurrentPositionAsync({});
          const r = toRegion(pos.coords.latitude, pos.coords.longitude);
          setInitialRegion(r);
          setCenter({ latitude: r.latitude, longitude: r.longitude });
          setTimeout(() => mapRef.current?.animateToRegion(r, 400), 0);
        } else {
          // Fall back to default London
          setInitialRegion(DEFAULT_REGION);
          setCenter({ latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude });
        }
      } catch {
        // Fallback to default if anything throws
        setInitialRegion(DEFAULT_REGION);
        setCenter({ latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude });
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, initialQuery]);

  // Keep a human label up to date
  const centerLabel = useMemo(() => {
    if (!center) return "";
    return `${center.latitude.toFixed(5)}, ${center.longitude.toFixed(5)}`;
  }, [center]);

  const doSearch = async () => {
    setError(null);
    const q = search.trim();
    if (!q) return;
    try {
      setLoading(true);
      const r = await geocodeToRegion(q);
      if (r) {
        setInitialRegion(r); // so the map has a good "base"
        setCenter({ latitude: r.latitude, longitude: r.longitude });
        mapRef.current?.animateToRegion(r, 400);
      } else {
        setError("No results for that place.");
      }
    } catch {
      setError("Search failed. Try a different place.");
    } finally {
      setLoading(false);
    }
  };

  const useMyLocation = async () => {
    setError(null);
    try {
      setLoading(true);
      const services = await Location.hasServicesEnabledAsync();
      setServicesOn(services);
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === "granted";
      setPermissionGranted(granted);

      if (!services) {
        setError("Location services are off. Turn them on to use your current location.");
        return;
      }
      if (!granted) {
        setError("Permission not granted. Open Settings to allow location access.");
        return;
      }

      const pos = await Location.getCurrentPositionAsync({});
      const r = toRegion(pos.coords.latitude, pos.coords.longitude);
      setCenter({ latitude: r.latitude, longitude: r.longitude });
      mapRef.current?.animateToRegion(r, 400);

      // Best-effort reverse geocode to update the search input
      try {
        const rev = await Location.reverseGeocodeAsync({ latitude: r.latitude, longitude: r.longitude });
        if (rev && rev[0]) setSearch(composeAddress(rev[0]));
      } catch {}
    } catch {
      setError("Could not get your current location.");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!center) return;
    let label = centerLabel;
    try {
      const rev = await Location.reverseGeocodeAsync({ latitude: center.latitude, longitude: center.longitude });
      if (rev && rev[0]) label = composeAddress(rev[0]);
    } catch {}
    onSave({ label, latitude: center.latitude, longitude: center.longitude });
  };

  const openSettings = () => {
    Linking.openSettings();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.iconBtn}>
          <Ionicons name="close" size={22} />
        </Pressable>
        <Text style={styles.title}>Choose Location</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Search Row */}
      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <TextInput
            placeholder="Search town or postcode"
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={doSearch}
          />
        </View>
        <Pressable onPress={doSearch} style={[styles.pillBtn, { marginLeft: 8 }]}>
          <Ionicons name="search" size={16} />
          <Text style={styles.pillBtnText}>Search</Text>
        </Pressable>
        <Pressable onPress={useMyLocation} style={[styles.pillBtn, { marginLeft: 8 }]}>
          <Ionicons name="locate" size={16} />
          <Text style={styles.pillBtnText}>My location</Text>
        </Pressable>
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}

      {/* Map */}
      <View style={{ flex: 1 }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={initialRegion}
          onRegionChangeComplete={(r) => setCenter({ latitude: r.latitude, longitude: r.longitude })}
        />
        {/* Center pin */}
        <View pointerEvents="none" style={styles.centerPinWrap}>
          <Ionicons name="location-sharp" size={28} color={Colors.primary} />
        </View>

        {/* Guidance overlays when services/permission aren’t ready */}
        {!servicesOn && (
          <View style={styles.overlay}>
            <Text style={styles.overlayTitle}>Turn on Location Services</Text>
            <Text style={styles.overlaySub}>Enable GPS or Location in Settings to use your current location.</Text>
            <Pressable onPress={openSettings} style={[styles.primaryBtn, { marginTop: 10 }]}>
              <Text style={styles.primaryBtnText}>Open Settings</Text>
            </Pressable>
          </View>
        )}
        {!permissionGranted && (
          <View style={[styles.overlay, { top: 120 }]}>
            <Text style={styles.overlayTitle}>Allow Location Access</Text>
            <Text style={styles.overlaySub}>Choose “Allow while using the app”.</Text>
            <Pressable onPress={openSettings} style={[styles.primaryBtn, { marginTop: 10 }]}>
              <Text style={styles.primaryBtnText}>Open Settings</Text>
            </Pressable>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={{ flex: 1 }}>
            <Text style={styles.centerText} numberOfLines={1}>{centerLabel}</Text>
          </View>
          <Pressable onPress={save} style={[styles.primaryBtn]}>
            {loading ? <ActivityIndicator /> : <Text style={styles.primaryBtnText}>Use this location</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

async function geocodeToRegion(q: string): Promise<Region | null> {
  try {
    const hits = await Location.geocodeAsync(q);
    if (hits && hits[0]) return toRegion(hits[0].latitude, hits[0].longitude);
  } catch {}
  return null;
}

function toRegion(latitude: number, longitude: number): Region {
  return { latitude, longitude, latitudeDelta: 0.12, longitudeDelta: 0.12 };
}

function composeAddress(r: Location.LocationGeocodedAddress): string {
  const bits = [r.city || r.subregion || r.region, r.country];
  return bits.filter(Boolean).join(", ");
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderColor: Colors.border },
  iconBtn: { padding: 6, borderRadius: 10, backgroundColor: "#fff" },
  title: { fontWeight: "800", fontSize: 18, color: "#1F2937" },

  searchRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 8, backgroundColor: "#fff" },
  searchInput: { backgroundColor: "#F3F4F6", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: "#111827", borderWidth: 1, borderColor: Colors.border },

  pillBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: Colors.border },
  pillBtnText: { fontWeight: "700", color: "#111827" },

  error: { color: "#b91c1c", paddingHorizontal: 12, paddingBottom: 6 },

  centerPinWrap: { position: "absolute", top: "50%", left: "50%", marginLeft: -14, marginTop: -28, backgroundColor: "transparent" },

  footer: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderTopWidth: 1, borderColor: Colors.border, backgroundColor: "#fff" },
  centerText: { color: "#6B7280" },

  primaryBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  primaryBtnText: { color: "#fff", fontWeight: "800" },

  overlay: { position: "absolute", left: 16, right: 16, top: 60, borderRadius: 12, padding: 12, backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 1, borderColor: Colors.border },
  overlayTitle: { fontWeight: "800", fontSize: 16, color: "#111827" },
  overlaySub: { color: "#6B7280", marginTop: 4 }
});
