import { Types } from "mongoose";
import { getTranslations } from "next-intl/server";
import { AppError } from "@/lib/appError";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/context";
import { GalleryId } from "@/server/modules/website/gallery";
import { removeStaffPhoto } from "@/server/modules/website/staffPhotos";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ staffId: string }> },
) {
  try {
    const ctx = await requirePermission("website.manage");
    const staffId = GalleryId.parse((await params).staffId);
    await removeStaffPhoto(ctx, staffId);
    await audit(ctx, "website.staffPhoto.remove", {
      type: "staff",
      id: new Types.ObjectId(staffId),
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
