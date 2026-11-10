import mongoose, { Types } from 'mongoose';
import { afterAll, beforeAll, expect, it } from 'vitest';
import type { RequestContext } from '@/server/auth/context';
import { connectDb } from '@/server/db/connect';
import { AcademicYear } from '@/server/models/academicYear';
import { PeriodDefinition } from '@/server/models/periodDefinition';
import { School } from '@/server/models/school';
import { TimetableSlot } from '@/server/models/timetableSlot';
import { getPeriods } from '@/server/modules/timetable/service';
import { getSettings, PeriodsInput, savePeriods, saveYear, SchoolInput, updateSchool, YearInput } from './service';

const ADDRESS = { line1: '12 School Road', city: 'Bhopal', state: 'Madhya Pradesh', pincode: '462001' };
let ctx: RequestContext;
let other: RequestContext;

const seed = async (code: string): Promise<RequestContext> => {
  const school = await School.create({
    organizationId: new Types.ObjectId(),
    name: `School ${code}`,
    code,
    board: 'CBSE',
    address: { ...ADDRESS, country: 'IN' },
  });
  return { userId: new Types.ObjectId(), name: 'Office', role: 'school_admin', scope: 'school', schoolId: school._id };
};

beforeAll(async () => {
  await connectDb();
  await Promise.all([AcademicYear, PeriodDefinition, TimetableSlot, School].map((model) => model.init()));
  const stamp = Date.now().toString(36).slice(-5).toUpperCase();
  ctx = await seed(`L${stamp}`);
  other = await seed(`M${stamp}`);
});

afterAll(() => mongoose.disconnect());

it('saves the school profile and working days for this school only', async () => {
  const input = SchoolInput.parse({ name: ' Green Valley ', address: ADDRESS, workingDays: [5, 1, 1, 3] });
  expect(input.workingDays).toEqual([1, 3, 5]);
  expect(SchoolInput.safeParse({ name: 'X', address: { ...ADDRESS, pincode: '12' }, workingDays: [] }).success).toBe(false);

  await updateSchool(ctx, input);
  expect(await getSettings(ctx)).toMatchObject({ name: 'Green Valley', workingDays: [1, 3, 5] });
  expect(await getSettings(other)).toMatchObject({ workingDays: [1, 2, 3, 4, 5, 6] });
});

it('replaces the default bell schedule, rejects overlaps, and keeps periods the timetable uses', async () => {
  expect(await getPeriods(ctx)).toHaveLength(8);
  const paths = (periods: unknown) => {
    const result = PeriodsInput.safeParse(periods);
    return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
  };
  expect(paths([{ start: '08:00', end: '08:40' }, { start: '08:30', end: '09:10' }])).toEqual(['1.start']);
  expect(paths([{ start: '09:00', end: '08:00' }])).toEqual(['0.end']);

  const three = PeriodsInput.parse([
    { start: '08:00', end: '08:45' },
    { start: '08:45', end: '09:30' },
    { start: '10:00', end: '10:45' },
  ]);
  await savePeriods(ctx, three);
  expect(await getPeriods(ctx)).toEqual(three.map((period, index) => ({ number: index + 1, ...period })));
  expect(await getPeriods(other)).toHaveLength(8);

  await TimetableSlot.create({
    schoolId: ctx.schoolId,
    branchId: new Types.ObjectId(),
    academicYearId: new Types.ObjectId(),
    sectionId: new Types.ObjectId(),
    day: 1,
    period: 3,
    subjectId: new Types.ObjectId(),
    teacherId: new Types.ObjectId(),
  });
  await expect(savePeriods(ctx, three.slice(0, 2))).rejects.toMatchObject({ code: 'BUSINESS_RULE' });
  await expect(savePeriods(ctx, three)).resolves.toMatchObject({ count: 3 });
  expect(await PeriodDefinition.countDocuments({ schoolId: ctx.schoolId })).toBe(1);
});

it('moves the academic year, relabels it and refuses dates that strand a term', async () => {
  await AcademicYear.create({
    schoolId: ctx.schoolId,
    label: '2026–27',
    startDate: '2026-04-01',
    endDate: '2027-03-31',
    status: 'current',
    terms: [{ name: 'Term 1', startDate: '2026-04-01', endDate: '2026-09-30' }],
  });
  expect(YearInput.safeParse({ startDate: '2026-04-01', endDate: '2026-04-01' }).success).toBe(false);

  await expect(saveYear(ctx, { startDate: '2026-06-01', endDate: '2027-03-31' })).rejects.toThrow();
  await saveYear(ctx, { startDate: '2026-03-15', endDate: '2027-03-31' });
  expect((await getSettings(ctx))?.year).toMatchObject({ label: '2026–27', startDate: '2026-03-15' });
  expect((await getSettings(other))?.year).toBeNull();
});
