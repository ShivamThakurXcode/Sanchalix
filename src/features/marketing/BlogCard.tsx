import Box from '@cloudscape-design/components/box';
import Container from '@cloudscape-design/components/container';
import Link from '@cloudscape-design/components/link';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { getTranslations } from 'next-intl/server';
import type { CSSProperties } from 'react';
import { postDate } from '@/features/marketing/posts';

export type BlogCardPost = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  minutes: number;
  topic: string;
  cover: string;
  coverImage: string;
};

export function BlogCover({ cover, coverImage }: Pick<BlogCardPost, 'cover' | 'coverImage'>) {
  return coverImage ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="vw-blog-photo" src={coverImage} alt="" />
  ) : (
    <div className="vw-blog-cover" style={{ '--vw-blog-cover-image': `url(/banners/${cover}.svg)` } as CSSProperties} />
  );
}

export async function BlogCard({ slug, title, summary, date, minutes, topic, cover, coverImage }: BlogCardPost) {
  const t = await getTranslations('marketing.blog');

  return (
    <Container
      fitHeight
      className="vw-blog-card"
      header={
        <div className="vw-blog-topic">
          <Box variant="awsui-key-label" color="inherit">
            {t(`topics.${topic}`)}
          </Box>
          <Box variant="small" color="text-body-secondary">
            {t('readTime', { minutes })}
          </Box>
        </div>
      }
      footer={
        <Box color="text-body-secondary" fontSize="body-s">
          {postDate(date)}
        </Box>
      }
      media={{ position: 'top', height: 180, content: <BlogCover cover={cover} coverImage={coverImage} /> }}
    >
      <SpaceBetween size="xs">
        <Box variant="h2" fontSize="heading-m">
          <Link href={`/blog/${slug}`} fontSize="heading-m">
            {title}
          </Link>
        </Box>
        <Box color="text-body-secondary">{summary}</Box>
      </SpaceBetween>
    </Container>
  );
}
