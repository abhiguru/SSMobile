import { useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Text, Switch, ActivityIndicator, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useAppDispatch, useAppSelector } from '../../src/store';
import { fetchProducts, selectProducts } from '../../src/store/slices/productsSlice';
import { authenticatedFetch } from '../../src/services/supabase';
import { Product } from '../../src/types';
import type { AppTheme } from '../../src/theme';

export default function AdminProductsScreen() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useTheme<AppTheme>();
  const products = useAppSelector(selectProducts);
  const { isLoading } = useAppSelector((state) => state.products);

  const isGujarati = i18n.language === 'gu';

  useEffect(() => {
    dispatch(fetchProducts({ includeUnavailable: true }));
  }, [dispatch]);

  const handleToggleAvailability = async (productId: string, currentValue: boolean) => {
    try {
      await authenticatedFetch(`/rest/v1/products?id=eq.${productId}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_available: !currentValue }),
      });
      dispatch(fetchProducts({ includeUnavailable: true }));
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <Card mode="elevated" style={styles.productCard}>
      <Card.Content style={styles.productCardContent}>
        <View style={styles.productImage}>
          <MaterialCommunityIcons name="leaf" size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.productInfo}>
          <Text variant="titleSmall" style={styles.productName}>
            {isGujarati ? item.name_gu : item.name}
          </Text>
          <Text variant="bodySmall" style={styles.productOptions}>
            {t('admin.weightOptions', { count: item.weight_options.length })}
          </Text>
        </View>
        <View style={styles.toggleContainer}>
          <Text variant="labelSmall" style={styles.toggleLabel}>
            {item.is_available ? t('admin.available') : t('admin.unavailable')}
          </Text>
          <Switch
            value={item.is_available}
            onValueChange={() => handleToggleAvailability(item.id, item.is_available)}
            color={theme.custom.success}
          />
        </View>
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

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={isLoading}
        onRefresh={() => dispatch(fetchProducts({ includeUnavailable: true }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  productCard: {
    marginBottom: 12,
  },
  productCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 50,
    height: 50,
    backgroundColor: '#FFF5F2',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    color: '#333333',
    marginBottom: 4,
  },
  productOptions: {
    color: '#666666',
  },
  toggleContainer: {
    alignItems: 'center',
  },
  toggleLabel: {
    color: '#666666',
    marginBottom: 4,
  },
});
