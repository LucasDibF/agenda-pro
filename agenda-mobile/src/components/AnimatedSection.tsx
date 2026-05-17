// ─── Wrapper com animação de entrada (fade + slide) ──────────────────────────

import { useEffect, useRef } from "react";
import { Animated, Easing, type StyleProp, type ViewStyle } from "react-native";

type AnimatedSectionProps = {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
};

export function AnimatedSection({ children, delay = 0, style }: AnimatedSectionProps) {
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    const animation = Animated.timing(translateY, {
      toValue: 0,
      duration: 420,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, translateY]);

  return (
    <Animated.View style={[style, { transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
