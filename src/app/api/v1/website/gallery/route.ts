import { getTranslations } from "next-intl/server";
import { AppError } from "@/lib/appError";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/context";
import { addGalleryImage, Caption } from "@/server/modules/website/gallery";
import { MAX_FILE_BYTES } from "@/server/storage/store";

const STATUS: Partial<Record<string, number>> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
};

export async function POST(request: Request) {
  try {
    const ctx = await requirePermission("website.manage");
    if (
      Number(request.headers.get("content-length") ?? 0) >
      MAX_FILE_BYTES + 100_000
    ) {
      throw new AppError("VALIDATION", "website.errors.image");
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      throw new AppError("VALIDATION", "website.errors.image");
    const caption = Caption.parse(String(form.get("caption") ?? ""));
    const { id } = await addGalleryImage(
      ctx,
      new Uint8Array(await file.arrayBuffer()),
      caption,
    );
    await audit(ctx, "website.gallery.add", {
      type: "school",
      id: ctx.schoolId,
    });
    return Response.json({ ok: true, data: { id } });
  } catch (error) {
    if (
      !(error instanceof AppError) &&
      !(error instanceof Error && error.name === "ZodError")
    )
      throw error;
    const t = await getTranslations();
    const message =
      error instanceof AppError
        ? t(error.messageKey, error.details)
        : t("website.errors.caption");
    const code = error instanceof AppError ? error.code : "VALIDATION";
    return Response.json(
      { ok: false, error: { code, message } },
      { status: STATUS[code] ?? 400 },
    );
  }
}
