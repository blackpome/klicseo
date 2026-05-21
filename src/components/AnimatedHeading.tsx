"use client";

import { motion, type Variants } from "framer-motion";
import { Fragment } from "react";

// Reusable cascading headline. Normal text lines reveal letter-by-letter
// (rise + un-blur + fade); a `shimmer` line is kept as one element so the
// gold gradient still sweeps across the whole word instead of per-letter.
//
// Used for the hero headline (trigger="mount") and every section <h2>
// (trigger="inView", animates once when scrolled into view).

export type HeadingLine = {
  text: string;
  /** Render as a `gold-shimmer` block (the brand gold gradient sweep). */
  shimmer?: boolean;
  /** Force a line break before this line even when not shimmering. */
  block?: boolean;
};

type Props = {
  lines: HeadingLine[];
  className?: string;
  style?: React.CSSProperties;
  as?: "h1" | "h2" | "h3";
  /** "mount" plays immediately; "inView" plays once on scroll-in. */
  trigger?: "mount" | "inView";
  /** Seconds to wait before the cascade starts. */
  delay?: number;
};

const container: Variants = {
  hidden: {},
  show: (delay: number = 0) => ({
    transition: { delayChildren: delay, staggerChildren: 0.035 },
  }),
};

const letter: Variants = {
  hidden: { opacity: 0, y: "0.45em", filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: "0em",
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

// Shimmer lines move as a single unit (preserves the cross-word gold sweep).
const shimmerLine: Variants = {
  hidden: { opacity: 0, y: "0.4em", filter: "blur(10px)" },
  show: {
    opacity: 1,
    y: "0em",
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function AnimatedHeading({
  lines,
  className,
  style,
  as = "h2",
  trigger = "inView",
  delay = 0,
}: Props) {
  const MotionTag = motion[as];
  const animateProps =
    trigger === "mount"
      ? { animate: "show" as const }
      : {
          whileInView: "show" as const,
          viewport: { once: true, amount: 0.4 },
        };

  // Read by screen readers; the per-letter spans below are aria-hidden.
  const label = lines.map((l) => l.text).join(" ");

  return (
    <MotionTag
      className={className}
      style={style}
      aria-label={label}
      variants={container}
      initial="hidden"
      custom={delay}
      {...animateProps}
    >
      {lines.map((line, li) => {
        const isBlock = line.shimmer || line.block;

        if (line.shimmer) {
          return (
            <motion.span
              key={li}
              aria-hidden
              variants={shimmerLine}
              className="gold-shimmer block"
              style={{ display: "block" }}
            >
              {line.text}
            </motion.span>
          );
        }

        return (
          <Fragment key={li}>
            <span
              aria-hidden
              style={{ display: isBlock ? "block" : "inline" }}
            >
              {Array.from(line.text).map((ch, ci) => (
                <motion.span
                  key={ci}
                  variants={letter}
                  // inline-block so transform/blur apply; keep real spaces
                  // selectable and from collapsing at line wraps.
                  style={{
                    display: "inline-block",
                    whiteSpace: ch === " " ? "pre" : undefined,
                  }}
                >
                  {ch === " " ? " " : ch}
                </motion.span>
              ))}
            </span>
            {/* keep a real space between non-block lines */}
            {!isBlock && li < lines.length - 1 ? " " : null}
          </Fragment>
        );
      })}
    </MotionTag>
  );
}
