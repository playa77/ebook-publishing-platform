import type { Metadata } from "next";
import type { ReactNode } from "react";

import { de } from "@/i18n/de";

import "./globals.css";

export const metadata: Metadata = {
  title: de.app.title,
  description: de.app.description,
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>
        <a className="skip-link" href="#hauptinhalt">
          {de.shell.skipToContent}
        </a>
        <header className="site-header">
          <p className="site-name">{de.app.name}</p>
          <p className="pilot-badge">{de.shell.pilotBadge}</p>
        </header>
        <main id="hauptinhalt" className="site-main">
          {children}
        </main>
        <footer className="site-footer">
          <p>{de.shell.footer}</p>
        </footer>
      </body>
    </html>
  );
}
