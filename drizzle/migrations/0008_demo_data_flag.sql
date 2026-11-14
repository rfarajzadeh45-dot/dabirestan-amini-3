ALTER TABLE public.grades ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.attendance ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.notes ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
CREATE INDEX grades_is_demo_idx ON public.grades (is_demo) WHERE is_demo;
CREATE INDEX attendance_is_demo_idx ON public.attendance (is_demo) WHERE is_demo;
CREATE INDEX notes_is_demo_idx ON public.notes (is_demo) WHERE is_demo;

CREATE OR REPLACE FUNCTION public.clear_demo_data()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g int; a int; n int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.grades WHERE is_demo; GET DIAGNOSTICS g = ROW_COUNT;
  DELETE FROM public.attendance WHERE is_demo; GET DIAGNOSTICS a = ROW_COUNT;
  DELETE FROM public.notes WHERE is_demo; GET DIAGNOSTICS n = ROW_COUNT;
  RETURN jsonb_build_object('grades', g, 'attendance', a, 'notes', n);
END $$;
REVOKE EXECUTE ON FUNCTION public.clear_demo_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_demo_data() TO authenticated, service_role;