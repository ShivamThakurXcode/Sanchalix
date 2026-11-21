import Container from "@cloudscape-design/components/container";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { notFoundOrMoved } from "@/features/website/moved";
import { SitePage } from "@/features/website/SitePage";
import { getContext } from "@/server/auth/context";
import { can } from "@/server/auth/permissions";
import { recordVisit } from "@/server/modules/website/analytics";
import { getPublicPage, getPublicSite } from "@/server/modules/website/public";

async function load(params: Promise<{ slug: string; page: string }>) {
  const [{ slug, page }, ctx] = await Promise.all([params, getContext()]);
  const preview =
    ctx && can(ctx.role, "website.manage") ? ctx.schoolId : undefined;
  const [site, content] = await Promise.all([
    getPublicSite(slug, preview),
    getPublicPage(slug, page, preview),
  ]);
  return { site, content };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; page: string }>;
}) {
  const { site, content } = await load(params);
  return site && content
    ? {
        title: `${content.title} · ${site.name}`,
        description: content.body.slice(0, 160),
        robots: { index: !site.preview },
      }
    : {};
}

export default async function CustomPage({
  params,
}: {
  params: Promise<{ slug: string; page: string }>;
}) {
  const { site, content } = await load(params);
  if (!site && !content)
    return notFoundOrMoved((await params).slug, `/p/${(await params).page}`);
  if (!site || !content) notFound();
  if (!site.preview) after(() => recordVisit(site.slug, "page"));
  return (
    <SitePage site={site} title={content.title}>
      <Container>
        <div className="vw-site-prose">{content.body}</div>
      </Container>
    </SitePage>
  );
}
