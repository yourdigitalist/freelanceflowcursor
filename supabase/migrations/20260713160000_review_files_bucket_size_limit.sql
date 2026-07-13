-- Raise per-file limit on review-files bucket (default can block uploads > ~2MB).
UPDATE storage.buckets
SET file_size_limit = 20971520  -- 20 MB
WHERE id = 'review-files';
