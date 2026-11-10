import mongoose, { Types } from 'mongoose';
import { afterAll, beforeAll, expect, it } from 'vitest';
import type { RequestContext } from '@/server/auth/context';
import { connectDb } from '@/server/db/connect';
import { AcademicYear } from '@/server/models/academicYear';
import { School } from '@/server/models/school';
import { getOnboarding, markOnboardingComplete } from './service';

const ADDRESS = { line1: '12 School Road', city: 'Bhopal', state: 'Madhya Pradesh', pincode: '462001', country: 'IN' };
let ctx: RequestContext;
let other: RequestContext;

const seed = async (code: string): Promise<RequestContext> => {
  const school = await School.create({ organizationId: new Types.ObjectId(), name: `School ${code}`, code, board: 'CBSE', address: ADDRESS });
  await AcademicYear.create({ schoolId: school._id, label: '2026–27', startDate: '2026-04-01', endDate: '2027-03-31', status: 'current' });
  return { userId: new Types.ObjectId(), name: 'Office', role: 'school_admin', scope: 'school', schoolId: school._id };
};

beforeAll(async () => {
  await connectDb();
  await Promise.all([AcademicYear, School].map((model) => model.init()));
  const stamp = Date.now().toString(36).slice(-5).toUpperCase();
  ctx = await seed(`O${stamp}`);
  other = await seed(`P${stamp}`);
});

afterAll(() => mongoose.disconnect());

it('stays open until this school finishes setup, and no other school is touched', async () => {
  expect(await getOnboarding(ctx)).toMatchObject({ completed: false, classes: [], subjects: [] });
  await markOnboardingComplete(ctx);
  expect((await getOnboarding(ctx))?.completed).toBe(true);
  expect((await getOnboarding(other))?.completed).toBe(false);
});
