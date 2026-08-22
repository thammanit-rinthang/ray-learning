import type { Metadata, Viewport } from "next";
import { getCurrentUser } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ray Learning — ศูนย์การเรียนรู้และวิเคราะห์รายงาน",
  description: "พื้นที่อ่านบทเรียน ฝึกทำข้อสอบ และถาม AI จากเนื้อหารายงานของคุณ",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="th">
      <body>
        <div className="app-container">
          <Navbar user={user} />
          <main className="shell">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
