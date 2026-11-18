import "server-only";
import type { Types } from "mongoose";
import { DEFAULT_PAGE_SIZE } from "@/lib/tableQuery";
import { AppError } from "@/lib/appError";
import type { RequestContext } from "@/server/auth/context";
import { can, ROLE_KEYS } from "@/server/auth/permissions";
import { logger } from "@/server/logger";
import { paginate, textMatch } from "@/server/db/paginate";
import { withTransaction } from "@/server/db/transaction";
import { AcademicYear } from "@/server/models/academicYear";
import { Admission } from "@/server/models/admission";
import { Class } from "@/server/models/class";
import { Counter } from "@/server/models/counter";
import { Notification } from "@/server/models/notification";
import { Section } from "@/server/models/section";
import { Student } from "@/server/models/student";
import { User } from "@/server/models/user";
import { toDocumentRows } from "@/server/modules/sis/documents";
import { createStudent } from "@/server/modules/sis/service";
import {
  type AcceptAdmission,
  type AdmissionDetail,
  type AdmissionInput,
  type AdmissionRow,
  type AdmissionStatus,
  FINAL,
  type ListAdmissions,
  type MoveAdmission,
  NEXT,
  REQUIRED_DOCUMENTS,
} from "./schemas";

const scopeOf = (ctx: RequestContext) => ({
  schoolId: ctx.schoolId,
  ...(ctx.scope === "branch" && ctx.branchId && { branchId: ctx.branchId }),
});

export const createAdmission = (ctx: RequestContext, input: AdmissionInput) =>
  insertAdmission(ctx.schoolId, scopeOf(ctx), input, ctx.userId);

/** An application from the school's public website: no signed-in user, so nobody is recorded as its author. */
type AlertText = (admission: { name: string; applicationNo: string }) => {
  title: string;
  body: string;
};

export async function createWebsiteApplication(
  schoolId: Types.ObjectId,
  input: Omit<AdmissionInput, "source">,
  alertText: AlertText,
) {
  const admission = await insertAdmission(
    schoolId,
    { schoolId },
    { ...input, source: "website" },
  );
  // The family already has its number; a failed alert must not turn a saved application into an error.
  await notifyNewApplication(schoolId, admission, alertText).catch(
    (error: unknown) =>
      logger.error(
        { err: error, admissionId: String(admission.id) },
        "new application alert failed",
      ),
  );
  return admission;
}

async function notifyNewApplication(
  schoolId: Types.ObjectId,
  admission: { id: Types.ObjectId; applicationNo: string; name: string },
  alertText: AlertText,
) {
  const roles = ROLE_KEYS.filter((role) => can(role, "sis.admission.read"));
  const people = await User.find({
    status: "active",
    roles: { $elemMatch: { schoolId, role: { $in: roles } } },
  })
    .select("_id")
    .lean();
  if (people.length === 0) return;
  const { title, body } = alertText(admission);
  await Notification.insertMany(
    people.map((person) => ({
      schoolId,
      userId: person._id,
      category: "approvals" as const,
      title,
      body,
      link: `/admissions/${admission.id.toString()}`,
      deliveries: [
        { channel: "in_app" as const, status: "sent" as const, at: new Date() },
      ],
      dedupeKey: `application:${admission.id.toString()}:${person._id.toString()}`,
    })),
  );
}

