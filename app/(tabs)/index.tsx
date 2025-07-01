import { Stack } from 'expo-router';
import React from 'react';
export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="home" options={{ headerShown: false }} />
      {/* otras rutas */}
    </Stack>
  );
}