import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Daily Puzzle",
  description: "A daily word puzzle.",
};

// Inline pre-hydration script: sets the `dark` class on <html> before paint
// so theme-aware styles render correctly on the very first frame.
const themeScript = `try { if (localStorage.getItem('dp:theme') === 'dark') document.documentElement.classList.add('dark'); } catch (e) {}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
