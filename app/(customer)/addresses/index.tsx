import {
  View,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Card, Text, Button, Chip, FAB, ActivityIndicator, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useGetAddressesQuery, useDeleteAddressMutation, useSetDefaultAddressMutation } from '../../../src/store/apiSlice';
import { Address } from '../../../src/types';
import type { AppTheme } from '../../../src/theme';

export default function AddressesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme<AppTheme>();
  const { data: addresses = [], isLoading, isFetching, refetch } = useGetAddressesQuery();
  const [deleteAddress] = useDeleteAddressMutation();
  const [setDefaultAddress] = useSetDefaultAddressMutation();

  const handleAddAddress = () => { router.push('/(customer)/addresses/new'); };
  const handleEditAddress = (id: string) => { router.push(`/(customer)/addresses/${id}`); };

  const handleDeleteAddress = (id: string) => {
    Alert.alert(t('addresses.deleteConfirmTitle'), t('addresses.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteAddress(id) },
    ]);
  };

  const handleSetDefault = (id: string) => { setDefaultAddress(id); };

  const renderAddress = ({ item }: { item: Address }) => (
    <Card mode="elevated" style={styles.addressCard}>
      <Card.Content>
        <View style={styles.addressHeader}>
          <View style={styles.labelContainer}>
            <Text variant="titleSmall">{item.label || item.full_name}</Text>
            {item.is_default && (
              <Chip compact style={styles.defaultChip} textStyle={styles.defaultChipText}>{t('addresses.default')}</Chip>
            )}
          </View>
        </View>
        <Text variant="bodyMedium" style={styles.addressName}>{item.full_name}</Text>
        <Text variant="bodySmall" style={styles.addressLine}>
          {item.address_line1}{item.address_line2 ? `, ${item.address_line2}` : ''}
        </Text>
        <Text variant="bodySmall" style={styles.addressLine}>
          {item.city}{item.state ? `, ${item.state}` : ''} - {item.pincode}
        </Text>
        <Text variant="bodySmall" style={styles.addressPhone}>{item.phone}</Text>
        <View style={styles.actionButtons}>
          <Button mode="text" compact onPress={() => handleEditAddress(item.id)}>{t('common.edit')}</Button>
          {!item.is_default && (
            <Button mode="text" compact onPress={() => handleSetDefault(item.id)}>{t('addresses.setAsDefault')}</Button>
          )}
          <Button mode="text" compact textColor={theme.colors.error} onPress={() => handleDeleteAddress(item.id)}>{t('common.delete')}</Button>
        </View>
      </Card.Content>
    </Card>
  );

  if (isLoading && addresses.length === 0) {
    return (<View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>);
  }

  return (
    <View style={styles.container}>
      {addresses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="map-marker-off" size={64} color="#999999" />
          <Text variant="titleMedium" style={styles.emptyTitle}>{t('addresses.empty')}</Text>
          <Text variant="bodyMedium" style={styles.emptySubtitle}>{t('addresses.emptySubtitle')}</Text>
          <Button mode="contained" onPress={handleAddAddress} style={styles.addButton}>{t('addresses.addAddress')}</Button>
        </View>
      ) : (
        <>
          <FlatList data={addresses} renderItem={renderAddress} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} refreshing={isFetching} onRefresh={refetch} />
          <FAB icon="plus" style={styles.fab} onPress={handleAddAddress} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { fontWeight: '600', color: '#333333', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { color: '#666666', textAlign: 'center', marginBottom: 24 },
  addButton: { borderRadius: 8 },
  listContent: { padding: 16, paddingBottom: 80 },
  addressCard: { marginBottom: 12 },
  addressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  labelContainer: { flexDirection: 'row', alignItems: 'center' },
  defaultChip: { marginLeft: 8, backgroundColor: '#E8F5E9', height: 24 },
  defaultChipText: { fontSize: 10, color: '#4CAF50' },
  addressName: { color: '#333333', marginBottom: 2 },
  addressLine: { color: '#666666', lineHeight: 20 },
  addressPhone: { color: '#666666', marginTop: 4 },
  actionButtons: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EEEEEE', gap: 4 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#FF6B35' },
});
