import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../../src/store';
import { selectProductById, toggleFavorite } from '../../../src/store/slices/productsSlice';
import { addToCart } from '../../../src/store/slices/cartSlice';
import { formatPrice } from '../../../src/constants';
import { WeightOption } from '../../../src/types';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();

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
        <ActivityIndicator size="large" color="#FF6B35" />
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
        <Text style={styles.placeholderText}>🌶️</Text>
        <TouchableOpacity style={styles.favoriteButton} onPress={handleToggleFavorite}>
          <Text style={styles.favoriteIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.name}>
          {isGujarati ? product.name_gu : product.name}
        </Text>

        {product.description && (
          <Text style={styles.description}>
            {isGujarati ? product.description_gu : product.description}
          </Text>
        )}

        <Text style={styles.sectionTitle}>{t('product.selectWeight')}</Text>
        <View style={styles.weightOptions}>
          {product.weight_options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.weightOption,
                selectedWeight?.id === option.id && styles.weightOptionSelected,
              ]}
              onPress={() => setSelectedWeight(option)}
            >
              <Text
                style={[
                  styles.weightText,
                  selectedWeight?.id === option.id && styles.weightTextSelected,
                ]}
              >
                {option.weight_grams}g
              </Text>
              <Text
                style={[
                  styles.priceText,
                  selectedWeight?.id === option.id && styles.priceTextSelected,
                ]}
              >
                {formatPrice(option.price_paise)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.quantitySection}>
          <Text style={styles.sectionTitle}>{t('product.quantity')}</Text>
          <View style={styles.quantityControl}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantityValue}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(quantity + 1)}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>{t('cart.total')}</Text>
          <Text style={styles.totalPrice}>
            {selectedWeight
              ? formatPrice(selectedWeight.price_paise * quantity)
              : '-'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, !product.is_available && styles.addButtonDisabled]}
          onPress={handleAddToCart}
          disabled={!product.is_available || !selectedWeight}
        >
          <Text style={styles.addButtonText}>
            {product.is_available ? t('product.addToCart') : t('product.outOfStock')}
          </Text>
        </TouchableOpacity>
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
  placeholderText: {
    fontSize: 80,
  },
  favoriteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  favoriteIcon: {
    fontSize: 24,
  },
  content: {
    padding: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
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
  weightOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  weightOptionSelected: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF5F2',
  },
  weightText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  weightTextSelected: {
    color: '#FF6B35',
  },
  priceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666666',
    marginTop: 4,
  },
  priceTextSelected: {
    color: '#FF6B35',
  },
  quantitySection: {
    marginBottom: 24,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 44,
    height: 44,
    backgroundColor: '#F5F5F5',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
  },
  quantityValue: {
    fontSize: 20,
    fontWeight: '600',
    marginHorizontal: 24,
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
    fontSize: 16,
    color: '#666666',
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  addButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
