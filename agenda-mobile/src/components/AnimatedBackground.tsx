// ─── Fundo animado com partículas em parallax ────────────────────────────────

import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import type { ThemeMode } from "../types";
import { APP_THEMES, PARTICLE_LAYOUT } from "../constants/theme";
import { styles } from "../styles";

type AnimatedBackgroundProps = {
  mode: ThemeMode | "light";
};

function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

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

  const themeMode = mode === "light" ? "light" : "dark";
  const accent = APP_THEMES[themeMode].accent;
  const isDark = themeMode === "dark";
  const colorPrimary = withAlpha(accent, isDark ? 0.52 : 0.42);
  const colorSecondary = withAlpha(accent, isDark ? 0.34 : 0.26);

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
