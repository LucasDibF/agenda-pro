"use client";

import { StaggerList, StaggerListItem } from "@/components/motion/primitives";

type Step = {
  title: string;
  body: string;
};

type ClienteStepsProps = {
  steps: readonly Step[];
};

export function ClienteSteps({ steps }: ClienteStepsProps) {
  return (
    <StaggerList className="space-y-3" stagger={0.08}>
      {steps.map((step, index) => (
        <StaggerListItem key={step.title}>
          <div className="elevated-card flex gap-4 p-4">
            <span
              className="from-[var(--accent)] to-[var(--accent-dark)] shadow-sm flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-sm font-bold text-white"
              aria-hidden
            >
              {index + 1}
            </span>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[var(--ink-strong)] text-sm font-semibold">{step.title}</p>
              <p className="text-body-muted text-xs leading-snug">{step.body}</p>
            </div>
          </div>
        </StaggerListItem>
      ))}
    </StaggerList>
  );
}
