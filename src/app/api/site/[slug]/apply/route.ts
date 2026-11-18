import { withAction } from "@/server/action";
import { submitApplication } from "@/server/modules/website/apply";

const STATUS: Partial<Record<string, number>> = {
  NOT_FOUND: 404,
  VALIDATION: 422,
  RATE_LIMITED: 429,
};

// Public on purpose: a family applying has no account. See submitApplication for what protects it.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const raw: unknown = await request.json().catch(() => null);
  const result = await withAction("website.apply", async () =>
    submitApplication((await params).slug, raw),
  );
  return Response.json(result, {
    status: result.ok ? 200 : (STATUS[result.error.code] ?? 400),
  });
}
