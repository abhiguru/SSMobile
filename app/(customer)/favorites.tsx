import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Card, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useAppSelector } from '../../src/store';
import { useGetProductsQuery } from '../../src/store/apiSlice';
import { EmptyState } from '../../src/components/common/EmptyState';
import { PriceText } from '../../src/components/common/PriceText';
import { Product } from '../../src/types';
import { colors, spacing, borderRadius } from '../../src/constants/theme';
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
    <Card mode="elevated" style={styles.productCard} onPress={() => router.push(`/(customer)/product/${item.id}`)}>
      <Card.Content style={styles.productCardContent}>
        <View style={styles.productImage}>
          <MaterialCommunityIcons name="leaf" size={32} color={theme.colors.primary} />
        </View>
        <View style={styles.productInfo}>
          <Text variant="titleSmall" numberOfLines={2} style={styles.productName}>{isGujarati ? item.name_gu : item.name}</Text>
          {item.weight_options.length > 0 && (
            <PriceText paise={item.weight_options[0].price_paise} variant="titleSmall" />
          )}
        </View>
      </Card.Content>
    </Card>
  );

  if (favorites.length === 0) {
    return <EmptyState icon="heart-off" title={t('favorites.empty')} subtitle={t('favorites.addFavorites')} />;
  }

  return (
    <View style={styles.container}>
      <FlashList data={favorites} renderItem={renderProduct} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  listContent: { padding: spacing.md },
  productCard: { marginBottom: 12 },
  productCardContent: { flexDirection: 'row' },
  productImage: { width: 80, height: 80, backgroundColor: colors.secondary, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  productName: { color: colors.text.primary, marginBottom: spacing.xs },
});
