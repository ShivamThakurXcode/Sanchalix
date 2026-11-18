import type { SectionKey } from "./palette";
import type { PublicSite } from "./public";

/** Each section is a page of its own. Notices live at /news, where every notice has its own page too. */
export const SECTION_PATH: Record<SectionKey, string> = {
  about: "about",
  programmes: "programmes",
  facilities: "facilities",
  notices: "news",
  events: "events",
  staff: "teachers",
  testimonials: "testimonials",
  gallery: "gallery",
  downloads: "downloads",
  contact: "contact",
};

const has = (site: PublicSite, key: SectionKey) => {
  switch (key) {
    case "about":
      return Boolean(site.about);
    case "contact":
      return true;
    default:
      return site[key].length > 0;
  }
};

/** The sections a visitor can open: switched on by the school and with something to show. */
export const visibleSections = (site: PublicSite) =>
  site.order.filter((key) => site.sections[key] && has(site, key));

export const sectionOfPath = (path: string) =>
  (Object.keys(SECTION_PATH) as SectionKey[]).find(
    (key) => SECTION_PATH[key] === path,
  );
