import "server-only";
import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { z } from "zod";
import { AppError } from "@/lib/appError";
import type { RequestContext } from "@/server/auth/context";
import {
  MAX_DOWNLOADS,
  WebsiteDownload,
} from "@/server/models/websiteDownload";
import {
  detectFileKind,
  putFile,
  removeFile,
  safeFileName,
} from "@/server/storage/store";

const E = "website.errors";

export const DownloadTitle = z
  .string()
  .trim()
  .min(1, `${E}.downloadTitle`)
  .max(80, `${E}.downloadTitle`);

export async function addDownload(
  ctx: RequestContext,
  bytes: Uint8Array,
  title: string,
  fileName: string,
) {
  const { schoolId } = ctx;
  const kind = detectFileKind(bytes);
  if (kind?.mime !== "application/pdf") {
    throw new AppError("VALIDATION", `${E}.download`);
  }
  if ((await WebsiteDownload.countDocuments({ schoolId })) >= MAX_DOWNLOADS) {
    throw new AppError("BUSINESS_RULE", `${E}.downloadsFull`, {
      max: MAX_DOWNLOADS,
    });
  }
  const _id = new Types.ObjectId();
  const storageKey = `${schoolId}/${_id}/${randomUUID()}.pdf`;
  await putFile(storageKey, bytes);
  await WebsiteDownload.create({
    _id,
    schoolId,
    title,
    storageKey,
    fileName: safeFileName(fileName, "pdf"),
    size: bytes.length,
    createdBy: ctx.userId,
    updatedBy: ctx.userId,
  });
  return { id: String(_id) };
}

export async function removeDownload(ctx: RequestContext, id: string) {
  const item = await WebsiteDownload.findOneAndDelete({
    schoolId: ctx.schoolId,
    _id: id,
  })
    .select("storageKey")
    .lean();
  if (!item) throw new AppError("NOT_FOUND", `${E}.notFound`);
  await removeFile(item.storageKey).catch(() => undefined);
}

export async function listDownloads(ctx: RequestContext) {
  const items = await WebsiteDownload.find({ schoolId: ctx.schoolId })
    .sort({ createdAt: -1 })
    .select("title size")
    .lean();
  return items.map((item) => ({
    id: String(item._id),
    title: item.title,
    size: item.size,
  }));
}
