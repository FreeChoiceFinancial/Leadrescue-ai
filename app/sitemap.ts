import type { MetadataRoute } from "next";
import { BRAND_SITE_URL } from "@/lib/brand";

const PATHS = ["", "/pricing", "/compare", "/faq", "/demo", "/contact", "/signup", "/privacy", "/terms", "/sms-terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((path) => ({
    url: `${BRAND_SITE_URL}${path}`,
  }));
}
