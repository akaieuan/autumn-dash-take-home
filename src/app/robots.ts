import type { MetadataRoute } from "next";

/** Crawlers may read the two screens; the design-system reference is a path for the team, not a page for search. */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: "/design-system" }] };
}
