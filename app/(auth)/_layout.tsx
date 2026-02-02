import { Stack } from 'expo-router';
import { fontFamily } from '../../src/constants/theme';
import { useAppTheme } from '../../src/theme/useAppTheme';

export default function AuthLayout() {
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
        name="login"
        options={{
          title: 'Login',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="otp"
        options={{
          title: 'Verify OTP',
          headerBackTitle: 'Back',
        }}
      />
    </Stack>
  );
}
