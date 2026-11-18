import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { SECTION_PATH, visibleSections } from "@/server/modules/website/nav";
import type { PublicSite } from "@/server/modules/website/public";
import { siteBase } from "@/server/modules/website/slug";
import { SectionBody } from "./sections";
import { SiteFrame } from "./SiteFrame";

const ABOUT_CHARS = 420;
// How much of a section the home page shows before sending the visitor to its own page.
const TEASE = {
  programmes: 3,
  facilities: 4,
  notices: 3,
  events: 3,
  staff: 4,
  testimonials: 2,
  gallery: 5,
} as const;

const short = (text: string) =>
  text.length > ABOUT_CHARS
    ? `${text.slice(0, ABOUT_CHARS).replace(/\s+\S*$/, "")}…`
    : text;

/** The home page: the school at a glance, with a way into every page. */
export async function SchoolSite({ site }: { site: PublicSite }) {
  const t = await getTranslations("site");
  const base = siteBase(site.slug);
  const heroPhoto = site.gallery[0];
  // Downloads and contact have no teaser: the menu and the footer lead there.
  const teasers = visibleSections(site).filter(
    (key) => key !== "downloads" && key !== "contact",
  );
  const latest = site.sections.notices ? site.notices[0] : undefined;
  const tease = (key: (typeof teasers)[number]): PublicSite => ({
    ...site,
    about: short(site.about),
    ...(key in TEASE && {
      [key]: (site[key as keyof typeof TEASE] as unknown[]).slice(
        0,
        TEASE[key as keyof typeof TEASE],
      ),
    }),
  });
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "School",
    name: site.name,
    ...(site.phone && { telephone: site.phone }),
    ...(site.email && { email: site.email }),
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address,
      addressLocality: site.city,
    },
  }).replace(/</g, "\u003c");

  return (
    <SiteFrame site={site} current="home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <section className="vw-site-hero" aria-labelledby="site-title">
        <div className="vw-site-hero-body">
          <div>
            <h1 id="site-title">{site.hero.headline}</h1>
            {site.hero.subline && (
              <p className="vw-site-hero-sub">{site.hero.subline}</p>
            )}
            <div className="vw-site-actions">
              {site.admissionsOpen && (
                <a
                  className="vw-site-cta vw-site-cta--light"
                  href={`${base}/apply`}
                >
                  {t("nav.apply")}
                </a>
              )}
              <a
                className="vw-site-cta vw-site-cta--ghost"
                href={`${base}/${SECTION_PATH.contact}`}
              >
                {t("nav.contact")}
              </a>
            </div>
          </div>
          {heroPhoto && (
            <figure className="vw-site-hero-media">
              <Image
                src={`/api/site/${site.slug}/${heroPhoto.id}`}
                alt=""
                fill
                priority
                sizes="(min-width: 832px) 50vw, 100vw"
                unoptimized={site.preview}
              />
            </figure>
          )}
        </div>
      </section>
      <dl className="vw-site-facts">
        <div>
          <dt>{t("facts.board")}</dt>
          <dd>{site.board}</dd>
        </div>
        <div>
          <dt>{t("facts.city")}</dt>
          <dd>{site.city}</dd>
        </div>
        {site.phone && (
          <div>
            <dt>{t("facts.phone")}</dt>
            <dd>
              <a href={`tel:${site.phone}`}>{site.phone}</a>
            </dd>
          </div>
        )}
        {site.admissionsOpen && (
          <div>
            <dt>{t("facts.admissions")}</dt>
            <dd>{t("facts.open")}</dd>
          </div>
        )}
      </dl>
      {latest && (
        <div className="vw-site-latest">
          <p className="vw-site-wrap">
            <strong>{t("latest")}</strong>
            <a href={`${base}/news/${latest.id}`}>{latest.title}</a>
          </p>
        </div>
      )}
      {teasers.map((key, index) => (
        <div key={key} className={index % 2 ? "vw-site-band" : undefined}>
          <section className="vw-site-section" aria-labelledby={`${key}-title`}>
            <h2 id={`${key}-title`}>{t(`${key}.title`)}</h2>
            <SectionBody site={tease(key)} name={key} />
            <p>
              <a className="vw-site-more" href={`${base}/${SECTION_PATH[key]}`}>
                {t(`more.${key}`)}
              </a>
            </p>
          </section>
        </div>
      ))}
      {site.admissionsOpen && (
        <div className="vw-site-invite">
          <div className="vw-site-section">
            <h2>{t("invite")}</h2>
            <a
              className="vw-site-cta vw-site-cta--light"
              href={`${base}/apply`}
            >
              {t("nav.apply")}
            </a>
          </div>
        </div>
      )}
    </SiteFrame>
  );
}
