import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Percel - Fast Intra-State & Interstate Mobile Logistics',
  description:
    'Download the Percel Mobile App (Android APK) or track your delivery live. Reliable, door-to-door intra-state and hub-to-hub interstate logistics with KYC-verified riders.',
  keywords: [
    'Percel',
    'Percel Delivery App',
    'Logistics App',
    'Courier Dispatch',
    'Interstate Freight',
    'Track Parcel',
    'Download Percel APK',
  ],
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'Percel - Fast Mobile Delivery Platform',
    description:
      'Direct APK download & live order tracking. Instant intra-state dispatch & interstate freight.',
    url: 'https://percel.app',
    siteName: 'Percel Logistics',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'Percel Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Percel - Logistics App',
    description: 'Download Percel APK & track deliveries live in real time.',
    images: ['/logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <ThemeProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
