import "server-only";
import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/appError";
import type { RequestContext } from "@/server/auth/context";
import { Staff } from "@/server/models/staff";
import { Website } from "@/server/models/website";
import { detectFileKind, putFile, removeFile } from "@/server/storage/store";

const E = "website.errors";

/** A teacher's picture for the website. A teacher has at most one; a new one replaces the old. */
export async function setStaffPhoto(
  ctx: RequestContext,
  staffId: string,
  bytes: Uint8Array,
) {
  const { schoolId } = ctx;
  const kind = detectFileKind(bytes);
  if (!kind || !kind.mime.startsWith("image/")) {
    throw new AppError("VALIDATION", `${E}.image`);
  }
  const teacher = await Staff.findOne({
    schoolId,
    _id: staffId,
    type: "teaching",
    status: "active",
  })
    .select("_id")
    .lean();
  if (!teacher) throw new AppError("NOT_FOUND", `${E}.notFound`);

  const key = `${schoolId}/${staffId}/${randomUUID()}.${kind.ext}`;
  await putFile(key, bytes);
  const before = await Website.findOne({ schoolId })
    .select("staffPhotos")
    .lean();
  const old = before?.staffPhotos?.find(
    (photo) => String(photo.staffId) === staffId,
  )?.storageKey;
  // Two steps: one update can't both pull and push the same list.
  await Website.updateOne(
    { schoolId },
    { $pull: { staffPhotos: { staffId } } },
  );
  await Website.updateOne(
    { schoolId },
    { $push: { staffPhotos: { staffId, storageKey: key } } },
    { upsert: true, setDefaultsOnInsert: true },
  );
  if (old) await removeFile(old).catch(() => undefined);
}

export async function removeStaffPhoto(ctx: RequestContext, staffId: string) {
  const { schoolId } = ctx;
  const before = await Website.findOne({ schoolId })
    .select("staffPhotos")
    .lean();
  const old = before?.staffPhotos?.find(
    (photo) => String(photo.staffId) === staffId,
  )?.storageKey;
  if (!old) throw new AppError("NOT_FOUND", `${E}.notFound`);
  await Website.updateOne(
    { schoolId },
    { $pull: { staffPhotos: { staffId } } },
  );
  await removeFile(old).catch(() => undefined);
}
