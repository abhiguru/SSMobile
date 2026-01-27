import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '../../../src/constants/theme';

export default function AddressesLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.text.inverse,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t('addresses.title'),
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: t('addresses.editAddress'),
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: t('addresses.addAddress'),
        }}
      />
    </Stack>
  );
}
