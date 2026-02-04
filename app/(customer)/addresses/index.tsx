import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Card, Text, Button, FAB } from 'react-native-paper';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useGetAddressesQuery, useDeleteAddressMutation, useSetDefaultAddressMutation } from '../../../src/store/apiSlice';
import { useAppSelector } from '../../../src/store';
import { Address } from '../../../src/types';

// #30: Icon mapping for address labels
const ADDRESS_LABEL_ICONS: Record<string, string> = {
  home: 'home-outline',
  office: 'briefcase-outline',
  work: 'briefcase-outline',
  other: 'map-marker-outline',
};

const getAddressIcon = (label?: string | null): string => {
  if (!label) return 'map-marker-outline';
  const normalized = label.toLowerCase().trim();
  return ADDRESS_LABEL_ICONS[normalized] || 'map-marker-outline';
};
import { EmptyState } from '../../../src/components/common/EmptyState';
import { LoadingScreen } from '../../../src/components/common/LoadingScreen';
import { FioriChip } from '../../../src/components/common/FioriChip';
import { FioriDialog } from '../../../src/components/common/FioriDialog';
import { spacing, borderRadius } from '../../../src/constants/theme';
import { useAppTheme } from '../../../src/theme';

export default function AddressesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { appColors } = useAppTheme();
  const { data: addresses = [], isLoading, isFetching, refetch } = useGetAddressesQuery();
  const [deleteAddress] = useDeleteAddressMutation();
  const [setDefaultAddress] = useSetDefaultAddressMutation();
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const user = useAppSelector((state) => state.auth.user);

  const handleAddAddress = () => {
    if (!user?.name?.trim()) {
      router.push('/(customer)/profile');
      return;
    }
    router.push('/(customer)/addresses/new');
  };
  const handleEditAddress = (id: string) => { router.push(`/(customer)/addresses/${id}`); };
  const handleDeleteAddress = (id: string) => {
    setDeletingId(id);
    setDeleteDialogVisible(true);
  };
  const handleSetDefault = (id: string) => { setDefaultAddress(id); };

  const renderAddress = ({ item }: { item: Address }) => (
    <Card mode="elevated" style={styles.addressCard}>
      <Card.Content>
        <View style={styles.addressHeader}>
          <View style={styles.labelContainer}>
            {/* #30: Address label icon */}
            <View style={[styles.labelIconBg, { backgroundColor: appColors.brandTint }]}>
              <MaterialCommunityIcons
                name={getAddressIcon(item.label) as any}
                size={18}
                color={appColors.brand}
              />
            </View>
            <Text variant="titleSmall" style={styles.labelText}>{item.label || item.full_name}</Text>
            {item.is_default && <FioriChip label={t('addresses.default')} selected variant="positive" />}
          </View>
        </View>
        <Text variant="bodyMedium" style={{ color: appColors.text.primary, marginBottom: 2 }}>{item.full_name}</Text>
        <Text variant="bodySmall" style={{ color: appColors.text.secondary, lineHeight: 20 }}>{item.address_line1}{item.address_line2 ? `, ${item.address_line2}` : ''}</Text>
        <Text variant="bodySmall" style={{ color: appColors.text.secondary, lineHeight: 20 }}>{item.city}{item.state ? `, ${item.state}` : ''} - {item.pincode}</Text>
        <Text variant="bodySmall" style={{ color: appColors.text.secondary, marginTop: spacing.xs }}>{item.phone}</Text>
        <View style={[styles.actionButtons, { borderTopColor: appColors.border }]}>
          <Button mode="text" compact onPress={() => handleEditAddress(item.id)}>{t('common.edit')}</Button>
          {!item.is_default && <Button mode="text" compact onPress={() => handleSetDefault(item.id)}>{t('addresses.setAsDefault')}</Button>}
          <Button mode="text" compact textColor={appColors.negative} onPress={() => handleDeleteAddress(item.id)}>{t('common.delete')}</Button>
        </View>
      </Card.Content>
    </Card>
  );

  if (isLoading && addresses.length === 0) return <LoadingScreen />;

  return (
    <View style={[styles.container, { backgroundColor: appColors.shell }]}>
      {addresses.length === 0 ? (
        <EmptyState icon="map-marker-off" title={t('addresses.empty')} subtitle={t('addresses.emptySubtitle')} actionLabel={t('addresses.addAddress')} onAction={handleAddAddress} />
      ) : (
        <>
          <FlashList data={addresses} renderItem={renderAddress} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} refreshing={isFetching} onRefresh={refetch} />
          <FAB icon="plus" style={[styles.fab, { backgroundColor: appColors.brand }]} color={appColors.text.inverse} onPress={handleAddAddress} />
        </>
      )}

      <FioriDialog
        visible={deleteDialogVisible}
        onDismiss={() => setDeleteDialogVisible(false)}
        title={t('addresses.deleteConfirmTitle')}
        actions={[
          { label: t('common.cancel'), onPress: () => setDeleteDialogVisible(false), variant: 'text' },
          { label: t('common.delete'), onPress: () => { setDeleteDialogVisible(false); if (deletingId) deleteAddress(deletingId); }, variant: 'danger' },
        ]}
      >
        <Text variant="bodyMedium">{t('addresses.deleteConfirmMessage')}</Text>
      </FioriDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: spacing.md, paddingBottom: 80 },
  addressCard: { marginBottom: 12 },
  addressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  labelContainer: { flexDirection: 'row', alignItems: 'center' },
  // #30: Address label icon styles
  labelIconBg: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  labelText: { marginRight: spacing.xs },
  actionButtons: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, gap: spacing.xs },
  fab: { position: 'absolute', right: spacing.md, bottom: spacing.md },
});
