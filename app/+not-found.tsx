import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, Button, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import type { AppTheme } from '../src/theme';

export default function NotFoundScreen() {
  const router = useRouter();
  const theme = useTheme<AppTheme>();

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="alert-circle-outline" size={64} color={theme.colors.primary} />
      <Text variant="displaySmall" style={[styles.code, { color: theme.colors.primary }]}>404</Text>
      <Text variant="headlineSmall" style={styles.title}>Page Not Found</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
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
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  code: {
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  subtitle: {
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    borderRadius: 8,
  },
  buttonContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
});
