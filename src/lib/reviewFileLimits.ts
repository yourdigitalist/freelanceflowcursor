/** Shared limits for approval (review) file uploads. */
export const REVIEW_FILE_MAX_SIZE_BYTES = 20 * 1024 * 1024;
export const REVIEW_FILE_MAX_SIZE_MB = 20;
/** Soft guidance — batches above this show a warning in the UI. */
export const REVIEW_FILE_BATCH_WARN_BYTES = 80 * 1024 * 1024;

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function totalFileSize(files: File[]): number {
  return files.reduce((sum, f) => sum + f.size, 0);
}
