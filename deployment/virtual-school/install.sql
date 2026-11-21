-- Additive installation for the Tehran VPS ONLY. Existing school rows are not changed.
BEGIN;
CREATE TABLE IF NOT EXISTS public.vs_settings (
 id boolean PRIMARY KEY DEFAULT true CHECK (id), enabled boolean NOT NULL DEFAULT false,
 announcement text NOT NULL DEFAULT '', notifications_enabled boolean NOT NULL DEFAULT true,
 meeting_provider text NOT NULL DEFAULT 'external' CHECK (meeting_provider = 'external'), provider_name text NOT NULL DEFAULT ''
);
GRANT SELECT ON public.vs_settings TO authenticated;
GRANT INSERT, UPDATE ON public.vs_settings TO authenticated;
GRANT ALL ON public.vs_settings TO service_role;
ALTER TABLE public.vs_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.vs_teacher_subjects (
 user_id uuid NOT NULL, class_id uuid NOT NULL REFERENCES public.classes(id),
 subject_id uuid NOT NULL REFERENCES public.subjects(id), PRIMARY KEY(user_id,class_id,subject_id)
);
GRANT SELECT,INSERT,DELETE ON public.vs_teacher_subjects TO authenticated;
GRANT ALL ON public.vs_teacher_subjects TO service_role;
ALTER TABLE public.vs_teacher_subjects ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.vs_activities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL CHECK(kind IN ('session','assignment','exam','lesson','resource','question','announcement')),
 class_id uuid REFERENCES public.classes(id), subject_id uuid REFERENCES public.subjects(id), created_by uuid NOT NULL DEFAULT auth.uid(),
 student_id uuid REFERENCES public.students(id), teacher_name text NOT NULL DEFAULT '',
 title text NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 180), body text NOT NULL DEFAULT '',
 objectives text NOT NULL DEFAULT '', rubric text NOT NULL DEFAULT '', chapter text NOT NULL DEFAULT '',
 starts_at timestamptz, ends_at timestamptz, duration_minutes integer NOT NULL DEFAULT 45 CHECK(duration_minutes BETWEEN 1 AND 300),
 max_score numeric NOT NULL DEFAULT 20 CHECK(max_score > 0 AND max_score <= 20), url text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published','cancelled')),
 allow_edits boolean NOT NULL DEFAULT true, allow_late boolean NOT NULL DEFAULT true,
 audience uuid[] NOT NULL DEFAULT '{}', release_results boolean NOT NULL DEFAULT false,
 randomize boolean NOT NULL DEFAULT false, random_count integer NOT NULL DEFAULT 0 CHECK(random_count BETWEEN 0 AND 200),
 public_question boolean NOT NULL DEFAULT false, resolved boolean NOT NULL DEFAULT false, pinned boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(url = '' OR url ~ '^https://'),
 CHECK(kind = 'announcement' OR (class_id IS NOT NULL AND subject_id IS NOT NULL))
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.vs_activities TO authenticated;
GRANT ALL ON public.vs_activities TO service_role;
ALTER TABLE public.vs_activities ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS vs_activities_class_kind ON public.vs_activities(class_id,kind,created_at DESC);
CREATE INDEX IF NOT EXISTS vs_activities_schedule ON public.vs_activities(starts_at,ends_at) WHERE kind='session';

CREATE TABLE IF NOT EXISTS public.vs_submissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), activity_id uuid NOT NULL REFERENCES public.vs_activities(id),
 student_id uuid NOT NULL REFERENCES public.students(id), answer text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','returned','graded')),
 score numeric, feedback text NOT NULL DEFAULT '', submitted_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(),
 grade_id uuid REFERENCES public.grades(id), UNIQUE(activity_id,student_id)
);
GRANT SELECT,INSERT,UPDATE ON public.vs_submissions TO authenticated;
GRANT ALL ON public.vs_submissions TO service_role;
ALTER TABLE public.vs_submissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.vs_exam_questions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), activity_id uuid NOT NULL REFERENCES public.vs_activities(id),
 type text NOT NULL CHECK(type IN ('choice','boolean','short','written')), prompt text NOT NULL CHECK(length(trim(prompt))>0),
 options jsonb NOT NULL DEFAULT '[]', points numeric NOT NULL CHECK(points>0 AND points<=20), sort_order integer NOT NULL DEFAULT 0,
 image_url text NOT NULL DEFAULT '' CHECK(image_url='' OR image_url ~ '^https://'),
 correct_answer text NOT NULL DEFAULT ''
);
-- Direct SELECT is staff-only: students retrieve prompts without answer keys via vs_attempt_questions().
GRANT SELECT,INSERT,UPDATE,DELETE ON public.vs_exam_questions TO authenticated;
GRANT ALL ON public.vs_exam_questions TO service_role;
ALTER TABLE public.vs_exam_questions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS vs_exam_questions_activity ON public.vs_exam_questions(activity_id,sort_order);

