DROP POLICY IF EXISTS "subjects read" ON public.subjects;
CREATE POLICY "subjects read staff" ON public.subjects FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));