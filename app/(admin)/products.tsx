import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { Text, Switch, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { useGetProductsQuery, useToggleProductAvailabilityMutation } from '../../src/store/apiSlice';
import { Product } from '../../src/types';
import { SkeletonBox, SkeletonText } from '../../src/components/common/SkeletonLoader';
import { AnimatedPressable } from '../../src/components/common/AnimatedPressable';
import { colors, spacing, borderRadius, elevation, fontFamily, gradients } from '../../src/constants/theme';
import { hapticSelection } from '../../src/utils/haptics';
import type { AppTheme } from '../../src/theme';

function ProductsSkeleton() {
  return (
    <View style={{ padding: spacing.lg }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <SkeletonBox width={50} height={50} borderRadius={borderRadius.md} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <SkeletonText lines={1} width="60%" />
            <SkeletonText lines={1} width="30%" style={{ marginTop: spacing.xs }} />
          </View>
          <SkeletonBox width={50} height={30} borderRadius={borderRadius.md} />
        </View>
      ))}
    </View>
  );
}

export default function AdminProductsScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme<AppTheme>();
  const isGujarati = i18n.language === 'gu';
  const { data: products = [], isLoading, isFetching, refetch } = useGetProductsQuery({ includeUnavailable: true });
  const [toggleAvailability] = useToggleProductAvailabilityMutation();

  const handleToggleAvailability = (productId: string, currentValue: boolean) => {
    hapticSelection();
    toggleAvailability({ productId, isAvailable: currentValue });
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const hasImage = !!item.image_url;

    return (
      <AnimatedPressable style={styles.productCard}>
        <View style={styles.productCardContent}>
          <View style={styles.productImage}>
            {hasImage ? (
              <Image source={{ uri: item.image_url }} style={styles.thumbnail} contentFit="cover" />
            ) : (
              <LinearGradient
                colors={gradients.brand as unknown as [string, string]}
                style={styles.thumbnail}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="leaf" size={24} color="rgba(255,255,255,0.8)" />
              </LinearGradient>
            )}
          </View>
          <View style={styles.productInfo}>
            <Text variant="titleSmall" style={styles.productName}>{isGujarati ? item.name_gu : item.name}</Text>
            <Text variant="bodySmall" style={styles.productOptions}>{t('admin.weightOptions', { count: item.weight_options.length })}</Text>
          </View>
          <View style={styles.toggleContainer}>
            <Text variant="labelSmall" style={[styles.toggleLabel, item.is_available && { color: colors.positive }]}>
              {item.is_available ? t('admin.available') : t('admin.unavailable')}
            </Text>
            <Switch value={item.is_available} onValueChange={() => handleToggleAvailability(item.id, item.is_available)} color={theme.custom.positive} />
          </View>
        </View>
      </AnimatedPressable>
    );
  };

  if (isLoading && products.length === 0) return <ProductsSkeleton />;

  return (
    <View style={styles.container}>
      <FlashList data={products} renderItem={renderProduct} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} refreshing={isFetching} onRefresh={refetch} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.shell },
  listContent: { padding: spacing.lg },
  productCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, marginBottom: 12, borderWidth: 1, borderColor: colors.border, ...elevation.level1 },
  productCardContent: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg },
  productImage: {},
  thumbnail: { width: 50, height: 50, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1, marginLeft: 12 },
  productName: { fontFamily: fontFamily.regular, color: colors.text.primary, marginBottom: spacing.xs },
  productOptions: { color: colors.text.secondary },
  toggleContainer: { alignItems: 'center' },
  toggleLabel: { color: colors.neutral, marginBottom: spacing.xs },
  skeletonCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: 12, ...elevation.level1 },
});
