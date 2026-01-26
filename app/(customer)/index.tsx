import { useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Card, Chip, Text, Button, ActivityIndicator, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useAppDispatch, useAppSelector } from '../../src/store';
import { fetchProducts, fetchCategories } from '../../src/store/slices/productsSlice';
import type { AppTheme } from '../../src/theme';

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const theme = useTheme<AppTheme>();
  const { products, categories, isLoading, error } = useAppSelector(
    (state) => state.products
  );

  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchCategories());
  }, [dispatch]);

  const isGujarati = i18n.language === 'gu';

  const renderCategory = ({ item }: { item: typeof categories[0] }) => (
    <Chip
      mode="outlined"
      style={styles.categoryChip}
      textStyle={styles.categoryText}
    >
      {isGujarati ? item.name_gu : item.name}
    </Chip>
  );

  const renderProduct = ({ item }: { item: typeof products[0] }) => (
    <Card
      mode="elevated"
      style={styles.productCard}
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
        <Text variant="bodyLarge" style={{ color: theme.colors.error, textAlign: 'center', marginBottom: 16 }}>
          {error}
        </Text>
        <Button
          mode="contained"
          onPress={() => {
            dispatch(fetchProducts());
            dispatch(fetchCategories());
          }}
        >
          {t('common.retry')}
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.sectionTitle}>{t('home.categories')}</Text>
      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesList}
      />

      <Text variant="titleMedium" style={styles.sectionTitle}>{t('home.popularProducts')}</Text>
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.productsList}
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
    padding: 24,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#333333',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  categoriesList: {
    paddingHorizontal: 12,
  },
  categoryChip: {
    marginHorizontal: 4,
  },
  categoryText: {
    fontSize: 14,
  },
  productsList: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  productRow: {
    justifyContent: 'space-between',
  },
  productCard: {
    marginHorizontal: 4,
    marginBottom: 8,
    width: '47%',
  },
  productImage: {
    height: 100,
    backgroundColor: '#FFF5F2',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    color: '#333333',
    marginBottom: 4,
  },
});
