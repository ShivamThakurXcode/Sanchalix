import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, expect, it } from "vitest";
import { connectDb } from "@/server/db/connect";
import { Announcement } from "@/server/models/announcement";
import { Event } from "@/server/models/event";
import { GalleryItem } from "@/server/models/galleryItem";
import { Staff } from "@/server/models/staff";
import { School } from "@/server/models/school";
import { Website } from "@/server/models/website";
import { getPublicPage, getPublicSite } from "./public";

const ADDRESS = {
  line1: "12 School Road",
  city: "Bhopal",
  state: "Madhya Pradesh",
  pincode: "462001",
  country: "IN",
};
const stamp = Date.now().toString(36).slice(-5);
const slugs = {
  live: `live-${stamp}`,
  draft: `draft-${stamp}`,
  off: `off-${stamp}`,
};
const authorId = new Types.ObjectId();

const seed = async (
  slug: string,
  status: "active" | "suspended",
  site: "published" | "draft",
) => {
  const school = await School.create({
    organizationId: new Types.ObjectId(),
    name: `School ${slug}`,
    code: slug.slice(0, 3).toUpperCase() + stamp.toUpperCase().slice(0, 3),
    slug,
    board: "CBSE",
    address: ADDRESS,
    status,
    phone: "+911234567890",
  });
  const teacher = (name: string, status: "active" | "resigned") =>
    Staff.create({
      schoolId: school._id,
      branchId: new Types.ObjectId(),
      employeeNo: name,
      name,
      phone: "+919876543210",
      designation: "PGT",
      type: "teaching",
      joinedOn: "2024-06-01",
      status,
    });
  const [shown, resigned] = await Promise.all([
    teacher("Shown", "active"),
    teacher("Resigned", "resigned"),
  ]);
  await teacher("NotChosen", "active");
  await Website.create({
    schoolId: school._id,
    status: site,
    about: "About us",
    staffIds: [shown._id, resigned._id],
  });
  return school._id;
};

const notice = (schoolId: Types.ObjectId, title: string, extra: object = {}) =>
  Announcement.create({
    schoolId,
    title,
    body: "Body",
    audience: { type: "school" },
    status: "published",
    publishAt: new Date(),
    authorId,
    ...extra,
  });

let liveId: Types.ObjectId;

beforeAll(async () => {
  await connectDb();
  await Promise.all(
    [School, Website, Announcement].map((model) => model.init()),
  );
  liveId = await seed(slugs.live, "active", "published");
  const draftId = await seed(slugs.draft, "active", "draft");
  await seed(slugs.off, "suspended", "published");
  await notice(liveId, "Open to all", { isPublic: true });
  await notice(liveId, "Staff only");
  await notice(liveId, "Expired", {
    isPublic: true,
    expiresAt: new Date(Date.now() - 1000),
  });
  await notice(draftId, "Other school", { isPublic: true });
  const event = (title: string, start: string, isPublic: boolean) =>
    Event.create({
      schoolId: liveId,
      title,
      type: "academic",
      start,
      end: start,
      isPublic,
    });
  await Promise.all([
    event("Sports day", "2999-01-10", true),
    event("Staff meeting", "2999-01-11", false),
    event("Last year", "2000-01-01", true),
    GalleryItem.create({
      schoolId: liveId,
      storageKey: `${liveId}/${liveId}/x.png`,
      caption: "Assembly",
    }),
  ]);
});

afterAll(() => mongoose.disconnect());

it("shows a published site with only its own public notices", async () => {
  const site = await getPublicSite(slugs.live);
  expect(site?.about).toBe("About us");
  expect(site?.notices.map((n) => n.title)).toEqual(["Open to all"]);
});

it("shows only public upcoming events, chosen active teachers and the gallery", async () => {
  const site = await getPublicSite(slugs.live);
  expect(site?.events.map((e) => e.title)).toEqual(["Sports day"]);
  expect(site?.staff.map((s) => s.name)).toEqual(["Shown"]);
  expect(Object.keys(site?.staff[0] ?? {}).sort()).toEqual([
    "designation",
    "hasPhoto",
    "id",
    "name",
  ]);
  expect(site?.gallery.map((g) => g.caption)).toEqual(["Assembly"]);
});

it("shows a website saved before teachers could be chosen", async () => {
  const school = await School.findOne({ slug: slugs.live })
    .select("_id")
    .lean();
  await Website.collection.updateOne(
    { schoolId: school?._id },
    { $unset: { staffIds: "", sections: "" } },
  );
  const site = await getPublicSite(slugs.live);
  expect(site?.staff).toEqual([]);
  expect(site?.sections.staff).toBe(true);
});

it("hides drafts, suspended schools and unknown or malformed addresses", async () => {
  for (const slug of [slugs.draft, slugs.off, "nobody-here", "A/../b"])
    expect(await getPublicSite(slug)).toBeNull();
});

it("shows a draft only to a manager of that school", async () => {
  const draft = await School.findOne({ slug: slugs.draft })
    .select("_id")
    .lean();
  expect((await getPublicSite(slugs.draft, draft?._id))?.preview).toBe(true);
  expect(await getPublicSite(slugs.draft, new Types.ObjectId())).toBeNull();
});

it("serves the written lists, the order and a text page", async () => {
  const school = await School.findOne({ slug: slugs.live })
    .select("_id")
    .lean();
  await Website.updateOne(
    { schoolId: school?._id as Types.ObjectId },
    {
      programmes: [{ title: "Science", text: "Class 11" }],
      testimonials: [{ quote: "Lovely school.", by: "A parent" }],
      pages: [{ slug: "policy", title: "Policy", body: "Our policy." }],
      sectionOrder: ["contact", "about"],
    },
  );
  const site = await getPublicSite(slugs.live);
  expect(site?.programmes).toEqual([{ title: "Science", text: "Class 11" }]);
  expect(site?.testimonials).toEqual([
    { quote: "Lovely school.", by: "A parent" },
  ]);
  expect(site?.pages).toEqual([{ slug: "policy", title: "Policy" }]);
  expect(site?.order.slice(0, 2)).toEqual(["contact", "about"]);
  expect(await getPublicPage(slugs.live, "policy")).toEqual({
    title: "Policy",
    body: "Our policy.",
  });
  expect(await getPublicPage(slugs.live, "missing")).toBeNull();
  expect(await getPublicPage(slugs.draft, "policy")).toBeNull();
});

it("returns only the whitelisted fields", async () => {
  const site = await getPublicSite(slugs.live);
  expect(Object.keys(site ?? {}).sort()).toEqual(
    [
      "about",
      "board",
      "city",
      "email",
      "hero",
      "name",
      "notices",
      "phone",
      "preview",
      "sections",
      "slug",
      "staff",
      "template",
      "theme",
      "events",
      "gallery",
      "hasLogo",
      "admissionsOpen",
      "address",
      "programmes",
      "facilities",
      "testimonials",
      "pages",
      "downloads",
      "order",
    ].sort(),
  );
  expect(Object.keys(site?.notices[0] ?? {}).sort()).toEqual([
    "date",
    "excerpt",
    "id",
    "title",
  ]);
});
