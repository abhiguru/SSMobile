import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fontFamily } from '../../../src/constants/theme';

export default function AdminProductsLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontWeight: 'bold',
          fontFamily: fontFamily.semiBold,
        },
        headerShadowVisible: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t('admin.products'),
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          title: t('admin.editProduct'),
        }}
      />
    </Stack>
  );
}
