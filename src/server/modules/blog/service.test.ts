import { describe, expect, it } from 'vitest';
import { PostInput } from './service';

const base = { title: 'A post', slug: 'a-post', summary: 'A summary of the post.', topic: 'fees', publishedOn: '2026-11-03', status: 'draft' };
const image = '/api/v1/blog/images/0b4f3c1e-5d2a-4c3b-8f6e-1a2b3c4d5e6f.png';

describe('PostInput content', () => {
  it('keeps formatting and this blog\'s pictures', () => {
    const { content } = PostInput.parse({ ...base, content: `<h2 style="text-align: center">Hi</h2><p><strong>Bold</strong></p><img src="${image}" alt="x">` });
    expect(content).toContain('<strong>Bold</strong>');
    expect(content).toContain('text-align:center');
    expect(content).toContain(image);
  });

  it('strips scripts, event handlers, foreign pictures and unsafe links', () => {
    const { content } = PostInput.parse({
      ...base,
      content: '<p onclick="x()">Hi<script>alert(1)</script></p><img src="https://evil.test/a.png"><img src="//evil.test/a.png"><a href="javascript:alert(1)">go</a>',
    });
    expect(content).toBe('<p>Hi</p><a rel="noopener noreferrer">go</a>');
  });

  it('rejects a post with no text and invalid JSON-LD', () => {
    expect(PostInput.safeParse({ ...base, content: '<p> </p>' }).success).toBe(false);
    expect(PostInput.safeParse({ ...base, content: '<p>Hi</p>', jsonLd: '{nope' }).success).toBe(false);
    expect(PostInput.safeParse({ ...base, content: '<p>Hi</p>', jsonLd: '{"@type":"FAQPage"}' }).success).toBe(true);
  });
});
