/** Shared limits for approval (review) file uploads — must match upload-review-file edge function. */
export const REVIEW_FILE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const REVIEW_FILE_MAX_SIZE_MB = 5;
export const REVIEW_FILE_MAX_UPLOADS_PER_HOUR = 50;

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
