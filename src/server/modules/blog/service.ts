import 'server-only';
import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, TableQuery } from '@/lib/tableQuery';
import { todayIn } from '@/lib/dates';
import { AppError } from '@/lib/appError';
import { COVERS, IMAGE_PATH, readingMinutes, sectionsToHtml, textOf, TOPICS } from '@/features/marketing/posts';
import { connectDb } from '@/server/db/connect';
import { paginate, textMatch } from '@/server/db/paginate';
import { BlogPost } from '@/server/models/blogPost';
import { User } from '@/server/models/user';
import { DATE_STR } from '@/server/models/shared';

const E = 'platform.blog.errors';
export const PostId = z.string().regex(/^[0-9a-f]{24}$/, `${E}.notFound`);

const ALLOWED_TAGS = ['h2', 'h3', 'h4', 'p', 'br', 'hr', 'strong', 'em', 'u', 's', 'blockquote', 'ul', 'ol', 'li', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'];

// The editor's HTML crosses a trust boundary: only the tags above, and only pictures this blog stored, survive.
const sanitizeContent = (html: string) =>
  sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ['href', 'target', 'rel'], img: ['src', 'alt'], th: ['colspan', 'rowspan'], td: ['colspan', 'rowspan'], '*': ['style'] },
    allowedStyles: { '*': { 'text-align': [/^(left|center|right|justify)$/] } },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }) },
    exclusiveFilter: (frame) => frame.tag === 'img' && !IMAGE_PATH.test(frame.attribs.src ?? ''),
  });

const list = (max: number, length: number, key: string) => z.array(z.string().trim().min(1, key).max(length, key)).max(max, key);

export const PostInput = z.object({
  title: z.string().trim().min(3, `${E}.title`).max(120, `${E}.title`),
  slug: z.string().trim().max(80, `${E}.slug`).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, `${E}.slug`),
  summary: z.string().trim().min(10, `${E}.summary`).max(300, `${E}.summary`),
  topic: z.enum(TOPICS, `${E}.topic`),
  cover: z.enum(COVERS, `${E}.cover`).default('dashboard'),
  coverImage: z.string().regex(IMAGE_PATH, `${E}.image`).or(z.literal('')).default(''),
  publishedOn: z.string().regex(DATE_STR, `${E}.date`),
  status: z.enum(['draft', 'published']),
  tags: list(10, 30, `${E}.tags`).default([]),
  seoTitle: z.string().trim().max(60, `${E}.seoTitle`).default(''),
  seoDescription: z.string().trim().max(160, `${E}.seoDescription`).default(''),
  keywords: list(10, 40, `${E}.keywords`).default([]),
  jsonLd: z
    .string()
    .trim()
    .max(10_000, `${E}.jsonLd`)
    .refine((text) => {
      if (!text) return true;
      try {
        return typeof JSON.parse(text) === 'object';
      } catch {
        return false;
      }
    }, `${E}.jsonLd`)
    .default(''),
  content: z
    .string()
    .max(300_000, `${E}.body`)
    .transform(sanitizeContent)
    .refine((html) => textOf(html).length > 0, `${E}.body`),
});
export type PostInput = z.input<typeof PostInput>;

export const ListPosts = TableQuery;
export type ListPosts = z.infer<typeof ListPosts>;

export type PostRow = { id: string; title: string; topic: string; status: 'draft' | 'published'; publishedOn: string };

export async function listPosts(query: ListPosts) {
  const { rows, ...page } = await paginate(BlogPost, textMatch(query.q, ['title', 'slug']), {
    sortField: 'publishedOn',
    descending: true,
    select: ['title', 'topic', 'status', 'publishedOn'],
    limit: query.pageSize ?? DEFAULT_PAGE_SIZE,
    cursor: query.cursor,
  });
  const posts: PostRow[] = rows.map((row) => ({
    id: String(row._id),
    title: row.title,
    topic: row.topic,
    status: row.status,
    publishedOn: row.publishedOn,
  }));
  return { rows: posts, ...page };
}

type Stored = { content?: string | null; sections?: { heading: string; paragraphs: string[] }[] };
const htmlOf = ({ content, sections = [] }: Stored) => content ?? sectionsToHtml(sections);
const day = (date: Date) => date.toISOString().slice(0, 10);

export async function getPost(id: string) {
  if (!PostId.safeParse(id).success) return null;
  const post = await BlogPost.findById(id).lean();
  if (!post) return null;
  const author = post.createdBy ? await User.findById(post.createdBy).select('name').lean() : null;
  return {
    id,
    title: post.title,
    slug: post.slug,
    summary: post.summary,
    topic: post.topic,
    cover: post.cover,
    coverImage: post.coverImage ?? '',
    publishedOn: post.publishedOn,
    status: post.status,
    tags: post.tags ?? [],
    seoTitle: post.seoTitle ?? '',
    seoDescription: post.seoDescription ?? '',
    keywords: post.keywords ?? [],
    jsonLd: post.jsonLd ?? '',
    content: htmlOf(post),
    author: author?.name ?? '',
    createdOn: day(post.createdAt),
    updatedOn: day(post.updatedAt),
  };
}

export async function createPost(userId: string, input: z.output<typeof PostInput>) {
  const post = await BlogPost.create({ ...input, createdBy: userId, updatedBy: userId });
  return { id: String(post._id) };
}

export async function updatePost(userId: string, id: string, input: z.output<typeof PostInput>) {
  const post = await BlogPost.findByIdAndUpdate(id, { ...input, updatedBy: userId, $unset: { sections: '' } }, { runValidators: true })
    .select('status')
    .lean();
  if (!post) throw new AppError('NOT_FOUND', `${E}.notFound`);
  return { before: { status: post.status } };
}

export async function deletePost(id: string) {
  const post = await BlogPost.findByIdAndDelete(id).select('title').lean();
  if (!post) throw new AppError('NOT_FOUND', `${E}.notFound`);
  return { title: post.title };
}

const visible = () => ({ status: 'published' as const, publishedOn: { $lte: todayIn('Asia/Kolkata') } });
const shape = (post: Stored & { slug: string; title: string; summary: string; topic: string; cover: string; coverImage?: string | null; publishedOn: string }) => ({
  slug: post.slug,
  title: post.title,
  summary: post.summary,
  topic: post.topic,
  cover: post.cover,
  coverImage: post.coverImage ?? '',
  date: post.publishedOn,
  minutes: readingMinutes(htmlOf(post)),
});

export async function listPublishedPosts() {
  await connectDb();
  const posts = await BlogPost.find(visible()).sort({ publishedOn: -1, _id: -1 }).lean();
  return posts.map(shape);
}

export async function getPublishedPost(slug: string) {
  await connectDb();
  const post = await BlogPost.findOne({ ...visible(), slug }).lean();
  return (
    post && {
      ...shape(post),
      content: htmlOf(post),
      tags: post.tags ?? [],
      seoTitle: post.seoTitle || post.title,
      seoDescription: post.seoDescription || post.summary,
      keywords: post.keywords ?? [],
      jsonLd: post.jsonLd ?? '',
    }
  );
}
