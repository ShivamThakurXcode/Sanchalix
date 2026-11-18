import {
  SECTION_PATH,
  visibleSections,
} from "@/server/modules/website/nav";
import { getPublicSite } from "@/server/modules/website/public";
import { siteUrl } from "@/server/modules/website/service";

// Open to anyone: search engines ask for these on each school's own address, and they say only which pages exist.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; kind: string }> },
) {
  const { slug, kind } = await params;
  const summary = await getPublicSite(slug);
  // On a school's own address the visitor's host is the site's address; in development it is the path form.
  const host = request.headers.get("host");
  const origin =
    process.env.SITE_ROOT_DOMAIN && host
      ? `https://${host}`
      : new URL(siteUrl(slug), request.url).href.replace(/\/$/, "");
  if (kind === "robots") {
    const body = summary
      ? `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`
      : "User-agent: *\nDisallow: /\n";
    return new Response(body, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  if (kind !== "sitemap" || !summary)
    return new Response(null, { status: 404 });
  const pages = [
    "",
    ...visibleSections(summary).map((key) => `/${SECTION_PATH[key]}`),
    ...(summary.admissionsOpen ? ["/apply"] : []),
    ...summary.pages.map((page) => `/p/${page.slug}`),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((page) => `<url><loc>${origin}${page}</loc></url>`).join("\n")}\n</urlset>\n`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
