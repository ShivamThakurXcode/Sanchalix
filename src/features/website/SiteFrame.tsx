import Box from "@cloudscape-design/components/box";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { env } from "@/lib/env";
import { MODE_COOKIE, parseVisualMode } from "@/lib/visualMode";
import { SECTION_PATH, visibleSections } from "@/server/modules/website/nav";
import type { PublicSite } from "@/server/modules/website/public";
import { siteBase } from "@/server/modules/website/slug";
import { SiteHeader } from "./SiteHeader";

/** What every page of a school's website shares: the preview notice, header and footer. */
export async function SiteFrame({
  site,
  children,
}: {
  site: PublicSite;
  children: ReactNode;
}) {
  const [t, jar] = await Promise.all([getTranslations("site"), cookies()]);
  const base = siteBase(site.slug);
  const home = base || "/";
  const links = [
    { id: "home", href: home, text: t("nav.homeShort") },
    ...visibleSections(site).map((key) => ({
      id: key,
      href: `${base}/${SECTION_PATH[key]}`,
      text: t(`nav.${key}`),
    })),
    ...site.pages.map((page) => ({
      id: `page:${page.slug}`,
      href: `${base}/p/${page.slug}`,
      text: page.title,
    })),
  ];
  const apply = site.admissionsOpen
    ? { id: "apply", href: `${base}/apply`, text: t("nav.apply") }
    : null;

  return (
    <>
      {site.preview && (
        <p className="vw-site-preview" role="status">
          {t("preview")}
        </p>
      )}
      <SiteHeader
        name={site.name}
        logo={site.hasLogo ? `/api/site/${site.slug}/logo` : null}
        home={home}
        links={links}
        apply={apply}
        signIn={{
          id: "signin",
          href: `${env.APP_URL}/signin`,
          text: t("nav.signIn"),
        }}
        visualMode={parseVisualMode(jar.get(MODE_COOKIE)?.value)}
      />
      <main id="main">{children}</main>
      <footer className="vw-public-footer awsui-context-top-navigation">
        <Box padding={{ vertical: "xxl", horizontal: "xl" }}>
          <SpaceBetween size="xl">
            <div className="vw-public-footer-grid">
              <div className="vw-public-footer-brand">
                <SpaceBetween size="s">
                  <Box fontWeight="bold" fontSize="heading-m">
                    {site.name}
                  </Box>
                  <Box color="text-body-secondary">{site.address}</Box>
                  <Box color="text-body-secondary">
                    {t("meta", { board: site.board, city: site.city })}
                  </Box>
                </SpaceBetween>
              </div>
              <nav aria-label={t("footerLinks")}>
                <SpaceBetween size="m">
                  <Box fontWeight="bold" fontSize="heading-s">
                    {t("footerLinks")}
                  </Box>
                  <ColumnLayout columns={2} minColumnWidth={120}>
                    {links.map(({ id, href, text }) => (
                      <Link key={id} href={href} variant="secondary">
                        {text}
                      </Link>
                    ))}
                  </ColumnLayout>
                </SpaceBetween>
              </nav>
              <SpaceBetween size="m">
                <Box fontWeight="bold" fontSize="heading-s">
                  {t("contact.title")}
                </Box>
                {site.phone && (
                  <Link href={`tel:${site.phone}`} variant="secondary">
                    {site.phone}
                  </Link>
                )}
                {site.email && (
                  <Link href={`mailto:${site.email}`} variant="secondary">
                    {site.email}
                  </Link>
                )}
              </SpaceBetween>
            </div>
            <div className="vw-public-footer-legal">
              <Box color="text-body-secondary" fontSize="body-s">
                {t("footer", {
                  name: site.name,
                  year: new Date().getFullYear(),
                })}
              </Box>
              <Box color="text-body-secondary" fontSize="body-s">
                {t("credit")}
              </Box>
            </div>
          </SpaceBetween>
        </Box>
      </footer>
    </>
  );
}
