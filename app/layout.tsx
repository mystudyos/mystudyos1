import type { Metadata, Viewport } from 'next'
import { DM_Sans, Paytone_One } from 'next/font/google'
import './globals.css'
import { Analytics } from '@vercel/analytics/next';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

const paytoneOne = Paytone_One({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-paytone',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://studyos1.online'),
  title: 'StudyOS - Modern Study Hub & Exam Prep for Student',
  description: 'Your premium responsive workspace for EXAM PREP. Practice anytime, anywhere.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'StudyOS - Modern Study Hub & Exam Prep for Student',
    description: 'Your premium responsive workspace for EXAM PREP. Practice anytime, anywhere.',
    url: 'https://studyos1.online',
    siteName: 'StudyOS',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'StudyOS - Modern Study Hub & Exam Prep for Student',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StudyOS - Modern Study Hub & Exam Prep for Student',
    description: 'Your premium responsive workspace for EXAM PREP. Practice anytime, anywhere.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192-removebg-preview.png',
    shortcut: '/icon-192-removebg-preview.png',
    apple: '/icon-192-removebg-preview.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'StudyOS',
  },
}

export const viewport: Viewport = {
  themeColor: '#f8fafc',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  interactiveWidget: 'resizes-content',
}

import { ThemeProvider } from '@/components/theme-provider'
import { PWARegistration } from '@/components/pwa-registration'
import { ToastProvider } from '@/components/toast-provider'
import Script from 'next/script'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${paytoneOne.variable} bg-background`} suppressHydrationWarning>
      <head>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-2NMQ5CW6G6" strategy="lazyOnload" />
        <Script id="google-analytics" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-2NMQ5CW6G6');
          `}
        </Script>
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <PWARegistration />
          {children}
          <ToastProvider />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
