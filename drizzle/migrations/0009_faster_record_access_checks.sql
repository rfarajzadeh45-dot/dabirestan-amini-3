DROP POLICY IF EXISTS "attendance access" ON public.attendance;
CREATE POLICY "attendance access" ON public.attendance FOR ALL TO authenticated
  USING ((SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role)) OR public.can_access_student((SELECT auth.uid()), student_id))
  WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role)) OR public.can_access_student((SELECT auth.uid()), student_id));
DROP POLICY IF EXISTS "grades access" ON public.grades;
CREATE POLICY "grades access" ON public.grades FOR ALL TO authenticated
  USING ((SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role)) OR public.can_access_student((SELECT auth.uid()), student_id))
  WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role)) OR public.can_access_student((SELECT auth.uid()), student_id));
DROP POLICY IF EXISTS "notes access" ON public.notes;
CREATE POLICY "notes access" ON public.notes FOR ALL TO authenticated
  USING ((SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role)) OR public.can_access_student((SELECT auth.uid()), student_id))
  WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role)) OR public.can_access_student((SELECT auth.uid()), student_id));
DROP POLICY IF EXISTS "students read" ON public.students;
CREATE POLICY "students read" ON public.students FOR SELECT TO authenticated
  USING ((SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role)) OR public.can_access_class((SELECT auth.uid()), class_id));