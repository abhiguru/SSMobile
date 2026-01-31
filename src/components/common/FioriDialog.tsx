import { View, StyleSheet, Pressable, Modal } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { colors, spacing, borderRadius, fontFamily, fontSize, elevation } from '../../constants/theme';
import { AppButton } from './AppButton';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text' | 'danger';

interface DialogAction {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
}

interface FioriDialogProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  children?: React.ReactNode;
  actions?: DialogAction[];
}

export function FioriDialog({
  visible,
  onDismiss,
  title,
  children,
  actions = [],
}: FioriDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
        <Animated.View entering={SlideInDown.duration(250)} style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          {children && <View style={styles.content}>{children}</View>}
          {actions.length > 0 && (
            <View style={styles.actions}>
              {actions.map((action, index) => (
                <AppButton
                  key={index}
                  variant={action.variant || (index === actions.length - 1 ? 'primary' : 'text')}
                  size="md"
                  onPress={action.onPress}
                >
                  {action.label}
                </AppButton>
              ))}
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  dialog: {
    maxWidth: 320,
    width: '85%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...elevation.level4,
  },
  title: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  content: {
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
