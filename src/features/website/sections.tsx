import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
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

const DateTile = ({ iso, timeZone }: { iso: string; timeZone: string }) => {
  const when = new Date(iso);
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-IN", { ...options, timeZone }).format(when);
  return (
    <span className="vw-site-date" aria-hidden="true">
      <b>{part({ day: "numeric" })}</b>
      <span>{part({ month: "short" })}</span>
    </span>
  );
};

export async function NoticeList({
  notices,
  slug,
}: {
  notices: { id: string; title: string; excerpt: string; date: string }[];
  slug: string;
}) {
  const base = siteBase(slug);
  return (
    <ul className="vw-site-list">
      {notices.map((notice) => (
        <li key={notice.id} className="vw-site-dated">
          <DateTile iso={notice.date} timeZone="Asia/Kolkata" />
          <div>
            <h3 className="vw-site-item-title">
              <a href={`${base}/news/${notice.id}`}>{notice.title}</a>
            </h3>
            <time dateTime={notice.date}>
              {date.format(new Date(notice.date))}
            </time>
            <p className="vw-site-prose">{notice.excerpt}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

const Cards = ({
  items,
  kind,
}: {
  items: { title: string; text: string }[];
  kind: "rows" | "tiles";
}) => (
  <ul className={`vw-site-${kind}`}>
    {items.map((item) => (
      <li key={item.title}>
        <h3>{item.title}</h3>
        {item.text && <p>{item.text}</p>}
      </li>
    ))}
  </ul>
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
        <div
          className={`vw-site-about${picture ? " vw-site-about--photo" : ""}`}
        >
          <p className="vw-site-prose vw-site-lead">{site.about}</p>
          {picture && (
            <figure>
              <Image
                src={photo(picture.id)}
                alt={picture.caption}
                width={640}
                height={800}
                sizes="(max-width: 832px) 100vw, 40vw"
                unoptimized={unoptimized}
              />
            </figure>
          )}
        </div>
      );
    }
    case "programmes":
      return <Cards items={site.programmes} kind="rows" />;
    case "facilities":
      return <Cards items={site.facilities} kind="tiles" />;
    case "notices":
      return <NoticeList notices={site.notices} slug={site.slug} />;
    case "events":
      return (
        <ul className="vw-site-list">
          {site.events.map((event) => (
            <li key={event.id} className="vw-site-dated">
              <DateTile iso={event.start} timeZone="UTC" />
              <div>
                <h3 className="vw-site-item-title">{event.title}</h3>
                <p>
                  <time dateTime={event.start}>
                    {day.format(new Date(event.start))}
                  </time>
                  {event.end !== event.start && (
                    <>
                      {" – "}
                      <time dateTime={event.end}>
                        {day.format(new Date(event.end))}
                      </time>
                    </>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      );
    case "staff":
      return (
        <ul className="vw-site-people">
          {site.staff.map((member) => (
            <li key={member.id}>
              <div className="vw-site-portrait">
                {member.hasPhoto ? (
                  <Image
                    src={photo(`staff-${member.id}`)}
                    alt=""
                    width={320}
                    height={400}
                    sizes="(max-width: 640px) 50vw, 20vw"
                    unoptimized={unoptimized}
                  />
                ) : (
                  <span aria-hidden="true">{initials(member.name)}</span>
                )}
              </div>
              <h3>{member.name}</h3>
              <p>{member.designation}</p>
            </li>
          ))}
        </ul>
      );
    case "testimonials":
      return (
        <ul className="vw-site-quotes">
          {site.testimonials.map((item) => (
            <li key={`${item.by}-${item.quote.slice(0, 20)}`}>
              <figure className="vw-site-quote">
                <blockquote>{item.quote}</blockquote>
                <figcaption>{item.by}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
      );
    case "gallery":
      return (
        <ul className="vw-site-photos">
          {site.gallery.map((item) => (
            <li key={item.id}>
              <figure>
                <Image
                  src={photo(item.id)}
                  alt={item.caption || t("gallery.photo")}
                  width={640}
                  height={480}
                  sizes="(max-width: 832px) 50vw, 25vw"
                  unoptimized={unoptimized}
                />
                {item.caption && <figcaption>{item.caption}</figcaption>}
              </figure>
            </li>
          ))}
        </ul>
      );
    case "downloads":
      return (
        <ul className="vw-site-files">
          {site.downloads.map((item) => (
            <li key={item.id}>
              <span className="vw-site-pdf" aria-hidden="true">
                PDF
              </span>
              <a href={photo(`dl-${item.id}`)} download>
                {item.title}
              </a>
              <span>{t("downloads.meta", { size: size(item.size) })}</span>
            </li>
          ))}
        </ul>
      );
    case "contact":
      return (
        <div className="vw-site-split">
          <dl className="vw-site-contact">
            <div>
              <dt>{t("contact.address")}</dt>
              <dd>{site.address}</dd>
            </div>
            {site.phone && (
              <div>
                <dt>{t("contact.phone")}</dt>
                <dd>
                  <a href={`tel:${site.phone}`}>{site.phone}</a>
                </dd>
              </div>
            )}
            {site.email && (
              <div>
                <dt>{t("contact.email")}</dt>
                <dd>
                  <a href={`mailto:${site.email}`}>{site.email}</a>
                </dd>
              </div>
            )}
          </dl>
          <div>
            <a
              className="vw-site-cta"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${site.name}, ${site.address}`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("contact.map")}
            </a>
          </div>
        </div>
      );
  }
}
