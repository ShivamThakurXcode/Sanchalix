// Each of these keeps white text at 4.5:1 or better, so a school can't pick a colour that makes the hero unreadable.
export const PALETTE = {
  blue: "#0b5cad",
  teal: "#0f766e",
  green: "#15803d",
  maroon: "#9f1239",
  purple: "#6d28d9",
  slate: "#334155",
} as const;

export type Colour = keyof typeof PALETTE;
export const COLOURS = Object.keys(PALETTE) as [Colour, ...Colour[]];
export const colourOf = (hex: string | undefined): Colour =>
  COLOURS.find((key) => PALETTE[key] === hex) ?? "blue";

export const TEMPLATES = ["classic", "modern", "minimal"] as const;
export type Template = (typeof TEMPLATES)[number];

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
