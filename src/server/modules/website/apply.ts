import "server-only";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { AppError } from "@/lib/appError";
import { logger } from "@/server/logger";
import { sendMessages } from "@/server/messaging/send";
import { clientIp, enforceLimit } from "@/server/rateLimit";
import { connectDb } from "@/server/db/connect";
import { School } from "@/server/models/school";
import { Website } from "@/server/models/website";
import { AdmissionInput } from "@/server/modules/admissions/schemas";
import { createWebsiteApplication } from "@/server/modules/admissions/service";
import { SLUG } from "./slug";

export const ApplyInput = AdmissionInput.omit({ source: true }).extend({
  consent: z.literal(true, "website.errors.consent"),
  // A field people never see. Only a program fills it in.
  website: z.string().max(0).default(""),
});

// Open to anyone, so it is the one entry point that must hold up alone: a rate limit per address and school, the same
// validation as the staff form, and no school id from the browser (it comes from the slug, never the request body).
export async function submitApplication(slug: string, raw: unknown) {
  // Consent must be true and the hidden field empty, or validation fails and nothing is saved.
  const { consent: _consent, website: _trap, ...input } = ApplyInput.parse(raw);
  // Counted after validation, so a family fixing typos doesn't use up the allowance. Ten an hour, because a whole
  // open day can share one school Wi-Fi address.
  await enforceLimit("apply", 10, 3600, `${slug}:${await clientIp()}`);
  if (!SLUG.test(slug))
    throw new AppError("NOT_FOUND", "website.errors.applyClosed");
  await connectDb();
  const school = await School.findOne({ slug, status: "active" })
    .select("name")
    .lean();
  const site =
    school &&
    (await Website.findOne({
      schoolId: school._id,
      status: "published",
      admissionsOpen: true,
    })
      .select("applyClassIds")
      .lean());
  if (!school || !site)
    throw new AppError("NOT_FOUND", "website.errors.applyClosed");
  const open = site.applyClassIds ?? [];
  if (open.length > 0 && !open.some((id) => String(id) === input.classId))
    throw new AppError("VALIDATION", "website.errors.classClosed");
  const t = await getTranslations("website");
  const admission = await createWebsiteApplication(
    school._id,
    input,
    (created) => ({
      title: t("alert.title"),
      body: t("alert.body", {
        name: created.name,
        number: created.applicationNo,
      }),
    }),
  );
  const values = {
    school: school.name,
    name: admission.name,
    number: admission.applicationNo,
    guardian: input.guardian.name,
  };
  // The family has its number on screen already, so a failed message is logged and never an error.
  await sendMessages([
    {
      schoolId: school._id,
      channel: "sms",
      to: input.guardian.phone,
      template: "applicationReceived",
      body: t("confirmation.sms", values),
      dedupeKey: `application:${admission.id}:sms`,
    },
    ...(input.guardian.email
      ? [
          {
            schoolId: school._id,
            channel: "email" as const,
            to: input.guardian.email,
            template: "applicationReceived",
            subject: t("confirmation.subject", values),
            body: t("confirmation.email", values),
            dedupeKey: `application:${admission.id}:email`,
          },
        ]
      : []),
  ]).catch((error: unknown) =>
    logger.error({ err: error }, "application confirmation failed"),
  );
  return { applicationNo: admission.applicationNo };
}
