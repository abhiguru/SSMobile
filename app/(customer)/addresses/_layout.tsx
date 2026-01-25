import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function AddressesLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FF6B35',
        },
        headerTintColor: '#FFFFFF',
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
