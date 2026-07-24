import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PackageOpen } from 'lucide-react-native';

import { DispatchOrderCard } from '@/components/orders/DispatchOrderCard';
import { Screen } from '@/components/DriverPrimitives';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useDriverActiveOrders } from '@/hooks/useDriverOrders';
import { useAppPalette } from '@/lib/theme';

export default function ActiveOrdersScreen() {
  const router = useRouter();
  const palette = useAppPalette();
  const { data: activeOrders, isLoading } = useDriverActiveOrders();

  const handleOrderPress = (id: string) => {
    router.push(`/orders/${id}` as never);
  };

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={palette.primary} size="large" />
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Loading active orders...</Text>
        </View>
      </Screen>
    );
  }

  const isEmpty = !activeOrders || activeOrders.length === 0;

  return (
    <Screen>
      <FlatList
        data={activeOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: palette.text }]}>Active Orders</Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
              Orders you've accepted and are currently delivering.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <DispatchOrderCard
            order={item}
            readonly
            onPress={() => handleOrderPress(item.id)}
          />
        )}
        ListEmptyComponent={
          isEmpty ? (
            <View style={[styles.emptyCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <PackageOpen size={48} color={palette.textSecondary} />
              <Text style={[styles.emptyTitle, { color: palette.text }]}>No Active Orders</Text>
              <Text style={[styles.emptySubtitle, { color: palette.textSecondary }]}>
                You don't have any ongoing deliveries at the moment. Check the Dispatch tab for new offers.
              </Text>
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.sm,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  header: {
    gap: 4,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.xxl,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.sm,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  emptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.xl,
    marginTop: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.lg,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  emptySubtitle: {
    fontSize: Typography.sm,
    fontFamily: 'SpaceGrotesk_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
});
