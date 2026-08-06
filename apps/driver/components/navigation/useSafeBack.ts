import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';

type RouteHref = Parameters<ReturnType<typeof useRouter>['replace']>[0];

export function useSafeBack(fallbackHref?: RouteHref) {
  const navigation = useNavigation();
  const router = useRouter();

  return useCallback(() => {
    if (navigation.canGoBack()) {
      try {
        navigation.goBack();
        return;
      } catch {
        // Screen unmounted mid-navigation, fall through to fallback
      }
    }
    if (fallbackHref) {
      router.replace(fallbackHref);
    }
  }, [fallbackHref, navigation, router]);
}
