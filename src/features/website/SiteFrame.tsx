import { Public_Sans, Source_Serif_4 } from "next/font/google";
import { getTranslations } from "next-intl/server";
import type { CSSProperties, ReactNode } from "react";
import { env } from "@/lib/env";
import { SECTION_PATH, visibleSections } from "@/server/modules/website/nav";
import type { PublicSite } from "@/server/modules/website/public";
import { siteBase } from "@/server/modules/website/slug";
import { SiteNav } from "./SiteNav";

const display = Source_Serif_4({
  subsets: ["latin"],
  variable: "--vw-site-display",
  display: "swap",
});
const body = Public_Sans({
  subsets: ["latin"],
  variable: "--vw-site-body",
  display: "swap",
});

/** What every page of a school's website shares: the skip link, preview notice, header and footer. */
export async function SiteFrame({
  site,
  current,
  children,
}: {
  site: PublicSite;
  current?: string;
  children: ReactNode;
}) {
  const t = await getTranslations("site");
  const base = siteBase(site.slug);
  const links = [
    { id: "home", href: base || "/", text: t("nav.homeShort") },
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
  return (
    <div
      className={`vw-site vw-site--${site.template} ${display.variable} ${body.variable}`}
      style={{ "--vw-site-primary": site.theme.primary } as CSSProperties}
    >
      <a className="vw-site-skip" href="#main">
        {t("skip")}
      </a>
      {site.preview && (
        <p className="vw-site-preview" role="status">
          {t("preview")}
        </p>
      )}
      <div className="vw-site-barwrap">
        <div className="vw-site-bar">
          <ul>
            {site.phone && (
              <li>
                <a href={`tel:${site.phone}`}>{site.phone}</a>
              </li>
            )}
            {site.email && (
              <li>
                <a href={`mailto:${site.email}`}>{site.email}</a>
              </li>
            )}
          </ul>
          <a href={`${env.APP_URL}/signin`}>{t("nav.signIn")}</a>
        </div>
      </div>
      <SiteNav
        label={t("nav.label")}
        menu={t("nav.menu")}
        brand={
          <p className="vw-site-brand">
            <a href={base || "/"} className="vw-site-home">
              {site.hasLogo && (
                <img
                  src={`/api/site/${site.slug}/logo`}
                  alt=""
                  width={48}
                  height={48}
                />
              )}
              {site.name}
            </a>
          </p>
        }
        actions={
          site.admissionsOpen && (
            <a className="vw-site-cta" href={`${base}/apply`}>
              {t("nav.apply")}
            </a>
          )
        }
      >
        <ul className="vw-site-nav">
          {links.map((link) => (
            <li key={link.id}>
              <a
                href={link.href}
                {...(link.id === current && {
                  "aria-current": "page" as const,
                })}
              >
                {link.text}
              </a>
            </li>
          ))}
        </ul>
      </SiteNav>
      <main id="main">{children}</main>
      <footer className="vw-site-footer">
        <div className="vw-site-footer-grid">
          <div>
            <h2>{site.name}</h2>
            <p>{site.address}</p>
            <p>{t("meta", { board: site.board, city: site.city })}</p>
          </div>
          <nav aria-label={t("footerLinks")}>
            <h2>{t("footerLinks")}</h2>
            <ul>
              {links.map((link) => (
                <li key={link.id}>
                  <a href={link.href}>{link.text}</a>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <h2>{t("contact.title")}</h2>
            <ul>
              {site.phone && (
                <li>
                  <a href={`tel:${site.phone}`}>{site.phone}</a>
                </li>
              )}
              {site.email && (
                <li>
                  <a href={`mailto:${site.email}`}>{site.email}</a>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="vw-site-footer-grid vw-site-legal">
          <p>
            {t("footer", { name: site.name, year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
    </div>
  );
}