CREATE TABLE IF NOT EXISTS public.vs_exam_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), activity_id uuid NOT NULL REFERENCES public.vs_activities(id),
 student_id uuid NOT NULL REFERENCES public.students(id), started_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
 submitted_at timestamptz, answers jsonb NOT NULL DEFAULT '{}', question_ids uuid[] NOT NULL,
 score numeric, feedback text NOT NULL DEFAULT '', grade_id uuid REFERENCES public.grades(id), UNIQUE(activity_id,student_id)
);
GRANT SELECT ON public.vs_exam_attempts TO authenticated;
GRANT ALL ON public.vs_exam_attempts TO service_role;
ALTER TABLE public.vs_exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.vs_online_attendance (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), activity_id uuid NOT NULL REFERENCES public.vs_activities(id),
 student_id uuid NOT NULL REFERENCES public.students(id), status public.attendance_status NOT NULL DEFAULT 'present',
 joined_at timestamptz, recorded_by uuid NOT NULL DEFAULT auth.uid(), recorded_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(activity_id,student_id)
);
GRANT SELECT,INSERT,UPDATE ON public.vs_online_attendance TO authenticated;
GRANT ALL ON public.vs_online_attendance TO service_role;
ALTER TABLE public.vs_online_attendance ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.vs_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), activity_id uuid NOT NULL REFERENCES public.vs_activities(id),
 created_by uuid NOT NULL DEFAULT auth.uid(), body text NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 10000), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT ON public.vs_messages TO authenticated;
GRANT ALL ON public.vs_messages TO service_role;
ALTER TABLE public.vs_messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.vs_files (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), activity_id uuid NOT NULL REFERENCES public.vs_activities(id),
 submission_id uuid REFERENCES public.vs_submissions(id), created_by uuid NOT NULL DEFAULT auth.uid(),
 path text NOT NULL UNIQUE, name text NOT NULL CHECK(length(name) BETWEEN 1 AND 255), mime text NOT NULL,
 size bigint NOT NULL CHECK(size>0 AND size<=20971520), created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(mime IN ('image/jpeg','image/png','image/webp','application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation'))
);
GRANT SELECT,INSERT,DELETE ON public.vs_files TO authenticated;
GRANT ALL ON public.vs_files TO service_role;
ALTER TABLE public.vs_files ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.vs_watch_progress (
 activity_id uuid NOT NULL REFERENCES public.vs_activities(id), student_id uuid NOT NULL REFERENCES public.students(id),
 seconds integer NOT NULL DEFAULT 0 CHECK(seconds>=0), completed boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(activity_id,student_id)
);
GRANT SELECT,INSERT,UPDATE ON public.vs_watch_progress TO authenticated;
GRANT ALL ON public.vs_watch_progress TO service_role;
ALTER TABLE public.vs_watch_progress ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.vs_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, activity_id uuid REFERENCES public.vs_activities(id),
 title text NOT NULL, body text NOT NULL DEFAULT '', read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,UPDATE ON public.vs_notifications TO authenticated;
GRANT ALL ON public.vs_notifications TO service_role;
ALTER TABLE public.vs_notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS vs_notifications_user ON public.vs_notifications(user_id,created_at DESC);

