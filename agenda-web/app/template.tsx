"use client";

import type { ReactNode } from "react";
import { PageEnter } from "@/components/motion/primitives";

type TemplateProps = {
  children: ReactNode;
};

export default function Template({ children }: TemplateProps) {
  return <PageEnter>{children}</PageEnter>;
}
