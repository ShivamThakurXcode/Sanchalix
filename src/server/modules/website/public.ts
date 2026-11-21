import "server-only";
import type { Types } from "mongoose";
import { AppError } from "@/lib/appError";
import { todayIn } from "@/lib/dates";
import { connectDb } from "@/server/db/connect";
import { AcademicYear } from "@/server/models/academicYear";
import { Announcement } from "@/server/models/announcement";
import { Class } from "@/server/models/class";
import { Event } from "@/server/models/event";
import { GalleryItem } from "@/server/models/galleryItem";
import { WebsiteDownload } from "@/server/models/websiteDownload";
import { School } from "@/server/models/school";
import { Staff } from "@/server/models/staff";
import { Website } from "@/server/models/website";
import { getFile } from "@/server/storage/store";
import {
  orderSections,
  SECTION_KEYS,
  type SectionKey,
} from "./palette";
import { DOMAIN, SLUG } from "./slug";

export type PublicSite = {
  slug: string;
  name: string;
  board: string;
  city: string;
  address: string;
  phone: string | null;
  email: string | null;
  hasLogo: boolean;
  admissionsOpen: boolean;
  hero: { headline: string; subline: string };
  about: string;
  preview: boolean;
  sections: Record<SectionKey, boolean>;
  notices: { id: string; title: string; excerpt: string; date: string }[];
  events: { id: string; title: string; start: string; end: string }[];
  staff: { id: string; name: string; designation: string; hasPhoto: boolean }[];
  gallery: { id: string; caption: string }[];
  programmes: { title: string; text: string }[];
  facilities: { title: string; text: string }[];
  testimonials: { quote: string; by: string }[];
  pages: { slug: string; title: string }[];
  downloads: { id: string; title: string; size: number }[];
  order: SectionKey[];
};

const EXCERPT = 200;

/** What a visitor may read as a notice: marked public, published and not past its last day. */
const publicNotices = (schoolId: Types.ObjectId, now: Date) => ({
  schoolId,
  isPublic: true,
  status: "published" as const,
  $or: [
    { expiresAt: null },
    { expiresAt: { $exists: false } },
    { expiresAt: { $gt: now } },
  ],
});

// previewFor is the signed-in school manager's own school, who may see the draft before publishing it.
async function findSite(slug: string, previewFor?: Types.ObjectId) {
  // A name with a dot is a school's own domain, which counts only once the school has proved it owns it.
  const byDomain = slug.includes(".");
  if (!(byDomain ? DOMAIN : SLUG).test(slug)) return null;
  await connectDb();
  const school = await School.findOne(
    byDomain
      ? { customDomain: slug, customDomainVerifiedAt: { $ne: null } }
      : { slug },
  )
    .select("name slug board address phone email logoUrl timezone status")
    .lean();
  if (!school) return null;
  const preview = previewFor?.equals(school._id) ?? false;
  if (school.status !== "active" && !preview) return null;
  const site = await Website.findOne({
    schoolId: school._id,
    ...(!preview && { status: "published" }),
  })
    .select(
      "hero about sections sectionOrder staffIds staffPhotos admissionsOpen applyClassIds programmes facilities testimonials pages",
    )
    .lean();
  return site ? { school, site, preview } : null;
}

