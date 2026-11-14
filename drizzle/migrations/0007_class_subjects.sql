CREATE TABLE public.class_subjects (
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (class_id, subject_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_subjects TO authenticated;
GRANT ALL ON public.class_subjects TO service_role;
ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "class_subjects read" ON public.class_subjects FOR SELECT TO authenticated USING (public.can_access_class(auth.uid(), class_id));
CREATE POLICY "class_subjects admin write" ON public.class_subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE OR REPLACE FUNCTION public.validate_grade_subject() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.class_subjects cs JOIN public.students s ON s.class_id = cs.class_id WHERE s.id = NEW.student_id AND cs.subject_id = NEW.subject_id) THEN
    RAISE EXCEPTION 'این درس برای کلاس این دانش‌آموز تعریف نشده است';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER grades_validate_subject BEFORE INSERT OR UPDATE OF subject_id, student_id ON public.grades FOR EACH ROW EXECUTE FUNCTION public.validate_grade_subject();