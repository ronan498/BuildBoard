import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect, useState } from "react";
import { Asset } from "expo-asset";
import { useFonts } from "expo-font";

export default function RootLayout() {
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [fontsLoaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    async function loadAssets() {
      await Asset.loadAsync([
        require("../../assets/images/login.png"),
        require("../../assets/images/graphic.png"),
      ]);
      setAssetsLoaded(true);
    }

    loadAssets();
  }, []);

  if (!assetsLoaded || !fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Auth screens + role groups live under here */}
      </Stack>
    </GestureHandlerRootView>
  );
}
