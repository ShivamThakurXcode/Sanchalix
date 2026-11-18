import { expect, it } from "vitest";
import { SECTION_PATH, sectionOfPath, visibleSections } from "./nav";
import { SECTION_KEYS } from "./palette";
import type { PublicSite } from "./public";

const site = {
  about: "We teach.",
  order: [...SECTION_KEYS],
  sections: Object.fromEntries(SECTION_KEYS.map((key) => [key, true])),
  programmes: [{ title: "Middle school", text: "" }],
  facilities: [],
  notices: [],
  events: [],
  staff: [],
  testimonials: [],
  gallery: [],
  downloads: [],
} as unknown as PublicSite;

it("lists only the sections a visitor can open, in the school's order", () => {
  expect(visibleSections(site)).toEqual(["about", "programmes", "contact"]);
  expect(
    visibleSections({
      ...site,
      sections: { ...site.sections, programmes: false },
    }),
  ).toEqual(["about", "contact"]);
});

it("gives each section its own path and finds it again", () => {
  expect(new Set(Object.values(SECTION_PATH)).size).toBe(SECTION_KEYS.length);
  expect(sectionOfPath("teachers")).toBe("staff");
  expect(sectionOfPath("apply")).toBeUndefined();
});
