import React, { useRef } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Animated,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { HeartIcon } from './icons/HeartIcon';
import theme from '../theme';

export interface AnimatedHeartButtonProps {
  isSaved?: boolean;
  filled?: boolean;
  isLiked?: boolean;
  onPress?: () => void | Promise<void>;
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
}

/**
 * Animated Like / Wishlist Heart Button
 * Performs an elastic bounce scale animation on like (1.35x -> 1.0x spring)
 * and a smooth subtle settle on unlike (0.85x -> 1.0x spring).
 * Fully themed with zero hardcoded hex codes.
 */
export const AnimatedHeartButton: React.FC<AnimatedHeartButtonProps> = ({
  isSaved: isSavedProp,
  filled: filledProp,
  isLiked: isLikedProp,
  onPress,
  size = 18,
  activeColor = theme.colors.accent,
  inactiveColor = theme.colors.textSecondary,
  style,
  disabled = false,
  accessibilityLabel,
}) => {
  const isSaved = Boolean(isSavedProp ?? filledProp ?? isLikedProp ?? false);
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (disabled) return;

    const willBeSaved = !isSaved;
    if (willBeSaved) {
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.35,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 0.85,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }

    onPress?.();
  };

  const currentColor = isSaved ? activeColor : inactiveColor;

  return (
    <TouchableOpacity
      activeOpacity={theme.opacity.active}
      onPress={handlePress}
      disabled={disabled}
      style={[styles.container, style]}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel || (isSaved ? 'Remove from wishlist' : 'Save to wishlist')
      }
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <HeartIcon
          size={size}
          color={currentColor}
          filled={isSaved}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AnimatedHeartButton;
