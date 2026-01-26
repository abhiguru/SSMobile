import { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, Button, Chip, IconButton, ActivityIndicator, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useAppDispatch, useAppSelector } from '../../../src/store';
import { selectProductById, toggleFavorite } from '../../../src/store/slices/productsSlice';
import { addToCart } from '../../../src/store/slices/cartSlice';
import { formatPrice } from '../../../src/constants';
import { WeightOption } from '../../../src/types';
import type { AppTheme } from '../../../src/theme';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const theme = useTheme<AppTheme>();

  const product = useAppSelector(selectProductById(id!));
  const favorites = useAppSelector((state) => state.products.favorites);
  const isFavorite = favorites.includes(id!);

  const [selectedWeight, setSelectedWeight] = useState<WeightOption | null>(
    product?.weight_options[0] || null
  );
  const [quantity, setQuantity] = useState(1);

  const isGujarati = i18n.language === 'gu';

  if (!product) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const handleAddToCart = () => {
    if (!selectedWeight) return;

    dispatch(
      addToCart({
        product,
        weightOption: selectedWeight,
        quantity,
      })
    );

    router.back();
  };

  const handleToggleFavorite = () => {
    dispatch(toggleFavorite(id!));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.imageContainer}>
        <MaterialCommunityIcons name="leaf" size={80} color={theme.colors.primary} />
        <IconButton
          icon={isFavorite ? 'heart' : 'heart-outline'}
          iconColor={isFavorite ? theme.colors.error : '#666666'}
          size={28}
          mode="contained"
          containerColor="#FFFFFF"
          style={styles.favoriteButton}
          onPress={handleToggleFavorite}
        />
      </View>

      <View style={styles.content}>
        <Text variant="headlineSmall" style={styles.name}>
          {isGujarati ? product.name_gu : product.name}
        </Text>

        {product.description && (
          <Text variant="bodyMedium" style={styles.description}>
            {isGujarati ? product.description_gu : product.description}
          </Text>
        )}

        <Text variant="titleMedium" style={styles.sectionTitle}>{t('product.selectWeight')}</Text>
        <View style={styles.weightOptions}>
          {product.weight_options.map((option) => (
            <Chip
              key={option.id}
              selected={selectedWeight?.id === option.id}
              onPress={() => setSelectedWeight(option)}
              style={styles.weightChip}
              showSelectedOverlay
            >
              {option.weight_grams}g - {formatPrice(option.price_paise)}
            </Chip>
          ))}
        </View>

        <View style={styles.quantitySection}>
          <Text variant="titleMedium" style={styles.sectionTitle}>{t('product.quantity')}</Text>
          <View style={styles.quantityControl}>
            <IconButton
              icon="minus"
              mode="contained-tonal"
              size={20}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            />
            <Text variant="titleLarge" style={styles.quantityValue}>{quantity}</Text>
            <IconButton
              icon="plus"
              mode="contained-tonal"
              size={20}
              onPress={() => setQuantity(quantity + 1)}
            />
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text variant="bodyLarge" style={styles.totalLabel}>{t('cart.total')}</Text>
          <Text variant="headlineSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
            {selectedWeight
              ? formatPrice(selectedWeight.price_paise * quantity)
              : '-'}
          </Text>
        </View>
        <Button
          mode="contained"
          icon="cart"
          onPress={handleAddToCart}
          disabled={!product.is_available || !selectedWeight}
          style={styles.addButton}
          contentStyle={styles.addButtonContent}
          labelStyle={styles.addButtonLabel}
        >
          {product.is_available ? t('product.addToCart') : t('product.outOfStock')}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    height: 250,
    backgroundColor: '#FFF5F2',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  content: {
    padding: 16,
  },
  name: {
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  description: {
    color: '#666666',
    lineHeight: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  weightOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  weightChip: {
    minWidth: 100,
  },
  quantitySection: {
    marginBottom: 24,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityValue: {
    fontWeight: '600',
    marginHorizontal: 16,
    color: '#333333',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    color: '#666666',
  },
  addButton: {
    borderRadius: 8,
  },
  addButtonContent: {
    paddingVertical: 8,
  },
  addButtonLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
});
