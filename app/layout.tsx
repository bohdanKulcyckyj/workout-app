import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { RepositoryProvider } from "@/lib/repositories";
import { MigrationRunner } from "@/components/migration-runner";
import { NavHeader } from "@/components/nav-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Workout App",
  description: "Manage workout plans and track exercises during sessions",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <RepositoryProvider>
          <MigrationRunner>
            <div className="mx-auto max-w-lg px-4 py-6">
              <NavHeader />
              {children}
            </div>
          </MigrationRunner>
        </RepositoryProvider>
      </body>
    </html>
  );
}
