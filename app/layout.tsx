import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { BRAND_SITE_URL } from "@/lib/brand";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const sans = Outfit({ subsets: ["latin"], variable: "--font-sans" });

const description =
  "Month-to-month missed-call recovery for US owner-operated HVAC companies. Text the caller, qualify the job, and book the appointment.";

export const metadata: Metadata = {
  metadataBase: new URL(BRAND_SITE_URL),
  title: {
    default: "LeadRescue AI — missed HVAC calls, booked",
    template: "%s · LeadRescue AI",
  },
  description,
  alternates: { canonical: "./" },
  openGraph: {
    type: "website",
    url: "./",
    siteName: "LeadRescue AI",
    title: "LeadRescue AI — missed HVAC calls, booked",
    description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
