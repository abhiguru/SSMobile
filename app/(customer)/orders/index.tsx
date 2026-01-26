import {
  View,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Card, Text, ActivityIndicator, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useGetOrdersQuery } from '../../../src/store/apiSlice';
import { formatPrice } from '../../../src/constants';
import { Order } from '../../../src/types';
import { StatusBadge } from '../../../src/components/common/StatusBadge';
import type { AppTheme } from '../../../src/theme';

export default function OrdersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme<AppTheme>();
  const { data: orders = [], isLoading, isFetching, refetch } = useGetOrdersQuery();

  const getOrderDisplayNumber = (order: Order) => {
    if (order.order_number) {
      return order.order_number;
    }
    return `#${(order.id ?? '').slice(0, 8).toUpperCase()}`;
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <Card
      mode="elevated"
      style={styles.orderCard}
      onPress={() => router.push(`/(customer)/orders/${item.id}`)}
    >
      <Card.Content>
        <View style={styles.orderHeader}>
          <Text variant="titleSmall">
            {t('orders.orderNumber', { id: getOrderDisplayNumber(item) })}
          </Text>
          <StatusBadge status={item.status} />
        </View>

        <Text variant="bodySmall" style={styles.orderDate}>
          {t('orders.placedOn')}: {new Date(item.created_at).toLocaleDateString()}
        </Text>

        <View style={styles.orderFooter}>
          <Text variant="bodySmall" style={styles.itemCount}>
            {t('orders.items', { count: item.items?.length ?? 0 })}
          </Text>
          <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
            {formatPrice(item.total_paise)}
          </Text>
        </View>

        {item.status === 'out_for_delivery' && item.delivery_otp && (
          <View style={styles.otpContainer}>
            <Text variant="bodySmall" style={styles.otpLabel}>{t('orders.deliveryOtp')}:</Text>
            <Text variant="titleLarge" style={styles.otpCode}>{item.delivery_otp}</Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  if (isLoading && orders.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="package-variant" size={64} color="#999999" />
        <Text variant="titleMedium" style={styles.emptyTitle}>{t('orders.empty')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item, index) => item.id ?? `order-${index}`}
        contentContainerStyle={styles.listContent}
        refreshing={isFetching}
        onRefresh={refetch}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    color: '#666666',
    marginTop: 16,
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderDate: {
    color: '#666666',
    marginBottom: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCount: {
    color: '#666666',
  },
  otpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  otpLabel: {
    color: '#666666',
    marginRight: 8,
  },
  otpCode: {
    fontWeight: 'bold',
    color: '#4CAF50',
    letterSpacing: 2,
  },
});
