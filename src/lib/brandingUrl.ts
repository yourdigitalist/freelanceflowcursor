/** Append cache-busting query param so replaced storage assets do not flash stale images. */
export function brandingAssetUrl(
  url: string | null | undefined,
  updatedAt: string | null | undefined,
): string | undefined {
  if (!url?.trim()) return undefined;
  const base = url.trim();
  if (!updatedAt) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}v=${encodeURIComponent(updatedAt)}`;
}
