import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Rekapin",
  description:
    "Laporan keuangan otomatis untuk UMKM Indonesia — dari mutasi rekening ke laporan siap pakai.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Anti-flash: apply saved theme before React hydrates. Synchronous,
            in <head>, defaults to night. Must run before first paint. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('rekapin_theme');if(t!=='day'&&t!=='night'){t='night';}document.documentElement.setAttribute('data-theme',t);document.documentElement.style.colorScheme=t==='night'?'dark':'light';}catch(e){document.documentElement.setAttribute('data-theme','night');document.documentElement.style.colorScheme='dark';}})();`,
          }}
        />
      </head>
      <body className="min-h-full" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
