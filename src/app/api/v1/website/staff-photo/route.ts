import { Types } from "mongoose";
import { getTranslations } from "next-intl/server";
import { AppError } from "@/lib/appError";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/context";
import { GalleryId } from "@/server/modules/website/gallery";
import { setStaffPhoto } from "@/server/modules/website/staffPhotos";
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
    const staffId = GalleryId.parse(String(form.get("staffId") ?? ""));
    await setStaffPhoto(ctx, staffId, new Uint8Array(await file.arrayBuffer()));
    await audit(ctx, "website.staffPhoto.set", {
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
      { status: STATUS[code] ?? 400 },
    );
  }
}
