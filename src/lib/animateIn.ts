"use client";

import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Idempotent — gsap dedupes plugin registration internally.
gsap.registerPlugin(ScrollTrigger);

type Vars = gsap.TweenVars;

// Tween FROM `vars` to the element's natural state when it enters the viewport.
// Defaults match framer-motion's `whileInView` with amount ≈ 0.1 (top 88%).
export function useAnimateIn<T extends HTMLElement>(
  ref: RefObject<T | null>,
  vars: Vars,
  deps: ReadonlyArray<unknown> = [],
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.from(el, {
        ...vars,
        scrollTrigger: {
          trigger: el,
          start: "top 88%",
          once: true,
          ...(typeof vars.scrollTrigger === "object" ? vars.scrollTrigger : {}),
        },
      });
    }, el);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// Same idea, applied to descendants matching `selector` (use stagger via vars).
export function useAnimateInChildren<T extends HTMLElement>(
  ref: RefObject<T | null>,
  selector: string,
  vars: Vars,
  deps: ReadonlyArray<unknown> = [],
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const targets = el.querySelectorAll(selector);
    if (!targets.length) return;
    const ctx = gsap.context(() => {
      gsap.from(targets, {
        ...vars,
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          once: true,
          ...(typeof vars.scrollTrigger === "object" ? vars.scrollTrigger : {}),
        },
      });
    }, el);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
