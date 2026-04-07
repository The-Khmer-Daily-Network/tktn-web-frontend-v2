"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface RevealItemProps {
  children: ReactNode;
  /** Stagger delay in ms (e.g. index * 50). */
  delayMs?: number;
  /** Extra class for the wrapper. */
  className?: string;
  /** Animation duration in ms. */
  durationMs?: number;
}

/**
 * Single-item scroll reveal: fades in and slides up slightly when in view.
 * Use with delayMs for staggered list animations (e.g. delayMs={index * 50}).
 */
export default function RevealItem({
  children,
  delayMs = 0,
  className = "",
  durationMs = 280,
}: RevealItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            if (delayMs > 0) {
              timeoutRef.current = setTimeout(() => setVisible(true), delayMs);
            } else {
              setVisible(true);
            }
          } else {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            setVisible(false);
          }
        });
      },
      { threshold: 0.05, rootMargin: "80px 0px 80px 0px" }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [delayMs]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(14px)",
        transitionProperty: "opacity, transform",
        transitionDuration: `${durationMs}ms`,
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {children}
    </div>
  );
}