// The only way a visitor with no session reads school data. It copies named fields into a new object, so a field
// added to a model later stays private until someone adds it here. No session means schoolId is resolved from the
// address and passed to every query.
export async function getPublicSite(
  slug: string,
  previewFor?: Types.ObjectId,
): Promise<PublicSite | null> {
  const found = await findSite(slug, previewFor);
  if (!found) return null;
  const { school, site, preview } = found;
  const schoolId = school._id;
  const sections = Object.fromEntries(
    SECTION_KEYS.map((key) => [key, site.sections?.[key] ?? true]),
  ) as Record<SectionKey, boolean>;
  // lean() skips schema defaults, so a website saved before staffIds existed has no such field.
  const staffIds = site.staffIds ?? [];
  const now = new Date();
  const today = todayIn(school.timezone ?? "Asia/Kolkata");

  const [notices, events, staff, gallery, downloads] = await Promise.all([
    sections.notices
      ? Announcement.find(publicNotices(schoolId, now))
          .sort({ publishAt: -1 })
          .limit(5)
          .select("title body publishAt")
          .lean()
      : [],
    sections.events
      ? Event.find({ schoolId, isPublic: true, end: { $gte: today } })
          .sort({ start: 1 })
          .limit(6)
          .select("title start end")
          .lean()
      : [],
    sections.staff && staffIds.length > 0
      ? Staff.find({ schoolId, _id: { $in: staffIds }, status: "active" })
          .sort({ name: 1 })
          .select("name designation")
          .lean()
      : [],
    sections.gallery
      ? GalleryItem.find({ schoolId })
          .sort({ order: 1, createdAt: -1 })
          .limit(24)
          .select("caption")
          .lean()
      : [],
    sections.downloads
      ? WebsiteDownload.find({ schoolId })
          .sort({ createdAt: -1 })
          .limit(10)
          .select("title size")
          .lean()
      : [],
  ]);

  return {
    slug: school.slug ?? slug,
    name: school.name,
    board: school.board,
    city: school.address.city,
    address: [
      school.address.line1,
      school.address.city,
      school.address.state,
      school.address.pincode,
    ].join(", "),
    phone: school.phone ?? null,
    email: school.email ?? null,
    hasLogo: Boolean(school.logoUrl),
    admissionsOpen: Boolean(site.admissionsOpen),
    hero: {
      headline: site.hero?.headline ?? school.name,
      subline: site.hero?.subline ?? "",
    },
    about: site.about ?? "",
    preview,
    sections,
    notices: notices.map((notice) => ({
      id: String(notice._id),
      title: notice.title,
      excerpt:
        notice.body.length > EXCERPT
          ? `${notice.body.slice(0, EXCERPT).trimEnd()}…`
          : notice.body,
      date: (notice.publishAt ?? now).toISOString().slice(0, 10),
    })),
    events: events.map((event) => ({
      id: String(event._id),
      title: event.title,
      start: event.start,
      end: event.end,
    })),
    staff: staff.map((member) => ({
      id: String(member._id),
      name: member.name,
      designation: member.designation,
      hasPhoto: (site.staffPhotos ?? []).some((photo) =>
        photo.staffId.equals(member._id),
      ),
    })),
    gallery: gallery.map((item) => ({
      id: String(item._id),
      caption: item.caption ?? "",
    })),
    programmes: (site.programmes ?? []).map(({ title, text }) => ({
      title,
      text: text ?? "",
    })),
    facilities: (site.facilities ?? []).map(({ title, text }) => ({
      title,
      text: text ?? "",
    })),
    testimonials: (site.testimonials ?? []).map(({ quote, by }) => ({
      quote,
      by,
    })),
    pages: (site.pages ?? []).map(({ slug: pageSlug, title }) => ({
      slug: pageSlug,
      title,
    })),
    downloads: downloads.map((item) => ({
      id: String(item._id),
      title: item.title,
      size: item.size,
    })),
    order: orderSections(site.sectionOrder),
  };
}

/** One of the school's text pages, or null. Drafts are for the school's managers only, like the rest of the site. */
export async function getPublicPage(
  slug: string,
  pageSlug: string,
  previewFor?: Types.ObjectId,
) {
  const found = await findSite(slug, previewFor);
  const page = found?.site.pages?.find((item) => item.slug === pageSlug);
  return page ? { title: page.title, body: page.body } : null;
}

