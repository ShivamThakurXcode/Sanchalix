import "server-only";
import { Schema } from "mongoose";
import { audit, defineTenantModel } from "./shared";

export const MAX_DOWNLOADS = 10;

const schema = new Schema(
  {
    title: { type: String, required: true, maxlength: 80 },
    storageKey: { type: String, required: true },
    fileName: { type: String, required: true, maxlength: 100 },
    size: { type: Number, required: true },
    ...audit,
  },
  { timestamps: true },
);

schema.index({ schoolId: 1, createdAt: -1 });

export const WebsiteDownload = defineTenantModel(
  "WebsiteDownload",
  schema,
  "websiteDownloads",
);
