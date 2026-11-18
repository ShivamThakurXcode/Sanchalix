import { notFound } from "next/navigation";
import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { notFoundOrMoved } from "@/features/website/moved";
import { PageHead } from "@/features/website/PageHead";
import { SectionBody } from "@/features/website/sections";
import { SiteFrame } from "@/features/website/SiteFrame";
import { getContext } from "@/server/auth/context";
import { can } from "@/server/auth/permissions";
import { recordVisit } from "@/server/modules/website/analytics";
import {
  sectionOfPath,
  visibleSections,
} from "@/server/modules/website/nav";
import { getPublicSite } from "@/server/modules/website/public";

async function load(params: Promise<{ slug: string; section: string }>) {
  const [{ slug, section }, ctx] = await Promise.all([params, getContext()]);
  const site = await getPublicSite(
    slug,
    ctx && can(ctx.role, "website.manage") ? ctx.schoolId : undefined,
  );
  const key = sectionOfPath(section);
  return { slug, section, site, key };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; section: string }>;
}) {
  const [{ site, key }, t] = await Promise.all([
    load(params),
    getTranslations("site"),
  ]);
  return site && key
    ? {
        title: `${t(`${key}.title`)} · ${site.name}`,
        robots: { index: !site.preview },
      }
    : {};
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ slug: string; section: string }>;
}) {
  const [{ slug, section, site, key }, t] = await Promise.all([
    load(params),
    getTranslations("site"),
  ]);
  if (!site) return notFoundOrMoved(slug, `/${section}`);
  if (!key || !visibleSections(site).includes(key)) notFound();
  if (!site.preview) after(() => recordVisit(slug, "page"));
  return (
    <SiteFrame site={site} current={key}>
      <PageHead site={site} title={t(`${key}.title`)} />
      <section className="vw-site-section">
        <SectionBody site={site} name={key} />
      </section>
    </SiteFrame>
  );
}
