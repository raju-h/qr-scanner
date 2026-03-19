/** Root layout — sets up HTML document, viewport meta for mobile, and global error boundary. */
import type { Metadata, Viewport } from "next";
import { ErrorBoundary } from "@/components/error-boundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "QR Scanner",
  description: "Scan QR codes and barcodes from your browser camera",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "QR Scanner",
  },
};

/** Viewport config for mobile — camera apps need the full screen. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#030712",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    // suppressHydrationWarning on both html and body prevents React 19 from
    // flagging attributes injected by browser extensions (e.g. LanguageTool's
    // data-lt-installed, Grammarly's data-gr-* attributes). These attributes
    // are added after SSR and before hydration, causing a harmless mismatch.
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-950 text-white antialiased" suppressHydrationWarning>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
