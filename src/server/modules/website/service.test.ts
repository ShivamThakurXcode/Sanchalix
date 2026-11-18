import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, expect, it } from "vitest";
import type { RequestContext } from "@/server/auth/context";
import { connectDb } from "@/server/db/connect";
import { School } from "@/server/models/school";
import { Website } from "@/server/models/website";
import { getMovedSlug } from "./public";
import {
  getWebsite,
  saveWebsite,
  setWebsiteStatus,
  WebsiteInput,
} from "./service";

const ADDRESS = {
  line1: "12 School Road",
  city: "Bhopal",
  state: "Madhya Pradesh",
  pincode: "462001",
  country: "IN",
};
const stamp = Date.now().toString(36).slice(-5);
let ctx: RequestContext;
let other: RequestContext;
let noSlug: RequestContext;

const seed = async (code: string, slug?: string): Promise<RequestContext> => {
  const school = await School.create({
    organizationId: new Types.ObjectId(),
    name: `School ${code}`,
    code,
    ...(slug && { slug }),
    board: "CBSE",
    address: ADDRESS,
  });
  return {
    userId: new Types.ObjectId(),
    name: "Office",
    role: "school_admin",
    scope: "school",
    schoolId: school._id,
  };
};

const input = (slug: string) =>
  WebsiteInput.parse({
    slug,
    template: "modern",
    admissionsOpen: true,
    applyClassIds: [],
    colour: "teal",
    headline: "Welcome",
    subline: "",
    about: "About us",
    phone: "+911234567890",
    email: "Office@Example.com",
    staffIds: [],
    programmes: [{ title: "Science stream", text: "Classes 11 and 12" }],
    facilities: [],
    testimonials: [
      { quote: "Our child loves school.", by: "A parent of Class 7" },
    ],
    pages: [
      {
        slug: "admissions-policy",
        title: "Admissions policy",
        body: "How we admit.",
      },
    ],
    sectionOrder: ["contact", "about"],
    sections: {
      about: true,
      programmes: true,
      facilities: true,
      notices: false,
      events: true,
      staff: true,
      testimonials: true,
      gallery: true,
      downloads: true,
      contact: true,
    },
  });

beforeAll(async () => {
  await connectDb();
  await Promise.all([School, Website].map((model) => model.createIndexes()));
  ctx = await seed(`W${stamp.toUpperCase()}`, `one-${stamp}`);
  other = await seed(`X${stamp.toUpperCase()}`, `two-${stamp}`);
  noSlug = await seed(`Y${stamp.toUpperCase()}`);
});

afterAll(() => mongoose.disconnect());

it("saves a school its own website, which starts offline", async () => {
  await saveWebsite(ctx, input(`one-${stamp}`));
  expect(await getWebsite(ctx)).toMatchObject({
    status: "draft",
    template: "modern",
    colour: "teal",
    about: "About us",
    email: "office@example.com",
    sections: { notices: false, about: true },
  });
  expect((await getWebsite(other)).about).toBe("");
});

it("keeps the written lists, extra pages and the order the school chose", async () => {
  const saved = await getWebsite(ctx);
  expect(saved.programmes).toEqual([
    { title: "Science stream", text: "Classes 11 and 12" },
  ]);
  expect(saved.pages.map((page) => page.slug)).toEqual(["admissions-policy"]);
  expect(saved.sectionOrder.slice(0, 2)).toEqual(["contact", "about"]);
  expect(new Set(saved.sectionOrder).size).toBe(10);
  expect((await getWebsite(other)).sectionOrder[0]).toBe("about");
});

it("refuses two pages with one address and over-long entries", () => {
  const page = { slug: "terms", title: "Terms", body: "Text" };
  expect(() =>
    WebsiteInput.parse({ ...input(`one-${stamp}`), pages: [page, page] }),
  ).toThrow();
  expect(() =>
    WebsiteInput.parse({
      ...input(`one-${stamp}`),
      programmes: Array.from({ length: 9 }, () => ({ title: "x", text: "" })),
    }),
  ).toThrow();
  expect(() =>
    WebsiteInput.parse({
      ...input(`one-${stamp}`),
      testimonials: [{ quote: "", by: "A parent" }],
    }),
  ).toThrow();
});

it("forwards the old address after the slug changes, and keeps it from other schools", async () => {
  const oldSlug = `one-${stamp}`;
  const newSlug = `renamed-${stamp}`;
  await School.updateOne({ _id: ctx.schoolId }, { status: "active" });
  await saveWebsite(ctx, input(newSlug));
  expect(await getMovedSlug(oldSlug)).toBe(newSlug);
  expect(await getMovedSlug(newSlug)).toBeNull();
  await expect(saveWebsite(other, input(oldSlug))).rejects.toMatchObject({
    code: "CONFLICT",
  });
  await saveWebsite(ctx, input(oldSlug));
  expect(await getMovedSlug(newSlug)).toBe(oldSlug);
  expect(await getMovedSlug(oldSlug)).toBeNull();
});

it("publishes and unpublishes, and refuses to publish a school with no address", async () => {
  await setWebsiteStatus(ctx, "published");
  expect((await getWebsite(ctx)).status).toBe("published");
  await setWebsiteStatus(ctx, "draft");
  expect((await getWebsite(ctx)).status).toBe("draft");
  await expect(setWebsiteStatus(noSlug, "published")).rejects.toMatchObject({
    code: "BUSINESS_RULE",
  });
});

it("won't let a school take another school's address", async () => {
  await expect(saveWebsite(other, input(`one-${stamp}`))).rejects.toMatchObject(
    { code: "CONFLICT" },
  );
});

it("rejects names the platform keeps and malformed input", () => {
  for (const slug of ["www", "a", "Has Space"])
    expect(() => input(slug)).toThrow();
  expect(() =>
    WebsiteInput.parse({ ...input(`one-${stamp}`), phone: "12345" }),
  ).toThrow();
});
