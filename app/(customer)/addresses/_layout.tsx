import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { fontFamily } from '../../../src/constants/theme';
import { useAppTheme } from '../../../src/theme/useAppTheme';

export default function AddressesLayout() {
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
