CREATE POLICY "Admins can delete any feature_request"
  ON public.feature_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );
