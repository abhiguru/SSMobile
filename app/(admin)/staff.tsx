import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function StaffScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        <Text style={styles.icon}>👥</Text>
        <Text style={styles.title}>{t('admin.staff')}</Text>
        <Text style={styles.subtitle}>Staff management coming soon</Text>
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
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
});
