"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";

function subscribeToHash(notify: () => void) {
  window.addEventListener("hashchange", notify);
  window.addEventListener("popstate", notify);
  return () => {
    window.removeEventListener("hashchange", notify);
    window.removeEventListener("popstate", notify);
  };
}

/** Never mount an intro for reduced motion or a direct section link. */
export function OpeningSequence() {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)", true);
  const hasHash = useSyncExternalStore(
    subscribeToHash,
    () => !!window.location.hash,
    () => true,
  );
  return reduced || hasHash ? null : <OpeningAnimation />;
}

/** One continuous mark: center stage → its measured position in the header. */
function OpeningAnimation() {
  const [phase, setPhase] = useState("center");
  const logo = useRef<HTMLDivElement>(null);
  const cancel = useRef<() => void>(() => {});

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const jobs: ReturnType<typeof setTimeout>[] = [];
    const animations: Animation[] = [];
    const cleanup = () => {
      jobs.forEach(clearTimeout);
      animations.forEach((animation) => animation.cancel());
      document.body.style.overflow = previousOverflow;
    };
    cancel.current = cleanup;

    if (logo.current) {
      animations.push(
        logo.current.animate(
          [
            { opacity: 0, transform: "translate(-50%,-50%) scale(.92)" },
            { opacity: 1, transform: "translate(-50%,-50%) scale(1)" },
          ],
          { duration: 500, fill: "both", easing: "cubic-bezier(.22,.7,.15,1)" },
        ),
      );
    }
    jobs.push(
      setTimeout(() => {
        const target = document.querySelector(".header .wordmark");
        if (!logo.current || !target) return;
        setPhase("dock");
        const from = logo.current.getBoundingClientRect();
        const to = target.getBoundingClientRect();
        const x = to.left + to.width / 2 - (from.left + from.width / 2);
        const y = to.top + to.height / 2 - (from.top + from.height / 2);
        animations.push(
          logo.current.animate(
            [
              { transform: "translate(-50%,-50%) scale(1)" },
              {
                transform: `translate(calc(-50% + ${x}px),calc(-50% + ${y}px)) scale(${to.width / from.width})`,
              },
            ],
            {
              duration: 950,
              fill: "forwards",
              easing: "cubic-bezier(.76,0,.2,1)",
            },
          ),
        );
      }, 850),
    );
    jobs.push(setTimeout(() => setPhase("open"), 1810));
    jobs.push(
      setTimeout(() => {
        setPhase("done");
        document.body.style.overflow = previousOverflow;
      }, 2810),
    );

    return cleanup;
  }, []);

  if (phase === "done") return null;
  return (
    <div className="brand-opening" data-phase={phase} aria-label="VYRN opening">
      <div className="opening-panel opening-left" />
      <div className="opening-panel opening-right" />
      <div ref={logo} className="opening-logo">
        VYRN<span>®</span>
      </div>
      <p className="opening-note mono">INDEPENDENT EXPRESSION.</p>
      <button
        className="opening-skip"
        onClick={() => {
          cancel.current();
          setPhase("done");
        }}
      >
        Skip intro
      </button>
    </div>
  );
}