CREATE OR REPLACE FUNCTION public.vs_manage(_class uuid, _subject uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND (public.has_role(auth.uid(),'admin') OR (
 public.has_role(auth.uid(),'teacher') AND public.can_access_class(auth.uid(),_class)
 AND EXISTS(SELECT 1 FROM public.vs_teacher_subjects WHERE user_id=auth.uid() AND class_id=_class AND subject_id=_subject)))
$$;
CREATE OR REPLACE FUNCTION public.vs_student_eligible(_activity uuid,_student uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.vs_activities a JOIN public.students s ON s.class_id=a.class_id
 WHERE a.id=_activity AND s.id=_student AND (cardinality(a.audience)=0 OR s.id=ANY(a.audience)))
$$;
CREATE OR REPLACE FUNCTION public.vs_own_student(_student uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.has_role(auth.uid(),'student') AND EXISTS(SELECT 1 FROM public.students WHERE id=_student AND user_id=auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.vs_view(_activity uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.vs_activities a WHERE a.id=_activity AND (
 public.vs_manage(a.class_id,a.subject_id)
 OR (a.kind='announcement' AND a.status='published' AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid()))
 OR (a.status='published' AND (SELECT enabled FROM public.vs_settings WHERE id=true) AND (
   (a.kind='question' AND (public.can_view_student(auth.uid(),a.student_id) OR (a.public_question AND public.can_view_class(auth.uid(),a.class_id))))
   OR (a.kind<>'question' AND EXISTS(SELECT 1 FROM public.students s WHERE s.class_id=a.class_id AND public.can_view_student(auth.uid(),s.id) AND (cardinality(a.audience)=0 OR s.id=ANY(a.audience))))
 ))))
$$;
CREATE OR REPLACE FUNCTION public.vs_manage_activity(_activity uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.vs_activities WHERE id=_activity AND public.vs_manage(class_id,subject_id))
$$;
CREATE OR REPLACE FUNCTION public.vs_view_file(_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.vs_files f WHERE f.id=_id AND public.vs_view(f.activity_id) AND (
 f.submission_id IS NULL OR public.vs_manage_activity(f.activity_id) OR EXISTS(SELECT 1 FROM public.vs_submissions s WHERE s.id=f.submission_id AND public.can_view_student(auth.uid(),s.student_id))))
$$;
REVOKE ALL ON FUNCTION public.vs_manage(uuid,uuid),public.vs_student_eligible(uuid,uuid),public.vs_own_student(uuid),public.vs_view(uuid),public.vs_manage_activity(uuid),public.vs_view_file(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vs_manage(uuid,uuid),public.vs_student_eligible(uuid,uuid),public.vs_own_student(uuid),public.vs_view(uuid),public.vs_manage_activity(uuid),public.vs_view_file(uuid) TO authenticated,service_role;

-- Reinstallable policies. This only replaces policies on the NEW virtual-school tables.
DO $policies$ DECLARE r record; BEGIN
 FOR r IN SELECT tablename,policyname FROM pg_policies WHERE schemaname='public' AND tablename IN ('vs_settings','vs_teacher_subjects','vs_activities','vs_submissions','vs_exam_questions','vs_exam_attempts','vs_online_attendance','vs_messages','vs_files','vs_watch_progress','vs_notifications') LOOP
 EXECUTE format('DROP POLICY %I ON public.%I',r.policyname,r.tablename); END LOOP;
END $policies$;
CREATE POLICY vs_settings_read ON public.vs_settings FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid()));
CREATE POLICY vs_settings_insert ON public.vs_settings FOR INSERT TO authenticated WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE POLICY vs_settings_update ON public.vs_settings FOR UPDATE TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE POLICY vs_teacher_read ON public.vs_teacher_subjects FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY vs_teacher_insert ON public.vs_teacher_subjects FOR INSERT TO authenticated WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE POLICY vs_teacher_delete ON public.vs_teacher_subjects FOR DELETE TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE POLICY vs_activity_read ON public.vs_activities FOR SELECT TO authenticated USING(public.vs_view(id));
CREATE POLICY vs_activity_insert ON public.vs_activities FOR INSERT TO authenticated WITH CHECK(created_by=auth.uid() AND (
 public.vs_manage(class_id,subject_id) OR (kind='question' AND public.vs_own_student(student_id) AND NOT public_question AND NOT pinned AND NOT resolved AND status='published' AND COALESCE((SELECT enabled FROM public.vs_settings WHERE id=true),false))));
CREATE POLICY vs_activity_update ON public.vs_activities FOR UPDATE TO authenticated USING(public.vs_manage(class_id,subject_id)) WITH CHECK(public.vs_manage(class_id,subject_id));
CREATE POLICY vs_activity_delete ON public.vs_activities FOR DELETE TO authenticated USING(public.vs_manage(class_id,subject_id));
CREATE POLICY vs_submission_read ON public.vs_submissions FOR SELECT TO authenticated USING(public.vs_manage_activity(activity_id) OR public.can_view_student(auth.uid(),student_id));
CREATE POLICY vs_submission_insert ON public.vs_submissions FOR INSERT TO authenticated WITH CHECK(public.vs_own_student(student_id) AND public.vs_view(activity_id) AND public.vs_student_eligible(activity_id,student_id));
CREATE POLICY vs_submission_update ON public.vs_submissions FOR UPDATE TO authenticated USING(public.vs_manage_activity(activity_id) OR public.vs_own_student(student_id)) WITH CHECK(public.vs_manage_activity(activity_id) OR public.vs_own_student(student_id));
CREATE POLICY vs_questions_staff ON public.vs_exam_questions FOR ALL TO authenticated USING(public.vs_manage_activity(activity_id)) WITH CHECK(public.vs_manage_activity(activity_id));
CREATE POLICY vs_attempt_read ON public.vs_exam_attempts FOR SELECT TO authenticated USING(public.vs_manage_activity(activity_id) OR (public.can_view_student(auth.uid(),student_id) AND (score IS NULL OR EXISTS(SELECT 1 FROM public.vs_activities a WHERE a.id=activity_id AND a.release_results))));
CREATE POLICY vs_att_read ON public.vs_online_attendance FOR SELECT TO authenticated USING(public.vs_manage_activity(activity_id) OR public.can_view_student(auth.uid(),student_id));
CREATE POLICY vs_att_insert ON public.vs_online_attendance FOR INSERT TO authenticated WITH CHECK(public.vs_manage_activity(activity_id));
CREATE POLICY vs_att_update ON public.vs_online_attendance FOR UPDATE TO authenticated USING(public.vs_manage_activity(activity_id)) WITH CHECK(public.vs_manage_activity(activity_id));
CREATE POLICY vs_message_read ON public.vs_messages FOR SELECT TO authenticated USING(public.vs_view(activity_id));
CREATE POLICY vs_message_insert ON public.vs_messages FOR INSERT TO authenticated WITH CHECK(created_by=auth.uid() AND public.vs_view(activity_id) AND (public.vs_manage_activity(activity_id) OR EXISTS(SELECT 1 FROM public.vs_activities WHERE id=activity_id AND kind='question' AND NOT public_question AND public.vs_own_student(student_id))));
CREATE POLICY vs_file_read ON public.vs_files FOR SELECT TO authenticated USING(public.vs_view_file(id));
CREATE POLICY vs_file_insert ON public.vs_files FOR INSERT TO authenticated WITH CHECK(created_by=auth.uid() AND public.vs_view(activity_id) AND (
 public.vs_manage_activity(activity_id) OR (submission_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.vs_submissions s WHERE s.id=submission_id AND s.activity_id=vs_files.activity_id AND public.vs_own_student(s.student_id))) OR (submission_id IS NULL AND EXISTS(SELECT 1 FROM public.vs_activities a WHERE a.id=activity_id AND a.kind='question' AND public.vs_own_student(a.student_id)))));
CREATE POLICY vs_file_delete ON public.vs_files FOR DELETE TO authenticated USING(created_by=auth.uid() AND public.vs_view(activity_id));
CREATE POLICY vs_watch_read ON public.vs_watch_progress FOR SELECT TO authenticated USING(public.can_view_student(auth.uid(),student_id) OR public.vs_manage_activity(activity_id));
CREATE POLICY vs_watch_insert ON public.vs_watch_progress FOR INSERT TO authenticated WITH CHECK(public.vs_own_student(student_id) AND public.vs_view(activity_id) AND public.vs_student_eligible(activity_id,student_id));
CREATE POLICY vs_watch_update ON public.vs_watch_progress FOR UPDATE TO authenticated USING(public.vs_own_student(student_id) AND public.vs_view(activity_id)) WITH CHECK(public.vs_own_student(student_id) AND public.vs_student_eligible(activity_id,student_id));
CREATE POLICY vs_notification_read ON public.vs_notifications FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY vs_notification_update ON public.vs_notifications FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

