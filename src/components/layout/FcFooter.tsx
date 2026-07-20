import Link from "next/link";
import Image from "next/image";

export default function FcFooter() {
  return (
    <footer
      style={{
        backgroundColor: "var(--fc-bg-dark)",
        borderTop: "1px solid var(--fc-border)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 relative overflow-hidden rounded">
                <Image
                  src="/images/logo/BD - logo.png"
                  alt="Bardownski FC"
                  fill
                  className="object-contain"
                />
              </div>
              <h3 className="text-xl font-bold text-white">
                BARDOWNSKI <span style={{ color: "var(--fc-gold)" }}>FC</span>
              </h3>
            </div>
            <p className="text-sm text-white/40">
              Official website of Bardownski FC. EA FC 26 Pro Clubs.
            </p>
          </div>

          <div>
            <h4
              className="text-sm font-semibold uppercase tracking-wider mb-4"
              style={{ color: "var(--fc-gold)" }}
            >
              Club
            </h4>
            <ul className="space-y-2 text-sm text-white/40">
              <li><Link href="/fc/squad" className="hover:text-white transition-colors">Squad</Link></li>
              <li><Link href="/fc/fixtures" className="hover:text-white transition-colors">Fixtures &amp; Results</Link></li>
              <li><Link href="/fc/stats" className="hover:text-white transition-colors">Stats</Link></li>
              <li><Link href="/fc/records" className="hover:text-white transition-colors">Records</Link></li>
            </ul>
          </div>

          <div>
            <h4
              className="text-sm font-semibold uppercase tracking-wider mb-4"
              style={{ color: "var(--fc-gold)" }}
            >
              Media
            </h4>
            <ul className="space-y-2 text-sm text-white/40">
              <li><Link href="/fc/news" className="hover:text-white transition-colors">News</Link></li>
              <li><Link href="/fc/gallery" className="hover:text-white transition-colors">Gallery</Link></li>
              <li><Link href="/fc/highlights" className="hover:text-white transition-colors">Highlights</Link></li>
            </ul>
          </div>

          <div>
            <h4
              className="text-sm font-semibold uppercase tracking-wider mb-4"
              style={{ color: "var(--fc-gold)" }}
            >
              The Family
            </h4>
            <ul className="space-y-2 text-sm text-white/40">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Bardownski Hockey Club →
                </Link>
              </li>
              <li>
                <a
                  href="https://discord.gg/QunuzvaC"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Discord
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="mt-12 pt-8 text-center text-sm text-white/40"
          style={{ borderTop: "1px solid var(--fc-border)" }}
        >
          &copy; {new Date().getFullYear()} Bardownski FC. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
