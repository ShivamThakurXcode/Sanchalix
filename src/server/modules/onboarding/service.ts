import 'server-only';
import { AppError } from '@/lib/appError';
import type { RequestContext } from '@/server/auth/context';
import { School } from '@/server/models/school';
import { Section } from '@/server/models/section';
import { listClasses } from '@/server/modules/academics/queries';
import { getSettings } from '@/server/modules/settings/service';
import { listSubjects } from '@/server/modules/timetable/service';

export async function getOnboarding(ctx: RequestContext) {
  const [school, settings, classes, subjects] = await Promise.all([
    School.findById(ctx.schoolId).select('settings.onboardingCompletedAt').lean(),
    getSettings(ctx),
    listClasses(ctx),
    listSubjects(ctx),
  ]);
  if (!school || !settings) return null;
  const sections = await Section.find({ schoolId: ctx.schoolId, classId: { $in: classes.map((item) => item.id) } })
    .select('classId')
    .lean();
  const perClass = Map.groupBy(sections, (section) => String(section.classId));
  return {
    completed: Boolean(school.settings?.onboardingCompletedAt),
    settings,
    classes: classes.map(({ id, name, order }) => ({ id, name, order, sections: perClass.get(id)?.length ?? 0 })),
    subjects,
  };
}

export async function markOnboardingComplete(ctx: RequestContext) {
  const school = await School.findOneAndUpdate(
    { _id: ctx.schoolId },
    { 'settings.onboardingCompletedAt': new Date() },
  )
    .select('_id')
    .lean();
  if (!school) throw new AppError('NOT_FOUND', 'settings.errors.notFound');
}
