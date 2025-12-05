import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers"; // ⬅️ new
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]/route";
import type { Session } from "next-auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Friend",
  description: "A little AI buddy that remembers you",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // fetch the server session and pass to the client SessionProvider
  const session = (await getServerSession(authOptions as any)) as Session | null;

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* NextAuth session provider lives here (with server session) */}
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
