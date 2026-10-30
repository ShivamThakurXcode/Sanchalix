import { getTranslations } from 'next-intl/server';
import { AppError } from '@/lib/appError';
import { audit } from '@/server/audit';
import { getContext, requirePermission } from '@/server/auth/context';
import { readLogo, removeLogo, saveLogo } from '@/server/modules/settings/logo';
import { MAX_FILE_BYTES } from '@/server/storage/store';

const STATUS: Partial<Record<string, number>> = { UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, VALIDATION: 422 };

async function failure(error: unknown) {
  if (!(error instanceof AppError)) throw error;
  const t = await getTranslations();
  return Response.json(
    { ok: false, error: { code: error.code, message: t(error.messageKey, error.details) } },
    { status: STATUS[error.code] ?? 400 },
  );
}

export async function GET() {
  try {
    const ctx = await getContext();
    if (!ctx) throw new AppError('UNAUTHENTICATED', 'errors.unauthenticated');
    const logo = await readLogo(ctx);
    return new Response(new Uint8Array(logo.bytes), {
      headers: {
        'Content-Type': logo.mime,
        // The header asks for it as ?v=<file name>, so a new logo is a new address and the old one can be kept.
        'Cache-Control': 'private, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requirePermission('settings.school.update');
    if (Number(request.headers.get('content-length') ?? 0) > MAX_FILE_BYTES + 100_000) {
      throw new AppError('VALIDATION', 'settings.errors.logo');
    }
    const file = (await request.formData()).get('file');
    if (!(file instanceof File)) throw new AppError('VALIDATION', 'settings.errors.logo');
    await saveLogo(ctx, new Uint8Array(await file.arrayBuffer()));
    await audit(ctx, 'settings.logo.update', { type: 'school', id: ctx.schoolId });
    return Response.json({ ok: true, data: {} });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE() {
  try {
    const ctx = await requirePermission('settings.school.update');
    await removeLogo(ctx);
    await audit(ctx, 'settings.logo.remove', { type: 'school', id: ctx.schoolId });
    return Response.json({ ok: true, data: {} });
  } catch (error) {
    return failure(error);
  }
}
