// The order they appear in until a school moves them.
export const SECTION_KEYS = [
  "about",
  "programmes",
  "facilities",
  "notices",
  "events",
  "staff",
  "testimonials",
  "gallery",
  "downloads",
  "contact",
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

/** The school's saved order, then any section it doesn't mention in the default order. */
export const orderSections = (saved: readonly string[] | undefined) => {
  const known = [
    ...new Set(
      (saved ?? []).filter((key): key is SectionKey =>
        (SECTION_KEYS as readonly string[]).includes(key),
      ),
    ),
  ];
  return [...known, ...SECTION_KEYS.filter((key) => !known.includes(key))];
};

export const MAX_PAGES = 5;
