import { notFound, permanentRedirect } from "next/navigation";
import { getMovedSlug } from "@/server/modules/website/public";
import { siteUrl } from "@/server/modules/website/service";

/** A page for an address nobody has: forward to the school's new address if it moved, otherwise 404. */
export async function notFoundOrMoved(slug: string, path = ""): Promise<never> {
  const moved = await getMovedSlug(slug);
  if (moved) permanentRedirect(`${siteUrl(moved)}${path}`);
  notFound();
}
