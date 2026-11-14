CREATE TABLE public.class_timetable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  day smallint NOT NULL CHECK (day BETWEEN 0 AND 4),
  period smallint NOT NULL CHECK (period BETWEEN 1 AND 4),
  subject text NOT NULL,
  teacher text NOT NULL DEFAULT '',
  UNIQUE (class_id, day, period)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_timetable TO authenticated;
GRANT ALL ON public.class_timetable TO service_role;
ALTER TABLE public.class_timetable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "timetable read" ON public.class_timetable FOR SELECT TO authenticated USING (public.can_access_class(auth.uid(), class_id));
CREATE POLICY "timetable admin write" ON public.class_timetable FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));