import { Toaster } from '@client/components/ui/toaster';
import type { Metadata, Viewport } from 'next';
import { Lato, Ubuntu } from 'next/font/google';
import { headers } from 'next/headers';
import Script from 'next/script';
import { Suspense } from 'react';

import '@client/styles/globals.css';
import '@client/styles/editor.css';

import { DevToolsInit } from '@client/components/dev-tools-init';
import { SidebarProvider } from '@client/providers/side-bar';
import { ThemeProvider } from '@client/providers/theme';
import type { NextFontWithVariable } from 'next/dist/compiled/@next/font';
import { useId } from 'react';

const lato: NextFontWithVariable = Lato({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lato',
  preload: false,
  weight: ['100', '300', '400', '700', '900'],
});

const ubuntu: NextFontWithVariable = Ubuntu({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-ubuntu',
  preload: false,
  weight: ['500'],
});

export const metadata: Metadata = {
  title: 'Reactive Agents',
  description: 'AI management without existing knowledge',
};

export const viewport: Viewport = {
  height: 'device-height',
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
};

// MIGRATED: Wrapped layout content in Suspense for Cache Components compatibility
// The headers() call for CSP nonce makes this route dynamic
// Suspense boundary ensures proper rendering with Cache Components enabled
async function LayoutContent({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const nonceScriptId = useId();
  const nonce = (await headers()).get('X-Nonce');

  return (
    <>
      <Script
        strategy="afterInteractive"
        id={nonceScriptId}
        nonce={nonce ?? undefined}
      >
        {`__webpack_nonce__ = ${JSON.stringify(nonce)}`}
      </Script>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <DevToolsInit />
        <SidebarProvider>{children}</SidebarProvider>
        <Toaster />
      </ThemeProvider>
    </>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html
      lang="en"
      className={`${lato.variable} ${ubuntu.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="flex flex-col overflow-hidden overscroll-none w-screen h-screen">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-screen">
              <div className="text-center">
                <p className="text-lg">Loading...</p>
              </div>
            </div>
          }
        >
          <LayoutContent>{children}</LayoutContent>
        </Suspense>
      </body>
    </html>
  );
}
