import { getTranslations } from "next-intl/server";
import { AppError } from "@/lib/appError";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/context";
import { addDownload, DownloadTitle } from "@/server/modules/website/downloads";
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
      throw new AppError("VALIDATION", "website.errors.download");
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      throw new AppError("VALIDATION", "website.errors.download");
    const title = DownloadTitle.parse(String(form.get("title") ?? ""));
    const { id } = await addDownload(
      ctx,
      new Uint8Array(await file.arrayBuffer()),
      title,
      file.name,
    );
    await audit(ctx, "website.download.add", {
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
        : t("website.errors.downloadTitle");
    const code = error instanceof AppError ? error.code : "VALIDATION";
    return Response.json(
      { ok: false, error: { code, message } },
      { status: STATUS[code] ?? 400 },
    );
  }
}
