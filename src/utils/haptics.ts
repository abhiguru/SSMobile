import * as Haptics from 'expo-haptics';

export const hapticLight = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Silently fail - haptics may not be available on simulator/all devices
  }
};

export const hapticMedium = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // Silently fail - haptics may not be available on simulator/all devices
  }
};

export const hapticSuccess = () => {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Silently fail - haptics may not be available on simulator/all devices
  }
};

export const hapticError = () => {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    // Silently fail - haptics may not be available on simulator/all devices
  }
};

export const hapticSelection = () => {
  try {
    Haptics.selectionAsync();
  } catch {
    // Silently fail - haptics may not be available on simulator/all devices
  }
};
