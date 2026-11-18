import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, expect, it } from "vitest";
import { connectDb } from "@/server/db/connect";
import { AcademicYear } from "@/server/models/academicYear";
import { Admission } from "@/server/models/admission";
import { Class } from "@/server/models/class";
import { Counter } from "@/server/models/counter";
import { Notification } from "@/server/models/notification";
import { School } from "@/server/models/school";
import { User } from "@/server/models/user";
import { Website } from "@/server/models/website";
import { createWebsiteApplication } from "@/server/modules/admissions/service";
import { ApplyInput } from "./apply";
import { getApplyClasses } from "./public";

const ADDRESS = {
  line1: "12 School Road",
  city: "Bhopal",
  state: "Madhya Pradesh",
  pincode: "462001",
  country: "IN",
};
const stamp = Date.now().toString(36).slice(-5);
let schoolId: Types.ObjectId;
let classId: string;
let foreignClassId: string;

const seed = async (slug: string, admissionsOpen: boolean) => {
  const school = await School.create({
    organizationId: new Types.ObjectId(),
    name: slug,
    code: slug.slice(0, 3).toUpperCase() + stamp.toUpperCase().slice(0, 3),
    slug,
    board: "CBSE",
    address: ADDRESS,
    status: "active",
  });
  const year = await AcademicYear.create({
    schoolId: school._id,
    label: "2026–27",
    startDate: "2026-04-01",
    endDate: "2027-03-31",
    status: "current",
  });
  const grade = await Class.create({
    schoolId: school._id,
    branchId: new Types.ObjectId(),
    academicYearId: year._id,
    name: "Class 5",
    order: 5,
  });
  await Website.create({
    schoolId: school._id,
    status: "published",
    admissionsOpen,
  });
  return { schoolId: school._id, classId: String(grade._id) };
};

const form = (overrides: object = {}) => ({
  firstName: "Ishaan",
  lastName: "Verma",
  dob: "2018-08-20",
  gender: "male",
  classId,
  guardian: {
    name: "Pooja Verma",
    relation: "mother",
    phone: "9811122233",
    email: "",
  },
  consent: true,
  ...overrides,
});

beforeAll(async () => {
  await connectDb();
  await Promise.all([Admission, Counter].map((model) => model.init()));
  ({ schoolId, classId } = await seed(`open-${stamp}`, true));
  ({ classId: foreignClassId } = await seed(`shut-${stamp}`, false));
});

afterAll(() => mongoose.disconnect());

const alertText = (admission: { name: string; applicationNo: string }) => ({
  title: "New online application",
  body: `${admission.name} (${admission.applicationNo})`,
});

it("files a website application as an enquiry with no author", async () => {
  const { id, applicationNo } = await createWebsiteApplication(
    schoolId,
    ApplyInput.omit({ consent: true, website: true }).parse(form()),
    alertText,
  );
  expect(applicationNo).toMatch(/^APP-2026-\d{5}$/);
  const saved = await Admission.findOne({ schoolId, _id: id }).lean();
  expect(saved).toMatchObject({
    status: "enquiry",
    source: "website",
    guardians: [{ phone: "+919811122233" }],
  });
  expect(saved?.createdBy).toBeUndefined();
});

it("tells the principal about a new application, and not a teacher", async () => {
  const person = (
    role: "principal" | "teacher",
    scope: "school" | "assigned",
  ) =>
    User.create({
      name: role,
      email: `${role}-${stamp}@apply.example`,
      passwordHash: "x",
      status: "active",
      roles: [{ role, schoolId, scope }],
    });
  const [principal, teacher] = await Promise.all([
    person("principal", "school"),
    person("teacher", "assigned"),
  ]);
  const { id } = await createWebsiteApplication(
    schoolId,
    ApplyInput.omit({ consent: true, website: true }).parse(form()),
    alertText,
  );
  const told = await Notification.find({ schoolId, link: `/admissions/${id}` })
    .select("userId")
    .lean();
  expect(told.map((row) => String(row.userId))).toEqual([
    String(principal._id),
  ]);
  expect(String(teacher._id)).not.toBe(String(principal._id));
});

it("refuses a class from another school", async () => {
  await expect(
    createWebsiteApplication(
      schoolId,
      ApplyInput.omit({ consent: true, website: true }).parse(
        form({ classId: foreignClassId }),
      ),
      alertText,
    ),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});

it("needs consent, and a hidden field that only a program fills stays empty", () => {
  expect(() => ApplyInput.parse(form({ consent: false }))).toThrow();
  expect(() => ApplyInput.parse(form({ website: "http://spam" }))).toThrow();
  expect(ApplyInput.parse(form()).website).toBe("");
});

it("lists classes only for a school that is taking applications", async () => {
  expect((await getApplyClasses(`open-${stamp}`))?.map((c) => c.name)).toEqual([
    "Class 5",
  ]);
  expect(await getApplyClasses(`shut-${stamp}`)).toBeNull();
});
