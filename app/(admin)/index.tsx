import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Card, Text, Divider, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useGetOrdersQuery, useGetProductsQuery } from '../../src/store/apiSlice';
import { formatPrice } from '../../src/constants';
import { colors, spacing, borderRadius, shadows } from '../../src/constants/theme';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import type { AppTheme } from '../../src/theme';

const KPI_CONFIG = [
  { key: 'pendingOrders', icon: 'clock-alert-outline' as const, bg: colors.warningLight },
  { key: 'todaysOrders', icon: 'calendar-today' as const, bg: colors.infoLight },
  { key: 'activeProducts', icon: 'check-circle-outline' as const, bg: colors.successLight },
  { key: 'totalProducts', icon: 'leaf' as const, bg: colors.secondary },
];

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
      <Card mode="elevated" style={styles.revenueCard}>
        <Card.Content style={styles.revenueContent}>
          <View style={styles.revenueIconContainer}>
            <MaterialCommunityIcons name="chart-line" size={28} color={theme.colors.primary} />
          </View>
          <View style={styles.revenueTextContainer}>
            <Text variant="bodySmall" style={styles.revenueLabel}>{t('admin.todaysRevenue')}</Text>
            <Text variant="headlineMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{formatPrice(todaysRevenue)}</Text>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.statsGrid}>
        {KPI_CONFIG.map((kpi, index) => (
          <Card key={kpi.key} mode="elevated" style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <View style={[styles.kpiIconContainer, { backgroundColor: kpi.bg }]}>
                <MaterialCommunityIcons name={kpi.icon} size={24} color={theme.colors.primary} />
              </View>
              <Text variant="displaySmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{kpiValues[index]}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>{t(`admin.${kpi.key}`)}</Text>
            </Card.Content>
          </Card>
        ))}
      </View>

      <Card mode="elevated" style={styles.sectionCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>{t('admin.recentOrders')}</Text>
          {pendingOrders.slice(0, 5).map((order) => (
            <View key={order.id}>
              <View style={styles.orderRow}>
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
        <Pressable style={({ pressed }) => [styles.quickActionCard, pressed && { opacity: 0.85 }]} onPress={() => router.push('/(admin)/orders')}>
          <View style={[styles.quickActionIcon, { backgroundColor: colors.infoLight }]}>
            <MaterialCommunityIcons name="package-variant" size={24} color={colors.info} />
          </View>
          <Text variant="bodyMedium" style={styles.quickActionLabel}>{t('admin.viewAllOrders')}</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.quickActionCard, pressed && { opacity: 0.85 }]} onPress={() => router.push('/(admin)/products')}>
          <View style={[styles.quickActionIcon, { backgroundColor: colors.successLight }]}>
            <MaterialCommunityIcons name="leaf" size={24} color={colors.success} />
          </View>
          <Text variant="bodyMedium" style={styles.quickActionLabel}>{t('admin.manageProducts')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  revenueCard: { margin: spacing.sm, marginBottom: 0 },
  revenueContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20 },
  revenueIconContainer: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  revenueTextContainer: { flex: 1 },
  revenueLabel: { color: colors.text.secondary, marginBottom: spacing.xs },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.sm },
  statCard: { width: '46%', margin: '2%' },
  statContent: { alignItems: 'center', paddingVertical: spacing.md },
  kpiIconContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  statLabel: { color: colors.text.secondary, textAlign: 'center', marginTop: spacing.sm },
  sectionCard: { margin: spacing.sm },
  sectionTitle: { fontWeight: '600', color: colors.text.primary, marginBottom: spacing.md },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  orderId: { fontWeight: '500', color: colors.text.primary, flex: 1 },
  orderTotal: { fontWeight: '600', color: colors.text.primary },
  emptyText: { color: colors.text.secondary, textAlign: 'center', paddingVertical: 20 },
  quickActionsTitle: { fontWeight: '600', color: colors.text.primary, marginHorizontal: spacing.md, marginTop: spacing.sm, marginBottom: 12 },
  quickActionsRow: { flexDirection: 'row', paddingHorizontal: spacing.sm, marginBottom: spacing.lg },
  quickActionCard: { flex: 1, backgroundColor: colors.background.card, borderRadius: borderRadius.lg, padding: spacing.md, marginHorizontal: spacing.xs, alignItems: 'center', ...shadows.md },
  quickActionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  quickActionLabel: { color: colors.text.primary, textAlign: 'center', fontWeight: '500' },
});