CREATE OR REPLACE FUNCTION public.vs_validate_activity() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.kind<>'announcement' AND NOT EXISTS(SELECT 1 FROM public.class_subjects WHERE class_id=NEW.class_id AND subject_id=NEW.subject_id) THEN RAISE EXCEPTION 'این درس برای کلاس تعریف نشده است'; END IF;
 IF NEW.kind='announcement' AND NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'فقط مدیر می‌تواند اطلاعیه عمومی منتشر کند'; END IF;
 IF NEW.kind='question' AND NOT EXISTS(SELECT 1 FROM public.students WHERE id=NEW.student_id AND class_id=NEW.class_id) THEN RAISE EXCEPTION 'دانش‌آموز این کلاس معتبر نیست'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(NEW.audience) sid WHERE NOT EXISTS(SELECT 1 FROM public.students WHERE id=sid AND class_id=NEW.class_id)) THEN RAISE EXCEPTION 'دانش‌آموز انتخاب‌شده عضو کلاس نیست'; END IF;
 IF NEW.kind IN ('session','exam','assignment') AND (NEW.ends_at IS NULL OR (NEW.kind<>'assignment' AND NEW.starts_at IS NULL)) THEN RAISE EXCEPTION 'زمان‌بندی را تکمیل کنید'; END IF;
 IF NEW.starts_at IS NOT NULL AND NEW.ends_at<=NEW.starts_at THEN RAISE EXCEPTION 'زمان پایان باید بعد از شروع باشد'; END IF;
 IF TG_OP='UPDATE' AND (NEW.kind,NEW.class_id,NEW.subject_id,NEW.created_by,NEW.student_id) IS DISTINCT FROM (OLD.kind,OLD.class_id,OLD.subject_id,OLD.created_by,OLD.student_id) THEN RAISE EXCEPTION 'مالک و کلاس فعالیت قابل تغییر نیست'; END IF;
 IF NEW.kind='exam' AND TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM public.vs_exam_attempts WHERE activity_id=NEW.id) AND (NEW.starts_at,NEW.ends_at,NEW.duration_minutes,NEW.max_score,NEW.randomize,NEW.random_count) IS DISTINCT FROM (OLD.starts_at,OLD.ends_at,OLD.duration_minutes,OLD.max_score,OLD.randomize,OLD.random_count) THEN RAISE EXCEPTION 'آزمون شروع‌شده قابل تغییر نیست'; END IF;
 IF NEW.kind<>'question' THEN SELECT full_name INTO NEW.teacher_name FROM public.profiles WHERE id=NEW.created_by; NEW.teacher_name:=COALESCE(NEW.teacher_name,''); END IF;
 IF NEW.kind='session' AND NEW.status='published' THEN
  -- Serialize all sessions sharing a teacher OR class, including concurrent inserts.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.class_id::text,0));
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.created_by::text,1));
  IF EXISTS(SELECT 1 FROM public.vs_activities a WHERE a.kind='session' AND a.status='published' AND a.id<>NEW.id AND (a.created_by=NEW.created_by OR a.class_id=NEW.class_id) AND tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(NEW.starts_at,NEW.ends_at,'[)')) THEN RAISE EXCEPTION 'این ساعت با کلاس دیگر معلم یا دانش‌آموزان تداخل دارد'; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS vs_validate_activity ON public.vs_activities;
CREATE TRIGGER vs_validate_activity BEFORE INSERT OR UPDATE ON public.vs_activities FOR EACH ROW EXECUTE FUNCTION public.vs_validate_activity();

CREATE OR REPLACE FUNCTION public.vs_validate_submission() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.vs_activities; staff boolean; BEGIN
 SELECT * INTO a FROM public.vs_activities WHERE id=NEW.activity_id;
 IF a.kind<>'assignment' OR NOT public.vs_student_eligible(a.id,NEW.student_id) THEN RAISE EXCEPTION 'تکلیف برای این دانش‌آموز معتبر نیست'; END IF;
 staff:=public.vs_manage(a.class_id,a.subject_id);
 IF TG_OP='UPDATE' AND (NEW.activity_id,NEW.student_id,NEW.grade_id) IS DISTINCT FROM (OLD.activity_id,OLD.student_id,OLD.grade_id) THEN RAISE EXCEPTION 'شناسه‌های تکلیف قابل تغییر نیست'; END IF;
 IF NOT staff THEN
  IF NOT public.vs_own_student(NEW.student_id) OR NOT public.vs_view(a.id) THEN RAISE EXCEPTION 'دسترسی مجاز نیست'; END IF;
  IF NEW.status NOT IN ('draft','submitted') THEN RAISE EXCEPTION 'نمره‌دهی فقط توسط معلم انجام می‌شود'; END IF;
  IF TG_OP='INSERT' AND (NEW.score IS NOT NULL OR NEW.feedback<>'' OR NEW.grade_id IS NOT NULL) THEN RAISE EXCEPTION 'نمره‌دهی فقط توسط معلم انجام می‌شود'; END IF;
  IF TG_OP='UPDATE' AND (NEW.score,NEW.feedback,NEW.grade_id) IS DISTINCT FROM (OLD.score,OLD.feedback,OLD.grade_id) THEN RAISE EXCEPTION 'نمره‌دهی فقط توسط معلم انجام می‌شود'; END IF;
  IF TG_OP='UPDATE' AND (OLD.status='graded' OR (OLD.submitted_at IS NOT NULL AND now()>a.ends_at) OR (OLD.status='submitted' AND NOT a.allow_edits)) THEN RAISE EXCEPTION 'ویرایش این تکلیف مجاز نیست'; END IF;
  IF now()>a.ends_at AND NOT a.allow_late THEN RAISE EXCEPTION 'مهلت تکلیف پایان یافته است'; END IF;
  IF NEW.status='submitted' THEN NEW.submitted_at:=now(); ELSE NEW.submitted_at:=NULL; END IF;
 ELSE
  IF NEW.score IS NOT NULL AND (NEW.score<0 OR NEW.score>a.max_score) THEN RAISE EXCEPTION 'نمره خارج از محدوده است'; END IF;
  IF NEW.status='graded' AND NEW.score IS NULL THEN RAISE EXCEPTION 'نمره را وارد کنید'; END IF;
  IF NEW.status='graded' THEN
   IF OLD.grade_id IS NULL THEN INSERT INTO public.grades(student_id,subject_id,score,title,date,created_by) VALUES(NEW.student_id,a.subject_id,NEW.score*20/a.max_score,'تکلیف: '||a.title,(now() AT TIME ZONE 'Asia/Tehran')::date,auth.uid()) RETURNING id INTO NEW.grade_id;
   ELSE UPDATE public.grades SET score=NEW.score*20/a.max_score WHERE id=OLD.grade_id; END IF;
  END IF;
 END IF;
 NEW.updated_at:=now(); RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS vs_validate_submission ON public.vs_submissions;
