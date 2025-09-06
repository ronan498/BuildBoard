import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";

export default function LabourerProfileStack() {
  return (
    <Stack
      screenOptions={{
        animation: "slide_from_right",
        headerLeft: () => (
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#111" />
          </Pressable>
        ),
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          // Show profile instantly without the default slide animation
          animation: "none",
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="saved"
        options={{
          headerShown: false,
          animation: "none",
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
