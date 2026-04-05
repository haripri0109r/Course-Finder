import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

/**
 * Standard tactile feedback for user actions
 */
export const triggerHaptic = (type = 'selection') => {
  try {
    switch (type) {
      case 'selection':
        Haptics.selectionAsync();
        break;
      case 'impactLight':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'impactMedium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'impactHeavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'notificationSuccess':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'notificationError':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      default:
        Haptics.selectionAsync();
    }
  } catch (error) {
    // Fallback for non-expo environments or failed haptics
    Vibration.vibrate(Platform.OS === 'ios' ? 1 : 10);
  }
};
