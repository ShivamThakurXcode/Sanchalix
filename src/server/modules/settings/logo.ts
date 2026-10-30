import 'server-only';
import { randomUUID } from 'node:crypto';
import { AppError } from '@/lib/appError';
import type { RequestContext } from '@/server/auth/context';
import { School } from '@/server/models/school';
import { detectFileKind, getFile, putFile, removeFile } from '@/server/storage/store';

const E = 'settings.errors';

export async function saveLogo(ctx: RequestContext, bytes: Uint8Array) {
  const kind = detectFileKind(bytes);
  if (!kind || !kind.mime.startsWith('image/')) throw new AppError('VALIDATION', `${E}.logo`);
  // The store's keys are school/owner/uuid; the school is the owner of its logo.
  const key = `${ctx.schoolId}/${ctx.schoolId}/${randomUUID()}.${kind.ext}`;
  await putFile(key, bytes);
  const before = await School.findOneAndUpdate({ _id: ctx.schoolId }, { logoUrl: key }).select('logoUrl').lean();
  if (before?.logoUrl) await removeFile(before.logoUrl).catch(() => undefined);
}

export async function removeLogo(ctx: RequestContext) {
  const before = await School.findOneAndUpdate({ _id: ctx.schoolId }, { logoUrl: null }).select('logoUrl').lean();
  if (before?.logoUrl) await removeFile(before.logoUrl).catch(() => undefined);
}

export async function readLogo(ctx: RequestContext) {
  const school = await School.findById(ctx.schoolId).select('logoUrl').lean();
  if (!school?.logoUrl) throw new AppError('NOT_FOUND', `${E}.notFound`);
  const ext = school.logoUrl.split('.').pop();
  return { bytes: await getFile(school.logoUrl), mime: ext === 'jpg' ? 'image/jpeg' : `image/${ext}` };
}
