import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ProtectedShell } from "@/components/ProtectedShell";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// No-flash theme script — runs synchronously before paint to set
// `light` / `dark` on <html> based on localStorage or system preference.
const themeScript = `
(() => {
  const k = "osm-theme";
  try {
    const s = window.localStorage.getItem(k);
    const t =
      s === "light" || s === "dark"
        ? s
        : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const r = document.documentElement;
    r.classList.remove("light", "dark");
    r.classList.add(t);
    r.dataset.theme = t;
  } catch {
    const r = document.documentElement;
    r.classList.add("dark");
    r.dataset.theme = "dark";
  }
})();
`;

export const metadata: Metadata = {
  title: "OpenSourceMate",
  description: "Opensource contribution made easier and seamless with AI assistance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <ThemeProvider>
          <ProtectedShell>{children}</ProtectedShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
