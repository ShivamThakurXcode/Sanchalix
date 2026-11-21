import Box from "@cloudscape-design/components/box";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { notFoundOrMoved } from "@/features/website/moved";
import { NoticeList } from "@/features/website/sections";
import { SitePage } from "@/features/website/SitePage";
import { getContext } from "@/server/auth/context";
import { can } from "@/server/auth/permissions";
import { recordVisit } from "@/server/modules/website/analytics";
import {
  getPublicNotices,
  getPublicSite,
} from "@/server/modules/website/public";
import { siteBase } from "@/server/modules/website/slug";

const date = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});

export async function generateMetadata() {
  const t = await getTranslations("site.notices");
  return { title: t("all") };
}

export default async function NewsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, ctx, t] = await Promise.all([
    params,
    getContext(),
    getTranslations("site"),
  ]);
  const preview =
    ctx && can(ctx.role, "website.manage") ? ctx.schoolId : undefined;
  const [site, notices] = await Promise.all([
    getPublicSite(slug, preview),
    getPublicNotices(slug, preview),
  ]);
  if (!site || !notices) return notFoundOrMoved(slug, "/news");
  if (!site.preview) after(() => recordVisit(slug, "news"));
  const base = siteBase(slug);
  return (
    <SitePage site={site} title={t("notices.all")}>
      {notices.length === 0 ? (
        <Box color="text-body-secondary">{t("notices.none")}</Box>
      ) : (
        <NoticeList notices={notices} slug={slug} />
      )}
    </SitePage>
  );
}
