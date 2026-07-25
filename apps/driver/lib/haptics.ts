export const haptics = {
  impact: async () => {
    try {
      const Haptics = require('expo-haptics');
      await Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics unavailable in environment
    }
  },
  tap: async () => {
    try {
      const Haptics = require('expo-haptics');
      await Haptics.selectionAsync?.();
    } catch {
      // Haptics unavailable in environment
    }
  },
  success: async () => {
    try {
      const Haptics = require('expo-haptics');
      await Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptics unavailable in environment
    }
  },
};
