import "server-only";
import { z } from "zod";
import { AppError } from "@/lib/appError";
import { env } from "@/lib/env";
import type { RequestContext } from "@/server/auth/context";
import { AcademicYear } from "@/server/models/academicYear";
import { Class } from "@/server/models/class";
import { School } from "@/server/models/school";
import { Staff } from "@/server/models/staff";
import { Website } from "@/server/models/website";
import { getVisitSummary, type VisitSummary } from "./analytics";
import { type DomainInfo, getDomainInfo } from "./domain";
import { listDownloads } from "./downloads";
import { listGallery } from "./gallery";
import {
  COLOURS,
  colourOf,
  MAX_PAGES,
  orderSections,
  PALETTE,
  SECTION_KEYS,
  type SectionKey,
  TEMPLATES,
} from "./palette";
import { isUsableSlug } from "./slug";

const E = "website.errors";
const Card = z.object({
  title: z.string().trim().min(1, `${E}.cardTitle`).max(80, `${E}.cardTitle`),
  text: z.string().trim().max(400, `${E}.cardText`),
});
const Quote = z.object({
  quote: z.string().trim().min(1, `${E}.quote`).max(300, `${E}.quote`),
  by: z.string().trim().min(1, `${E}.quoteBy`).max(80, `${E}.quoteBy`),
});
const Page = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,30}$/, `${E}.pageSlug`),
  title: z.string().trim().min(1, `${E}.pageTitle`).max(80, `${E}.pageTitle`),
  body: z.string().trim().min(1, `${E}.pageBody`).max(5000, `${E}.pageBody`),
});
const Optional = (schema: z.ZodType<string>) =>
  z.union([z.literal(""), schema]);

export const WebsiteInput = z.object({
  slug: z.string().trim().toLowerCase().refine(isUsableSlug, `${E}.slug`),
  template: z.enum(TEMPLATES),
  admissionsOpen: z.boolean(),
  applyClassIds: z
    .array(z.string().regex(/^[0-9a-f]{24}$/, `${E}.classes`))
    .max(40, `${E}.classes`),
  colour: z.enum(COLOURS),
  headline: z.string().trim().min(1, `${E}.headline`).max(120, `${E}.headline`),
  subline: z.string().trim().max(240, `${E}.subline`),
  about: z.string().trim().max(3000, `${E}.about`),
  phone: Optional(
    z
      .string()
      .trim()
      .regex(/^\+[1-9]\d{7,14}$/, `${E}.phone`),
  ),
  email: Optional(
    z
      .string()
      .trim()
      .toLowerCase()
      .max(120, `${E}.email`)
      .pipe(z.email(`${E}.email`)),
  ),
  programmes: z.array(Card).max(8, `${E}.cards`),
  facilities: z.array(Card).max(12, `${E}.cards`),
  testimonials: z.array(Quote).max(6, `${E}.cards`),
  pages: z
    .array(Page)
    .max(MAX_PAGES, `${E}.cards`)
    .refine(
      (pages) => new Set(pages.map((page) => page.slug)).size === pages.length,
      `${E}.pageSlugTaken`,
    ),
  sectionOrder: z.array(z.enum(SECTION_KEYS)).max(SECTION_KEYS.length),
  staffIds: z
    .array(z.string().regex(/^[0-9a-f]{24}$/, `${E}.staff`))
    .max(30, `${E}.staff`),
  sections: z.object(
    Object.fromEntries(SECTION_KEYS.map((key) => [key, z.boolean()])) as Record<
      SectionKey,
      z.ZodBoolean
    >,
  ),
});
export type WebsiteInput = z.infer<typeof WebsiteInput>;

export type WebsiteEditor = WebsiteInput & {
  status: "draft" | "published";
  url: string;
  staffOptions: { id: string; name: string; designation: string }[];
  classOptions: { id: string; name: string }[];
  gallery: { id: string; caption: string }[];
  downloads: { id: string; title: string; size: number }[];
  visits: VisitSummary;
  domain: DomainInfo;
  staffPhotoIds: string[];
};

/** Where the school's website is. Development has no wildcard address, so it uses the path form. */
/** The address of the site as a crawler needs it: complete, even in development. */
export const siteOrigin = (slug: string) =>
  process.env.SITE_ROOT_DOMAIN
    ? `https://${slug}.${process.env.SITE_ROOT_DOMAIN}`
    : env.APP_URL;

export const siteUrl = (slug: string) =>
  process.env.SITE_ROOT_DOMAIN
    ? `https://${slug}.${process.env.SITE_ROOT_DOMAIN}`
    : `/site/${slug}`;

