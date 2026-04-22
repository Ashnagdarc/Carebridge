"use client";

import Link from "next/link";
import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { PixelBackground } from "@/components/backgrounds/pixel";
import { useAuth } from "@/hooks/useAuth";
import { DiaTextReveal } from "@/components/unlumen-ui/dia-text-reveal";

const revealWords = [
  "own your health data.",
  "share records securely.",
  "connect with trusted providers.",
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [wordIndex, setWordIndex] = React.useState(0);
  const destination = isAuthenticated ? "/dashboard" : "/login";

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setWordIndex((current) => (current + 1) % revealWords.length);
    }, 2200);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <PixelBackground
      className="min-h-screen bg-[#0d0d0d] text-white"
      gap={6}
      speed={35}
      pattern="center"
      darkColors="#173327,#25483a,#385f50"
      lightColors="#d7efe5,#b7dccd,#8fbfac"
    >
      <main className="relative min-h-screen">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_52%,rgba(52,199,89,0.13),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/50 to-transparent" />

        <section className="relative flex min-h-screen items-center px-6 py-14 pb-32 sm:px-10 sm:pb-14 lg:px-16">
          <div className="w-full max-w-5xl">
            <h1 className="text-balance text-[clamp(2.5rem,11vw,3.5rem)] font-semibold leading-[1.05] tracking-normal text-white/88 sm:text-[clamp(3.5rem,8vw,6.75rem)] sm:leading-[1.02]">
              <span>CareBridge helps you </span>
              <span className="inline-grid max-w-full align-baseline sm:min-w-[22ch]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={revealWords[wordIndex]}
                    className="col-start-1 row-start-1 inline-block"
                    initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -14, filter: "blur(6px)" }}
                    transition={{ duration: 0.34, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <DiaTextReveal
                      text={revealWords[wordIndex]}
                      duration={1.35}
                      delay={0.05}
                      startOnView={false}
                      colors={["#34c759", "#7dd3fc", "#f0abfc", "#fb923c"]}
                    />
                  </motion.span>
                </AnimatePresence>
              </span>
            </h1>
          </div>

          <motion.div
            className="fixed inset-x-0 bottom-8 z-10 flex justify-center px-6 sm:inset-x-auto sm:right-8 sm:justify-end sm:px-0"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.25, ease: [0.23, 1, 0.32, 1] }}
          >
            <Link
              href={destination}
              aria-label="Get started with CareBridge"
              className="inline-flex min-h-12 w-full max-w-[220px] items-center justify-center gap-3 rounded-full bg-white px-5 py-3 text-base font-semibold text-black transition duration-200 hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-info sm:w-auto sm:max-w-none"
            >
              Get started
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          </motion.div>
        </section>
      </main>
    </PixelBackground>
  );
}
