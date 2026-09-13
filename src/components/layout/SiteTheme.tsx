"use client";

import { usePathname } from "next/navigation";
import HockeyMotion from "./HockeyMotion";
import "./hockey-retouch.css";
import "./hockey-motion.css";

/** Scope hockey tokens to the entire shell, including navigation and footer.
 * FC inherits the original :root palette on both direct loads and navigation.
 */
export default function SiteTheme({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFc = pathname === "/fc" || pathname.startsWith("/fc/");
  const interior = !isFc && pathname !== "/";
  return <div className={isFc ? "fc-site" : `hockey-site${interior ? " hockey-interior" : ""}`}>
    {children}
    {interior && <HockeyMotion key={pathname} />}
  </div>;
}
