import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "~/styles/globals.css";
import { Header } from "~/components/layout/header";
import { Sidebar } from "~/components/layout/sidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata = {
  title: "AquaSense - Water Quality Monitor",
  description: "Digital twin water body monitoring system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrains.variable} ${spaceGrotesk.variable}`}
    >
      <body className="font-sans antialiased">
        <div className="min-h-screen text-white">
          <Header />
          <div className="flex">
            <Sidebar />
            <main className="relative flex-1 overflow-hidden p-4 sm:p-6 lg:p-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
