"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";
import FcFooter from "./FcFooter";

export default function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/") return null; // Approved homepage includes its own footer.
  const isFc = pathname === "/fc" || pathname.startsWith("/fc/");
  return isFc ? <FcFooter /> : <Footer />;
}
