"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export const easeOutSoft: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

type MotionBoxProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function PageEnter({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: easeOutSoft }}
    >
      {children}
    </motion.div>
  );
}

export function FadeIn({ children, className, delay = 0 }: MotionBoxProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: reduce ? 0 : delay, ease: easeOutSoft }}
    >
      {children}
    </motion.div>
  );
}

export function PopIn({ children, className, delay = 0 }: MotionBoxProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, scale: 0.97, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.48, delay: reduce ? 0 : delay, ease: easeOutSoft }}
    >
      {children}
    </motion.div>
  );
}

type StaggerProps = {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
};

export function Stagger({ children, className, stagger = 0.07, delay = 0 }: StaggerProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: reduce ? 0 : stagger,
            delayChildren: reduce ? 0 : delay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={reduce ? { hidden: {}, visible: {} } : fadeUp}
      transition={{ duration: 0.4, ease: easeOutSoft }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerList({ children, className, stagger = 0.08, delay = 0 }: StaggerProps) {
  const reduce = useReducedMotion();

  return (
    <motion.ul
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: reduce ? 0 : stagger,
            delayChildren: reduce ? 0 : delay,
          },
        },
      }}
    >
      {children}
    </motion.ul>
  );
}

export function StaggerListItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.li
      className={className}
      variants={reduce ? { hidden: {}, visible: {} } : fadeUp}
      transition={{ duration: 0.4, ease: easeOutSoft }}
    >
      {children}
    </motion.li>
  );
}

export function MotionAlert({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.p
      className={className}
      initial={reduce ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: easeOutSoft }}
    >
      {children}
    </motion.p>
  );
}

type StepPanelProps = {
  stepKey: string;
  children: ReactNode;
  className?: string;
  direction?: number;
};

export function StepPanel({
  stepKey,
  children,
  className,
  direction = 1,
}: StepPanelProps) {
  const reduce = useReducedMotion();
  const offset = 18 * direction;

  return (
    <motion.div
      key={stepKey}
      className={className}
      initial={reduce ? false : { opacity: 0, x: offset }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduce ? undefined : { opacity: 0, x: -offset }}
      transition={{ duration: 0.28, ease: easeOutSoft }}
    >
      {children}
    </motion.div>
  );
}

export { AnimatePresence, motion, useReducedMotion };
