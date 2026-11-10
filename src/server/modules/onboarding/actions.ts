'use server';

import 'server-only';
import { withAction } from '@/server/action';
import { audit } from '@/server/audit';
import { requirePermission } from '@/server/auth/context';
import { markOnboardingComplete } from './service';

export async function completeOnboarding() {
  return withAction('settings.onboarding.complete', async () => {
    const ctx = await requirePermission('settings.school.update');
    await markOnboardingComplete(ctx);
    await audit(ctx, 'settings.onboarding.complete', { type: 'school', id: ctx.schoolId }, {});
    return null;
  });
}
