import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import Link from '@cloudscape-design/components/link';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getEntry, PublicPage } from '@/features/marketing/PublicPage';
import { postDate } from '@/features/marketing/posts';
import { getPublishedPost, listPublishedPosts } from '@/server/modules/blog/service';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const post = await getPublishedPost((await params).slug);
  return post ? { title: post.title, description: post.summary } : {};
}

export default async function BlogPostPage({ params }: Props) {
  const post = await getPublishedPost((await params).slug);
  if (!post) notFound();
  const [t, tMarketing, enter, posts] = await Promise.all([
    getTranslations('marketing.blog'),
    getTranslations('marketing'),
    getEntry(),
    listPublishedPosts(),
  ]);
  const others = posts.filter(({ slug }) => slug !== post.slug).slice(0, 3);

  return (
    <PublicPage>
      <ContentLayout
        defaultPadding
        disableOverlap
        maxContentWidth={760}
        headerVariant="high-contrast"
        header={
          <Box padding={{ vertical: 'xl' }}>
            <SpaceBetween size="s">
              <Link href="/blog" color="inverted">
                {t('back')}
              </Link>
              <Box variant="awsui-key-label" color="inherit">
                {t(`topics.${post.topic}`)}
              </Box>
              <Box variant="h1" fontSize="display-l" fontWeight="bold">
                {post.title}
              </Box>
              <Box variant="p" fontSize="heading-m" color="inherit">
                {post.summary}
              </Box>
              <Box color="inherit" fontSize="body-s">
                {t('meta', { date: postDate(post.date), minutes: post.minutes })}
              </Box>
            </SpaceBetween>
          </Box>
        }
      >
        <Box padding={{ vertical: 'xl' }}>
          <SpaceBetween size="xxl">
            <article>
              <SpaceBetween size="xl">
                {post.sections.map(({ heading, paragraphs }) => (
                  <section key={heading}>
                    <SpaceBetween size="s">
                      <Box variant="h2">{heading}</Box>
                      {paragraphs.map((paragraph) => (
                        <Box key={paragraph} variant="p" fontSize="heading-s" fontWeight="normal">
                          {paragraph}
                        </Box>
                      ))}
                    </SpaceBetween>
                  </section>
                ))}
              </SpaceBetween>
            </article>

            {others.length > 0 && (
              <Container header={<Header variant="h2">{t('more')}</Header>}>
                <SpaceBetween size="m">
                  {others.map(({ slug, title, date, minutes }) => (
                    <div key={slug}>
                      <Link href={`/blog/${slug}`} fontSize="heading-s">
                        {title}
                      </Link>
                      <Box color="text-body-secondary" fontSize="body-s">
                        {t('meta', { date: postDate(date), minutes })}
                      </Box>
                    </div>
                  ))}
                </SpaceBetween>
              </Container>
            )}

            <Container>
              <SpaceBetween size="m" alignItems="center">
                <Box variant="h2" textAlign="center">
                  {tMarketing('cta.title')}
                </Box>
                <Box color="text-body-secondary" textAlign="center">
                  {tMarketing('cta.body')}
                </Box>
                <Button variant="primary" href={enter.href}>
                  {enter.text}
                </Button>
              </SpaceBetween>
            </Container>
          </SpaceBetween>
        </Box>
      </ContentLayout>
    </PublicPage>
  );
}
