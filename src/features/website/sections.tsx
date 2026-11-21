import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { svg } from "@/components/icons";
import type { SectionKey } from "@/server/modules/website/palette";
import type { PublicSite } from "@/server/modules/website/public";
import { siteBase } from "@/server/modules/website/slug";

export const date = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});
const day = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "UTC",
});
const size = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((word) => /^\p{L}/u.test(word))
    .slice(-2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

export function NoticeList({
  notices,
  slug,
}: {
  notices: { id: string; title: string; excerpt: string; date: string }[];
  slug: string;
}) {
  const base = siteBase(slug);
  return (
    <SpaceBetween size="m">
      {notices.map((notice) => (
        <Container
          key={notice.id}
          header={
            <Header
              variant="h3"
              description={date.format(new Date(notice.date))}
            >
              <Link
                fontSize="heading-m"
                href={`${base}/news/${notice.id}`}
                variant="primary"
              >
                {notice.title}
              </Link>
            </Header>
          }
        >
          <div className="vw-site-prose">{notice.excerpt}</div>
        </Container>
      ))}
    </SpaceBetween>
  );
}

const Cards = ({ items }: { items: { title: string; text: string }[] }) => (
  <ColumnLayout columns={3} minColumnWidth={240}>
    {items.map((item) => (
      <Container
        key={item.title}
        fitHeight
        header={<Header variant="h3">{item.title}</Header>}
      >
        {item.text && <Box color="text-body-secondary">{item.text}</Box>}
      </Container>
    ))}
  </ColumnLayout>
);

/** What one section shows. Its own page gives it in full; the home page gives it a few items of the same site. */
export async function SectionBody({
  site,
  name,
}: {
  site: PublicSite;
  name: SectionKey;
}): Promise<ReactNode> {
  const t = await getTranslations("site");
  const photo = (id: string) => `/api/site/${site.slug}/${id}`;
  // The optimizer fetches with no session, so a draft's photos can only be shown as they are.
  const unoptimized = site.preview;

  switch (name) {
    case "about": {
      // The gallery's first photograph is the hero, so the second sits beside the words.
      const picture = site.gallery[1];
      return (
        <Container
          {...(picture && {
            media: {
              position: "side" as const,
              width: "40%",
              content: (
                <Image
                  className="vw-site-cover"
                  src={photo(picture.id)}
                  alt={picture.caption}
                  width={640}
                  height={480}
                  sizes="(max-width: 900px) 100vw, 40vw"
                  unoptimized={unoptimized}
                />
              ),
            },
          })}
        >
          <div className="vw-site-prose">
            <Box fontSize="heading-s" variant="p">
              {site.about}
            </Box>
          </div>
        </Container>
      );
    }
    case "programmes":
      return <Cards items={site.programmes} />;
    case "facilities":
      return <Cards items={site.facilities} />;
    case "notices":
      return <NoticeList notices={site.notices} slug={site.slug} />;
    case "events":
      return (
        <ColumnLayout columns={3} minColumnWidth={240}>
          {site.events.map((event) => (
            <Container
              key={event.id}
              fitHeight
              header={
                <Header
                  variant="h3"
                  description={
                    event.end !== event.start
                      ? `${day.format(new Date(event.start))} – ${day.format(new Date(event.end))}`
                      : day.format(new Date(event.start))
                  }
                >
                  {event.title}
                </Header>
              }
            />
          ))}
        </ColumnLayout>
      );
    case "staff":
      return (
        <ColumnLayout columns={4} minColumnWidth={200}>
          {site.staff.map((member) => (
            <Container
              key={member.id}
              fitHeight
              media={{
                position: "top",
                height: 220,
                content: member.hasPhoto ? (
                  <Image
                    className="vw-site-cover"
                    src={photo(`staff-${member.id}`)}
                    alt=""
                    width={320}
                    height={220}
                    sizes="(max-width: 900px) 50vw, 20vw"
                    unoptimized={unoptimized}
                  />
                ) : (
                  <div className="vw-site-initials" aria-hidden="true">
                    {initials(member.name)}
                  </div>
                ),
              }}
            >
              <Box variant="h3">{member.name}</Box>
              <Box color="text-body-secondary">{member.designation}</Box>
            </Container>
          ))}
        </ColumnLayout>
      );
    case "testimonials":
      return (
        <ColumnLayout columns={2} minColumnWidth={300}>
          {site.testimonials.map((item) => (
            <Container key={`${item.by}-${item.quote.slice(0, 20)}`} fitHeight>
              <figure className="vw-site-quote">
                <blockquote>
                  <Box fontSize="heading-m">{item.quote}</Box>
                </blockquote>
                <figcaption>
                  <Box color="text-body-secondary" fontWeight="bold">
                    {item.by}
                  </Box>
                </figcaption>
              </figure>
            </Container>
          ))}
        </ColumnLayout>
      );
    case "gallery":
      return (
        <ColumnLayout columns={3} minColumnWidth={240}>
          {site.gallery.map((item) => (
            <Container
              key={item.id}
              fitHeight
              media={{
                position: "top",
                height: 200,
                content: (
                  <Image
                    className="vw-site-cover"
                    src={photo(item.id)}
                    alt={item.caption || t("gallery.photo")}
                    width={640}
                    height={400}
                    sizes="(max-width: 900px) 100vw, 33vw"
                    unoptimized={unoptimized}
                  />
                ),
              }}
            >
              {item.caption && (
                <Box color="text-body-secondary">{item.caption}</Box>
              )}
            </Container>
          ))}
        </ColumnLayout>
      );
    case "downloads":
      return (
        <SpaceBetween size="m">
          {site.downloads.map((item) => (
            <Container
              key={item.id}
              header={
                <Header
                  variant="h3"
                  description={t("downloads.meta", { size: size(item.size) })}
                  actions={
                    <Button
                      href={photo(`dl-${item.id}`)}
                      download
                      iconSvg={svg("download")}
                      ariaLabel={t("downloads.label", { title: item.title })}
                    >
                      {t("downloads.get")}
                    </Button>
                  }
                >
                  {item.title}
                </Header>
              }
            />
          ))}
        </SpaceBetween>
      );
    case "contact":
      return (
        <Container
          header={
            <Header
              variant="h2"
              actions={
                <Button
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${site.name}, ${site.address}`)}`}
                  target="_blank"
                  iconSvg={svg("external")}
                  iconAlign="right"
                >
                  {t("contact.map")}
                </Button>
              }
            >
              {site.name}
            </Header>
          }
        >
          <ColumnLayout columns={3} variant="text-grid" minColumnWidth={220}>
            <div>
              <Box variant="awsui-key-label">{t("contact.address")}</Box>
              <div>{site.address}</div>
            </div>
            {site.phone && (
              <div>
                <Box variant="awsui-key-label">{t("contact.phone")}</Box>
                <Link href={`tel:${site.phone}`}>{site.phone}</Link>
              </div>
            )}
            {site.email && (
              <div>
                <Box variant="awsui-key-label">{t("contact.email")}</Box>
                <Link href={`mailto:${site.email}`}>{site.email}</Link>
              </div>
            )}
          </ColumnLayout>
        </Container>
      );
  }
}
