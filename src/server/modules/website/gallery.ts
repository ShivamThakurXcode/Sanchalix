import "server-only";
import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { z } from "zod";
import { AppError } from "@/lib/appError";
import type { RequestContext } from "@/server/auth/context";
import { GalleryItem, MAX_GALLERY_ITEMS } from "@/server/models/galleryItem";
import { detectFileKind, putFile, removeFile } from "@/server/storage/store";

const E = "website.errors";

export const Caption = z.string().trim().max(120, `${E}.caption`);
export const GalleryId = z.string().regex(/^[0-9a-f]{24}$/, `${E}.notFound`);

export async function addGalleryImage(
  ctx: RequestContext,
  bytes: Uint8Array,
  caption: string,
) {
  const { schoolId } = ctx;
  const kind = detectFileKind(bytes);
  if (!kind || !kind.mime.startsWith("image/"))
    throw new AppError("VALIDATION", `${E}.image`);
  if ((await GalleryItem.countDocuments({ schoolId })) >= MAX_GALLERY_ITEMS) {
    throw new AppError("BUSINESS_RULE", `${E}.galleryFull`, {
      max: MAX_GALLERY_ITEMS,
    });
  }
  const last = await GalleryItem.findOne({ schoolId })
    .sort({ order: -1 })
    .select("order")
    .lean();
  const _id = new Types.ObjectId();
  // The store's keys are school/owner/uuid; the gallery item owns its picture.
  const storageKey = `${schoolId}/${_id}/${randomUUID()}.${kind.ext}`;
  await putFile(storageKey, bytes);
  await GalleryItem.create({
    _id,
    schoolId,
    storageKey,
    caption,
    order: (last?.order ?? 0) + 1,
    createdBy: ctx.userId,
    updatedBy: ctx.userId,
  });
  return { id: String(_id) };
}

export async function removeGalleryImage(ctx: RequestContext, id: string) {
  const item = await GalleryItem.findOneAndDelete({
    schoolId: ctx.schoolId,
    _id: id,
  })
    .select("storageKey")
    .lean();
  if (!item) throw new AppError("NOT_FOUND", `${E}.notFound`);
  await removeFile(item.storageKey).catch(() => undefined);
}

export async function listGallery(ctx: RequestContext) {
  const items = await GalleryItem.find({ schoolId: ctx.schoolId })
    .sort({ order: 1, createdAt: -1 })
    .select("caption")
    .lean();
  return items.map((item) => ({
    id: String(item._id),
    caption: item.caption ?? "",
  }));
}

/** Moves one photo a step earlier or later and renumbers them all, so old photos without a number settle in order too. */
export async function moveGalleryImage(
  ctx: RequestContext,
  id: string,
  by: -1 | 1,
) {
  const { schoolId } = ctx;
  const items = await GalleryItem.find({ schoolId })
    .sort({ order: 1, createdAt: -1 })
    .select("_id")
    .lean();
  const ids = items.map((item) => String(item._id));
  const from = ids.indexOf(id);
  if (from === -1) throw new AppError("NOT_FOUND", `${E}.notFound`);
  const to = from + by;
  if (to < 0 || to >= ids.length) return;
  [ids[from], ids[to]] = [ids[to] as string, ids[from] as string];
  await GalleryItem.bulkWrite(
    ids.map((itemId, order) => ({
      updateOne: { filter: { schoolId, _id: itemId }, update: { order } },
    })),
  );
}