CREATE TRIGGER vs_validate_submission BEFORE INSERT OR UPDATE ON public.vs_submissions FOR EACH ROW EXECUTE FUNCTION public.vs_validate_submission();

CREATE OR REPLACE FUNCTION public.vs_validate_related() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.vs_activities; s public.vs_submissions; BEGIN
 SELECT * INTO a FROM public.vs_activities WHERE id=NEW.activity_id;
 IF TG_TABLE_NAME='vs_online_attendance' THEN
  IF a.kind<>'session' OR NOT public.vs_student_eligible(a.id,NEW.student_id) OR NOT public.vs_manage(a.class_id,a.subject_id) THEN RAISE EXCEPTION 'ثبت حضور این جلسه مجاز نیست'; END IF;
  NEW.recorded_by:=auth.uid(); NEW.recorded_at:=now();
  IF TG_OP='UPDATE' AND (NEW.activity_id,NEW.student_id,NEW.joined_at) IS DISTINCT FROM (OLD.activity_id,OLD.student_id,OLD.joined_at) THEN RAISE EXCEPTION 'شناسه و سابقه ورود قابل تغییر نیست'; END IF;
 ELSIF TG_TABLE_NAME='vs_files' THEN
  IF NEW.path <> NEW.activity_id::text||'/'||NEW.id::text THEN RAISE EXCEPTION 'مسیر فایل معتبر نیست'; END IF;
  IF NEW.submission_id IS NOT NULL THEN
   SELECT * INTO s FROM public.vs_submissions WHERE id=NEW.submission_id;
   IF s.activity_id<>a.id THEN RAISE EXCEPTION 'فایل تکلیف معتبر نیست'; END IF;
   IF NOT public.vs_manage(a.class_id,a.subject_id) AND (NOT public.vs_own_student(s.student_id) OR s.status='graded' OR (s.submitted_at IS NOT NULL AND now()>a.ends_at) OR (s.status='submitted' AND NOT a.allow_edits)) THEN RAISE EXCEPTION 'ویرایش فایل تکلیف مجاز نیست'; END IF;
  END IF;
 ELSIF TG_TABLE_NAME='vs_exam_questions' THEN
  IF a.kind<>'exam' OR EXISTS(SELECT 1 FROM public.vs_exam_attempts WHERE activity_id=a.id) THEN RAISE EXCEPTION 'سؤالات آزمون شروع‌شده قابل تغییر نیست'; END IF;
  IF jsonb_typeof(NEW.options)<>'array' OR (NEW.type='choice' AND (jsonb_array_length(NEW.options)<2 OR NEW.correct_answer NOT IN (SELECT jsonb_array_elements_text(NEW.options)))) OR (NEW.type='boolean' AND NEW.correct_answer NOT IN ('true','false')) THEN RAISE EXCEPTION 'گزینه یا پاسخ صحیح معتبر نیست'; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS vs_validate_attendance ON public.vs_online_attendance;
CREATE TRIGGER vs_validate_attendance BEFORE INSERT OR UPDATE ON public.vs_online_attendance FOR EACH ROW EXECUTE FUNCTION public.vs_validate_related();
DROP TRIGGER IF EXISTS vs_validate_file ON public.vs_files;
CREATE TRIGGER vs_validate_file BEFORE INSERT ON public.vs_files FOR EACH ROW EXECUTE FUNCTION public.vs_validate_related();
DROP TRIGGER IF EXISTS vs_validate_question ON public.vs_exam_questions;
CREATE TRIGGER vs_validate_question BEFORE INSERT OR UPDATE ON public.vs_exam_questions FOR EACH ROW EXECUTE FUNCTION public.vs_validate_related();

