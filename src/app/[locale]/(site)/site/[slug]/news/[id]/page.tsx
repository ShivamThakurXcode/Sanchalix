import { notFound } from "next/navigation";
import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { notFoundOrMoved } from "@/features/website/moved";
import { PageHead } from "@/features/website/PageHead";
import { SiteFrame } from "@/features/website/SiteFrame";
import { getContext } from "@/server/auth/context";
import { can } from "@/server/auth/permissions";
import { recordVisit } from "@/server/modules/website/analytics";
import {
  getPublicNotice,
  getPublicSite,
} from "@/server/modules/website/public";
import { siteBase } from "@/server/modules/website/slug";

const date = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "long",
  timeZone: "Asia/Kolkata",
});

async function load(params: Promise<{ slug: string; id: string }>) {
  const [{ slug, id }, ctx] = await Promise.all([params, getContext()]);
  const preview =
    ctx && can(ctx.role, "website.manage") ? ctx.schoolId : undefined;
  const [site, notice] = await Promise.all([
    getPublicSite(slug, preview),
    getPublicNotice(slug, id, preview),
  ]);
  return { slug, id, site, notice };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { site, notice } = await load(params);
  return site && notice
    ? {
        title: `${notice.title} · ${site.name}`,
        description: notice.body.slice(0, 160),
        robots: { index: !site.preview },
      }
    : {};
}

export default async function NoticePage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const [{ slug, id, site, notice }, t] = await Promise.all([
    load(params),
    getTranslations("site"),
  ]);
  if (!site && !notice) return notFoundOrMoved(slug, `/news/${id}`);
  if (!site || !notice) notFound();
  if (!site.preview) after(() => recordVisit(slug, "news"));
  const base = siteBase(slug);
  return (
    <SiteFrame site={site} current="notices">
      <PageHead
        site={site}
        title={notice.title}
        parent={{ href: `${base}/news`, text: t("notices.all") }}
      />
      <article className="vw-site-section">
        <time dateTime={notice.date}>{date.format(new Date(notice.date))}</time>
        <p className="vw-site-prose">{notice.body}</p>
      </article>
    </SiteFrame>
  );
}
