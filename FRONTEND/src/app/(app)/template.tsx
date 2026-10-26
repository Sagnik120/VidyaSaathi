"use client";

import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { RouteLoader } from "@/components/brand/route-loader";
import { EASE } from "@/lib/utils";

/**
 * Every page change: a short section-themed arrival animation, then the page
 * lifts into place. Opacity and position only — a lingering `filter`/`transform`
 * would become the containing block for fixed-position dialogs inside the page.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      <RouteLoader pathname={pathname} />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0, transitionEnd: { transform: "none" } }}
        transition={{ duration: 0.28, ease: EASE }}
      >
        {children}
      </motion.div>
    </>
  );
}
