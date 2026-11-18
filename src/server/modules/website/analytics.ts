import "server-only";
import { todayIn } from "@/lib/dates";
import type { RequestContext } from "@/server/auth/context";
import { connectDb } from "@/server/db/connect";
import { Admission } from "@/server/models/admission";
import { School } from "@/server/models/school";
import { SiteVisit, VISIT_KINDS } from "@/server/models/siteVisit";
import { SLUG } from "./slug";

const DAY_MS = 86_400_000;
const KEEP_DAYS = 400;

type Kind = (typeof VISIT_KINDS)[number];

/** Counts one view of a public page. A failure here must never break the page, so callers don't wait on it. */
export async function recordVisit(slug: string, kind: Kind) {
  if (!SLUG.test(slug)) return;
  await connectDb();
  const school = await School.findOne({ slug, status: "active" })
    .select("timezone")
    .lean();
  if (!school) return;
  await SiteVisit.updateOne(
    {
      schoolId: school._id,
      day: todayIn(school.timezone ?? "Asia/Kolkata"),
      kind,
    },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date(Date.now() + KEEP_DAYS * DAY_MS) },
    },
    { upsert: true },
  );
}

export type VisitSummary = {
  total: number;
  byKind: Record<Kind, number>;
  days: { day: string; count: number }[];
  applications: number;
};

/** The last 30 days of views, the last 7 days one by one, and the applications that came from the website. */
export async function getVisitSummary(
  ctx: RequestContext,
): Promise<VisitSummary> {
  const { schoolId } = ctx;
  const school = await School.findById(schoolId).select("timezone").lean();
  const zone = school?.timezone ?? "Asia/Kolkata";
  const ago = (days: number) =>
    todayIn(zone, new Date(Date.now() - days * DAY_MS));
  const [rows, applications] = await Promise.all([
    SiteVisit.find({ schoolId, day: { $gte: ago(29) } })
      .select("day kind count")
      .lean(),
    Admission.countDocuments({
      schoolId,
      source: "website",
      createdAt: { $gte: new Date(Date.now() - 30 * DAY_MS) },
    }),
  ]);
  const byKind = Object.fromEntries(
    VISIT_KINDS.map((kind) => [kind, 0]),
  ) as Record<Kind, number>;
  const perDay = new Map<string, number>();
  for (const row of rows) {
    byKind[row.kind] += row.count;
    perDay.set(row.day, (perDay.get(row.day) ?? 0) + row.count);
  }
  return {
    total: rows.reduce((sum, row) => sum + row.count, 0),
    byKind,
    days: Array.from({ length: 7 }, (_, index) => {
      const day = ago(6 - index);
      return { day, count: perDay.get(day) ?? 0 };
    }),
    applications,
  };
}
