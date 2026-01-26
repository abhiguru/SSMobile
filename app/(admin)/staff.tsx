import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export default function StaffScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        <MaterialCommunityIcons name="account-group" size={64} color="#999999" />
        <Text variant="headlineSmall" style={styles.title}>{t('admin.staff')}</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>Staff management coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    color: '#666666',
  },
});
