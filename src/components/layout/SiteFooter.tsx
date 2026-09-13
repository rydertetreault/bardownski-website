"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";
import FcFooter from "./FcFooter";

/** Shared navigation is additive: page-specific closing content stays above it.
 * Home keeps its large sign-off in the page; FC retains its club links here. */
export default function SiteFooter() {
  const pathname = usePathname();
  const isFc = pathname === "/fc" || pathname.startsWith("/fc/");
  return <>{isFc && <FcFooter />}<Footer tone={pathname === "/" ? "lavender" : "dark"} /></>;
}
