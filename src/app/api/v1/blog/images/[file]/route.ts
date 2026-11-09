import { getFile } from '@/server/storage/store';

const MIME: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

// Public on purpose: the pictures belong to posts on the public blog. The name is a random UUID, so it is never reused.
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const ext = /^[0-9a-f-]{36}\.(jpg|png|webp)$/.exec(file)?.[1];
  if (!ext) return new Response(null, { status: 404 });
  try {
    const bytes = await getFile(`blog/${file}`);
    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': MIME[ext] as string,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
