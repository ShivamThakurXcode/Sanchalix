"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withAction } from "@/server/action";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/context";
import { DomainInput, saveCustomDomain, verifyCustomDomain } from "./domain";
import { GalleryId, moveGalleryImage } from "./gallery";
import { saveWebsite, setWebsiteStatus, WebsiteInput } from "./service";

export async function updateWebsite(input: unknown) {
  return withAction("website.update", async () => {
    const ctx = await requirePermission("website.manage");
    const data = WebsiteInput.parse(input);
    const { before } = await saveWebsite(ctx, data);
    await audit(
      ctx,
      "website.update",
      { type: "school", id: ctx.schoolId },
      { before: { slug: before }, after: { slug: data.slug } },
    );
    revalidatePath("/", "layout");
    return { slug: data.slug };
  });
}

export async function publishWebsite(input: unknown) {
  return withAction("website.publish", async () => {
    const ctx = await requirePermission("website.manage");
    const { published } = z.object({ published: z.boolean() }).parse(input);
    const { before } = await setWebsiteStatus(
      ctx,
      published ? "published" : "draft",
    );
    await audit(
      ctx,
      "website.publish",
      { type: "school", id: ctx.schoolId },
      {
        before: { status: before },
        after: { status: published ? "published" : "draft" },
      },
    );
    revalidatePath("/", "layout");
    return { published };
  });
}

export async function moveGalleryPhoto(input: unknown) {
  return withAction("website.gallery.move", async () => {
    const ctx = await requirePermission("website.manage");
    const { id, by } = z
      .object({ id: GalleryId, by: z.union([z.literal(-1), z.literal(1)]) })
      .parse(input);
    await moveGalleryImage(ctx, id, by);
    revalidatePath("/", "layout");
    return { id };
  });
}

export async function saveDomain(input: unknown) {
  return withAction("website.domain.save", async () => {
    const ctx = await requirePermission("website.manage");
    const { domain } = DomainInput.parse(input);
    const { before } = await saveCustomDomain(ctx, domain);
    await audit(
      ctx,
      "website.domain.save",
      { type: "school", id: ctx.schoolId },
      { before: { domain: before }, after: { domain } },
    );
    revalidatePath("/", "layout");
    return { domain };
  });
}

export async function verifyDomain() {
  return withAction("website.domain.verify", async () => {
    const ctx = await requirePermission("website.manage");
    await verifyCustomDomain(ctx);
    await audit(ctx, "website.domain.verify", {
      type: "school",
      id: ctx.schoolId,
    });
    revalidatePath("/", "layout");
    return { verified: true };
  });
}
