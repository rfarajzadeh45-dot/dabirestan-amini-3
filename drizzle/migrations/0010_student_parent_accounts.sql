ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'student';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'parent';

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON public.profiles (lower(username));

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE;

CREATE TABLE IF NOT EXISTS public.parent_children (
  parent_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_id, student_id)
);
GRANT SELECT, INSERT, DELETE ON public.parent_children TO authenticated;
GRANT ALL ON public.parent_children TO service_role;
ALTER TABLE public.parent_children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pc read own or admin" ON public.parent_children FOR SELECT TO authenticated
  USING (parent_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pc admin insert" ON public.parent_children FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pc admin delete" ON public.parent_children FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.can_view_student(_user_id uuid, _student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id IS NOT NULL AND _user_id = auth.uid() AND (
    public.can_access_student(_user_id, _student_id)
    OR EXISTS (SELECT 1 FROM public.students WHERE id = _student_id AND user_id = _user_id)
    OR EXISTS (SELECT 1 FROM public.parent_children WHERE parent_id = _user_id AND student_id = _student_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.can_view_class(_user_id uuid, _class_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id IS NOT NULL AND _user_id = auth.uid() AND (
    public.can_access_class(_user_id, _class_id)
    OR EXISTS (SELECT 1 FROM public.students s WHERE s.class_id = _class_id AND (
      s.user_id = _user_id
      OR EXISTS (SELECT 1 FROM public.parent_children pc WHERE pc.parent_id = _user_id AND pc.student_id = s.id)))
  )
$$;
REVOKE EXECUTE ON FUNCTION public.can_view_student(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_class(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_student(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_class(uuid, uuid) TO authenticated;

-- Records: everyone allowed may read; only staff may write.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['attendance','grades','notes'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s access" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s read" ON public.%I FOR SELECT TO authenticated USING (public.can_view_student((SELECT auth.uid()), student_id))', t, t);
    EXECUTE format('CREATE POLICY "%s staff insert" ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), ''admin'')) OR public.can_access_student((SELECT auth.uid()), student_id))', t, t);
    EXECUTE format('CREATE POLICY "%s staff update" ON public.%I FOR UPDATE TO authenticated USING ((SELECT public.has_role((SELECT auth.uid()), ''admin'')) OR public.can_access_student((SELECT auth.uid()), student_id)) WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), ''admin'')) OR public.can_access_student((SELECT auth.uid()), student_id))', t, t);
    EXECUTE format('CREATE POLICY "%s staff delete" ON public.%I FOR DELETE TO authenticated USING ((SELECT public.has_role((SELECT auth.uid()), ''admin'')) OR public.can_access_student((SELECT auth.uid()), student_id))', t, t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "students read" ON public.students;
CREATE POLICY "students read" ON public.students FOR SELECT TO authenticated
  USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')) OR public.can_access_class((SELECT auth.uid()), class_id)
    OR user_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.parent_children pc WHERE pc.parent_id = (SELECT auth.uid()) AND pc.student_id = id));

DROP POLICY IF EXISTS "classes read" ON public.classes;
CREATE POLICY "classes read" ON public.classes FOR SELECT TO authenticated USING (public.can_view_class(auth.uid(), id));
DROP POLICY IF EXISTS "class_subjects read" ON public.class_subjects;
CREATE POLICY "class_subjects read" ON public.class_subjects FOR SELECT TO authenticated USING (public.can_view_class(auth.uid(), class_id));
DROP POLICY IF EXISTS "timetable read" ON public.class_timetable;
CREATE POLICY "timetable read" ON public.class_timetable FOR SELECT TO authenticated USING (public.can_view_class(auth.uid(), class_id));
DROP POLICY IF EXISTS "subjects read staff" ON public.subjects;
CREATE POLICY "subjects read members" ON public.subjects FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));

-- Roles come only from admin-set app metadata (never user-editable). First account is admin.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r text := NEW.raw_app_meta_data->>'role';
BEGIN
  INSERT INTO public.profiles (id, full_name, email, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email, NULLIF(lower(NEW.raw_app_meta_data->>'username'), ''));
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSIF r IN ('admin','teacher','student','parent') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, r::public.app_role);
  END IF;
  RETURN NEW;
END $$;