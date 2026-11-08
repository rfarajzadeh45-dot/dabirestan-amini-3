
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher');
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late');
CREATE TYPE public.note_category AS ENUM ('general', 'behavior', 'strength', 'improvement');

-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- classes
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.teacher_classes (
  user_id uuid NOT NULL,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, class_id)
);
GRANT SELECT, INSERT, DELETE ON public.teacher_classes TO authenticated;
GRANT ALL ON public.teacher_classes TO service_role;
ALTER TABLE public.teacher_classes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_class(_user_id uuid, _class_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin')
    OR EXISTS (SELECT 1 FROM public.teacher_classes WHERE user_id = _user_id AND class_id = _class_id)
$$;

-- students
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_code text NOT NULL UNIQUE,
  first_name text NOT NULL CHECK (char_length(trim(first_name)) BETWEEN 1 AND 60),
  last_name text NOT NULL CHECK (char_length(trim(last_name)) BETWEEN 1 AND 60),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.students(class_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_student(_user_id uuid, _student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.students s WHERE s.id = _student_id AND public.can_access_class(_user_id, s.class_id))
$$;

CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date date NOT NULL,
  status public.attendance_status NOT NULL,
  recorded_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, date)
);
CREATE INDEX ON public.attendance(date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  score numeric(4,2) NOT NULL CHECK (score >= 0 AND score <= 20),
  title text NOT NULL DEFAULT '',
  date date NOT NULL DEFAULT current_date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.grades(student_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grades TO authenticated;
GRANT ALL ON public.grades TO service_role;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  category public.note_category NOT NULL DEFAULT 'general',
  content text NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 2000),
  date date NOT NULL DEFAULT current_date,
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.notes(student_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "profiles self or admin read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "roles self or admin read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles admin insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles admin delete" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND user_id <> auth.uid());

CREATE POLICY "classes read" ON public.classes FOR SELECT TO authenticated
  USING (public.can_access_class(auth.uid(), id));
CREATE POLICY "classes admin write" ON public.classes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "tc read" ON public.teacher_classes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "tc admin insert" ON public.teacher_classes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "tc admin delete" ON public.teacher_classes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "students read" ON public.students FOR SELECT TO authenticated
  USING (public.can_access_class(auth.uid(), class_id));
CREATE POLICY "students admin insert" ON public.students FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "students admin update" ON public.students FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "students admin delete" ON public.students FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "subjects read" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "subjects admin write" ON public.subjects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "attendance access" ON public.attendance FOR ALL TO authenticated
  USING (public.can_access_student(auth.uid(), student_id))
  WITH CHECK (public.can_access_student(auth.uid(), student_id));
CREATE POLICY "grades access" ON public.grades FOR ALL TO authenticated
  USING (public.can_access_student(auth.uid(), student_id))
  WITH CHECK (public.can_access_student(auth.uid(), student_id));
CREATE POLICY "notes access" ON public.notes FOR ALL TO authenticated
  USING (public.can_access_student(auth.uid(), student_id))
  WITH CHECK (public.can_access_student(auth.uid(), student_id));

-- New user: profile + role (first user becomes admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'teacher');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== Seed data =====
INSERT INTO public.classes (name, sort_order) VALUES
 ('اول الف', 1), ('اول ب', 2), ('دوم الف', 3), ('دوم ب', 4), ('سوم الف', 5),
 ('سوم ب', 6), ('چهارم الف', 7), ('پنجم الف', 8), ('ششم الف', 9);

INSERT INTO public.subjects (name, sort_order) VALUES
 ('ریاضی', 1), ('علوم', 2), ('فارسی', 3), ('انگلیسی', 4), ('مطالعات اجتماعی', 5), ('قرآن', 6);

DO $$
DECLARE
  fnames text[] := ARRAY['علی','محمد','حسین','رضا','امیرحسین','مهدی','پارسا','آرین','سینا','کیان','عرفان','یاسین','ماهان','آرمان','بردیا','حسام','امید','نیما','دانیال','سپهر',
    'زهرا','فاطمه','مریم','سارا','نازنین','هستی','رها','ستایش','یلدا','آیدا','مهسا','نگار','الینا','کوثر','ترانه','ریحانه','باران','پریا','مبینا','آوا'];
  lnames text[] := ARRAY['محمدی','حسینی','رضایی','احمدی','کریمی','موسوی','جعفری','صادقی','رحیمی','نوری','کاظمی','قاسمی','عباسی','حیدری','فرهادی','اکبری','یوسفی','زارعی','شریفی','طاهری',
    'نجفی','مرادی','سلیمانی','بهرامی','رستمی','امینی','کرمی','میرزایی','توکلی','نظری','فتحی','باقری','منصوری','عزیزی','شکوهی','پاکزاد','افشار','تهرانی','شیرازی','اصفهانی'];
  cls record;
  counts int[] := ARRAY[28,28,28,28,28,28,28,27,27];
  n int := 0;
  i int;
BEGIN
  PERFORM setseed(0.42);
  FOR cls IN SELECT id, sort_order FROM public.classes ORDER BY sort_order LOOP
    FOR i IN 1..counts[cls.sort_order] LOOP
      n := n + 1;
      INSERT INTO public.students (student_code, first_name, last_name, class_id)
      VALUES ('1403' || lpad(n::text, 3, '0'),
              fnames[1 + floor(random()*array_length(fnames,1))::int],
              lnames[1 + floor(random()*array_length(lnames,1))::int],
              cls.id);
    END LOOP;
  END LOOP;
END $$;

-- attendance for the last 14 days (skip Fridays)
INSERT INTO public.attendance (student_id, date, status)
SELECT s.id, d::date,
  CASE WHEN r < 0.87 THEN 'present'::public.attendance_status WHEN r < 0.94 THEN 'absent' ELSE 'late' END
FROM public.students s
CROSS JOIN generate_series(current_date - 14, current_date, interval '1 day') d
CROSS JOIN LATERAL (SELECT random() + 0 * extract(epoch from d) + 0 * length(s.student_code) AS r) x
WHERE extract(dow from d) <> 5;

-- grades: 3 per subject per student with per-student ability
INSERT INTO public.grades (student_id, subject_id, score, title, date)
SELECT s.id, sub.id,
  LEAST(20, GREATEST(0, round(((ab.base + (random()*4 - 2) + k*0.4)*4)::numeric)/4)),
  (ARRAY['آزمون مستمر','میان‌ترم','کوییز کلاسی'])[k],
  current_date - (90 - k*28)
FROM public.students s
CROSS JOIN LATERAL (SELECT 11 + random()*8 + 0*length(s.student_code) AS base) ab
CROSS JOIN public.subjects sub
CROSS JOIN generate_series(1,3) k;

-- sample notes
INSERT INTO public.notes (student_id, category, content, date)
SELECT s.id,
  (ARRAY['general','behavior','strength','improvement']::public.note_category[])[1 + (row_number() OVER () % 4)::int],
  (ARRAY['در فعالیت‌های گروهی مشارکت خوبی دارد.','نیاز به تمرکز بیشتر در کلاس دارد.','در حل مسائل ریاضی بسیار توانمند است.','باید روی املا و خوش‌خطی بیشتر کار کند.'])[1 + (row_number() OVER () % 4)::int],
  current_date - (row_number() OVER () % 30)::int
FROM (SELECT id FROM public.students ORDER BY student_code LIMIT 60) s;
