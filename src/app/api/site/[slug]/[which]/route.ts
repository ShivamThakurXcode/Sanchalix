import { AppError } from "@/lib/appError";
import { getContext } from "@/server/auth/context";
import { can } from "@/server/auth/permissions";
import {
  readSiteDownload,
  readSiteImage,
} from "@/server/modules/website/public";

const SAFE = {
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; sandbox",
};

// Open to anyone on purpose: it serves the logo, gallery photos and PDF downloads of a published school website, and
// nothing else. `dl-{id}` is a download; anything else is a picture.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; which: string }> },
) {
  const [{ slug, which }, ctx] = await Promise.all([params, getContext()]);
  const previewFor =
    ctx && can(ctx.role, "website.manage") ? ctx.schoolId : undefined;
  try {
    if (which.startsWith("dl-")) {
      const file = await readSiteDownload(slug, which.slice(3), previewFor);
      return new Response(new Uint8Array(file.bytes), {
        headers: {
          ...SAFE,
          "Content-Type": "application/pdf",
          // The name was cleaned to letters, digits and a few marks when it was saved.
          "Content-Disposition": `attachment; filename="${file.fileName}"`,
          "Cache-Control": file.preview
            ? "private, no-store"
            : "public, max-age=300",
        },
      });
    }
    const image = await readSiteImage(slug, which, previewFor);
    return new Response(new Uint8Array(image.bytes), {
      headers: {
        ...SAFE,
        "Content-Type": image.mime,
        "Cache-Control": image.preview
          ? "private, no-store"
          : "public, max-age=300",
      },
    });
  } catch (error) {
    if (error instanceof AppError) return new Response(null, { status: 404 });
    throw error;
  }
}
