import "server-only";
import { Schema } from "mongoose";
import { SECTION_KEYS, TEMPLATES } from "@/server/modules/website/palette";
import { audit, defineTenantModel } from "./shared";

export const HEX_COLOUR = /^#[0-9a-f]{6}$/i;

const card = () => ({
  _id: false,
  title: { type: String, required: true, maxlength: 80 },
  text: { type: String, maxlength: 400, default: "" },
});

const schema = new Schema(
  {
    template: { type: String, enum: TEMPLATES, default: "classic" },
    theme: { primary: { type: String, match: HEX_COLOUR, default: "#0b5cad" } },
    hero: {
      headline: { type: String, maxlength: 120 },
      subline: { type: String, maxlength: 240 },
    },
    about: { type: String, maxlength: 3000 },
    sections: Object.fromEntries(
      SECTION_KEYS.map((key) => [key, { type: Boolean, default: true }]),
    ),
    sectionOrder: [{ type: String, enum: SECTION_KEYS }],
    programmes: [card()],
    facilities: [card()],
    testimonials: [
      {
        _id: false,
        quote: { type: String, required: true, maxlength: 300 },
        by: { type: String, required: true, maxlength: 80 },
      },
    ],
    // Plain text pages such as an admissions policy, reached from the header at /p/{slug}.
    pages: [
      {
        _id: false,
        slug: { type: String, required: true, match: /^[a-z0-9-]{2,30}$/ },
        title: { type: String, required: true, maxlength: 80 },
        body: { type: String, required: true, maxlength: 5000 },
      },
    ],
    // Pictures for the chosen teachers. Shown only for a teacher who is also in staffIds.
    staffPhotos: [
      {
        _id: false,
        staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
        storageKey: { type: String, required: true },
      },
    ],
    // The teachers the school chose to show; the public page reads only their name and designation.
    staffIds: [{ type: Schema.Types.ObjectId, ref: "Staff" }],
    admissionsOpen: { type: Boolean, default: false },
    // Classes taking applications on the website. Empty means every class of the current year.
    applyClassIds: [{ type: Schema.Types.ObjectId, ref: "Class" }],
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    ...audit,
  },
  { timestamps: true },
);

schema.index({ schoolId: 1 }, { unique: true });

export const Website = defineTenantModel("Website", schema, "websites");
