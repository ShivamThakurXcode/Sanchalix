import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { connectDb } from "@/server/db/connect";
import { AcademicYear } from "@/server/models/academicYear";
import { Admission } from "@/server/models/admission";
import { Class } from "@/server/models/class";
import { OutboundMessage } from "@/server/models/outboundMessage";
import { School } from "@/server/models/school";
import { Website } from "@/server/models/website";
import { submitApplication } from "./apply";

vi.mock("@/server/rateLimit", () => ({
  enforceLimit: async () => undefined,
  clientIp: async () => "test",
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

const ADDRESS = {
  line1: "12 School Road",
  city: "Bhopal",
  state: "Madhya Pradesh",
  pincode: "462001",
  country: "IN",
};
const stamp = Date.now().toString(36).slice(-5);
const slug = `submit-${stamp}`;
let schoolId: Types.ObjectId;
let five: string;
let six: string;

const form = (classId: string, overrides: object = {}) => ({
  firstName: "Ishaan",
  lastName: "Verma",
  dob: "2018-08-20",
  gender: "male",
  classId,
  guardian: {
    name: "Pooja Verma",
    relation: "mother",
    phone: "9811122233",
    email: "pooja@example.com",
  },
  consent: true,
  website: "",
  ...overrides,
});

beforeAll(async () => {
  await connectDb();
  const school = await School.create({
    organizationId: new Types.ObjectId(),
    name: "Submit School",
    code: `SUB${stamp.toUpperCase().slice(0, 4)}`,
    slug,
    board: "CBSE",
    address: ADDRESS,
    status: "active",
  });
  schoolId = school._id;
  const year = await AcademicYear.create({
    schoolId,
    label: "2026–27",
    startDate: "2026-04-01",
    endDate: "2027-03-31",
    status: "current",
  });
  const common = {
    schoolId,
    branchId: new Types.ObjectId(),
    academicYearId: year._id,
  };
  const [fiveClass, sixClass] = await Promise.all([
    Class.create({ ...common, name: "Class 5", order: 5 }),
    Class.create({ ...common, name: "Class 6", order: 6 }),
  ]);
  [five, six] = [String(fiveClass._id), String(sixClass._id)];
  await Website.create({
    schoolId,
    status: "published",
    admissionsOpen: true,
    applyClassIds: [fiveClass._id],
  });
});

afterAll(() => mongoose.disconnect());

it("files an application for an open class and messages the family", async () => {
  const { applicationNo } = await submitApplication(slug, form(five));
  expect(applicationNo).toMatch(/^APP-2026-\d{5}$/);
  const sent = await OutboundMessage.find({
    schoolId,
    template: "applicationReceived",
  })
    .select("channel to")
    .lean();
  expect(
    sent.map((message) => `${message.channel}:${message.to}`).sort(),
  ).toEqual(["email:pooja@example.com", "sms:+919811122233"]);
});

it("refuses a class the school has not opened", async () => {
  await expect(submitApplication(slug, form(six))).rejects.toMatchObject({
    code: "VALIDATION",
  });
});

it("saves nothing when the hidden field is filled", async () => {
  const before = await Admission.countDocuments({ schoolId });
  await expect(
    submitApplication(slug, form(five, { website: "spam" })),
  ).rejects.toThrow();
  expect(await Admission.countDocuments({ schoolId })).toBe(before);
});

it("refuses when the school is not taking applications", async () => {
  await Website.updateOne({ schoolId }, { admissionsOpen: false });
  await expect(submitApplication(slug, form(five))).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
});
