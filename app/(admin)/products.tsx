import { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../src/store';
import { fetchProducts, selectProducts } from '../../src/store/slices/productsSlice';
import { authenticatedFetch } from '../../src/services/supabase';
import { Product } from '../../src/types';

export default function AdminProductsScreen() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const products = useAppSelector(selectProducts);
  const { isLoading } = useAppSelector((state) => state.products);

  const isGujarati = i18n.language === 'gu';

  useEffect(() => {
    dispatch(fetchProducts({ includeUnavailable: true })); // Include unavailable products for admin
  }, [dispatch]);

  const handleToggleAvailability = async (productId: string, currentValue: boolean) => {
    try {
      await authenticatedFetch(`/rest/v1/products?id=eq.${productId}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_available: !currentValue }),
      });
      dispatch(fetchProducts({ includeUnavailable: true })); // Refresh all products
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <View style={styles.productImage}>
        <Text style={styles.placeholderText}>🌶️</Text>
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>
          {isGujarati ? item.name_gu : item.name}
        </Text>
        <Text style={styles.productOptions}>
          {t('admin.weightOptions', { count: item.weight_options.length })}
        </Text>
      </View>
      <View style={styles.toggleContainer}>
        <Text style={styles.toggleLabel}>
          {item.is_available ? t('admin.available') : t('admin.unavailable')}
        </Text>
        <Switch
          value={item.is_available}
          onValueChange={() => handleToggleAvailability(item.id, item.is_available)}
          trackColor={{ false: '#DDDDDD', true: '#A5D6A7' }}
          thumbColor={item.is_available ? '#4CAF50' : '#999999'}
        />
      </View>
    </View>
  );

  if (isLoading && products.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B35" />
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
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productImage: {
    width: 50,
    height: 50,
    backgroundColor: '#FFF5F2',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  productOptions: {
    fontSize: 12,
    color: '#666666',
  },
  toggleContainer: {
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 4,
  },
});
