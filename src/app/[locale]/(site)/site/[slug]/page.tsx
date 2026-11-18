import { after } from "next/server";
import { notFoundOrMoved } from "@/features/website/moved";
import { SchoolSite } from "@/features/website/SchoolSite";
import { getContext } from "@/server/auth/context";
import { can } from "@/server/auth/permissions";
import { recordVisit } from "@/server/modules/website/analytics";
import { getPublicSite } from "@/server/modules/website/public";
import { siteOrigin } from "@/server/modules/website/service";

async function load(params: Promise<{ slug: string }>) {
  const [{ slug }, ctx] = await Promise.all([params, getContext()]);
  return getPublicSite(
    slug,
    ctx && can(ctx.role, "website.manage") ? ctx.schoolId : undefined,
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const site = await load(params);
  // The first photo, or the logo, for the preview a link shows when it is shared.
  const picture = site?.gallery[0]?.id ?? (site?.hasLogo ? "logo" : null);
  const image =
    site && picture
      ? `${siteOrigin(site.slug)}/api/site/${site.slug}/${picture}`
      : null;
  return site
    ? {
        title: site.name,
        description: site.hero.subline || site.about.slice(0, 160),
        robots: { index: !site.preview },
        openGraph: {
          title: site.name,
          description: site.hero.subline || site.about.slice(0, 160),
          type: "website",
          ...(image && { images: [image] }),
        },
        twitter: {
          card: image ? "summary_large_image" : "summary",
          title: site.name,
        },
      }
    : {};
}

export default async function SchoolSitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const site = await load(params);
  const { slug } = await params;
  if (!site) return notFoundOrMoved(slug);
  // Views of a draft by the school's own managers are not visits.
  if (!site.preview) after(() => recordVisit(slug, "home"));
  return <SchoolSite site={site} />;
}
