import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '../../../src/constants/theme';

export default function AdminOrdersLayout() {
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
          title: t('admin.orders'),
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Order Details',
        }}
      />
    </Stack>
  );
}
