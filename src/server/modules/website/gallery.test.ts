import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, expect, it } from "vitest";
import type { RequestContext } from "@/server/auth/context";
import { connectDb } from "@/server/db/connect";
import { GalleryItem } from "@/server/models/galleryItem";
import { listGallery, moveGalleryImage } from "./gallery";

const ctxOf = (): RequestContext => ({
  userId: new Types.ObjectId(),
  name: "Office",
  role: "school_admin",
  scope: "school",
  schoolId: new Types.ObjectId(),
});
let ctx: RequestContext;
let other: RequestContext;
let ids: string[];

const photo = (schoolId: Types.ObjectId, caption: string, extra: object = {}) =>
  GalleryItem.create({
    schoolId,
    storageKey: `${schoolId}/${schoolId}/x.png`,
    caption,
    ...extra,
  });

beforeAll(async () => {
  await connectDb();
  ctx = ctxOf();
  other = ctxOf();
  // Saved before ordering existed: no order, so newest first.
  const first = await photo(ctx.schoolId, "first", {
    createdAt: new Date(2026, 0, 1),
  });
  const second = await photo(ctx.schoolId, "second", {
    createdAt: new Date(2026, 0, 2),
  });
  const third = await photo(ctx.schoolId, "third", {
    createdAt: new Date(2026, 0, 3),
  });
  ids = [first, second, third].map((item) => String(item._id));
});

afterAll(() => mongoose.disconnect());

it("lists photos with no order newest first", async () => {
  expect((await listGallery(ctx)).map((item) => item.caption)).toEqual([
    "third",
    "second",
    "first",
  ]);
});

it("moves a photo and numbers them all, and ignores a move past either end", async () => {
  const order = async () =>
    (await listGallery(ctx)).map((item) => item.caption);
  await moveGalleryImage(ctx, ids[0] as string, -1);
  expect(await order()).toEqual(["third", "first", "second"]);
  await moveGalleryImage(ctx, ids[2] as string, -1);
  expect(await order()).toEqual(["third", "first", "second"]);
  await moveGalleryImage(ctx, ids[2] as string, 1);
  expect(await order()).toEqual(["first", "third", "second"]);
});

it("won't move another school's photo", async () => {
  await expect(
    moveGalleryImage(other, ids[0] as string, 1),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});
