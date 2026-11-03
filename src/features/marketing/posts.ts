export const TOPICS = ['fees', 'attendance', 'admissions', 'exams', 'gettingStarted', 'timetable'] as const;
// Pictures from the page banners in public/banners, until a post can carry its own.
export const COVERS = ['dashboard', 'students', 'admissions', 'attendance', 'timetable', 'exams', 'reportCards', 'feeCounter', 'announcements', 'homework'] as const;

export type PostSection = { heading: string; paragraphs: string[] };

const day = new Intl.DateTimeFormat('en-IN', { dateStyle: 'long', timeZone: 'UTC' });
export const postDate = (date: string) => day.format(new Date(`${date}T00:00:00Z`));

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const sectionsToHtml = (sections: PostSection[]) =>
  sections
    .map(({ heading, paragraphs }) => `<h2>${escapeHtml(heading)}</h2>${paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`).join('')}`)
    .join('');

export const textOf = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

export const readingMinutes = (html: string) => Math.max(1, Math.round(textOf(html).split(' ').length / 200));

export const IMAGE_PATH = /^\/api\/v1\/blog\/images\/[0-9a-f-]{36}\.(jpg|png|webp)$/;