async function insertAdmission(
  schoolId: Types.ObjectId,
  scope: object,
  input: AdmissionInput,
  userId?: Types.ObjectId,
) {
  const schoolClass = await Class.findOne({
    ...scope,
    schoolId,
    _id: input.classId,
  })
    .select("branchId academicYearId")
    .lean();
  const year =
    schoolClass &&
    (await AcademicYear.findOne({
      schoolId,
      _id: schoolClass.academicYearId,
      status: "current",
    })
      .select("startDate")
      .lean());
  if (!schoolClass || !year)
    throw new AppError("NOT_FOUND", "admissions.errors.class");

  const applicationYear = year.startDate.slice(0, 4);
  // Application numbers only need to be unique, not gap-free, so the counter isn't tied to a transaction.
  const counter = await Counter.findOneAndUpdate(
    { _id: `${schoolId.toString()}:application:${applicationYear}` },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  ).lean();
  const { guardian, classId, previousSchool, source, ...applicant } = input;
  const admission = await Admission.create({
    schoolId,
    branchId: schoolClass.branchId,
    academicYearId: schoolClass.academicYearId,
    applicationNo: `APP-${applicationYear}-${String(counter.seq).padStart(5, "0")}`,
    status: "enquiry",
    applicant: {
      ...applicant,
      previousSchool: previousSchool || null,
      classSought: classId,
    },
    guardians: [{ ...guardian, email: guardian.email ?? null }],
    requiredDocuments: REQUIRED_DOCUMENTS,
    source,
    history: [
      {
        at: new Date(),
        ...(userId && { by: userId }),
        from: null,
        to: "enquiry",
        note: null,
      },
    ],
    ...(userId && { createdBy: userId, updatedBy: userId }),
  });
  return {
    id: admission._id,
    applicationNo: admission.applicationNo,
    name: `${applicant.firstName} ${applicant.lastName}`.trim(),
  };
}

const missingDocuments = (admission: {
  requiredDocuments: string[];
  documents: { type: string; verifiedAt?: Date | null }[];
}) =>
  admission.requiredDocuments.filter(
    (type) =>
      !admission.documents.some(
        (document) => document.type === type && document.verifiedAt,
      ),
  );

type Lean = {
  _id: unknown;
  applicationNo: string;
  status: AdmissionStatus;
  applicant: {
    firstName: string;
    lastName?: string | null;
    classSought: unknown;
  };
  guardians: { name: string; phone: string }[];
  createdAt: Date;
};

const toRow = (
  admission: Lean,
  classNames: Map<string, string>,
): AdmissionRow => ({
  id: String(admission._id),
  applicationNo: admission.applicationNo,
  name: `${admission.applicant.firstName} ${admission.applicant.lastName ?? ""}`.trim(),
  classSought: classNames.get(String(admission.applicant.classSought)) ?? "",
  guardianName: admission.guardians[0]?.name ?? "",
  guardianPhone: admission.guardians[0]?.phone ?? "",
  status: admission.status,
  appliedOn: admission.createdAt.toISOString(),
});

async function classNamesOf(ctx: RequestContext, ids: unknown[]) {
  const classes = await Class.find({
    schoolId: ctx.schoolId,
    _id: { $in: ids },
  })
    .select("name")
    .lean();
  return new Map(
    classes.map((schoolClass) => [String(schoolClass._id), schoolClass.name]),
  );
}

export async function listAdmissions(
  ctx: RequestContext,
  query: ListAdmissions,
) {
  const { rows, ...page } = await paginate(
    Admission,
    {
      ...scopeOf(ctx),
      status: query.status === "open" ? { $nin: FINAL } : query.status,
      ...textMatch(query.q, [
        "applicationNo",
        "applicant.firstName",
        "applicant.lastName",
      ]),
    },
    {
      sortField: "applicationNo",
      select: [
        "applicationNo",
        "status",
        "applicant",
        "guardians",
        "createdAt",
      ],
      limit: query.pageSize ?? DEFAULT_PAGE_SIZE,
      cursor: query.cursor,
      descending: true,
    },
  );
  const classNames = await classNamesOf(
    ctx,
    rows.map((row) => row.applicant.classSought),
  );
  return {
    rows: rows.map((row) => toRow(row as unknown as Lean, classNames)),
    ...page,
  };
}

