import type { ReactNode } from 'react';
import { View } from 'react-native';

// Parent scroll content grows to the Safe Area. Short tasks place actions at
// its bottom; long/large-text tasks scroll with their actions, without overlays.
export function TaskActions({ children }: { children: ReactNode }) {
  return <View style={{ paddingTop: 8, gap: 12 }}>{children}</View>;
}
