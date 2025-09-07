import { Stack } from "expo-router";

export default function LabourerProfileModalLayout() {
  return (
    <Stack screenOptions={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }} />
  );
}

