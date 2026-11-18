import "server-only";
import { Schema } from "mongoose";
import { audit, defineTenantModel } from "./shared";

export const MAX_GALLERY_ITEMS = 24;

const schema = new Schema(
  {
    storageKey: { type: String, required: true },
    caption: { type: String, maxlength: 120, default: "" },
    // Lowest first. A photo saved before ordering existed has none and sorts first, newest first.
    order: { type: Number, default: 0 },
    ...audit,
  },
  { timestamps: true },
);

schema.index({ schoolId: 1, createdAt: -1 });

export const GalleryItem = defineTenantModel(
  "GalleryItem",
  schema,
  "galleryItems",
);
