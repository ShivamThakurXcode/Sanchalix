import "server-only";
import { Schema } from "mongoose";
import { DATE_STR, defineTenantModel } from "./shared";

export const VISIT_KINDS = ["home", "apply", "page", "news"] as const;

// Only counts: no address, no cookie, no person. A school sees how many times its pages were opened, never by whom.
const schema = new Schema(
  {
    day: { type: String, required: true, match: DATE_STR },
    kind: { type: String, required: true, enum: VISIT_KINDS },
    count: { type: Number, default: 0 },
    expiresAt: Date,
  },
  { timestamps: false },
);

schema.index({ schoolId: 1, day: 1, kind: 1 }, { unique: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SiteVisit = defineTenantModel("SiteVisit", schema, "siteVisits");
