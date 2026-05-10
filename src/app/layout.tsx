import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "~/styles/globals.css";
import { TRPCReactProvider } from "~/trpc/react";
import { Header } from "~/components/layout/header";

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
      <body className="font-sans">
        <TRPCReactProvider>
          <div className="min-h-screen bg-[#0A1929] text-white">
            <Header />
            <main className="p-6">{children}</main>
          </div>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
