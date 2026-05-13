// ─── Fundo animado com partículas em parallax ────────────────────────────────

import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import type { ThemeMode } from "../types";
import { PARTICLE_LAYOUT } from "../constants/theme";
import { styles } from "../styles";

type AnimatedBackgroundProps = {
  mode: ThemeMode | "light";
};

export function AnimatedBackground({ mode }: AnimatedBackgroundProps) {
  const motionA = useRef(new Animated.Value(0)).current;
  const motionB = useRef(new Animated.Value(0)).current;
  const motionC = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = (ref: Animated.Value, duration: number, easing: (t: number) => number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(ref, { toValue: 1, duration, easing, useNativeDriver: true }),
          Animated.timing(ref, { toValue: 0, duration, easing, useNativeDriver: true }),
        ])
      );

    const animA = loop(motionA, 9000, Easing.inOut(Easing.sin));
    const animB = loop(motionB, 12000, Easing.inOut(Easing.sin));
    const animC = loop(motionC, 7000, Easing.inOut(Easing.quad));

    animA.start();
    animB.start();
    animC.start();

    return () => {
      animA.stop();
      animB.stop();
      animC.stop();
    };
  }, [motionA, motionB, motionC]);

  const nearX = motionB.interpolate({ inputRange: [0, 1], outputRange: [-10, 12] });
  const nearY = motionA.interpolate({ inputRange: [0, 1], outputRange: [-14, 14] });
  const midX = motionC.interpolate({ inputRange: [0, 1], outputRange: [8, -10] });
  const midY = motionB.interpolate({ inputRange: [0, 1], outputRange: [12, -11] });
  const farX = motionA.interpolate({ inputRange: [0, 1], outputRange: [-6, 7] });
  const farY = motionC.interpolate({ inputRange: [0, 1], outputRange: [8, -8] });

  const opacityNear = motionB.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.24] });
  const opacityMid = motionC.interpolate({ inputRange: [0, 1], outputRange: [0.07, 0.18] });
  const opacityFar = motionA.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.1] });
  const opacitySpark = motionB.interpolate({ inputRange: [0, 1], outputRange: [0.24, 0.52] });
  const scale = motionA.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.14] });

  const isDark = mode === "dark";
  const colorPrimary = isDark ? "rgba(245,238,255,0.7)" : "rgba(76,39,182,0.56)";
  const colorSecondary = isDark ? "rgba(199,180,255,0.64)" : "rgba(122,89,220,0.5)";

  return (
    <View pointerEvents="none" style={styles.animatedBackgroundLayer}>
      {PARTICLE_LAYOUT.map((particle, index) => {
        const translateX =
          particle.depth === "near" ? nearX : particle.depth === "mid" ? midX : farX;
        const translateY =
          particle.depth === "near" ? nearY : particle.depth === "mid" ? midY : farY;
        const opacity =
          index % 9 === 0
            ? opacitySpark
            : particle.depth === "near"
              ? opacityNear
              : particle.depth === "mid"
                ? opacityMid
                : opacityFar;
        const color = index % 4 === 0 ? colorSecondary : colorPrimary;

        return (
          <Animated.View
            key={`particle-${index}`}
            style={[
              styles.animatedParticle,
              {
                width: particle.size,
                height: particle.size,
                top: `${particle.top}%`,
                left: `${particle.left}%`,
                backgroundColor: color,
                opacity,
                transform: [{ translateX }, { translateY }, { scale }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}
