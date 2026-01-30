import { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Card, Text, Divider, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { useGetOrdersQuery, useGetProductsQuery } from '../../src/store/apiSlice';
import { formatPrice, ORDER_STATUS_COLORS } from '../../src/constants';
import { colors, spacing, borderRadius, elevation, fontFamily, gradients } from '../../src/constants/theme';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { AnimatedPressable } from '../../src/components/common/AnimatedPressable';
import type { AppTheme } from '../../src/theme';

const KPI_CONFIG = [
  { key: 'pendingOrders', icon: 'clock-alert-outline' as const, bg: colors.criticalLight },
  { key: 'todaysOrders', icon: 'calendar-today' as const, bg: colors.informativeLight },
  { key: 'activeProducts', icon: 'check-circle-outline' as const, bg: colors.positiveLight },
  { key: 'totalProducts', icon: 'leaf' as const, bg: colors.shell },
];

function AnimatedKPI({ value, label, icon, bg, delay, theme }: { value: number; label: string; icon: any; bg: string; delay: number; theme: AppTheme }) {
  const animatedValue = useSharedValue(0);
  const displayStyle = useAnimatedStyle(() => ({
    opacity: 1,
  }));

  useEffect(() => {
    animatedValue.value = withTiming(value, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [value, animatedValue]);

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(400)} style={{ flex: 1 }}>
      <View style={styles.statCard}>
        <View style={styles.statContent}>
          <View style={[styles.kpiIconContainer, { backgroundColor: bg }]}>
            <MaterialCommunityIcons name={icon} size={24} color={theme.colors.primary} />
          </View>
          <Animated.View style={displayStyle}>
            <Text variant="displaySmall" style={{ color: theme.colors.primary, fontFamily: fontFamily.bold }}>{value}</Text>
          </Animated.View>
          <Text variant="bodySmall" style={styles.statLabel}>{label}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { data: orders = [] } = useGetOrdersQuery();
  const { data: products = [] } = useGetProductsQuery({ includeUnavailable: true });

  const pendingOrders = orders.filter((o) => o.status === 'placed' || o.status === 'confirmed');
  const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === new Date().toDateString());
  const activeProducts = products.filter((p) => p.is_available);
  const todaysRevenue = todayOrders.reduce((sum, o) => sum + o.total_paise, 0);
  const kpiValues = [pendingOrders.length, todayOrders.length, activeProducts.length, products.length];

  return (
    <ScrollView style={styles.container}>
      <Animated.View entering={FadeInUp.duration(400)}>
        <LinearGradient
          colors={gradients.brand as unknown as [string, string]}
          style={styles.revenueCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.revenueIconContainer}>
            <MaterialCommunityIcons name="chart-line" size={28} color={colors.text.inverse} />
          </View>
          <View style={styles.revenueTextContainer}>
            <Text variant="bodySmall" style={styles.revenueLabel}>{t('admin.todaysRevenue')}</Text>
            <Text variant="headlineMedium" style={styles.revenueValue}>{formatPrice(todaysRevenue)}</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          {KPI_CONFIG.slice(0, 2).map((kpi, index) => (
            <AnimatedKPI
              key={kpi.key}
              value={kpiValues[index]}
              label={t(`admin.${kpi.key}`)}
              icon={kpi.icon}
              bg={kpi.bg}
              delay={index * 100}
              theme={theme}
            />
          ))}
        </View>
        <View style={styles.statsRow}>
          {KPI_CONFIG.slice(2, 4).map((kpi, index) => (
            <AnimatedKPI
              key={kpi.key}
              value={kpiValues[index + 2]}
              label={t(`admin.${kpi.key}`)}
              icon={kpi.icon}
              bg={kpi.bg}
              delay={(index + 2) * 100}
              theme={theme}
            />
          ))}
        </View>
      </View>

      <Card mode="elevated" style={styles.sectionCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>{t('admin.recentOrders')}</Text>
          {pendingOrders.slice(0, 5).map((order) => (
            <View key={order.id}>
              <View style={styles.orderRow}>
                <View style={[styles.orderStripe, { backgroundColor: ORDER_STATUS_COLORS[order.status] || colors.critical }]} />
                <Text variant="bodyMedium" style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
                <StatusBadge status={order.status} />
                <Text variant="bodyMedium" style={styles.orderTotal}>{formatPrice(order.total_paise)}</Text>
              </View>
              <Divider />
            </View>
          ))}
          {pendingOrders.length === 0 && <Text variant="bodyMedium" style={styles.emptyText}>{t('admin.noPendingOrders')}</Text>}
        </Card.Content>
      </Card>

      <Text variant="titleMedium" style={styles.quickActionsTitle}>{t('admin.quickActions')}</Text>
      <View style={styles.quickActionsRow}>
        <AnimatedPressable style={styles.quickActionCard} onPress={() => router.push('/(admin)/orders')}>
          <View style={[styles.quickActionIcon, { backgroundColor: colors.informativeLight }]}>
            <MaterialCommunityIcons name="package-variant" size={24} color={colors.informative} />
          </View>
          <Text variant="bodyMedium" style={styles.quickActionLabel}>{t('admin.viewAllOrders')}</Text>
        </AnimatedPressable>
        <AnimatedPressable style={styles.quickActionCard} onPress={() => router.push('/(admin)/products')}>
          <View style={[styles.quickActionIcon, { backgroundColor: colors.positiveLight }]}>
            <MaterialCommunityIcons name="leaf" size={24} color={colors.positive} />
          </View>
          <Text variant="bodyMedium" style={styles.quickActionLabel}>{t('admin.manageProducts')}</Text>
        </AnimatedPressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.shell },
  revenueCard: { margin: spacing.sm, marginBottom: 0, borderRadius: borderRadius.lg, flexDirection: 'row', alignItems: 'center', padding: 20 },
  revenueIconContainer: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  revenueTextContainer: { flex: 1 },
  revenueLabel: { color: 'rgba(255,255,255,0.8)', marginBottom: spacing.xs },
  revenueValue: { color: colors.text.inverse, fontFamily: fontFamily.bold },
  statsGrid: { padding: spacing.sm, gap: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, ...elevation.level2 },
  statContent: { alignItems: 'center', paddingVertical: spacing.lg },
  kpiIconContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  statLabel: { color: colors.text.secondary, textAlign: 'center', marginTop: spacing.sm },
  sectionCard: { margin: spacing.sm },
  sectionTitle: { fontSize: 13, fontFamily: fontFamily.semiBold, color: colors.text.secondary, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: spacing.md },
  orderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  orderStripe: { width: 3, height: 24, borderRadius: 2, marginRight: spacing.sm },
  orderId: { fontFamily: fontFamily.semiBold, color: colors.text.primary, flex: 1 },
  orderTotal: { fontFamily: fontFamily.semiBold, color: colors.text.primary, marginLeft: spacing.sm },
  emptyText: { color: colors.text.secondary, textAlign: 'center', paddingVertical: 20 },
  quickActionsTitle: { fontSize: 13, fontFamily: fontFamily.semiBold, color: colors.text.secondary, letterSpacing: 0.5, textTransform: 'uppercase', marginHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: 12 },
  quickActionsRow: { flexDirection: 'row', paddingHorizontal: spacing.sm, marginBottom: spacing.xl },
  quickActionCard: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginHorizontal: spacing.xs, alignItems: 'center', borderWidth: 1, borderColor: colors.border, ...elevation.level2 },
  quickActionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  quickActionLabel: { color: colors.text.primary, textAlign: 'center', fontFamily: fontFamily.regular },
});
