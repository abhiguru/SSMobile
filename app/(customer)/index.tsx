import { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Card, Chip, Text, Button, ActivityIndicator, Searchbar, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useGetProductsQuery, useGetCategoriesQuery } from '../../src/store/apiSlice';
import { colors, spacing, borderRadius, shadows } from '../../src/constants/theme';
import type { AppTheme } from '../../src/theme';

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const theme = useTheme<AppTheme>();

  const {
    data: products = [],
    isLoading: productsLoading,
    error: productsError,
    refetch: refetchProducts,
  } = useGetProductsQuery();

  const {
    data: categories = [],
    refetch: refetchCategories,
  } = useGetCategoriesQuery();

  const isLoading = productsLoading;
  const error = productsError
    ? (typeof productsError === 'object' && 'data' in productsError
        ? String(productsError.data)
        : 'Failed to load products')
    : null;

  const [searchQuery, setSearchQuery] = useState('');

  const isGujarati = i18n.language === 'gu';

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.name_gu && p.name_gu.toLowerCase().includes(query))
    );
  }, [products, searchQuery]);

  const renderCategory = ({ item }: { item: typeof categories[0] }) => (
    <Chip
      mode="outlined"
      style={styles.categoryChip}
      textStyle={styles.categoryText}
    >
      {isGujarati ? item.name_gu : item.name}
    </Chip>
  );

  const renderProduct = ({ item, index }: { item: typeof products[0]; index: number }) => (
    <Card
      mode="elevated"
      style={[
        styles.productCard,
        index % 2 === 0 ? styles.productCardLeft : styles.productCardRight,
      ]}
      onPress={() => router.push(`/(customer)/product/${item.id}`)}
    >
      <Card.Content>
        <View style={styles.productImage}>
          <MaterialCommunityIcons name="leaf" size={40} color={theme.colors.primary} />
        </View>
        <Text variant="titleSmall" numberOfLines={2} style={styles.productName}>
          {isGujarati ? item.name_gu : item.name}
        </Text>
        {item.weight_options.length > 0 && (
          <Text variant="titleSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
            From ₹{(item.weight_options[0].price_paise / 100).toFixed(2)}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  if (isLoading && products.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyLarge" style={{ color: theme.colors.error, textAlign: 'center', marginBottom: spacing.md }}>
          {error}
        </Text>
        <Button
          mode="contained"
          onPress={() => {
            refetchProducts();
            refetchCategories();
          }}
        >
          {t('common.retry')}
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder={t('home.searchProducts')}
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
      />
      <Text variant="titleMedium" style={styles.sectionTitle}>{t('home.categories')}</Text>
      <FlashList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesList}
      />

      <Text variant="titleMedium" style={styles.sectionTitle}>{t('home.popularProducts')}</Text>
      {searchQuery.trim() && filteredProducts.length === 0 ? (
        <View style={styles.noResults}>
          <MaterialCommunityIcons name="magnify-close" size={48} color={colors.text.muted} />
          <Text variant="bodyLarge" style={styles.noResultsText}>{t('common.noResults')}</Text>
        </View>
      ) : (
        <FlashList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.productsList}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  searchBar: {
    marginHorizontal: spacing.md,
    marginTop: 12,
    ...shadows.sm,
  },
  searchInput: {
    fontSize: 14,
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  noResultsText: {
    color: colors.text.muted,
    marginTop: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: colors.text.primary,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: 12,
  },
  categoriesList: {
    paddingHorizontal: 12,
  },
  categoryChip: {
    marginHorizontal: spacing.xs,
  },
  categoryText: {
    fontSize: 14,
  },
  productsList: {
    paddingHorizontal: 12,
    paddingBottom: spacing.md,
  },
  productCard: {
    marginBottom: spacing.sm,
    flex: 1,
  },
  productCardLeft: {
    marginLeft: 12,
    marginRight: spacing.xs,
  },
  productCardRight: {
    marginLeft: spacing.xs,
    marginRight: 12,
  },
  productImage: {
    height: 100,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  productName: {
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
});
