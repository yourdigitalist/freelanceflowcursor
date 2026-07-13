import { supabase } from '@/integrations/supabase/client';
import { REVIEW_FILE_MAX_SIZE_MB } from '@/lib/reviewFileLimits';
import { validateReviewFile } from '@/lib/reviewFileValidation';

/**
 * Upload a file to an approval (review) request.
 * Uploads directly to Supabase Storage (bypasses edge function 6MB body limit).
 */
export async function uploadReviewFile(file: File, reviewRequestId: string): Promise<void> {
  const validation = await validateReviewFile(file);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!userId || !supabaseUrl) {
    throw new Error('Session not available. Please sign in again.');
  }

  const { data: request, error: requestError } = await supabase
    .from('review_requests')
    .select('id')
    .eq('id', reviewRequestId)
    .eq('user_id', userId)
    .maybeSingle();

  if (requestError || !request) {
    throw new Error('Review request not found or access denied');
  }

  const { sanitizedName, extension, mimeType } = validation;
  const storagePath = `${userId}/${reviewRequestId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('review-files')
    .upload(storagePath, file, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    const msg = uploadError.message || 'Upload failed';
    if (/maximum allowed size|too large|payload/i.test(msg)) {
      throw new Error(
        `${file.name}: file exceeds the ${REVIEW_FILE_MAX_SIZE_MB}MB limit. Try exporting JPEG or compressing the image.`,
      );
    }
    throw new Error(`${file.name}: ${msg}`);
  }

  const fileUrl = `${supabaseUrl}/storage/v1/object/review-files/${storagePath}`;
  const { error: dbError } = await supabase.from('review_files').insert({
    review_request_id: reviewRequestId,
    user_id: userId,
    file_url: fileUrl,
    file_name: sanitizedName,
    file_type: mimeType,
    file_size: file.size,
  });

  if (dbError) {
    await supabase.storage.from('review-files').remove([storagePath]);
    throw new Error(`${file.name}: failed to save file record`);
  }
}
