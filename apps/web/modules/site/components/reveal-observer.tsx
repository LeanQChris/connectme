"use client";

import { useEffect } from "react";

/**
 * Releases [data-reveal] elements as they enter the viewport.
 * Uses IntersectionObserver rather than a scroll listener so nothing runs per
 * frame, and honours prefers-reduced-motion through the CSS layer, which keeps
 * revealed content visible even if this never runs.
 */
export function RevealObserver() {
  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed])"),
    );
    if (nodes.length === 0) return;

    if (!("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.setAttribute("data-revealed", ""));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute("data-revealed", "");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return null;
}