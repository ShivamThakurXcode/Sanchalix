export async function uploadBlogImage(file: File): Promise<{ url: string } | { error: string }> {
  const body = new FormData();
  body.set('file', file);
  const response = await fetch('/api/v1/blog/images', { method: 'POST', body });
  const result = (await response.json().catch(() => null)) as { ok: boolean; data?: { url: string }; error?: { message: string } } | null;
  return result?.ok && result.data ? { url: result.data.url } : { error: result?.error?.message ?? '' };
}
