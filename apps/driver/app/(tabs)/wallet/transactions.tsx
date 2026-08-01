import { useRouter } from 'expo-router';
import { ArrowLeft, Search } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TransactionItem } from '@/components/wallet/TransactionItem';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useTransactions } from '@/hooks/useWallet';
import { useAppPalette } from '@/lib/theme';
import { walletCategories } from '@/lib/wallet';

export default function DriverTransactionsScreen() {
  const router = useRouter();
  const palette = useAppPalette();
  const insets = useSafeAreaInsets();

  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useTransactions({ category: selectedCategory });

  const allItems = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.data);
  }, [data]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(
      (item) =>
        item.description.toLowerCase().includes(q) ||
        item.reference.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q),
    );
  }, [allItems, searchQuery]);

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <View style={[styles.container, { paddingTop: insets.top + Spacing.md }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={palette.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Transaction History</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search Input */}
        <View style={[styles.searchBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Search size={18} color={palette.textSecondary} style={{ marginRight: Spacing.xs }} />
          <TextInput
            style={[styles.searchInput, { color: palette.text }]}
            placeholder="Search by description or reference…"
            placeholderTextColor={palette.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Category Filters Horizontal Scroll */}
        <View style={styles.categoryWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {walletCategories.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <Pressable
                  key={cat.key}
                  style={[
                    styles.catChip,
                    { backgroundColor: palette.card, borderColor: palette.border },
                    isSelected && { backgroundColor: palette.primary + '20', borderColor: palette.primary },
                  ]}
                  onPress={() => setSelectedCategory(cat.key)}
                >
                  <Text style={[styles.catChipText, { color: isSelected ? palette.primary : palette.text }]}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Transactions List */}
        {isLoading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator color={palette.primary} size="large" />
            <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Loading transactions…</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={[styles.emptyWrap, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              {searchQuery
                ? `No transactions match "${searchQuery}"`
                : 'No transactions found in this category.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <TransactionItem item={item} />}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.4}
            refreshing={isRefetching}
            onRefresh={refetch}
            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
            ListFooterComponent={
              isFetchingNextPage ? (
                <View style={{ paddingVertical: 16 }}>
                  <ActivityIndicator color={palette.primary} />
                </View>
              ) : null
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 48,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.xs,
  },
  categoryWrap: {
    marginBottom: Spacing.md,
  },
  categoryRow: {
    gap: 8,
  },
  catChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: 14,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  loadingText: {
    fontSize: Typography.xs,
  },
  emptyWrap: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.xs,
    textAlign: 'center',
  },
});
