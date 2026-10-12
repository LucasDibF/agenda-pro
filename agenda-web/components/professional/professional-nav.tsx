"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

const links = [
  { href: "/professional", label: "Dashboard", exact: true },
  { href: "/professional/services", label: "Serviços", exact: false },
  { href: "/professional/calendar", label: "Agenda", exact: false },
] as const;

export function ProfessionalNav() {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <nav className="flex items-center gap-4 text-sm" aria-label="Painel">
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`relative pb-0.5 ${
              active
                ? "font-semibold text-[var(--accent-dark)]"
                : "text-body-secondary hover:text-[var(--accent-dark)]"
            }`}
          >
            {link.label}
            {active ? (
              reduce ? (
                <span
                  className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-[var(--accent)]"
                  aria-hidden
                />
              ) : (
                <motion.span
                  layoutId="professional-nav-underline"
                  className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-[var(--accent)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  aria-hidden
                />
              )
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
