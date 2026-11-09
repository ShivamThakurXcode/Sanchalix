import Box from '@cloudscape-design/components/box';
import Container from '@cloudscape-design/components/container';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { getTranslations } from 'next-intl/server';
import type { CSSProperties } from 'react';
import { GuideNav } from '@/features/marketing/GuideNav';
import { PublicPage } from '@/features/marketing/PublicPage';

export async function generateMetadata() {
  const t = await getTranslations('marketing.guide');
  return { title: t('title'), description: t('description') };
}

const GROUPS = [
  { key: 'platform', sections: ['overview', 'signin', 'shell', 'start', 'privacy'] },
  { key: 'roles', sections: ['schoolAdmin', 'principal', 'teacher', 'accountant', 'student', 'parent', 'superAdmin'] },
  {
    key: 'modules',
    sections: ['students', 'promotion', 'staff', 'academics', 'attendance', 'exams', 'homework', 'calendar', 'fees', 'communication', 'reports', 'users', 'settings'],
  },
  { key: 'more', sections: ['access', 'phone', 'help'] },
] as const;

export default async function GuidePage() {
  const t = await getTranslations('marketing.guide');
  const groups = GROUPS.map(({ key, sections }) => ({
    key,
    title: t(`groups.${key}`),
    items: sections.map((id) => ({ id, text: t(`sections.${id}.title`) })),
  }));

  return (
    <PublicPage>
      <ContentLayout
        defaultPadding
        disableOverlap
        maxContentWidth={1240}
        headerVariant="high-contrast"
        header={
          <Box padding={{ vertical: 'xl' }}>
            <SpaceBetween size="s">
              <Box variant="h1" fontSize="display-l" fontWeight="bold">
                {t('title')}
              </Box>
              <Box variant="p" fontSize="heading-m" color="inherit">
                {t('description')}
              </Box>
            </SpaceBetween>
          </Box>
        }
      >
        <Box padding={{ vertical: 'xl' }}>
          <div className="vw-guide">
            <aside className="vw-guide-nav">
              <GuideNav label={t('onThisPage')} groups={groups} />
            </aside>
            <div className="vw-guide-content">
              <SpaceBetween size="xxl">
                {groups.map(({ key, title, items }) => (
                  <SpaceBetween key={key} size="l">
                    <Box variant="h2" fontSize="heading-xl">
                      {title}
                    </Box>
                    {items.map(({ id, text }) => {
                      const points = t.raw(`sections.${id}.points`) as string[];
                      return (
                        <section key={id} id={id} aria-labelledby={`${id}-heading`}>
                          <Container header={<Header variant="h2" description={t(`sections.${id}.body`)}><span id={`${id}-heading`}>{text}</span></Header>}>
                            <SpaceBetween size="m">
                              {t.has(`sections.${id}.image`) && (
                                <div
                                  role="img"
                                  aria-label={t(`sections.${id}.image`)}
                                  className="vw-guide-figure"
                                  style={{ '--vw-guide-image': `url(/guide/${id}.svg)` } as CSSProperties}
                                />
                              )}
                              <ul className="vw-guide-list">
                                {points.map((point) => (
                                  <li key={point}>{point}</li>
                                ))}
                              </ul>
                              {t.has(`sections.${id}.who`) && (
                                <div>
                                  <Box variant="awsui-key-label">{t('usedBy')}</Box>
                                  <Box color="text-body-secondary">{t(`sections.${id}.who`)}</Box>
                                </div>
                              )}
                            </SpaceBetween>
                          </Container>
                        </section>
                      );
                    })}
                  </SpaceBetween>
                ))}
              </SpaceBetween>
            </div>
          </div>
        </Box>
      </ContentLayout>
    </PublicPage>
  );
}
