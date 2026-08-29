import React, { useRef } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';

export interface TouchableScaleProps extends PressableProps {
  scaleTo?: number;
  friction?: number;
  tension?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const TouchableScale: React.FC<TouchableScaleProps> = ({
  scaleTo = 0.97,
  friction = 7,
  tension = 150,
  style,
  children,
  onPressIn,
  onPressOut,
  disabled,
  ...props
}) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = (event: GestureResponderEvent) => {
    if (!disabled) {
      Animated.spring(scaleValue, {
        toValue: scaleTo,
        friction,
        tension,
        useNativeDriver: true,
      }).start();
    }
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    if (!disabled) {
      Animated.spring(scaleValue, {
        toValue: 1,
        friction,
        tension,
        useNativeDriver: true,
      }).start();
    }
    onPressOut?.(event);
  };

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[{ transform: [{ scale: scaleValue }] }, style]}
    >
      {children}
    </AnimatedPressable>
  );
};

export default TouchableScale;
