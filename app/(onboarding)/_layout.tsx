import React from 'react';
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0B0F19' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="teacher-profile" />
      <Stack.Screen name="face-registration" />
      <Stack.Screen name="setup-complete" />
    </Stack>
  );
}
