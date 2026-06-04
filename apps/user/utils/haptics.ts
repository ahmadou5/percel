import * as Haptics from "expo-haptics";

async function safeInvoke(task: () => Promise<unknown>) {
  try {
    await task();
  } catch {
    // Haptics can fail silently on simulators, web, or unsupported devices.
  }
}

export const haptics = {
  tap: () => safeInvoke(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  press: () => safeInvoke(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: () => safeInvoke(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: () => safeInvoke(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => safeInvoke(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  warning: () => safeInvoke(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
