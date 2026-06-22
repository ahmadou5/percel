type ExpoLocalAuth = {
  hasHardwareAsync?: () => Promise<boolean>;
  isEnrolledAsync?: () => Promise<boolean>;
  authenticateAsync?: (options?: { promptMessage?: string; cancelLabel?: string; disableDeviceFallback?: boolean; fallbackLabel?: string }) => Promise<{ success: boolean; error?: string }>;
  supportedAuthenticationTypesAsync?: () => Promise<number[]>;
};

export type BiometricPromptResult =
  | { success: true }
  | { success: false; reason: 'unavailable' | 'cancelled' | 'failed'; message: string };

function loadModule(): ExpoLocalAuth | null {
  try {
    return (0, eval)("require")("expo-local-authentication") as ExpoLocalAuth;
  } catch {
    return null;
  }
}

const moduleRef = loadModule();

export const LocalAuthentication = {
  hasHardwareAsync: async () => (moduleRef?.hasHardwareAsync ? moduleRef.hasHardwareAsync() : false),
  isEnrolledAsync: async () => (moduleRef?.isEnrolledAsync ? moduleRef.isEnrolledAsync() : false),
  authenticateAsync: async (options?: { promptMessage?: string; cancelLabel?: string; disableDeviceFallback?: boolean; fallbackLabel?: string }) =>
    (moduleRef?.authenticateAsync ? moduleRef.authenticateAsync(options) : { success: false, error: undefined }),
  supportedAuthenticationTypesAsync: async () => (moduleRef?.supportedAuthenticationTypesAsync ? moduleRef.supportedAuthenticationTypesAsync() : []),
};

const BIOMETRIC_TYPE = {
  FINGERPRINT: 1,
  FACIAL_RECOGNITION: 2,
  IRIS: 3,
} as const;

export function describeBiometricTypes(types: number[]) {
  if (types.includes(BIOMETRIC_TYPE.FACIAL_RECOGNITION)) return 'Face Recognition';
  if (types.includes(BIOMETRIC_TYPE.FINGERPRINT)) return 'Fingerprint';
  if (types.includes(BIOMETRIC_TYPE.IRIS)) return 'Iris Recognition';
  return 'Biometrics';
}

export async function promptBiometricAuthentication(options: { promptMessage: string; cancelLabel?: string; fallbackLabel?: string }): Promise<BiometricPromptResult> {
  const hardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = hardware ? await LocalAuthentication.isEnrolledAsync() : false;

  if (!hardware || !enrolled) {
    return {
      success: false,
      reason: 'unavailable',
      message: 'Biometrics are not available on this device. Enter your PIN to continue.',
    };
  }

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: options.promptMessage,
      cancelLabel: options.cancelLabel ?? 'Cancel',
      fallbackLabel: options.fallbackLabel ?? 'Use PIN',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    }

    const cancelledErrors = new Set(['user_cancel', 'app_cancel', 'system_cancel', 'user_fallback']);
    const unavailableErrors = new Set(['not_available', 'not_enrolled', 'passcode_not_set', 'lockout']);

    if (result.error && cancelledErrors.has(result.error)) {
      return {
        success: false,
        reason: 'cancelled',
        message: 'Biometric cancelled — enter your PIN to continue',
      };
    }

    if (result.error && unavailableErrors.has(result.error)) {
      return {
        success: false,
        reason: 'unavailable',
        message: 'Biometrics are not available on this device. Enter your PIN to continue.',
      };
    }

    return {
      success: false,
      reason: 'failed',
      message: 'Biometric check failed — enter your PIN to continue',
    };
  } catch {
    return {
      success: false,
      reason: 'failed',
      message: 'Biometric check failed — enter your PIN to continue',
    };
  }
}

export async function triggerBiometricAuth(options: { promptMessage: string; cancelLabel?: string; fallbackLabel?: string }): Promise<BiometricPromptResult> {
  return promptBiometricAuthentication(options);
}
