type ExpoLocalAuth = {
  hasHardwareAsync?: () => Promise<boolean>;
  isEnrolledAsync?: () => Promise<boolean>;
  authenticateAsync?: (options?: { promptMessage?: string; cancelLabel?: string; disableDeviceFallback?: boolean }) => Promise<{ success: boolean }>;
};

function loadModule(): ExpoLocalAuth | null {
  try {
    return (0, eval)("require")('expo-local-authentication') as ExpoLocalAuth;
  } catch {
    return null;
  }
}

const moduleRef = loadModule();

export const LocalAuthentication = {
  hasHardwareAsync: async () => moduleRef?.hasHardwareAsync ? moduleRef.hasHardwareAsync() : false,
  isEnrolledAsync: async () => moduleRef?.isEnrolledAsync ? moduleRef.isEnrolledAsync() : false,
  authenticateAsync: async (options?: { promptMessage?: string; cancelLabel?: string; disableDeviceFallback?: boolean }) =>
    moduleRef?.authenticateAsync ? moduleRef.authenticateAsync(options) : { success: false },
};