export async function getAdmission(
  ctx: RequestContext,
  id: string,
): Promise<AdmissionDetail | null> {
  if (!/^[0-9a-f]{24}$/.test(id)) return null;
  const admission = await Admission.findOne({
    ...scopeOf(ctx),
    _id: id,
  }).lean();
  if (!admission) return null;
  const [classNames, sections] = await Promise.all([
    classNamesOf(ctx, [admission.applicant.classSought]),
    admission.status === "offered"
      ? Section.find({
          schoolId: ctx.schoolId,
          classId: admission.applicant.classSought,
        })
          .sort({ displayName: 1 })
          .select("displayName")
          .lean()
      : [],
  ]);
  const guardian = admission.guardians[0];
  return {
    ...toRow(admission as unknown as Lean, classNames),
    dob: admission.applicant.dob,
    gender: admission.applicant.gender,
    previousSchool: admission.applicant.previousSchool || null,
    source: admission.source,
    guardianRelation: guardian?.relation ?? "guardian",
    guardianEmail: guardian?.email || null,
    studentId: admission.studentId ? String(admission.studentId) : null,
    next: NEXT[admission.status],
    sections: sections.map((section) => ({
      id: String(section._id),
      name: section.displayName,
    })),
    documents: toDocumentRows(admission.documents),
    missingDocuments: missingDocuments(admission),
    history: admission.history
      .map((entry) => ({
        at: (entry.at ?? admission.createdAt).toISOString(),
        from: entry.from ?? null,
        to: entry.to ?? "",
        note: entry.note || null,
      }))
      .reverse(),
  };
}

export async function moveAdmission(
  ctx: RequestContext,
  { id, to, note }: MoveAdmission,
) {
  const from = (Object.keys(NEXT) as AdmissionStatus[]).filter((status) =>
    NEXT[status].includes(to),
  );
  // The stage it must be leaving is part of the filter, so two people can't move the same application twice.
  const before = await Admission.findOneAndUpdate(
    { ...scopeOf(ctx), _id: id, status: { $in: from } },
    [
      {
        $set: {
          history: {
            $concatArrays: [
              "$history",
              [
                {
                  at: "$$NOW",
                  by: ctx.userId,
                  from: "$status",
                  to,
                  note: note || null,
                },
              ],
            ],
          },
          status: to,
          updatedBy: ctx.userId,
        },
      },
    ],
    { updatePipeline: true },
  )
    .select("applicationNo status")
    .lean();
  if (!before)
    throw new AppError("BUSINESS_RULE", "admissions.errors.cannotMove");
  return {
    id: before._id,
    applicationNo: before.applicationNo,
    from: before.status,
  };
}

/** Admits the applicant: the student, guardian and enrollment are created and the application closed, or nothing is. */
export async function acceptAdmission(
  ctx: RequestContext,
  { id, sectionId, address }: AcceptAdmission,
) {
  const { schoolId } = ctx;
  return withTransaction(async (session) => {
    const admission = await Admission.findOne({
      ...scopeOf(ctx),
      _id: id,
      status: "offered",
    })
      .session(session)
      .lean();
    if (!admission)
      throw new AppError("BUSINESS_RULE", "admissions.errors.notOffered");
    const missing = missingDocuments(admission).length;
    if (missing > 0)
      throw new AppError("BUSINESS_RULE", "admissions.errors.documents", {
        count: missing,
      });
    const section = await Section.findOne({
      schoolId,
      _id: sectionId,
      classId: admission.applicant.classSought,
    })
      .select("_id")
      .session(session)
      .lean();
    if (!section) throw new AppError("NOT_FOUND", "admissions.errors.section");

    const { applicant } = admission;
    const student = await createStudent(
      ctx,
      {
        firstName: applicant.firstName,
        lastName: applicant.lastName ?? "",
        dob: applicant.dob,
        gender: applicant.gender,
        sectionId,
        guardians: admission.guardians.map((guardian) => ({
          name: guardian.name,
          relation: guardian.relation,
          phone: guardian.phone,
          email: guardian.email || undefined,
        })),
        primaryGuardianIndex: 0,
        address,
      },
      session,
    );
    if (admission.documents.length > 0) {
      await Student.updateOne(
        { schoolId, _id: student.id },
        { documents: admission.documents },
        { session },
      );
    }
    await Admission.updateOne(
      { schoolId, _id: admission._id },
      {
        status: "accepted",
        studentId: student.id,
        updatedBy: ctx.userId,
        $push: {
          history: {
            at: new Date(),
            by: ctx.userId,
            from: "offered",
            to: "accepted",
            note: null,
          },
        },
      },
      { session },
    );
    return {
      id: admission._id,
      applicationNo: admission.applicationNo,
      student,
    };
  });
}
