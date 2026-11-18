import "server-only";
import { createHash } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import { z } from "zod";
import { AppError } from "@/lib/appError";
import { env } from "@/lib/env";
import type { RequestContext } from "@/server/auth/context";
import { School } from "@/server/models/school";
import { DOMAIN } from "./slug";

const E = "website.errors";

const root = () => process.env.SITE_ROOT_DOMAIN?.toLowerCase();
const appHost = () => new URL(env.APP_URL).hostname.toLowerCase();

/** Custom domains need the platform's own address, a wildcard certificate and this switch, all set by whoever hosts it. */
export const customDomainsEnabled = () =>
  process.env.SITE_CUSTOM_DOMAINS === "true" && Boolean(root());

/** A name the school may point at its website: not one of the platform's own. */
const isSchoolDomain = (domain: string) =>
  DOMAIN.test(domain) &&
  domain !== appHost() &&
  domain !== root() &&
  !domain.endsWith(`.${root()}`);

export const DomainInput = z.object({
  domain: z.union([
    z.literal(""),
    z.string().trim().toLowerCase().refine(isSchoolDomain, `${E}.domain`),
  ]),
});

// Only the school's own DNS can publish this record, which is how we know the domain is theirs.
export const domainToken = (schoolId: unknown, domain: string) =>
  createHash("sha256")
    .update(`${env.AUTH_SECRET}:${String(schoolId)}:${domain}`)
    .digest("hex")
    .slice(0, 32);

export type DomainInfo = {
  enabled: boolean;
  domain: string;
  verified: boolean;
  txtName: string;
  txtValue: string;
  cname: string;
};

export async function getDomainInfo(ctx: RequestContext): Promise<DomainInfo> {
  const school = await School.findById(ctx.schoolId)
    .select("customDomain customDomainVerifiedAt")
    .lean();
  const domain = school?.customDomain ?? "";
  return {
    enabled: customDomainsEnabled(),
    domain,
    verified: Boolean(school?.customDomainVerifiedAt),
    txtName: `_sanchalix.${domain}`,
    txtValue: `sanchalix-verify=${domainToken(ctx.schoolId, domain)}`,
    cname: `sites.${root() ?? ""}`,
  };
}

export async function saveCustomDomain(ctx: RequestContext, domain: string) {
  const { schoolId } = ctx;
  if (domain && !customDomainsEnabled()) {
    throw new AppError("BUSINESS_RULE", `${E}.domainsOff`);
  }
  if (
    domain &&
    (await School.exists({ _id: { $ne: schoolId }, customDomain: domain }))
  ) {
    throw new AppError("CONFLICT", `${E}.domainTaken`);
  }
  const before = await School.findById(schoolId).select("customDomain").lean();
  if (!before) throw new AppError("NOT_FOUND", `${E}.notFound`);
  // A new name has to be proved again; the same name keeps its proof.
  const changed = (before.customDomain ?? "") !== domain;
  await School.updateOne(
    { _id: schoolId },
    domain
      ? {
          customDomain: domain,
          ...(changed && { $unset: { customDomainVerifiedAt: 1 } }),
        }
      : { $unset: { customDomain: 1, customDomainVerifiedAt: 1 } },
  );
  return { before: before.customDomain ?? null };
}

type Lookup = (name: string) => Promise<string[][]>;

export async function verifyCustomDomain(
  ctx: RequestContext,
  lookup: Lookup = resolveTxt,
) {
  const info = await getDomainInfo(ctx);
  if (!info.enabled || !info.domain) {
    throw new AppError("BUSINESS_RULE", `${E}.domainsOff`);
  }
  // A name with no such record is the usual case before the school has added it, not a fault.
  const records = await lookup(info.txtName).catch(() => [] as string[][]);
  if (!records.some((chunks) => chunks.join("") === info.txtValue)) {
    throw new AppError("BUSINESS_RULE", `${E}.domainNotVerified`);
  }
  await School.updateOne(
    { _id: ctx.schoolId },
    { customDomainVerifiedAt: new Date() },
  );
}
