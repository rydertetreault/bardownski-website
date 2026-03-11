"use client";

import { useMotionValue, useTransform, animate } from "framer-motion";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export function AnimatedNumber({
  from = 0,
  to,
}: {
  from?: number;
  to: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isFloat = to % 1 !== 0;
  const motionValue = useMotionValue(from);
  const display = useTransform(motionValue, (v) =>
    isFloat ? v.toFixed(1) : Math.round(v).toString()
  );
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Check immediately if already in viewport on mount (client-side nav)
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setInView(true);
      return;
    }

    // Otherwise use IntersectionObserver for scroll
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (inView) {
      animate(motionValue, to, { duration: 1.5, ease: "easeOut" });
    }
  }, [inView, motionValue, to]);

  return <motion.span ref={ref}>{display}</motion.span>;
}
