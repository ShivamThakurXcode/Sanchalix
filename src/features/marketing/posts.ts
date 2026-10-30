export const TOPICS = ['fees', 'attendance', 'admissions', 'exams', 'gettingStarted', 'timetable'] as const;
// Pictures from the page banners in public/banners, until a post can carry its own.
export const COVERS = ['dashboard', 'students', 'admissions', 'attendance', 'timetable', 'exams', 'reportCards', 'feeCounter', 'announcements', 'homework'] as const;

export type PostSection = { heading: string; paragraphs: string[] };

const day = new Intl.DateTimeFormat('en-IN', { dateStyle: 'long', timeZone: 'UTC' });
export const postDate = (date: string) => day.format(new Date(`${date}T00:00:00Z`));

export const readingMinutes = (sections: PostSection[]) => {
  const words = sections.reduce((sum, { heading, paragraphs }) => sum + `${heading} ${paragraphs.join(' ')}`.split(/\s+/).length, 0);
  return Math.max(1, Math.round(words / 200));
};

/** The editor's text: a line starting `## ` opens a section, and a blank line separates paragraphs. */
export function bodyToSections(body: string): PostSection[] {
  const sections: PostSection[] = [];
  for (const block of body.split(/\n\s*\n/)) {
    const [first = '', ...rest] = block.trim().split('\n');
    const text = (first.startsWith('## ') ? rest : [first, ...rest]).join(' ').replace(/\s+/g, ' ').trim();
    if (first.startsWith('## ')) sections.push({ heading: first.slice(3).trim(), paragraphs: [] });
    if (text) sections.at(-1)?.paragraphs.push(text);
  }
  return sections;
}

export const sectionsToBody = (sections: PostSection[]) =>
  sections.map(({ heading, paragraphs }) => `## ${heading}\n\n${paragraphs.join('\n\n')}`).join('\n\n');