CREATE OR REPLACE FUNCTION public.vs_begin_exam(_activity uuid,_student uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.vs_activities; attempt public.vs_exam_attempts; ids uuid[]; BEGIN
 IF NOT public.vs_own_student(_student) OR NOT public.vs_view(_activity) OR NOT public.vs_student_eligible(_activity,_student) THEN RAISE EXCEPTION 'دسترسی به آزمون مجاز نیست'; END IF;
 SELECT * INTO a FROM public.vs_activities WHERE id=_activity;
 SELECT * INTO attempt FROM public.vs_exam_attempts WHERE activity_id=_activity AND student_id=_student;
 IF FOUND THEN RETURN to_jsonb(attempt)-'score'-'feedback'-'grade_id'; END IF;
 IF a.kind<>'exam' OR a.status<>'published' OR now()<a.starts_at OR now()>=a.ends_at THEN RAISE EXCEPTION 'آزمون در این زمان در دسترس نیست'; END IF;
 IF a.random_count=0 AND (SELECT COALESCE(sum(points),0) FROM public.vs_exam_questions WHERE activity_id=a.id)<>a.max_score THEN RAISE EXCEPTION 'مجموع نمره سؤالات آزمون کامل نیست'; END IF;
 IF a.random_count>0 AND NOT EXISTS(SELECT 1 FROM public.vs_exam_questions WHERE activity_id=a.id HAVING count(*)>=a.random_count AND min(points)=max(points) AND min(points)*a.random_count=a.max_score) THEN RAISE EXCEPTION 'برای گزینش تصادفی، نمره سؤال‌ها یکسان و مجموع نمره منتخب برابر نمره آزمون باشد'; END IF;
 SELECT array_agg(id ORDER BY ordering) INTO ids FROM (SELECT id, CASE WHEN a.randomize OR a.random_count>0 THEN random() ELSE sort_order::float END ordering FROM public.vs_exam_questions WHERE activity_id=_activity ORDER BY ordering LIMIT CASE WHEN a.random_count>0 THEN a.random_count ELSE 200 END) q;
 IF cardinality(ids) IS NULL THEN RAISE EXCEPTION 'سؤالی برای آزمون ثبت نشده است'; END IF;
 INSERT INTO public.vs_exam_attempts(activity_id,student_id,expires_at,question_ids) VALUES(_activity,_student,least(a.ends_at,now()+make_interval(mins=>a.duration_minutes)),ids) ON CONFLICT(activity_id,student_id) DO NOTHING;
 SELECT * INTO attempt FROM public.vs_exam_attempts WHERE activity_id=_activity AND student_id=_student;
 RETURN to_jsonb(attempt)-'score'-'feedback'-'grade_id';
END $$;
CREATE OR REPLACE FUNCTION public.vs_attempt_questions(_attempt uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.vs_exam_attempts; result jsonb; BEGIN
 SELECT * INTO a FROM public.vs_exam_attempts WHERE id=_attempt;
 IF NOT FOUND OR NOT (public.vs_own_student(a.student_id) OR public.vs_manage_activity(a.activity_id)) THEN RAISE EXCEPTION 'دسترسی مجاز نیست'; END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',q.id,'activity_id',q.activity_id,'type',q.type,'prompt',q.prompt,'options',q.options,'points',q.points,'sort_order',q.sort_order,'image_url',q.image_url) ORDER BY array_position(a.question_ids,q.id)),'[]') INTO result FROM public.vs_exam_questions q WHERE q.id=ANY(a.question_ids);
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.vs_save_exam(_attempt uuid,_answers jsonb,_submit boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.vs_exam_attempts; total numeric; manual boolean; BEGIN
 SELECT * INTO a FROM public.vs_exam_attempts WHERE id=_attempt FOR UPDATE;
 IF NOT FOUND OR NOT public.vs_own_student(a.student_id) OR NOT public.vs_view(a.activity_id) THEN RAISE EXCEPTION 'دسترسی مجاز نیست'; END IF;
 IF a.submitted_at IS NOT NULL THEN RETURN to_jsonb(a)-'score'-'feedback'-'grade_id'; END IF;
 IF jsonb_typeof(_answers)<>'object' OR octet_length(_answers::text)>100000 THEN RAISE EXCEPTION 'پاسخ‌ها معتبر نیست'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(_answers) e WHERE NOT e.key=ANY(SELECT unnest(a.question_ids)::text) OR jsonb_typeof(e.value)<>'string') THEN RAISE EXCEPTION 'شناسه یا نوع پاسخ معتبر نیست'; END IF;
 -- After expiry finalize only the last server-saved answers, never accept newly supplied answers.
 IF now()<a.expires_at THEN a.answers:=_answers; END IF;
 IF _submit OR now()>=a.expires_at THEN
  a.submitted_at:=now();
  SELECT COALESCE(sum(CASE WHEN type IN ('choice','boolean') AND a.answers->>id::text=correct_answer THEN points ELSE 0 END),0),COALESCE(bool_or(type IN ('short','written')),false) INTO total,manual FROM public.vs_exam_questions WHERE id=ANY(a.question_ids);
  IF NOT manual THEN a.score:=total; END IF;
 END IF;
 UPDATE public.vs_exam_attempts SET answers=a.answers,submitted_at=a.submitted_at,score=a.score WHERE id=a.id;
 RETURN to_jsonb(a)-'score'-'feedback'-'grade_id';
END $$;
CREATE OR REPLACE FUNCTION public.vs_grade_exam(_attempt uuid,_score numeric,_feedback text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE attempt public.vs_exam_attempts; a public.vs_activities; BEGIN
 SELECT * INTO attempt FROM public.vs_exam_attempts WHERE id=_attempt FOR UPDATE;
 IF NOT FOUND OR NOT public.vs_manage_activity(attempt.activity_id) THEN RAISE EXCEPTION 'نمره‌دهی مجاز نیست'; END IF;
 SELECT * INTO a FROM public.vs_activities WHERE id=attempt.activity_id;
 IF attempt.submitted_at IS NULL THEN
  IF now()<attempt.expires_at THEN RAISE EXCEPTION 'آزمون هنوز تحویل داده نشده است'; END IF;
  UPDATE public.vs_exam_attempts SET submitted_at=now() WHERE id=attempt.id;
 END IF;
 IF _score IS NULL OR _score<0 OR _score>a.max_score THEN RAISE EXCEPTION 'نمره معتبر نیست'; END IF;
 UPDATE public.vs_exam_attempts SET score=_score,feedback=_feedback WHERE id=attempt.id;
END $$;
-- Opening a meeting link is a join log, not proof of attendance; teachers record attendance manually.
CREATE OR REPLACE FUNCTION public.vs_join_session(_activity uuid,_student uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.vs_own_student(_student) OR NOT public.vs_view(_activity) OR NOT public.vs_student_eligible(_activity,_student) OR NOT EXISTS(SELECT 1 FROM public.vs_activities WHERE id=_activity AND kind='session' AND url<>'' AND now() BETWEEN starts_at-interval '15 minutes' AND ends_at) THEN RAISE EXCEPTION 'ورود به جلسه در این زمان مجاز نیست'; END IF;
 INSERT INTO public.vs_messages(activity_id,created_by,body) VALUES(_activity,auth.uid(),'لینک جلسه باز شد');
END $$;
REVOKE ALL ON FUNCTION public.vs_begin_exam(uuid,uuid),public.vs_attempt_questions(uuid),public.vs_save_exam(uuid,jsonb,boolean),public.vs_grade_exam(uuid,numeric,text),public.vs_join_session(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vs_begin_exam(uuid,uuid),public.vs_attempt_questions(uuid),public.vs_save_exam(uuid,jsonb,boolean),public.vs_grade_exam(uuid,numeric,text),public.vs_join_session(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.vs_publish_exam_scores() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.vs_activities; r public.vs_exam_attempts; gid uuid; BEGIN
 IF TG_TABLE_NAME='vs_activities' THEN a:=NEW;
 ELSE SELECT * INTO a FROM public.vs_activities WHERE id=NEW.activity_id; END IF;
 IF NOT a.release_results THEN RETURN NEW; END IF;
 FOR r IN SELECT * FROM public.vs_exam_attempts WHERE activity_id=a.id AND score IS NOT NULL AND submitted_at IS NOT NULL FOR UPDATE LOOP
  gid:=r.grade_id;
  IF gid IS NULL THEN INSERT INTO public.grades(student_id,subject_id,score,title,date,created_by) VALUES(r.student_id,a.subject_id,r.score*20/a.max_score,'آزمون: '||a.title,(now() AT TIME ZONE 'Asia/Tehran')::date,a.created_by) RETURNING id INTO gid;
  ELSE UPDATE public.grades SET score=r.score*20/a.max_score WHERE id=gid; END IF;
  UPDATE public.vs_exam_attempts SET grade_id=gid WHERE id=r.id;
 END LOOP; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS vs_release_scores ON public.vs_activities;
CREATE TRIGGER vs_release_scores AFTER UPDATE ON public.vs_activities FOR EACH ROW WHEN(NEW.kind='exam' AND NEW.release_results AND NOT OLD.release_results) EXECUTE FUNCTION public.vs_publish_exam_scores();
DROP TRIGGER IF EXISTS vs_publish_graded_exam ON public.vs_exam_attempts;
CREATE TRIGGER vs_publish_graded_exam AFTER UPDATE OF score,submitted_at ON public.vs_exam_attempts FOR EACH ROW WHEN(NEW.score IS NOT NULL AND NEW.submitted_at IS NOT NULL) EXECUTE FUNCTION public.vs_publish_exam_scores();

CREATE OR REPLACE FUNCTION public.vs_protect_delete() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.vs_activities; s public.vs_submissions; BEGIN
 SELECT * INTO a FROM public.vs_activities WHERE id=OLD.activity_id;
 IF TG_TABLE_NAME='vs_exam_questions' AND EXISTS(SELECT 1 FROM public.vs_exam_attempts WHERE activity_id=a.id) THEN RAISE EXCEPTION 'سؤال آزمون شروع‌شده قابل حذف نیست'; END IF;
 IF TG_TABLE_NAME='vs_files' AND OLD.submission_id IS NOT NULL AND NOT public.vs_manage(a.class_id,a.subject_id) THEN
  SELECT * INTO s FROM public.vs_submissions WHERE id=OLD.submission_id;
  IF s.status='graded' OR (s.submitted_at IS NOT NULL AND now()>a.ends_at) OR (s.status='submitted' AND NOT a.allow_edits) THEN RAISE EXCEPTION 'حذف پیوست تکلیف مجاز نیست'; END IF;
 END IF; RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS vs_protect_question_delete ON public.vs_exam_questions;
CREATE TRIGGER vs_protect_question_delete BEFORE DELETE ON public.vs_exam_questions FOR EACH ROW EXECUTE FUNCTION public.vs_protect_delete();
DROP TRIGGER IF EXISTS vs_protect_file_delete ON public.vs_files;
CREATE TRIGGER vs_protect_file_delete BEFORE DELETE ON public.vs_files FOR EACH ROW EXECUTE FUNCTION public.vs_protect_delete();

CREATE OR REPLACE FUNCTION public.vs_validate_teacher_assignment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=NEW.user_id AND role='teacher') OR NOT EXISTS(SELECT 1 FROM public.teacher_classes WHERE user_id=NEW.user_id AND class_id=NEW.class_id) OR NOT EXISTS(SELECT 1 FROM public.class_subjects WHERE class_id=NEW.class_id AND subject_id=NEW.subject_id) THEN RAISE EXCEPTION 'معلم باید به کلاس و درس معتبر اختصاص داشته باشد'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS vs_teacher_assignment_valid ON public.vs_teacher_subjects;
CREATE TRIGGER vs_teacher_assignment_valid BEFORE INSERT ON public.vs_teacher_subjects FOR EACH ROW EXECUTE FUNCTION public.vs_validate_teacher_assignment();

CREATE OR REPLACE FUNCTION public.vs_notify_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE recipients uuid[]; BEGIN
 IF NOT COALESCE((SELECT notifications_enabled FROM public.vs_settings WHERE id=true),false) THEN RETURN NEW; END IF;
 IF NEW.kind='question' THEN
  SELECT array_agg(DISTINCT user_id) INTO recipients FROM public.vs_teacher_subjects WHERE class_id=NEW.class_id AND subject_id=NEW.subject_id;
 ELSE
  IF NEW.status='draft' THEN RETURN NEW; END IF;
  SELECT array_agg(DISTINCT uid) INTO recipients FROM (
   SELECT s.user_id uid FROM public.students s WHERE (NEW.kind='announcement' OR s.class_id=NEW.class_id) AND (cardinality(NEW.audience)=0 OR s.id=ANY(NEW.audience))
   UNION SELECT pc.parent_id FROM public.parent_children pc JOIN public.students s ON s.id=pc.student_id WHERE (NEW.kind='announcement' OR s.class_id=NEW.class_id) AND (cardinality(NEW.audience)=0 OR s.id=ANY(NEW.audience))
  ) r WHERE uid IS NOT NULL;
 END IF;
 INSERT INTO public.vs_notifications(user_id,activity_id,title,body) SELECT uid,NEW.id,NEW.title,CASE WHEN NEW.status='cancelled' THEN 'کلاس لغو شد' WHEN TG_OP='UPDATE' THEN 'اطلاعات یا زمان‌بندی تغییر کرد' ELSE 'فعالیت جدید مدرسه مجازی' END FROM unnest(recipients) uid WHERE uid<>auth.uid();
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS vs_notify_activity ON public.vs_activities;
CREATE TRIGGER vs_notify_activity AFTER INSERT OR UPDATE ON public.vs_activities FOR EACH ROW EXECUTE FUNCTION public.vs_notify_activity();
CREATE OR REPLACE FUNCTION public.vs_notify_feedback() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.vs_activities; sid uuid; BEGIN
 IF NOT COALESCE((SELECT notifications_enabled FROM public.vs_settings WHERE id=true),false) THEN RETURN NEW; END IF;
 SELECT * INTO a FROM public.vs_activities WHERE id=NEW.activity_id;
 IF TG_TABLE_NAME='vs_messages' THEN
  IF a.kind<>'question' OR NOT public.vs_manage(a.class_id,a.subject_id) THEN RETURN NEW; END IF; sid:=a.student_id;
 ELSE sid:=NEW.student_id; END IF;
 INSERT INTO public.vs_notifications(user_id,activity_id,title,body) SELECT uid,a.id,a.title,'پاسخ یا نتیجه جدید منتشر شد' FROM (
 SELECT user_id uid FROM public.students WHERE id=sid UNION SELECT parent_id FROM public.parent_children WHERE student_id=sid) r WHERE uid IS NOT NULL AND uid<>auth.uid();
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS vs_notify_message ON public.vs_messages;
CREATE TRIGGER vs_notify_message AFTER INSERT ON public.vs_messages FOR EACH ROW EXECUTE FUNCTION public.vs_notify_feedback();
DROP TRIGGER IF EXISTS vs_notify_submission ON public.vs_submissions;
CREATE TRIGGER vs_notify_submission AFTER UPDATE ON public.vs_submissions FOR EACH ROW WHEN(NEW.status IN ('graded','returned')) EXECUTE FUNCTION public.vs_notify_feedback();

-- Storage bucket is created through Storage API by install.sh, never through SQL.
DROP POLICY IF EXISTS vs_private_files_read ON storage.objects;
DROP POLICY IF EXISTS vs_private_files_upload ON storage.objects;
DROP POLICY IF EXISTS vs_private_files_delete ON storage.objects;
CREATE POLICY vs_private_files_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='virtual-school-private' AND EXISTS(SELECT 1 FROM public.vs_files f WHERE f.path=name AND public.vs_view_file(f.id)));
CREATE POLICY vs_private_files_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='virtual-school-private' AND EXISTS(SELECT 1 FROM public.vs_files f WHERE f.path=name AND f.created_by=auth.uid() AND public.vs_view(f.activity_id)));
CREATE POLICY vs_private_files_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='virtual-school-private' AND EXISTS(SELECT 1 FROM public.vs_files f WHERE f.path=name AND f.created_by=auth.uid()));

CREATE OR REPLACE FUNCTION public.vs_validate_notification() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (NEW.id,NEW.user_id,NEW.activity_id,NEW.title,NEW.body,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.user_id,OLD.activity_id,OLD.title,OLD.body,OLD.created_at) THEN RAISE EXCEPTION 'فقط وضعیت خواندن اعلان قابل تغییر است'; END IF;
 NEW.read_at:=now(); RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS vs_notification_read_only ON public.vs_notifications;
CREATE TRIGGER vs_notification_read_only BEFORE UPDATE ON public.vs_notifications FOR EACH ROW EXECUTE FUNCTION public.vs_validate_notification();
NOTIFY pgrst, 'reload schema';
COMMIT;
