import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Цагийн Залбирал | Католик Шашны Өдөр Тутмын Залбирал",
  description:
    "Монгол дахь Католик итгэгчдэд зориулсан цагийн залбирлын апп",
  openGraph: {
    title: "Цагийн Залбирал",
    description:
      "Монгол дахь Католик итгэгчдэд зориулсан цагийн залбирлын апп",
    locale: "mn_MN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn">
      <body className={notoSans.className}>
        <div className="flex min-h-screen flex-col bg-stone-50 text-stone-800">
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
