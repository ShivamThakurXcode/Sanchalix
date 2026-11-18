import { getTranslations } from "next-intl/server";
import type { PublicSite } from "@/server/modules/website/public";
import { siteBase } from "@/server/modules/website/slug";

/** The band that opens every page but the home page: where you are, and the page's title. */
export async function PageHead({
  site,
  title,
  parent,
}: {
  site: PublicSite;
  title: string;
  parent?: { href: string; text: string };
}) {
  const t = await getTranslations("site");
  return (
    <div className="vw-site-pagehead">
      <div className="vw-site-wrap">
        <nav aria-label={t("breadcrumb")}>
          <ol>
            <li>
              <a href={siteBase(site.slug) || "/"}>{t("nav.homeShort")}</a>
            </li>
            {parent && (
              <li>
                <a href={parent.href}>{parent.text}</a>
              </li>
            )}
            <li aria-current="page">{title}</li>
          </ol>
        </nav>
        <h1>{title}</h1>
      </div>
    </div>
  );
}
