import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { fontFamily } from '../../../src/constants/theme';
import { useAppTheme } from '../../../src/theme/useAppTheme';

export default function AdminProductsLayout() {
  const { t } = useTranslation();
  const { appColors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: appColors.surface,
        },
        headerTintColor: appColors.text.primary,
        headerTitleStyle: {
          fontFamily: fontFamily.semiBold,
          fontSize: 17,
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
