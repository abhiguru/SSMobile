import { View, StyleSheet, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Card, Text, Button, Chip, FAB, useTheme } from 'react-native-paper';

import { useGetAddressesQuery, useDeleteAddressMutation, useSetDefaultAddressMutation } from '../../../src/store/apiSlice';
import { Address } from '../../../src/types';
import { EmptyState } from '../../../src/components/common/EmptyState';
import { LoadingScreen } from '../../../src/components/common/LoadingScreen';
import { colors, spacing, borderRadius } from '../../../src/constants/theme';
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
            {item.is_default && <Chip compact style={styles.defaultChip} textStyle={styles.defaultChipText}>{t('addresses.default')}</Chip>}
          </View>
        </View>
        <Text variant="bodyMedium" style={styles.addressName}>{item.full_name}</Text>
        <Text variant="bodySmall" style={styles.addressLine}>{item.address_line1}{item.address_line2 ? `, ${item.address_line2}` : ''}</Text>
        <Text variant="bodySmall" style={styles.addressLine}>{item.city}{item.state ? `, ${item.state}` : ''} - {item.pincode}</Text>
        <Text variant="bodySmall" style={styles.addressPhone}>{item.phone}</Text>
        <View style={styles.actionButtons}>
          <Button mode="text" compact onPress={() => handleEditAddress(item.id)}>{t('common.edit')}</Button>
          {!item.is_default && <Button mode="text" compact onPress={() => handleSetDefault(item.id)}>{t('addresses.setAsDefault')}</Button>}
          <Button mode="text" compact textColor={theme.colors.error} onPress={() => handleDeleteAddress(item.id)}>{t('common.delete')}</Button>
        </View>
      </Card.Content>
    </Card>
  );

  if (isLoading && addresses.length === 0) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      {addresses.length === 0 ? (
        <EmptyState icon="map-marker-off" title={t('addresses.empty')} subtitle={t('addresses.emptySubtitle')} actionLabel={t('addresses.addAddress')} onAction={handleAddAddress} />
      ) : (
        <>
          <FlashList data={addresses} renderItem={renderAddress} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} refreshing={isFetching} onRefresh={refetch} />
          <FAB icon="plus" style={styles.fab} onPress={handleAddAddress} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  listContent: { padding: spacing.md, paddingBottom: 80 },
  addressCard: { marginBottom: 12 },
  addressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  labelContainer: { flexDirection: 'row', alignItems: 'center' },
  defaultChip: { marginLeft: spacing.sm, backgroundColor: colors.successLight, height: 24 },
  defaultChipText: { fontSize: 10, color: colors.success },
  addressName: { color: colors.text.primary, marginBottom: 2 },
  addressLine: { color: colors.text.secondary, lineHeight: 20 },
  addressPhone: { color: colors.text.secondary, marginTop: spacing.xs },
  actionButtons: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border.light, gap: spacing.xs },
  fab: { position: 'absolute', right: spacing.md, bottom: spacing.md, backgroundColor: colors.primary },
});