export async function getWebsite(ctx: RequestContext): Promise<WebsiteEditor> {
  const { schoolId } = ctx;
  const [school, site, staff, gallery, year, downloads, visits, domain] =
    await Promise.all([
      School.findById(schoolId).select("name slug code phone email").lean(),
      Website.findOne({ schoolId }).lean(),
      Staff.find({ schoolId, type: "teaching", status: "active" })
        .sort({ name: 1 })
        .select("name designation")
        .lean(),
      listGallery(ctx),
      AcademicYear.findOne({ schoolId, status: "current" })
        .select("_id")
        .lean(),
      listDownloads(ctx),
      getVisitSummary(ctx),
      getDomainInfo(ctx),
    ]);
  const classes = year
    ? await Class.find({ schoolId, academicYearId: year._id })
        .sort({ order: 1 })
        .select("name")
        .lean()
    : [];
  if (!school) throw new AppError("NOT_FOUND", `${E}.notFound`);
  const slug = school.slug ?? school.code.toLowerCase();
  return {
    slug,
    status: site?.status ?? "draft",
    template: site?.template ?? "classic",
    admissionsOpen: site?.admissionsOpen ?? false,
    applyClassIds: (site?.applyClassIds ?? []).map(String),
    classOptions: classes.map((item) => ({
      id: String(item._id),
      name: item.name,
    })),
    colour: colourOf(site?.theme?.primary),
    headline: site?.hero?.headline ?? school.name,
    subline: site?.hero?.subline ?? "",
    about: site?.about ?? "",
    phone: school.phone ?? "",
    email: school.email ?? "",
    sections: Object.fromEntries(
      SECTION_KEYS.map((key) => [key, site?.sections?.[key] ?? true]),
    ) as Record<SectionKey, boolean>,
    staffIds: (site?.staffIds ?? []).map(String),
    programmes: (site?.programmes ?? []).map(({ title, text }) => ({
      title,
      text: text ?? "",
    })),
    facilities: (site?.facilities ?? []).map(({ title, text }) => ({
      title,
      text: text ?? "",
    })),
    testimonials: (site?.testimonials ?? []).map(({ quote, by }) => ({
      quote,
      by,
    })),
    pages: (site?.pages ?? []).map(({ slug: pageSlug, title, body }) => ({
      slug: pageSlug,
      title,
      body,
    })),
    sectionOrder: orderSections(site?.sectionOrder),
    url: siteUrl(slug),
    staffOptions: staff.map((member) => ({
      id: String(member._id),
      name: member.name,
      designation: member.designation,
    })),
    gallery,
    downloads,
    visits,
    domain,
    staffPhotoIds: (site?.staffPhotos ?? []).map((photo) =>
      String(photo.staffId),
    ),
  };
}

export async function saveWebsite(ctx: RequestContext, input: WebsiteInput) {
  const { schoolId } = ctx;
  const before = await School.findById(schoolId).select("slug").lean();
  if (!before) throw new AppError("NOT_FOUND", `${E}.notFound`);
  const changed = input.slug !== before.slug;
  // An address another school uses, or used, stays theirs so their old links keep working.
  if (
    changed &&
    (await School.exists({
      _id: { $ne: schoolId },
      $or: [{ slug: input.slug }, { slugHistory: input.slug }],
    }))
  ) {
    throw new AppError("CONFLICT", `${E}.slugTaken`);
  }
  await School.updateOne(
    { _id: schoolId },
    {
      slug: input.slug,
      phone: input.phone || null,
      email: input.email || null,
      ...(changed && { $pull: { slugHistory: input.slug } }),
    },
    { runValidators: true },
  );
  if (changed && before.slug) {
    await School.updateOne(
      { _id: schoolId },
      { $addToSet: { slugHistory: before.slug } },
    );
  }
  // Only this school's active teaching staff can be shown, whatever ids the browser sent.
  const staff = await Staff.find({
    schoolId,
    _id: { $in: input.staffIds },
    type: "teaching",
    status: "active",
  })
    .select("_id")
    .lean();
  // The same for classes: only this school's own.
  const classes = await Class.find({
    schoolId,
    _id: { $in: input.applyClassIds },
  })
    .select("_id")
    .lean();
  await Website.findOneAndUpdate(
    { schoolId },
    {
      applyClassIds: classes.map((item) => item._id),
      programmes: input.programmes,
      facilities: input.facilities,
      testimonials: input.testimonials,
      pages: input.pages,
      sectionOrder: orderSections(input.sectionOrder),
      staffIds: staff.map((member) => member._id),
      template: input.template,
      admissionsOpen: input.admissionsOpen,
      "theme.primary": PALETTE[input.colour],
      "hero.headline": input.headline,
      "hero.subline": input.subline,
      about: input.about,
      sections: input.sections,
      updatedBy: ctx.userId,
    },
    { upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );
  return { before: before.slug ?? null };
}

export async function setWebsiteStatus(
  ctx: RequestContext,
  status: "draft" | "published",
) {
  const { schoolId } = ctx;
  if (status === "published") {
    const school = await School.findById(schoolId).select("slug").lean();
    if (!school?.slug) throw new AppError("BUSINESS_RULE", `${E}.noSlug`);
  }
  const before = await Website.findOneAndUpdate(
    { schoolId },
    { status, updatedBy: ctx.userId },
    { upsert: true, setDefaultsOnInsert: true },
  )
    .select("status")
    .lean();
  return { before: before?.status ?? "draft" };
}
