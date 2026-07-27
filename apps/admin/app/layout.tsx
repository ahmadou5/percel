import type { Metadata } from 'next';
import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';

import { ADMIN_APP_TITLE } from '@/lib/session';
import { ThemeProvider } from '@/components/theme-provider';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-sans', display: 'swap', fallback: ['system-ui', 'sans-serif'] });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-mono', display: 'swap', fallback: ['monospace'] });

export const metadata: Metadata = {
  title: ADMIN_APP_TITLE,
  description: 'Percel operations dashboard for users, drivers, orders, wallet, and notifications.',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} bg-background text-foreground`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

