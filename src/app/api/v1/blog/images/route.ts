import { randomUUID } from 'node:crypto';
import { getTranslations } from 'next-intl/server';
import { AppError } from '@/lib/appError';
import { requirePlatform } from '@/server/auth/context';
import { detectFileKind, MAX_FILE_BYTES, putFile } from '@/server/storage/store';

const STATUS: Partial<Record<string, number>> = { UNAUTHENTICATED: 401, FORBIDDEN: 403, VALIDATION: 422 };

export async function POST(request: Request) {
  try {
    await requirePlatform('platform.blog.manage');
    if (Number(request.headers.get('content-length') ?? 0) > MAX_FILE_BYTES + 100_000) throw new AppError('VALIDATION', 'platform.blog.errors.image');
    const file = (await request.formData()).get('file');
    if (!(file instanceof File)) throw new AppError('VALIDATION', 'platform.blog.errors.image');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = detectFileKind(bytes);
    if (!kind || kind.ext === 'pdf') throw new AppError('VALIDATION', 'platform.blog.errors.image');
    const name = `${randomUUID()}.${kind.ext}`;
    await putFile(`blog/${name}`, bytes);
    return Response.json({ ok: true, data: { url: `/api/v1/blog/images/${name}` } });
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
    const t = await getTranslations();
    return Response.json({ ok: false, error: { code: error.code, message: t(error.messageKey, error.details) } }, { status: STATUS[error.code] ?? 400 });
  }
}
