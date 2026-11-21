import { notFound } from "next/navigation";
import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { notFoundOrMoved } from "@/features/website/moved";
import { ApplyForm } from "@/features/website/ApplyForm";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { SitePage } from "@/features/website/SitePage";
import { recordVisit } from "@/server/modules/website/analytics";
import {
  getPublicSite,
  getApplyClasses,
} from "@/server/modules/website/public";
import { siteBase } from "@/server/modules/website/slug";

export async function generateMetadata() {
  const t = await getTranslations("site.apply");
  return { title: t("title") };
}

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [site, classes, t] = await Promise.all([
    getPublicSite(slug),
    getApplyClasses(slug),
    getTranslations("site"),
  ]);
  if (!site && !classes) return notFoundOrMoved(slug, "/apply");
  if (!site || !classes) notFound();
  after(() => recordVisit(slug, "apply"));
  return (
    <SitePage site={site} title={t("apply.title")}>
      <SpaceBetween size="l">
        <Box variant="p">{t("apply.intro")}</Box>
        <ApplyForm slug={slug} classes={classes} />
      </SpaceBetween>
    </SitePage>
  );
}
