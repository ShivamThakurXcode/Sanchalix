import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, expect, it } from "vitest";
import type { RequestContext } from "@/server/auth/context";
import { connectDb } from "@/server/db/connect";
import { Admission } from "@/server/models/admission";
import { Announcement } from "@/server/models/announcement";
import { School } from "@/server/models/school";
import { Website } from "@/server/models/website";
import { WebsiteDownload } from "@/server/models/websiteDownload";
import { getVisitSummary, recordVisit } from "./analytics";
import { addDownload, listDownloads, removeDownload } from "./downloads";
import {
  getPublicNotice,
  getPublicNotices,
  getPublicSite,
  readSiteDownload,
} from "./public";

const ADDRESS = {
  line1: "12 School Road",
  city: "Bhopal",
  state: "Madhya Pradesh",
  pincode: "462001",
  country: "IN",
};
const stamp = Date.now().toString(36).slice(-5);
const slug = `extras-${stamp}`;
let ctx: RequestContext;
let other: RequestContext;
const authorId = new Types.ObjectId();

const seed = async (name: string, tag: string): Promise<RequestContext> => {
  const school = await School.create({
    organizationId: new Types.ObjectId(),
    name,
    code: `X${tag}${stamp.toUpperCase()}`,
    slug: name,
    board: "CBSE",
    address: ADDRESS,
    status: "active",
  });
  await Website.create({ schoolId: school._id, status: "published" });
  return {
    userId: new Types.ObjectId(),
    name: "Office",
    role: "school_admin",
    scope: "school",
    schoolId: school._id,
  };
};

const pdf = (text = "hello") =>
  new Uint8Array(Buffer.from(`%PDF-1.4\n${text}\n%%EOF`));

const notice = (schoolId: Types.ObjectId, title: string, extra: object = {}) =>
  Announcement.create({
    schoolId,
    title,
    body: "Body of " + title,
    audience: { type: "school" },
    status: "published",
    publishAt: new Date(),
    authorId,
    ...extra,
  });

let publicId: string;
let privateId: string;
let otherId: string;

beforeAll(async () => {
  await connectDb();
  await Promise.all(
    [WebsiteDownload, Admission, Announcement].map((model) => model.init()),
  );
  ctx = await seed(slug, "A");
  other = await seed(`${slug}-b`, "B");
  publicId = String(
    (await notice(ctx.schoolId, "Open", { isPublic: true }))._id,
  );
  privateId = String((await notice(ctx.schoolId, "Staff only"))._id);
  otherId = String(
    (await notice(other.schoolId, "Theirs", { isPublic: true }))._id,
  );
});

afterAll(() => mongoose.disconnect());

it("counts visits by day and page without naming anyone", async () => {
  await recordVisit(slug, "home");
  await recordVisit(slug, "home");
  await recordVisit(slug, "apply");
  await Admission.collection.insertOne({
    schoolId: ctx.schoolId,
    source: "website",
    createdAt: new Date(),
    deletedAt: null,
  });
  const summary = await getVisitSummary(ctx);
  expect(summary).toMatchObject({
    total: 3,
    byKind: { home: 2, apply: 1, page: 0, news: 0 },
    applications: 1,
  });
  expect(summary.days).toHaveLength(7);
  expect(summary.days.at(-1)?.count).toBe(3);
  expect((await getVisitSummary(other)).total).toBe(0);
  await recordVisit("no-such-school", "home");
  await recordVisit("Bad Slug!", "home");
});

it("shows a school its own public notices in full and no one else's", async () => {
  const list = await getPublicNotices(slug);
  expect(list?.map((item) => item.title)).toEqual(["Open"]);
  expect(await getPublicNotice(slug, publicId)).toMatchObject({
    title: "Open",
    body: "Body of Open",
  });
  expect(await getPublicNotice(slug, privateId)).toBeNull();
  expect(await getPublicNotice(slug, otherId)).toBeNull();
  expect(await getPublicNotice(slug, "not-an-id")).toBeNull();
  expect(await getPublicNotices("nobody-here")).toBeNull();
});

it("keeps only PDFs, lists them, serves them and removes them", async () => {
  await expect(
    addDownload(
      ctx,
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0]),
      "Image",
      "a.png",
    ),
  ).rejects.toMatchObject({ code: "VALIDATION" });
  const { id } = await addDownload(
    ctx,
    pdf(),
    "Fee structure",
    "fees 2026.pdf",
  );
  expect(await listDownloads(ctx)).toEqual([
    { id, title: "Fee structure", size: pdf().length },
  ]);
  expect(await listDownloads(other)).toEqual([]);
  const file = await readSiteDownload(slug, id);
  expect(file.fileName).toBe("fees 2026.pdf");
  expect(Buffer.from(file.bytes).subarray(0, 5).toString()).toBe("%PDF-");
  await expect(readSiteDownload(`${slug}-b`, id)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  expect((await getPublicSite(slug))?.downloads).toEqual([
    { id, title: "Fee structure", size: pdf().length },
  ]);
  await expect(removeDownload(other, id)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  await removeDownload(ctx, id);
  expect(await listDownloads(ctx)).toEqual([]);
});

it("refuses an eleventh download", async () => {
  for (let index = 0; index < 10; index += 1) {
    await addDownload(
      ctx,
      pdf(String(index)),
      `File ${index}`,
      `f${index}.pdf`,
    );
  }
  await expect(
    addDownload(ctx, pdf("x"), "One too many", "x.pdf"),
  ).rejects.toMatchObject({
    code: "BUSINESS_RULE",
  });
  for (const item of await listDownloads(ctx))
    await removeDownload(ctx, item.id);
});
