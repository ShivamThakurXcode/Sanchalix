import { getTranslations } from "next-intl/server";
import { AppError } from "@/lib/appError";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/context";
import {
  GalleryId,
  removeGalleryImage,
} from "@/server/modules/website/gallery";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requirePermission("website.manage");
    const id = GalleryId.parse((await params).id);
    await removeGalleryImage(ctx, id);
    await audit(ctx, "website.gallery.remove", {
      type: "school",
      id: ctx.schoolId,
    });
    return Response.json({ ok: true, data: {} });
  } catch (error) {
    if (
      !(error instanceof AppError) &&
      !(error instanceof Error && error.name === "ZodError")
    )
      throw error;
    const t = await getTranslations();
    const code = error instanceof AppError ? error.code : "NOT_FOUND";
    const message =
      error instanceof AppError
        ? t(error.messageKey, error.details)
        : t("website.errors.notFound");
    return Response.json(
      { ok: false, error: { code, message } },
      {
        status:
          code === "NOT_FOUND"
            ? 404
            : code === "FORBIDDEN"
              ? 403
              : code === "UNAUTHENTICATED"
                ? 401
                : 400,
      },
    );
  }
}
