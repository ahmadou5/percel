import { Platform } from 'react-native';

/**
 * Dynamically switches the app icon to match the selected primary color theme.
 * Handles native module loading safely to ensure zero crashes in web, dev client, or test environments.
 */
export async function changeAppIcon(iconName: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dynamicIconModule = require('expo-dynamic-app-icon');
    if (dynamicIconModule && typeof dynamicIconModule.setAppIcon === 'function') {
      const success = await dynamicIconModule.setAppIcon(iconName);
      return Boolean(success);
    }
  } catch {
    // Native dynamic app icon plugin not present or running inside Expo Go / standard build.
    // Log gracefully for debugging.
    if (__DEV__) {
      console.log(`[AppIcon] Theme app icon set to '${iconName}' (Native module not active in current build runtime).`);
    }
  }
  return false;
}
