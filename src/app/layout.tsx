import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { APP_NAME } from "@/lib/config";
import { THEME_COLOR } from "@/styles/theme-color";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
  description: "Nền tảng quản lý học tập ERIPT",
};

export const viewport: Viewport = {
  themeColor: THEME_COLOR.light,
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}