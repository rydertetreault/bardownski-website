import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-navy-dark border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 relative overflow-hidden rounded">
                <Image
                  src="/images/logo/BD - logo.png"
                  alt="Bardownski"
                  fill
                  className="object-contain"
                />
              </div>
              <h3 className="text-xl font-bold">BARDOWNSKI</h3>
            </div>
            <p className="text-sm text-muted">
              Official website of Bardownski Hockey Club. Based in Newfoundland.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4 text-red">Team</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/roster" className="hover:text-white transition-colors">Roster</Link></li>
              <li><Link href="/stats" className="hover:text-white transition-colors">Stats</Link></li>
              <li><Link href="/records" className="hover:text-white transition-colors">Records</Link></li>
              <li><Link href="/gallery" className="hover:text-white transition-colors">Gallery</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4 text-red">Community</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/news" className="hover:text-white transition-colors">News</Link></li>
              <li><a href="https://discord.gg/QunuzvaC" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Discord</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4 text-red">Connect</h4>
            <div className="flex gap-4">
              <a href="https://discord.gg/QunuzvaC" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-red transition-colors" aria-label="Discord">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z" />
                </svg>
              </a>
              <a href="#" className="text-muted hover:text-red transition-colors" aria-label="Twitter">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted">
          &copy; {new Date().getFullYear()} Bardownski Hockey Club. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
