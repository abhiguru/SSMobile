import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { Card, Text, Switch, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useGetProductsQuery, useToggleProductAvailabilityMutation } from '../../src/store/apiSlice';
import { Product } from '../../src/types';
import { LoadingScreen } from '../../src/components/common/LoadingScreen';
import { colors, spacing, borderRadius } from '../../src/constants/theme';
import type { AppTheme } from '../../src/theme';

export default function AdminProductsScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme<AppTheme>();
  const isGujarati = i18n.language === 'gu';
  const { data: products = [], isLoading, isFetching, refetch } = useGetProductsQuery({ includeUnavailable: true });
  const [toggleAvailability] = useToggleProductAvailabilityMutation();

  const handleToggleAvailability = (productId: string, currentValue: boolean) => {
    toggleAvailability({ productId, isAvailable: currentValue });
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <Card mode="elevated" style={styles.productCard}>
      <Card.Content style={styles.productCardContent}>
        <View style={styles.productImage}><MaterialCommunityIcons name="leaf" size={24} color={theme.colors.primary} /></View>
        <View style={styles.productInfo}>
          <Text variant="titleSmall" style={styles.productName}>{isGujarati ? item.name_gu : item.name}</Text>
          <Text variant="bodySmall" style={styles.productOptions}>{t('admin.weightOptions', { count: item.weight_options.length })}</Text>
        </View>
        <View style={styles.toggleContainer}>
          <Text variant="labelSmall" style={styles.toggleLabel}>{item.is_available ? t('admin.available') : t('admin.unavailable')}</Text>
          <Switch value={item.is_available} onValueChange={() => handleToggleAvailability(item.id, item.is_available)} color={theme.custom.success} />
        </View>
      </Card.Content>
    </Card>
  );

  if (isLoading && products.length === 0) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <FlashList data={products} renderItem={renderProduct} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} refreshing={isFetching} onRefresh={refetch} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  listContent: { padding: spacing.md },
  productCard: { marginBottom: 12 },
  productCardContent: { flexDirection: 'row', alignItems: 'center' },
  productImage: { width: 50, height: 50, backgroundColor: colors.secondary, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1, marginLeft: 12 },
  productName: { color: colors.text.primary, marginBottom: spacing.xs },
  productOptions: { color: colors.text.secondary },
  toggleContainer: { alignItems: 'center' },
  toggleLabel: { color: colors.text.secondary, marginBottom: spacing.xs },
});
