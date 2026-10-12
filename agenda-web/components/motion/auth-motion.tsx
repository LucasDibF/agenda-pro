"use client";

import type { ReactNode } from "react";
import { FadeIn, PopIn } from "@/components/motion/primitives";

type AuthMotionProps = {
  header: ReactNode;
  card: ReactNode;
  footer?: ReactNode;
};

export function AuthMotion({ header, card, footer }: AuthMotionProps) {
  return (
    <>
      <FadeIn className="space-y-3">{header}</FadeIn>
      <PopIn delay={0.1}>{card}</PopIn>
      {footer ? <FadeIn delay={0.2}>{footer}</FadeIn> : null}
    </>
  );
}
