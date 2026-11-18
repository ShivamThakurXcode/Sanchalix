import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, expect, it } from "vitest";
import type { RequestContext } from "@/server/auth/context";
import { connectDb } from "@/server/db/connect";
import { School } from "@/server/models/school";
import { Staff } from "@/server/models/staff";
import { Website } from "@/server/models/website";
import {
  DomainInput,
  getDomainInfo,
  saveCustomDomain,
  verifyCustomDomain,
} from "./domain";
import { getPublicSite, readSiteImage } from "./public";
import { removeStaffPhoto, setStaffPhoto } from "./staffPhotos";

const ADDRESS = {
  line1: "12 School Road",
  city: "Bhopal",
  state: "Madhya Pradesh",
  pincode: "462001",
  country: "IN",
};
const stamp = Date.now().toString(36).slice(-5);
const slug = `photos-${stamp}`;
const domain = `www.school-${stamp}.example.in`;
const png = () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
let ctx: RequestContext;
let other: RequestContext;
let chosen: string;
let notChosen: string;
let foreign: string;

const seed = async (name: string, tag: string) => {
  const school = await School.create({
    organizationId: new Types.ObjectId(),
    name,
    code: `Y${tag}${stamp.toUpperCase()}`,
    slug: name,
    board: "CBSE",
    address: ADDRESS,
    status: "active",
  });
  const teacher = (employeeNo: string) =>
    Staff.create({
      schoolId: school._id,
      branchId: new Types.ObjectId(),
      employeeNo,
      name: `Teacher ${employeeNo}`,
      phone: "+919876543210",
      designation: "PGT",
      type: "teaching",
      joinedOn: "2024-06-01",
    });
  const [first, second] = await Promise.all([teacher("1"), teacher("2")]);
  await Website.create({
    schoolId: school._id,
    status: "published",
    staffIds: [first._id],
  });
  return {
    ctx: {
      userId: new Types.ObjectId(),
      name: "Office",
      role: "school_admin",
      scope: "school",
      schoolId: school._id,
    } as RequestContext,
    ids: [String(first._id), String(second._id)],
  };
};

beforeAll(async () => {
  process.env.SITE_ROOT_DOMAIN = "sanchalix.app";
  process.env.SITE_CUSTOM_DOMAINS = "true";
  await connectDb();
  await School.createIndexes();
  const first = await seed(slug, "A");
  const second = await seed(`${slug}-b`, "B");
  ctx = first.ctx;
  other = second.ctx;
  [chosen, notChosen] = first.ids as [string, string];
  foreign = second.ids[0] as string;
});

afterAll(async () => {
  delete process.env.SITE_ROOT_DOMAIN;
  delete process.env.SITE_CUSTOM_DOMAINS;
  await mongoose.disconnect();
});

it("saves a teacher's photo, shows it only for a chosen teacher, and replaces it", async () => {
  await expect(
    setStaffPhoto(ctx, chosen, new Uint8Array([1, 2, 3])),
  ).rejects.toMatchObject({
    code: "VALIDATION",
  });
  await expect(setStaffPhoto(ctx, foreign, png())).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  await setStaffPhoto(ctx, chosen, png());
  await setStaffPhoto(ctx, notChosen, png());
  const site = await getPublicSite(slug);
  expect(site?.staff).toEqual([
    expect.objectContaining({ id: chosen, hasPhoto: true }),
  ]);
  expect((await readSiteImage(slug, `staff-${chosen}`)).mime).toBe("image/png");
  await expect(readSiteImage(slug, `staff-${notChosen}`)).rejects.toMatchObject(
    {
      code: "NOT_FOUND",
    },
  );
  await setStaffPhoto(ctx, chosen, png());
  const saved = await Website.findOne({ schoolId: ctx.schoolId })
    .select("staffPhotos")
    .lean();
  expect(
    saved?.staffPhotos?.filter((p) => String(p.staffId) === chosen),
  ).toHaveLength(1);
  await removeStaffPhoto(ctx, chosen);
  await expect(removeStaffPhoto(ctx, chosen)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  await expect(removeStaffPhoto(other, chosen)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
});

it("takes only a domain that is not the platform's own", () => {
  for (const bad of [
    "sanchalix.app",
    "x.sanchalix.app",
    "localhost",
    "no spaces.in",
    "http://a.in",
  ]) {
    expect(() => DomainInput.parse({ domain: bad })).toThrow();
  }
  expect(DomainInput.parse({ domain: " WWW.School.IN " }).domain).toBe(
    "www.school.in",
  );
  expect(DomainInput.parse({ domain: "" }).domain).toBe("");
});

it("serves a domain only after its DNS record proves ownership", async () => {
  await saveCustomDomain(ctx, domain);
  expect(await getPublicSite(domain)).toBeNull();
  const info = await getDomainInfo(ctx);
  expect(info).toMatchObject({ enabled: true, domain, verified: false });
  expect(info.txtName).toBe(`_sanchalix.${domain}`);

  await expect(
    verifyCustomDomain(ctx, async () => [["wrong"]]),
  ).rejects.toMatchObject({
    code: "BUSINESS_RULE",
  });
  await expect(
    verifyCustomDomain(ctx, async () => {
      throw new Error("ENOTFOUND");
    }),
  ).rejects.toMatchObject({ code: "BUSINESS_RULE" });
  expect(await getPublicSite(domain)).toBeNull();

  // A long value arrives split in chunks.
  const half = Math.floor(info.txtValue.length / 2);
  await verifyCustomDomain(ctx, async () => [
    [info.txtValue.slice(0, half), info.txtValue.slice(half)],
  ]);
  const site = await getPublicSite(domain);
  expect(site?.slug).toBe(slug);
  expect((await getDomainInfo(ctx)).verified).toBe(true);
});

it("keeps one school from another's domain and makes a changed domain prove itself again", async () => {
  await expect(saveCustomDomain(other, domain)).rejects.toMatchObject({
    code: "CONFLICT",
  });
  await saveCustomDomain(ctx, `new.school-${stamp}.example.in`);
  expect((await getDomainInfo(ctx)).verified).toBe(false);
  expect(await getPublicSite(domain)).toBeNull();
  await saveCustomDomain(ctx, "");
  expect((await getDomainInfo(ctx)).domain).toBe("");
});

it("refuses a domain when own domains are switched off", async () => {
  process.env.SITE_CUSTOM_DOMAINS = "false";
  await expect(saveCustomDomain(ctx, domain)).rejects.toMatchObject({
    code: "BUSINESS_RULE",
  });
  process.env.SITE_CUSTOM_DOMAINS = "true";
});
