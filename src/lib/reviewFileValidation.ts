import {
  REVIEW_FILE_MAX_SIZE_BYTES,
  REVIEW_FILE_MAX_SIZE_MB,
} from '@/lib/reviewFileLimits';

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const PDF_TYPES = ['application/pdf'];
export const WORD_TYPES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
};

export function sanitizeReviewFileName(filename: string): string {
  return filename
    .replace(/\.\./g, '')
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 255);
}

export function getReviewFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

export function resolveReviewMimeType(declaredType: string, extension: string): string | null {
  if (declaredType && EXT_TO_MIME[extension] === declaredType) return declaredType;
  const inferred = extension ? EXT_TO_MIME[extension] : undefined;
  return inferred ?? null;
}

export function fileMatchesReviewTypes(file: File, allowedTypes: string[]): boolean {
  if (allowedTypes.includes(file.type)) return true;
  const ext = getReviewFileExtension(file.name);
  if (!ext) return false;
  const inferred = EXT_TO_MIME[ext];
  return !!inferred && allowedTypes.includes(inferred);
}

async function verifyMagicBytes(file: File, mimeType: string): Promise<boolean> {
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) return true;
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  return signatures.some((signature) =>
    signature.every((byte, index) => bytes[index] === byte),
  );
}

export type ReviewFileValidationResult =
  | { ok: true; sanitizedName: string; extension: string; mimeType: string }
  | { ok: false; error: string };

export async function validateReviewFile(file: File): Promise<ReviewFileValidationResult> {
  if (file.size === 0) {
    return { ok: false, error: `${file.name}: file is empty` };
  }
  if (file.size > REVIEW_FILE_MAX_SIZE_BYTES) {
    return {
      ok: false,
      error: `${file.name}: too large (max ${REVIEW_FILE_MAX_SIZE_MB}MB per file)`,
    };
  }

  const sanitizedName = sanitizeReviewFileName(file.name);
  const extension = getReviewFileExtension(sanitizedName);
  if (!extension) {
    return { ok: false, error: `${file.name}: file must have an extension` };
  }

  const mimeType = resolveReviewMimeType(file.type, extension);
  if (!mimeType) {
    return {
      ok: false,
      error: `${file.name}: type not allowed (images, PDF, or Word only)`,
    };
  }

  const allowedExtensions: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'application/pdf': ['pdf'],
    'application/msword': ['doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  };
  if (!allowedExtensions[mimeType]?.includes(extension)) {
    return { ok: false, error: `${file.name}: extension does not match file type` };
  }

  const magicOk = await verifyMagicBytes(file, mimeType);
  if (!magicOk) {
    return { ok: false, error: `${file.name}: file content does not match its type` };
  }

  return { ok: true, sanitizedName, extension, mimeType };
}
