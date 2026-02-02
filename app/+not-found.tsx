import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, Button } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { spacing, borderRadius } from '../src/constants/theme';
import { useAppTheme } from '../src/theme/useAppTheme';

export default function NotFoundScreen() {
  const router = useRouter();
  const { appColors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: appColors.surface }]}>
      <MaterialCommunityIcons name="alert-circle-outline" size={64} color={appColors.brand} />
      <Text variant="displaySmall" style={[styles.code, { color: appColors.brand }]}>404</Text>
      <Text variant="headlineSmall" style={[styles.title, { color: appColors.text.primary }]}>Page Not Found</Text>
      <Text variant="bodyMedium" style={[styles.subtitle, { color: appColors.text.secondary }]}>
        The page you're looking for doesn't exist.
      </Text>
      <Button
        mode="contained"
        onPress={() => router.replace('/')}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        Go Home
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  code: {
    fontWeight: 'bold',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    borderRadius: borderRadius.md,
  },
  buttonContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
