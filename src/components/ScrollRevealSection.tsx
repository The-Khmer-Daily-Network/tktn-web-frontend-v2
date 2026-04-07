"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type RevealDirection = "up" | "down" | "left" | "right";

interface ScrollRevealSectionProps {
  children: ReactNode;
  /**
   * Optional extra classNames to apply to the wrapper (margin, padding, etc.)
   */
  className?: string;
  /**
   * Delay in ms before animating once in view (for staggering).
   */
  delayMs?: number;
  /**
   * Direction to slide from before revealing. Default "up".
   */
  direction?: RevealDirection;
  /**
   * Distance (in Tailwind units, e.g. 8 = 2rem) to slide. Default 8.
   */
  distance?: number;
  /**
   * Animation duration in ms. Default 380 (faster display).
   */
  durationMs?: number;
  /**
   * Slight scale from 0.96 to 1 when revealing. Default true.
   */
  scale?: boolean;
}

/**
 * Scroll reveal wrapper using IntersectionObserver.
 * Sections fade in, slide from a direction, and optionally scale when they enter the viewport.
 */
export default function ScrollRevealSection({
  children,
  className = "",
  delayMs = 0,
  direction = "up",
  distance = 8,
  durationMs = 380,
  scale: useScale = true,
}: ScrollRevealSectionProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const distancePx = distance * 4; // 4px per unit (Tailwind spacing)
  const getFromTransform = () => {
    const slide =
      direction === "up"
        ? `translateY(${distancePx}px)`
        : direction === "down"
          ? `translateY(-${distancePx}px)`
          : direction === "left"
            ? `translateX(${distancePx}px)`
            : `translateX(-${distancePx}px)`;
    return useScale ? `${slide} scale(0.96)` : slide;
  };
  const getToTransform = () => (useScale ? "translate(0) scale(1)" : "translate(0)");

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
              timeoutRef.current = setTimeout(() => setIsVisible(true), delayMs);
            } else {
              setIsVisible(true);
            }
          } else {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            setIsVisible(false);
          }
        });
      },
      {
        threshold: 0.05,
        rootMargin: "120px 0px 120px 0px",
      }
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
      style={{
        transitionProperty: "opacity, transform",
        transitionDuration: `${durationMs}ms`,
        transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? getToTransform() : getFromTransform(),
      }}
      className={className}
    >
      {children}
    </div>
  );
}