/** A picture on a school's website: its logo or a gallery photo. Pictures of an unpublished site are for its managers only. */
export async function readSiteImage(
  slug: string,
  which: "logo" | string,
  previewFor?: Types.ObjectId,
) {
  const found = await findSite(slug, previewFor);
  if (!found) throw new AppError("NOT_FOUND", "website.errors.notFound");
  const schoolId = found.school._id;
  let key: string | null | undefined;
  if (which === "logo") key = found.school.logoUrl;
  else if (/^staff-[0-9a-f]{24}$/.test(which)) {
    // Only for a teacher the school chose to show.
    const staffId = which.slice(6);
    key = found.site.staffIds?.some((id) => String(id) === staffId)
      ? found.site.staffPhotos?.find(
          (photo) => String(photo.staffId) === staffId,
        )?.storageKey
      : null;
  } else if (/^[0-9a-f]{24}$/.test(which))
    key = (
      await GalleryItem.findOne({ schoolId, _id: which })
        .select("storageKey")
        .lean()
    )?.storageKey;
  if (!key) throw new AppError("NOT_FOUND", "website.errors.notFound");
  const ext = key.split(".").pop();
  return {
    bytes: await getFile(key),
    mime: ext === "jpg" ? "image/jpeg" : `image/${ext}`,
    preview: found.preview,
  };
}

/** The classes an applicant can choose, or null when the school isn't taking applications on its website. */
export async function getApplyClasses(slug: string) {
  const found = await findSite(slug);
  if (!found?.site.admissionsOpen) return null;
  const schoolId = found.school._id;
  const year = await AcademicYear.findOne({ schoolId, status: "current" })
    .select("_id")
    .lean();
  const classes = year
    ? await Class.find({
        schoolId,
        academicYearId: year._id,
        ...(found.site.applyClassIds?.length && {
          _id: { $in: found.site.applyClassIds },
        }),
      })
        .sort({ order: 1 })
        .select("name")
        .lean()
    : [];
  return classes.map((schoolClass) => ({
    id: String(schoolClass._id),
    name: schoolClass.name,
  }));
}

/** The school's current address when someone arrives by one it used to have, or null. */
export async function getMovedSlug(slug: string) {
  if (!SLUG.test(slug)) return null;
  await connectDb();
  const school = await School.findOne({ slugHistory: slug, status: "active" })
    .select("slug")
    .lean();
  return school?.slug ?? null;
}

const day = (date: Date | null | undefined) =>
  (date ?? new Date()).toISOString().slice(0, 10);

/** Every public notice, newest first, for the notices page. */
export async function getPublicNotices(
  slug: string,
  previewFor?: Types.ObjectId,
) {
  const found = await findSite(slug, previewFor);
  if (!found) return null;
  const notices = await Announcement.find(
    publicNotices(found.school._id, new Date()),
  )
    .sort({ publishAt: -1 })
    .limit(50)
    .select("title body publishAt")
    .lean();
  return notices.map((notice) => ({
    id: String(notice._id),
    title: notice.title,
    excerpt:
      notice.body.length > EXCERPT
        ? `${notice.body.slice(0, EXCERPT).trimEnd()}…`
        : notice.body,
    date: day(notice.publishAt),
  }));
}

/** One public notice in full, or null if it isn't public, has ended, or belongs to another school. */
export async function getPublicNotice(
  slug: string,
  id: string,
  previewFor?: Types.ObjectId,
) {
  const found = await findSite(slug, previewFor);
  if (!found || !/^[0-9a-f]{24}$/.test(id)) return null;
  const notice = await Announcement.findOne({
    ...publicNotices(found.school._id, new Date()),
    _id: id,
  })
    .select("title body publishAt")
    .lean();
  return notice
    ? { title: notice.title, body: notice.body, date: day(notice.publishAt) }
    : null;
}

/** A PDF the school put on its website, with the name to offer it under. */
export async function readSiteDownload(
  slug: string,
  id: string,
  previewFor?: Types.ObjectId,
) {
  const found = await findSite(slug, previewFor);
  if (!found || !/^[0-9a-f]{24}$/.test(id)) {
    throw new AppError("NOT_FOUND", "website.errors.notFound");
  }
  const item = await WebsiteDownload.findOne({
    schoolId: found.school._id,
    _id: id,
  })
    .select("storageKey fileName")
    .lean();
  if (!item) throw new AppError("NOT_FOUND", "website.errors.notFound");
  return {
    bytes: await getFile(item.storageKey),
    fileName: item.fileName,
    preview: found.preview,
  };
}
