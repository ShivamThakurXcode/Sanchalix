import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Grid from "@cloudscape-design/components/grid";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
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
  facilities: 3,
  notices: 3,
  events: 3,
  staff: 4,
  testimonials: 2,
  gallery: 3,
} as const;
type Teased = keyof typeof TEASE;

const short = (text: string) =>
  text.length > ABOUT_CHARS
    ? `${text.slice(0, ABOUT_CHARS).replace(/\s+\S*$/, "")}…`
    : text;

const tease = (site: PublicSite, key: string): PublicSite =>
  key in TEASE
    ? { ...site, [key]: site[key as Teased].slice(0, TEASE[key as Teased]) }
    : { ...site, about: short(site.about) };

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
  }).replace(/</g, "\\u003c");

  return (
    <SiteFrame site={site}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <ContentLayout
        defaultPadding
        disableOverlap
        maxContentWidth={1040}
        headerVariant="high-contrast"
        header={
          <Box padding={{ vertical: "xxl" }}>
            <Grid
              gridDefinition={[
                { colspan: { default: 12, s: heroPhoto ? 7 : 12 } },
                ...(heroPhoto ? [{ colspan: { default: 12, s: 5 } }] : []),
              ]}
            >
              <SpaceBetween size="l">
                <Box variant="awsui-key-label" color="inherit">
                  {t("meta", { board: site.board, city: site.city })}
                </Box>
                <Box variant="h1" fontSize="display-l" fontWeight="bold">
                  {site.hero.headline}
                </Box>
                {site.hero.subline && (
                  <Box variant="p" fontSize="heading-m" color="inherit">
                    {site.hero.subline}
                  </Box>
                )}
                <SpaceBetween direction="horizontal" size="xs">
                  {site.admissionsOpen && (
                    <Button variant="primary" href={`${base}/apply`}>
                      {t("nav.apply")}
                    </Button>
                  )}
                  <Button href={`${base}/${SECTION_PATH.contact}`}>
                    {t("nav.contact")}
                  </Button>
                </SpaceBetween>
              </SpaceBetween>
              {heroPhoto && (
                <Image
                  className="vw-site-cover vw-site-hero-photo"
                  src={`/api/site/${site.slug}/${heroPhoto.id}`}
                  alt=""
                  width={640}
                  height={480}
                  priority
                  sizes="(max-width: 900px) 100vw, 40vw"
                  unoptimized={site.preview}
                />
              )}
            </Grid>
          </Box>
        }
      >
        <Box padding={{ vertical: "xl" }}>
          <SpaceBetween size="xxl">
            <Container>
              <ColumnLayout
                columns={4}
                variant="text-grid"
                minColumnWidth={160}
              >
                <div>
                  <Box variant="awsui-key-label">{t("facts.board")}</Box>
                  <div>{site.board}</div>
                </div>
                <div>
                  <Box variant="awsui-key-label">{t("facts.city")}</Box>
                  <div>{site.city}</div>
                </div>
                {site.phone && (
                  <div>
                    <Box variant="awsui-key-label">{t("facts.phone")}</Box>
                    <div>{site.phone}</div>
                  </div>
                )}
                {site.admissionsOpen && (
                  <div>
                    <Box variant="awsui-key-label">{t("facts.admissions")}</Box>
                    <div>{t("facts.open")}</div>
                  </div>
                )}
              </ColumnLayout>
            </Container>
            {latest && (
              <Alert
                type="info"
                header={t("latest")}
                action={
                  <Button href={`${base}/news/${latest.id}`}>
                    {t("readNotice")}
                  </Button>
                }
              >
                {latest.title}
              </Alert>
            )}
            {teasers.map((key) => (
              <section key={key} id={key} aria-labelledby={`${key}-title`}>
                <SpaceBetween size="l">
                  <Header
                    variant="h2"
                    actions={
                      <Button href={`${base}/${SECTION_PATH[key]}`}>
                        {t(`more.${key}`)}
                      </Button>
                    }
                  >
                    <span id={`${key}-title`}>{t(`${key}.title`)}</span>
                  </Header>
                  <SectionBody site={tease(site, key)} name={key} />
                </SpaceBetween>
              </section>
            ))}
            {site.admissionsOpen && (
              <Container>
                <SpaceBetween size="m" alignItems="center">
                  <Box variant="h2" textAlign="center">
                    {t("invite")}
                  </Box>
                  <Button variant="primary" href={`${base}/apply`}>
                    {t("nav.apply")}
                  </Button>
                </SpaceBetween>
              </Container>
            )}
          </SpaceBetween>
        </Box>
      </ContentLayout>
    </SiteFrame>
  );
}
