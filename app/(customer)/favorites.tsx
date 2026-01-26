import { useMemo } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Card, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useAppSelector } from '../../src/store';
import { useGetProductsQuery } from '../../src/store/apiSlice';
import { Product } from '../../src/types';
import type { AppTheme } from '../../src/theme';

export default function FavoritesScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const theme = useTheme<AppTheme>();
  const favoriteIds = useAppSelector((state) => state.products.favorites);
  const { data: products = [] } = useGetProductsQuery();

  const favorites = useMemo(
    () => products.filter((p) => favoriteIds.includes(p.id)),
    [products, favoriteIds]
  );

  const isGujarati = i18n.language === 'gu';

  const renderProduct = ({ item }: { item: Product }) => (
    <Card
      mode="elevated"
      style={styles.productCard}
      onPress={() => router.push(`/(customer)/product/${item.id}`)}
    >
      <Card.Content style={styles.productCardContent}>
        <View style={styles.productImage}>
          <MaterialCommunityIcons name="leaf" size={32} color={theme.colors.primary} />
        </View>
        <View style={styles.productInfo}>
          <Text variant="titleSmall" numberOfLines={2} style={styles.productName}>
            {isGujarati ? item.name_gu : item.name}
          </Text>
          {item.weight_options.length > 0 && (
            <Text variant="titleSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
              From ₹{(item.weight_options[0].price_paise / 100).toFixed(2)}
            </Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  if (favorites.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="heart-off" size={64} color="#999999" />
        <Text variant="titleMedium" style={styles.emptyTitle}>{t('favorites.empty')}</Text>
        <Text variant="bodyMedium" style={styles.emptySubtitle}>{t('favorites.addFavorites')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontWeight: '600',
    color: '#333333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#666666',
  },
  listContent: {
    padding: 16,
  },
  productCard: {
    marginBottom: 12,
  },
  productCardContent: {
    flexDirection: 'row',
  },
  productImage: {
    width: 80,
    height: 80,
    backgroundColor: '#FFF5F2',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  productName: {
    color: '#333333',
    marginBottom: 4,
  },
});
