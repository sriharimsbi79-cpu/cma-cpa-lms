-- =====================================================================
--  CMA USA · CPA USA · Technical skills  —  LMS database for Supabase
-- =====================================================================
--  How to run
--    1. Supabase dashboard → SQL Editor → New query
--       (Lovable: open the project's Supabase / Cloud → SQL editor)
--    2. Paste this whole file and press Run. It is safe to run again.
--    3. Sign up once in your app, then make yourself the owner:
--         update public.profiles set role = 'super_admin'
--         where email = 'you@example.com';
--
--  Sign-up from the app must send name and phone as metadata:
--    supabase.auth.signUp({ email, password,
--      options: { data: { full_name: 'Ananya Reddy', phone: '+9198…' } } })
--
--  What is inside
--    1. Types            6. Row level security (who can see what)
--    2. Tables           7. App functions (call with supabase.rpc)
--    3. Helper functions 8. Admin functions
--    4. Triggers         9. Storage buckets (eBooks, exhibits, thumbnails)
--    5. Indexes         10. Starting data (programs, courses, CMA chapters)
--
--  Videos are meant to live on a DRM video service (VdoCipher or
--  similar); this database keeps the service's video id, not the file.
--  Payments: a Supabase Edge Function verifies Razorpay, marks the
--  payment 'paid', then calls grant_package_after_payment(payment_id).
-- =====================================================================


-- =====================================================================
-- 1. TYPES
-- =====================================================================
do $$ begin create type public.app_role as enum ('student','faculty','admin','super_admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.course_kind as enum ('cma_part','cpa_core','cpa_discipline','skill'); exception when duplicate_object then null; end $$;
do $$ begin create type public.publish_status as enum ('draft','in_review','published','archived'); exception when duplicate_object then null; end $$;
do $$ begin create type public.video_status as enum ('uploading','processing','ready','failed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.question_type as enum ('mcq','tbs_journal_entry','tbs_numeric','tbs_dropdown','tbs_drag_drop','tbs_research','tbs_document_review','cbq'); exception when duplicate_object then null; end $$;
do $$ begin create type public.difficulty_level as enum ('easy','medium','hard'); exception when duplicate_object then null; end $$;
do $$ begin create type public.test_kind as enum ('chapter_test','full_mock','practice_set'); exception when duplicate_object then null; end $$;
do $$ begin create type public.selection_mode as enum ('fixed','random'); exception when duplicate_object then null; end $$;
do $$ begin create type public.attempt_status as enum ('in_progress','submitted','expired'); exception when duplicate_object then null; end $$;
do $$ begin create type public.enrollment_status as enum ('active','cancelled','refunded'); exception when duplicate_object then null; end $$;
do $$ begin create type public.payment_status as enum ('created','paid','failed','refunded'); exception when duplicate_object then null; end $$;
do $$ begin create type public.discount_type as enum ('percent','flat'); exception when duplicate_object then null; end $$;
do $$ begin create type public.doubt_status as enum ('open','answered','closed'); exception when duplicate_object then null; end $$;


-- =====================================================================
-- 2. TABLES
-- =====================================================================

-- ---------- People ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  created_at timestamptz not null default now()
);
-- (columns added one by one so this also works if Lovable already made a profiles table)
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists role public.app_role not null default 'student';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists phone_verified boolean not null default false;
alter table public.profiles add column if not exists is_blocked boolean not null default false;
alter table public.profiles add column if not exists target_exam_date date;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------- Catalog: program → course → chapter → videos / eBook / test ----------
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,                 -- 'CMA USA'
  short_name text,                    -- 'CMA'
  description text,
  position int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  slug text not null unique,
  code text not null,                 -- 'P1', 'FAR', 'EXCEL'
  name text not null,                 -- 'Part 1', 'FAR'
  full_name text,                     -- 'Financial Planning, Performance and Analytics'
  kind public.course_kind not null,
  exam_format text,                   -- '100 MCQs + 2 case-based questions · 4 hours'
  description text,
  position int not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, code)
);

alter table public.profiles add column if not exists target_course_id uuid references public.courses(id) on delete set null;

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  position int not null default 0,
  title text not null,
  description text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  position int not null default 0,
  title text not null,
  description text,
  duration_seconds int check (duration_seconds is null or duration_seconds >= 0),
  provider text not null default 'vdocipher',
  provider_video_id text,             -- id on the DRM video service
  thumbnail_url text,
  status public.video_status not null default 'uploading',
  processing_percent int not null default 0 check (processing_percent between 0 and 100),
  is_published boolean not null default false,
  uploaded_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ebooks (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  title text not null,
  storage_path text not null,         -- in bucket 'ebooks': <course_id>/<chapter_id>/<file>.pdf
  page_count int,
  file_size_bytes bigint,
  block_download boolean not null default true,
  watermark boolean not null default true,
  allow_annotations boolean not null default true,
  is_published boolean not null default false,
  uploaded_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Selling: packages, coupons, payments, enrollments ----------
create table if not exists public.course_packages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,                 -- 'CMA USA · Part 1 + Part 2'
  description text,
  price_inr numeric(10,2) check (price_inr is null or price_inr >= 0),
  validity_days int not null default 365 check (validity_days > 0),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint package_needs_price check (not is_active or price_inr is not null)
);

create table if not exists public.package_courses (
  package_id uuid not null references public.course_packages(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  primary key (package_id, course_id)
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  discount_type public.discount_type not null,
  discount_value numeric(10,2) not null check (discount_value > 0),
  package_id uuid references public.course_packages(id) on delete set null,  -- null = any package
  valid_from timestamptz,
  valid_until timestamptz,
  max_uses int check (max_uses is null or max_uses > 0),
  used_count int not null default 0,
  is_active boolean not null default true,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  package_id uuid references public.course_packages(id) on delete set null,
  coupon_id uuid references public.coupons(id) on delete set null,
  amount_inr numeric(10,2) not null check (amount_inr >= 0),
  discount_inr numeric(10,2) not null default 0,
  currency text not null default 'INR',
  status public.payment_status not null default 'created',
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  razorpay_signature text,
  invoice_number text unique,
  paid_at timestamptz,
  enrollments_granted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (coupon_id, user_id)
);

-- One row per student per course. Buying again extends valid_until.
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  package_id uuid references public.course_packages(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  valid_from timestamptz not null default now(),
  valid_until timestamptz not null,
  status public.enrollment_status not null default 'active',
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_id text not null,            -- random id the app stores on the device
  device_name text,                   -- 'Chrome on Windows', 'Android app'
  platform text,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, device_id)
);

-- ---------- Student progress ----------
create table if not exists public.video_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  watched_seconds int not null default 0,
  last_position_seconds int not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create table if not exists public.ebook_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  ebook_id uuid not null references public.ebooks(id) on delete cascade,
  last_page int not null default 1,
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, ebook_id)
);

create table if not exists public.video_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  at_seconds int not null default 0,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ebook_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  ebook_id uuid not null references public.ebooks(id) on delete cascade,
  page int not null,
  kind text not null check (kind in ('highlight','bookmark','note')),
  selected_text text,
  note text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.doubts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  video_id uuid references public.videos(id) on delete set null,
  at_seconds int,
  question text not null,
  status public.doubt_status not null default 'open',
  answer text,
  answered_by uuid references public.profiles(id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Question bank ----------
--  content (students see it)                 answer key (staff only)
--  mcq:            {"options":[{"id":"a","text":"…"},…]}            {"correct":"b"}
--  tbs_numeric:    {"cells":[{"id":"c1","label":"…"}]}              {"answers":{"c1":{"value":12637,"tolerance":1}}}
--  tbs_dropdown:   {"blanks":[{"id":"b1","options":["…","…"]}]}     {"answers":{"b1":"…"}}
--  tbs_document_review: {"spans":[{"id":"s1","text":"…","options":[…]}]}  {"answers":{"s1":"…"}}
--  tbs_drag_drop:  {"items":[{"id":"i1","text":"…"}],"targets":[{"id":"t1","text":"…"}]}  {"answers":{"i1":"t1"}}
--  tbs_journal_entry: {"accounts":["Right-of-use asset","Lease liability","Cash",…],"rows":4}
--                  key: {"lines":[{"account":"Right-of-use asset","debit":210618,"credit":0},
--                                 {"account":"Lease liability","debit":0,"credit":210618}]}
--  tbs_research:   {"instructions":"…"}                             {"citations":["842-10-25-2"]}
--  cbq:            {"parts":[{"id":"p1","type":"tbs_numeric","prompt":"…",…}]}
--                  key: {"parts":{"p1":{"type":"tbs_numeric","key":{"answers":{…}}}}}
--
--  Student responses use the same shape: {"selected":"b"}, {"answers":{…}},
--  {"lines":[…]}, {"citation":"…"}, {"parts":{"p1":{…}}}
create sequence if not exists public.question_code_seq start 10001;

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  code text unique,                   -- Q-10421, TBS-10912, CBQ-10310 (filled automatically)
  course_id uuid not null references public.courses(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete set null,
  type public.question_type not null,
  difficulty public.difficulty_level not null default 'medium',
  topic text,
  stem text not null,                 -- case scenario / question text (markdown)
  content jsonb not null default '{}'::jsonb,
  points numeric(6,2) not null default 1 check (points > 0),
  partial_credit boolean not null default true,
  time_guide_minutes int,
  status public.publish_status not null default 'draft',
  solution_video_id uuid references public.videos(id) on delete set null,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Kept in its own table so students can never read answers directly.
create table if not exists public.question_answer_keys (
  question_id uuid primary key references public.questions(id) on delete cascade,
  answer_key jsonb not null,
  explanation text,
  updated_at timestamptz not null default now()
);

create table if not exists public.question_exhibits (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  position int not null default 0,
  title text not null,
  storage_path text,                  -- in bucket 'question-exhibits'
  description text,
  created_at timestamptz not null default now()
);

-- ---------- Tests: chapter tests, full mocks, practice sets ----------
create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete cascade,   -- set for chapter tests
  kind public.test_kind not null,
  title text not null,
  description text,
  duration_minutes int not null check (duration_minutes > 0),
  selection_mode public.selection_mode not null default 'fixed',
  -- for random tests: {"counts":{"mcq":40,"cbq":1},"chapter_ids":["…"]}
  random_config jsonb not null default '{}'::jsonb,
  max_attempts int check (max_attempts is null or max_attempts > 0),  -- null = unlimited
  show_answers_after_submit boolean not null default true,
  status public.publish_status not null default 'draft',
  position int not null default 0,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.test_questions (
  test_id uuid not null references public.tests(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  position int not null default 0,
  testlet_no int not null default 1,
  primary key (test_id, question_id)
);

create table if not exists public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete cascade,
  attempt_no int not null,
  status public.attempt_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  score numeric(8,2),
  max_score numeric(8,2),
  percent numeric(5,2),
  time_spent_seconds int,
  created_at timestamptz not null default now()
);

create table if not exists public.attempt_questions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.test_attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  position int not null,
  testlet_no int not null default 1,
  response jsonb,
  flagged boolean not null default false,
  time_spent_seconds int not null default 0,
  answered_at timestamptz,
  fraction_correct numeric(5,4),
  score numeric(6,2),
  max_score numeric(6,2) not null default 1,
  unique (attempt_id, question_id)
);

-- ---------- Notifications and activity ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'info',
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);


-- =====================================================================
-- 3. HELPER FUNCTIONS (used by security rules)
-- =====================================================================
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('faculty','admin','super_admin') and not is_blocked
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','super_admin') and not is_blocked
  );
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin' and not is_blocked
  );
$$;

-- true when the signed-in student has a valid enrollment (staff always true)
create or replace function public.has_course_access(p_course_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff() or exists (
    select 1
    from public.enrollments e
    join public.profiles p on p.id = e.user_id
    where e.user_id = auth.uid()
      and e.course_id = p_course_id
      and e.status = 'active'
      and now() between e.valid_from and e.valid_until
      and not p.is_blocked
  );
$$;

create or replace function public.chapter_course_id(p_chapter_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select course_id from public.chapters where id = p_chapter_id;
$$;

-- turns text into a uuid, or null when it is not one (used by storage rules)
create or replace function public.try_uuid(p text)
returns uuid language sql immutable as $$
  select case when p ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then p::uuid end;
$$;

-- '210,618' / '$210618' / '210618.00' → 210618 ; anything else → 0
create or replace function public._num(p text)
returns numeric language sql immutable as $$
  select case when regexp_replace(coalesce(p, ''), '[,$[:space:]]', '', 'g') ~ '^-?[0-9]+(\.[0-9]+)?$'
              then regexp_replace(p, '[,$[:space:]]', '', 'g')::numeric
              else 0 end;
$$;


-- =====================================================================
-- 4. TRIGGERS
-- =====================================================================

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','app_settings','programs','courses','chapters','videos','ebooks',
    'course_packages','coupons','payments','enrollments','video_progress','ebook_progress',
    'video_notes','ebook_annotations','doubts','questions','question_answer_keys','tests'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- create a profile when someone signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', new.phone),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- students cannot change their own role or unblock themselves
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return new;   -- SQL editor / service role
  end if;
  if (new.role is distinct from old.role or new.is_blocked is distinct from old.is_blocked)
     and not public.is_admin() then
    raise exception 'Only admins can change role or blocked status';
  end if;
  if new.role in ('admin','super_admin') and new.role is distinct from old.role
     and not public.is_super_admin() then
    raise exception 'Only the super admin can make someone an admin';
  end if;
  return new;
end $$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- give every question a readable code
create or replace function public.set_question_code()
returns trigger language plpgsql as $$
begin
  if new.code is null or new.code = '' then
    new.code := case new.type
                  when 'mcq' then 'Q-'
                  when 'cbq' then 'CBQ-'
                  else 'TBS-'
                end || nextval('public.question_code_seq');
  end if;
  return new;
end $$;

drop trigger if exists set_question_code on public.questions;
create trigger set_question_code
  before insert on public.questions
  for each row execute function public.set_question_code();

-- write to the admin "Recent activity" feed
create or replace function public.log_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare j jsonb := to_jsonb(new);
begin
  insert into public.activity_log (actor_id, action, entity_type, entity_id, details)
  values (
    auth.uid(), tg_argv[0], tg_table_name, (j->>'id')::uuid,
    jsonb_strip_nulls(jsonb_build_object(
      'title', j->>'title', 'code', j->>'code', 'type', j->>'type',
      'user_id', j->>'user_id', 'course_id', j->>'course_id', 'chapter_id', j->>'chapter_id'))
  );
  return new;
end $$;

drop trigger if exists log_enrollment on public.enrollments;
create trigger log_enrollment after insert on public.enrollments
  for each row execute function public.log_activity('enrolled');

drop trigger if exists log_video on public.videos;
create trigger log_video after insert on public.videos
  for each row execute function public.log_activity('video_uploaded');

drop trigger if exists log_question on public.questions;
create trigger log_question after insert on public.questions
  for each row execute function public.log_activity('question_created');


-- =====================================================================
-- 5. INDEXES
-- =====================================================================
create index if not exists courses_program_idx on public.courses (program_id, position);
create index if not exists chapters_course_idx on public.chapters (course_id, position);
create index if not exists videos_chapter_idx on public.videos (chapter_id, position);
create index if not exists ebooks_chapter_idx on public.ebooks (chapter_id);
create unique index if not exists coupons_code_key on public.coupons (lower(code));
create index if not exists payments_user_idx on public.payments (user_id, created_at desc);
create index if not exists enrollments_user_idx on public.enrollments (user_id);
create index if not exists enrollments_valid_until_idx on public.enrollments (valid_until);
create index if not exists video_progress_user_idx on public.video_progress (user_id, updated_at desc);
create index if not exists video_notes_user_video_idx on public.video_notes (user_id, video_id);
create index if not exists ebook_annotations_user_idx on public.ebook_annotations (user_id, ebook_id);
create index if not exists doubts_status_idx on public.doubts (status, created_at desc);
create index if not exists questions_filter_idx on public.questions (course_id, chapter_id, type, status);
create index if not exists tests_course_idx on public.tests (course_id, kind);
create index if not exists tests_chapter_idx on public.tests (chapter_id);
create index if not exists test_attempts_user_idx on public.test_attempts (user_id, test_id);
create index if not exists attempt_questions_question_idx on public.attempt_questions (question_id);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists activity_log_created_idx on public.activity_log (created_at desc);


-- =====================================================================
-- 6. ROW LEVEL SECURITY
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','app_settings','programs','courses','chapters','videos','ebooks',
    'course_packages','package_courses','coupons','payments','coupon_redemptions','enrollments',
    'user_devices','video_progress','ebook_progress','video_notes','ebook_annotations','doubts',
    'questions','question_answer_keys','question_exhibits','tests','test_questions',
    'test_attempts','attempt_questions','notifications','activity_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- profiles
drop policy if exists "profiles: read own or staff" on public.profiles;
create policy "profiles: read own or staff" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles for insert to authenticated
  with check (id = auth.uid() and role = 'student');
drop policy if exists "profiles: update own or admin" on public.profiles;
create policy "profiles: update own or admin" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- app settings
drop policy if exists "settings: read" on public.app_settings;
create policy "settings: read" on public.app_settings for select to authenticated using (true);
drop policy if exists "settings: admin" on public.app_settings;
create policy "settings: admin" on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- programs and courses (catalog is visible on the website too)
drop policy if exists "programs: read" on public.programs;
create policy "programs: read" on public.programs for select to anon, authenticated
  using (is_published or public.is_staff());
drop policy if exists "programs: admin" on public.programs;
create policy "programs: admin" on public.programs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "courses: read" on public.courses;
create policy "courses: read" on public.courses for select to anon, authenticated
  using (is_published or public.is_staff());
drop policy if exists "courses: admin" on public.courses;
create policy "courses: admin" on public.courses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- chapters: titles visible to everyone signed in (so locked courses show their syllabus)
drop policy if exists "chapters: read" on public.chapters;
create policy "chapters: read" on public.chapters for select to authenticated
  using (is_published or public.is_staff());
drop policy if exists "chapters: staff" on public.chapters;
create policy "chapters: staff" on public.chapters for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- videos and eBooks: only students with a valid enrollment
drop policy if exists "videos: read enrolled" on public.videos;
create policy "videos: read enrolled" on public.videos for select to authenticated
  using (public.is_staff()
         or (is_published and status = 'ready'
             and public.has_course_access(public.chapter_course_id(chapter_id))));
drop policy if exists "videos: staff" on public.videos;
create policy "videos: staff" on public.videos for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "ebooks: read enrolled" on public.ebooks;
create policy "ebooks: read enrolled" on public.ebooks for select to authenticated
  using (public.is_staff()
         or (is_published and public.has_course_access(public.chapter_course_id(chapter_id))));
drop policy if exists "ebooks: staff" on public.ebooks;
create policy "ebooks: staff" on public.ebooks for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- packages (shown on the pricing page)
drop policy if exists "packages: read" on public.course_packages;
create policy "packages: read" on public.course_packages for select to anon, authenticated
  using (is_active or public.is_admin());
drop policy if exists "packages: admin" on public.course_packages;
create policy "packages: admin" on public.course_packages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "package courses: read" on public.package_courses;
create policy "package courses: read" on public.package_courses for select to anon, authenticated using (true);
drop policy if exists "package courses: admin" on public.package_courses;
create policy "package courses: admin" on public.package_courses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- coupons: admins only (students check a code with validate_coupon)
drop policy if exists "coupons: admin" on public.coupons;
create policy "coupons: admin" on public.coupons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- payments: students see their own; created/updated by the Edge Function (service role)
drop policy if exists "payments: read own or admin" on public.payments;
create policy "payments: read own or admin" on public.payments for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "payments: admin" on public.payments;
create policy "payments: admin" on public.payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "redemptions: read own or admin" on public.coupon_redemptions;
create policy "redemptions: read own or admin" on public.coupon_redemptions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- enrollments
drop policy if exists "enrollments: read own or staff" on public.enrollments;
create policy "enrollments: read own or staff" on public.enrollments for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
drop policy if exists "enrollments: admin" on public.enrollments;
create policy "enrollments: admin" on public.enrollments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- devices (added with register_device)
drop policy if exists "devices: read own or admin" on public.user_devices;
create policy "devices: read own or admin" on public.user_devices for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "devices: remove own or admin" on public.user_devices;
create policy "devices: remove own or admin" on public.user_devices for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- progress (written by mark_video_progress / mark_ebook_progress)
drop policy if exists "video progress: read own or staff" on public.video_progress;
create policy "video progress: read own or staff" on public.video_progress for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
drop policy if exists "ebook progress: read own or staff" on public.ebook_progress;
create policy "ebook progress: read own or staff" on public.ebook_progress for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

-- notes and highlights: fully owned by the student
drop policy if exists "video notes: own" on public.video_notes;
create policy "video notes: own" on public.video_notes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "ebook annotations: own" on public.ebook_annotations;
create policy "ebook annotations: own" on public.ebook_annotations for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- doubts
drop policy if exists "doubts: read own or staff" on public.doubts;
create policy "doubts: read own or staff" on public.doubts for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
drop policy if exists "doubts: ask" on public.doubts;
create policy "doubts: ask" on public.doubts for insert to authenticated
  with check (user_id = auth.uid() and status = 'open'
              and public.has_course_access(public.chapter_course_id(chapter_id)));
drop policy if exists "doubts: staff answer" on public.doubts;
create policy "doubts: staff answer" on public.doubts for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- question bank: staff only (students get questions through get_attempt)
drop policy if exists "questions: staff" on public.questions;
create policy "questions: staff" on public.questions for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists "answer keys: staff" on public.question_answer_keys;
create policy "answer keys: staff" on public.question_answer_keys for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists "exhibits: staff" on public.question_exhibits;
create policy "exhibits: staff" on public.question_exhibits for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- tests
drop policy if exists "tests: read enrolled" on public.tests;
create policy "tests: read enrolled" on public.tests for select to authenticated
  using (public.is_staff() or (status = 'published' and public.has_course_access(course_id)));
drop policy if exists "tests: staff" on public.tests;
create policy "tests: staff" on public.tests for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists "test questions: staff" on public.test_questions;
create policy "test questions: staff" on public.test_questions for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- attempts (created and changed only through the functions below)
drop policy if exists "attempts: read own or staff" on public.test_attempts;
create policy "attempts: read own or staff" on public.test_attempts for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
drop policy if exists "attempt questions: read own or staff" on public.attempt_questions;
create policy "attempt questions: read own or staff" on public.attempt_questions for select to authenticated
  using (public.is_staff() or exists (
    select 1 from public.test_attempts a where a.id = attempt_id and a.user_id = auth.uid()));

-- notifications
drop policy if exists "notifications: read own" on public.notifications;
create policy "notifications: read own" on public.notifications for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "notifications: mark read" on public.notifications;
create policy "notifications: mark read" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "notifications: admin" on public.notifications;
create policy "notifications: admin" on public.notifications for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- activity feed
drop policy if exists "activity: staff" on public.activity_log;
create policy "activity: staff" on public.activity_log for select to authenticated
  using (public.is_staff());

-- per-question accuracy for the question bank ("students correct" column)
create or replace view public.question_accuracy with (security_invoker = on) as
  select question_id,
         count(*)::int as times_answered,
         round(100 * avg(fraction_correct), 1) as percent_correct
  from public.attempt_questions
  where fraction_correct is not null
  group by question_id;


-- =====================================================================
-- 7. APP FUNCTIONS  (frontend: supabase.rpc('name', { … }))
-- =====================================================================

-- ---------- Device limit ----------
-- Call right after login. Returns {"allowed":true} or {"allowed":false,"max":2}.
create or replace function public.register_device(p_device_id text, p_device_name text default null, p_platform text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_max int;
  v_count int;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;

  if exists (select 1 from user_devices where user_id = v_uid and device_id = p_device_id) then
    update user_devices set last_active_at = now(),
           device_name = coalesce(p_device_name, device_name), platform = coalesce(p_platform, platform)
     where user_id = v_uid and device_id = p_device_id;
    return jsonb_build_object('allowed', true);
  end if;

  v_max := coalesce((select (value #>> '{}')::int from app_settings where key = 'max_devices'), 2);
  select count(*) into v_count from user_devices where user_id = v_uid;

  if v_count >= v_max and not public.is_staff() then
    insert into activity_log (actor_id, action, entity_type, details)
    values (v_uid, 'device_blocked', 'user_devices',
            jsonb_build_object('device_name', p_device_name, 'platform', p_platform, 'max', v_max));
    return jsonb_build_object('allowed', false, 'max', v_max);
  end if;

  insert into user_devices (user_id, device_id, device_name, platform)
  values (v_uid, p_device_id, p_device_name, p_platform);
  return jsonb_build_object('allowed', true);
end $$;

-- ---------- Progress ----------
create or replace function public.mark_video_progress(
  p_video_id uuid, p_position_seconds int, p_watched_seconds int, p_mark_complete boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_dur int;
  v_course uuid;
  v_pct int;
  v_auto boolean;
  v_done boolean;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select v.duration_seconds, c.course_id into v_dur, v_course
    from videos v join chapters c on c.id = v.chapter_id where v.id = p_video_id;
  if v_course is null then raise exception 'Video not found'; end if;
  if not public.has_course_access(v_course) then raise exception 'No access to this course'; end if;

  v_pct := coalesce((select (value #>> '{}')::int from app_settings where key = 'video_complete_percent'), 90);
  v_auto := p_mark_complete or (coalesce(v_dur, 0) > 0 and p_watched_seconds >= v_dur * v_pct / 100.0);

  insert into video_progress (user_id, video_id, last_position_seconds, watched_seconds, completed, completed_at)
  values (auth.uid(), p_video_id, greatest(coalesce(p_position_seconds, 0), 0), greatest(coalesce(p_watched_seconds, 0), 0),
          v_auto, case when v_auto then now() end)
  on conflict (user_id, video_id) do update set
    last_position_seconds = excluded.last_position_seconds,
    watched_seconds = greatest(video_progress.watched_seconds, excluded.watched_seconds),
    completed = video_progress.completed or excluded.completed,
    completed_at = coalesce(video_progress.completed_at, excluded.completed_at),
    updated_at = now()
  returning completed into v_done;

  return jsonb_build_object('completed', v_done);
end $$;

create or replace function public.mark_ebook_progress(p_ebook_id uuid, p_last_page int, p_mark_complete boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_pages int;
  v_course uuid;
  v_auto boolean;
  v_done boolean;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select e.page_count, c.course_id into v_pages, v_course
    from ebooks e join chapters c on c.id = e.chapter_id where e.id = p_ebook_id;
  if v_course is null then raise exception 'eBook not found'; end if;
  if not public.has_course_access(v_course) then raise exception 'No access to this course'; end if;

  v_auto := p_mark_complete or (coalesce(v_pages, 0) > 0 and p_last_page >= ceil(v_pages * 0.9));

  insert into ebook_progress (user_id, ebook_id, last_page, completed, completed_at)
  values (auth.uid(), p_ebook_id, greatest(coalesce(p_last_page, 1), 1), v_auto, case when v_auto then now() end)
  on conflict (user_id, ebook_id) do update set
    last_page = excluded.last_page,
    completed = ebook_progress.completed or excluded.completed,
    completed_at = coalesce(ebook_progress.completed_at, excluded.completed_at),
    updated_at = now()
  returning completed into v_done;

  return jsonb_build_object('completed', v_done);
end $$;

-- per-chapter numbers for one student (internal)
create or replace function public._user_chapter_stats(p_user_id uuid, p_course_id uuid default null)
returns table (
  chapter_id uuid, course_id uuid, chapter_position int, title text,
  videos_total int, videos_done int, ebooks_total int, ebooks_done int,
  tests_total int, tests_done int, best_test_percent numeric,
  items_total int, items_done int, progress_percent int, is_complete boolean)
language sql stable security definer set search_path = public as $$
  with base as (
    select c.id as cid, c.course_id as crs, c.position as pos, c.title as ttl,
      (select count(*) from videos v
        where v.chapter_id = c.id and v.is_published and v.status = 'ready')::int as vt,
      (select count(*) from videos v
         join video_progress vp on vp.video_id = v.id and vp.user_id = p_user_id and vp.completed
        where v.chapter_id = c.id and v.is_published and v.status = 'ready')::int as vd,
      (select count(*) from ebooks e
        where e.chapter_id = c.id and e.is_published)::int as et,
      (select count(*) from ebooks e
         join ebook_progress ep on ep.ebook_id = e.id and ep.user_id = p_user_id and ep.completed
        where e.chapter_id = c.id and e.is_published)::int as ed,
      (select count(*) from tests t
        where t.chapter_id = c.id and t.kind = 'chapter_test' and t.status = 'published')::int as tt,
      (select count(distinct t.id) from tests t
         join test_attempts a on a.test_id = t.id and a.user_id = p_user_id and a.status <> 'in_progress'
        where t.chapter_id = c.id and t.kind = 'chapter_test' and t.status = 'published')::int as td,
      (select max(a.percent) from tests t
         join test_attempts a on a.test_id = t.id and a.user_id = p_user_id and a.status <> 'in_progress'
        where t.chapter_id = c.id and t.kind = 'chapter_test') as best
    from chapters c
    where c.is_published and (p_course_id is null or c.course_id = p_course_id)
  )
  select cid, crs, pos, ttl, vt, vd, et, ed, tt, td, best,
         (vt + et + tt), (vd + ed + td),
         case when (vt + et + tt) = 0 then 0 else round(100.0 * (vd + ed + td) / (vt + et + tt))::int end,
         (vt + et + tt) > 0 and (vd + ed + td) >= (vt + et + tt)
  from base
  order by crs, pos;
$$;

-- "My courses" cards: course, validity, progress
create or replace function public.my_courses()
returns table (
  course_id uuid, program_slug text, program_name text, course_code text, course_name text,
  full_name text, kind public.course_kind, valid_until timestamptz, days_left int,
  chapters_total int, chapters_done int, progress_percent int)
language sql stable security definer set search_path = public as $$
  with e as (
    select en.course_id as crs, en.valid_until as vu
    from enrollments en
    where en.user_id = auth.uid() and en.status = 'active' and now() between en.valid_from and en.valid_until
  ),
  s as (
    select st.course_id as crs,
           count(*)::int as ct,
           (count(*) filter (where st.is_complete))::int as cd,
           sum(st.items_total)::int as it,
           sum(st.items_done)::int as idn
    from public._user_chapter_stats(auth.uid(), null) st
    where st.course_id in (select crs from e)
    group by st.course_id
  )
  select c.id, p.slug, p.name, c.code, c.name, c.full_name, c.kind, e.vu,
         greatest(0, ceil(extract(epoch from (e.vu - now())) / 86400))::int,
         coalesce(s.ct, 0), coalesce(s.cd, 0),
         case when coalesce(s.it, 0) = 0 then 0 else round(100.0 * s.idn / s.it)::int end
  from e
  join courses c on c.id = e.crs
  join programs p on p.id = c.program_id
  left join s on s.crs = c.id
  order by p.position, c.position;
$$;

-- Course page: chapter list with steps and the "Recommended next" chapter
create or replace function public.my_course_chapters(p_course_id uuid)
returns table (
  chapter_id uuid, chapter_position int, title text,
  videos_total int, videos_done int, ebooks_total int, ebooks_done int,
  tests_total int, tests_done int, best_test_percent numeric,
  progress_percent int, is_complete boolean, is_recommended boolean)
language sql stable security definer set search_path = public as $$
  with s as (
    select * from public._user_chapter_stats(auth.uid(), p_course_id)
  ),
  rec as (
    select s.chapter_id as rid from s where not s.is_complete order by s.chapter_position limit 1
  )
  select s.chapter_id, s.chapter_position, s.title,
         s.videos_total, s.videos_done, s.ebooks_total, s.ebooks_done,
         s.tests_total, s.tests_done, s.best_test_percent,
         s.progress_percent, s.is_complete,
         coalesce(s.chapter_id = (select rid from rec), false)
  from s
  where public.has_course_access(p_course_id)
  order by s.chapter_position;
$$;

-- Home "Continue learning" card
create or replace function public.my_continue_learning()
returns table (
  course_id uuid, course_name text, chapter_id uuid, chapter_title text,
  next_video_id uuid, next_video_title text, last_activity_at timestamptz)
language sql stable security definer set search_path = public as $$
  with last as (
    select v.chapter_id as chid, vp.updated_at as at
    from video_progress vp
    join videos v on v.id = vp.video_id
    where vp.user_id = auth.uid()
    order by vp.updated_at desc
    limit 1
  )
  select c.course_id, co.name, c.id, c.title, nv.id, nv.title, last.at
  from last
  join chapters c on c.id = last.chid
  join courses co on co.id = c.course_id
  left join lateral (
    select v.id, v.title
    from videos v
    left join video_progress vp on vp.video_id = v.id and vp.user_id = auth.uid()
    where v.chapter_id = c.id and v.is_published and v.status = 'ready'
      and coalesce(vp.completed, false) = false
    order by v.position
    limit 1
  ) nv on true
  where public.has_course_access(c.course_id);
$$;

-- ---------- Grading ----------
-- Returns how much of a response is correct, from 0 to 1. Formats are listed above the questions table.
create or replace function public.grade_response(p_type public.question_type, p_key jsonb, p_response jsonb)
returns numeric language plpgsql immutable as $$
declare
  v_total int := 0;
  v_ok int := 0;
  k text;
  v jsonb;
  r jsonb;
  line jsonb;
  resp_lines jsonb;
  used int[] := '{}';
  i int;
  matched boolean;
  v_resp_count int;
  part_sum numeric := 0;
  part_n int := 0;
begin
  if p_key is null or p_response is null then
    return 0;
  end if;

  case p_type
    when 'mcq' then
      return case when coalesce(p_response->>'selected', '') <> ''
                   and p_response->>'selected' = p_key->>'correct' then 1 else 0 end;

    when 'tbs_numeric' then
      for k, v in select key, value from jsonb_each(coalesce(p_key->'answers', '{}'::jsonb)) loop
        v_total := v_total + 1;
        if coalesce(p_response->'answers'->>k, '') <> ''
           and abs(public._num(p_response->'answers'->>k) - public._num(v->>'value'))
               <= coalesce(public._num(v->>'tolerance'), 0) then
          v_ok := v_ok + 1;
        end if;
      end loop;

    when 'tbs_dropdown', 'tbs_drag_drop', 'tbs_document_review' then
      for k, v in select key, value from jsonb_each(coalesce(p_key->'answers', '{}'::jsonb)) loop
        v_total := v_total + 1;
        if lower(trim(coalesce(p_response->'answers'->>k, ''))) = lower(trim(v #>> '{}')) then
          v_ok := v_ok + 1;
        end if;
      end loop;

    when 'tbs_journal_entry' then
      resp_lines := case when jsonb_typeof(p_response->'lines') = 'array' then p_response->'lines' else '[]'::jsonb end;
      select count(*) into v_resp_count
        from jsonb_array_elements(resp_lines) e
       where coalesce(trim(e->>'account'), '') <> '';
      for line in select value from jsonb_array_elements(coalesce(p_key->'lines', '[]'::jsonb)) loop
        v_total := v_total + 1;
        matched := false;
        for i in 0 .. jsonb_array_length(resp_lines) - 1 loop
          if not (i = any(used)) then
            r := resp_lines->i;
            if lower(trim(coalesce(r->>'account', ''))) = lower(trim(coalesce(line->>'account', '')))
               and abs(public._num(r->>'debit') - public._num(line->>'debit')) < 0.5
               and abs(public._num(r->>'credit') - public._num(line->>'credit')) < 0.5 then
              used := used || i;
              matched := true;
              exit;
            end if;
          end if;
        end loop;
        if matched then v_ok := v_ok + 1; end if;
      end loop;
      -- extra wrong lines lower the score
      v_total := greatest(v_total, v_resp_count);

    when 'tbs_research' then
      return case when exists (
        select 1 from jsonb_array_elements_text(coalesce(p_key->'citations', '[]'::jsonb)) c
        where lower(regexp_replace(c, '[^0-9A-Za-z]', '', 'g'))
            = lower(regexp_replace(coalesce(p_response->>'citation', ''), '[^0-9A-Za-z]', '', 'g'))
          and coalesce(p_response->>'citation', '') <> ''
      ) then 1 else 0 end;

    when 'cbq' then
      for k, v in select key, value from jsonb_each(coalesce(p_key->'parts', '{}'::jsonb)) loop
        part_n := part_n + 1;
        part_sum := part_sum + public.grade_response((v->>'type')::public.question_type, v->'key', p_response->'parts'->k);
      end loop;
      return case when part_n = 0 then 0 else round(part_sum / part_n, 4) end;

    else
      return 0;
  end case;

  return case when v_total = 0 then 0 else round(v_ok::numeric / v_total, 4) end;
end $$;

-- marks every question of an attempt and saves the total (internal)
create or replace function public._grade_attempt(p_attempt_id uuid, p_final_status public.attempt_status default 'submitted')
returns void language plpgsql security definer set search_path = public as $$
begin
  update attempt_questions aq
     set fraction_correct = public.grade_response(q.type, k.answer_key, aq.response)
    from questions q
    left join question_answer_keys k on k.question_id = q.id
   where aq.attempt_id = p_attempt_id
     and q.id = aq.question_id;

  update attempt_questions aq
     set score = case
                   when q.partial_credit then round(coalesce(aq.fraction_correct, 0) * aq.max_score, 2)
                   when coalesce(aq.fraction_correct, 0) >= 1 then aq.max_score
                   else 0
                 end
    from questions q
   where aq.attempt_id = p_attempt_id
     and q.id = aq.question_id;

  update test_attempts a
     set status = p_final_status,
         submitted_at = coalesce(a.submitted_at, least(now(), a.expires_at)),
         score = s.total_score,
         max_score = s.total_max,
         percent = case when s.total_max > 0 then round(100 * s.total_score / s.total_max, 2) else 0 end,
         time_spent_seconds = greatest(0, extract(epoch from (least(now(), a.expires_at) - a.started_at))::int)
    from (select coalesce(sum(score), 0) as total_score, coalesce(sum(max_score), 0) as total_max
            from attempt_questions where attempt_id = p_attempt_id) s
   where a.id = p_attempt_id;
end $$;

-- ---------- Taking a test ----------
-- Starts (or resumes) an attempt and picks its questions. Returns the attempt id.
create or replace function public.start_test_attempt(p_test_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  t record;
  v_attempt uuid;
  v_count int;
  v_pos int := 0;
  v_added int;
  k text;
  n int;
  v_chapters uuid[];
begin
  if v_uid is null then raise exception 'Not signed in'; end if;

  select * into t from tests where id = p_test_id;
  if not found then raise exception 'Test not found'; end if;
  if t.status <> 'published' and not public.is_staff() then raise exception 'Test is not published'; end if;
  if not public.has_course_access(t.course_id) then raise exception 'No access to this course'; end if;

  -- close attempts whose time already ran out
  for v_attempt in
    select id from test_attempts
     where user_id = v_uid and test_id = p_test_id and status = 'in_progress' and expires_at < now()
  loop
    perform public._grade_attempt(v_attempt, 'expired');
  end loop;

  -- resume an open attempt
  select id into v_attempt from test_attempts
   where user_id = v_uid and test_id = p_test_id and status = 'in_progress'
   limit 1;
  if v_attempt is not null then return v_attempt; end if;

  select count(*) into v_count from test_attempts where user_id = v_uid and test_id = p_test_id;
  if t.max_attempts is not null and v_count >= t.max_attempts then
    raise exception 'No attempts left for this test';
  end if;

  insert into test_attempts (user_id, test_id, attempt_no, expires_at)
  values (v_uid, p_test_id, v_count + 1, now() + make_interval(mins => t.duration_minutes))
  returning id into v_attempt;

  if t.selection_mode = 'fixed' then
    insert into attempt_questions (attempt_id, question_id, position, testlet_no, max_score)
    select v_attempt, tq.question_id, row_number() over (order by tq.position), tq.testlet_no, q.points
      from test_questions tq
      join questions q on q.id = tq.question_id
     where tq.test_id = p_test_id and q.status = 'published';
  else
    if t.chapter_id is not null then
      v_chapters := array[t.chapter_id];
    elsif jsonb_typeof(t.random_config->'chapter_ids') = 'array' then
      select array_agg(value::uuid) into v_chapters
        from jsonb_array_elements_text(t.random_config->'chapter_ids');
    end if;

    -- MCQs go in testlet 1, simulations and cases in testlet 2
    for k, n in
      select key, value::int from jsonb_each_text(coalesce(t.random_config->'counts', '{}'::jsonb))
      order by case when key = 'mcq' then 0 else 1 end, key
    loop
      insert into attempt_questions (attempt_id, question_id, position, testlet_no, max_score)
      select v_attempt, x.id, v_pos + row_number() over (), case when k = 'mcq' then 1 else 2 end, x.points
        from (select q.id, q.points
                from questions q
               where q.course_id = t.course_id
                 and q.status = 'published'
                 and q.type = k::public.question_type
                 and (v_chapters is null or q.chapter_id = any(v_chapters))
               order by random()
               limit n) x;
      get diagnostics v_added = row_count;
      v_pos := v_pos + v_added;
    end loop;
  end if;

  if not exists (select 1 from attempt_questions where attempt_id = v_attempt) then
    raise exception 'This test has no published questions yet';
  end if;

  return v_attempt;
end $$;

-- Everything the exam screen needs. Answers and explanations appear only after submit.
create or replace function public.get_attempt(p_attempt_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  a record;
  t record;
  v_show boolean;
  v_questions jsonb;
begin
  select * into a from test_attempts where id = p_attempt_id;
  if not found or (a.user_id is distinct from auth.uid() and not public.is_staff()) then
    raise exception 'Attempt not found';
  end if;
  select * into t from tests where id = a.test_id;
  v_show := (a.status <> 'in_progress' and t.show_answers_after_submit) or public.is_staff();

  select coalesce(jsonb_agg(jsonb_build_object(
           'attempt_question_id', aq.id,
           'position', aq.position,
           'testlet_no', aq.testlet_no,
           'question_id', q.id,
           'code', q.code,
           'type', q.type,
           'stem', q.stem,
           'content', q.content,
           'points', aq.max_score,
           'response', aq.response,
           'flagged', aq.flagged,
           'exhibits', coalesce((
              select jsonb_agg(jsonb_build_object('title', ex.title, 'storage_path', ex.storage_path,
                                                  'description', ex.description) order by ex.position)
                from question_exhibits ex where ex.question_id = q.id), '[]'::jsonb),
           'result', case when v_show then jsonb_build_object(
              'fraction_correct', aq.fraction_correct,
              'score', aq.score,
              'answer_key', k.answer_key,
              'explanation', k.explanation,
              'solution_video_id', q.solution_video_id) end
         ) order by aq.position), '[]'::jsonb)
    into v_questions
    from attempt_questions aq
    join questions q on q.id = aq.question_id
    left join question_answer_keys k on k.question_id = q.id
   where aq.attempt_id = p_attempt_id;

  return jsonb_build_object(
    'attempt', jsonb_build_object(
       'id', a.id, 'status', a.status, 'attempt_no', a.attempt_no,
       'started_at', a.started_at, 'expires_at', a.expires_at, 'submitted_at', a.submitted_at,
       'score', a.score, 'max_score', a.max_score, 'percent', a.percent, 'server_now', now()),
    'test', jsonb_build_object('id', t.id, 'title', t.title, 'kind', t.kind, 'duration_minutes', t.duration_minutes),
    'questions', v_questions);
end $$;

-- Save one answer while the timer is running (call on every change or every few seconds)
create or replace function public.save_attempt_response(
  p_attempt_question_id uuid, p_response jsonb, p_flagged boolean default null, p_time_spent_seconds int default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
  v_status public.attempt_status;
  v_expires timestamptz;
begin
  select a.user_id, a.status, a.expires_at into v_user, v_status, v_expires
    from attempt_questions aq join test_attempts a on a.id = aq.attempt_id
   where aq.id = p_attempt_question_id;

  if v_user is null or v_user is distinct from auth.uid() then raise exception 'Question not found'; end if;
  if v_status <> 'in_progress' then raise exception 'This attempt is already submitted'; end if;
  if now() > v_expires + interval '2 minutes' then raise exception 'Time is up for this attempt'; end if;

  update attempt_questions
     set response = coalesce(p_response, response),
         flagged = coalesce(p_flagged, flagged),
         time_spent_seconds = coalesce(p_time_spent_seconds, time_spent_seconds),
         answered_at = case when p_response is not null then now() else answered_at end
   where id = p_attempt_question_id;
end $$;

-- Submit and get the score back
create or replace function public.submit_test_attempt(p_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a record;
begin
  select * into a from test_attempts where id = p_attempt_id;
  if not found or a.user_id is distinct from auth.uid() then raise exception 'Attempt not found'; end if;

  if a.status = 'in_progress' then
    perform public._grade_attempt(
      p_attempt_id,
      case when now() > a.expires_at + interval '2 minutes'
           then 'expired'::public.attempt_status else 'submitted'::public.attempt_status end);
    select * into a from test_attempts where id = p_attempt_id;
  end if;

  return jsonb_build_object('attempt_id', a.id, 'status', a.status,
                            'score', a.score, 'max_score', a.max_score, 'percent', a.percent);
end $$;

-- ---------- Buying ----------
create or replace function public.validate_coupon(p_code text, p_package_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  c record;
  v_price numeric;
  v_discount numeric;
begin
  select price_inr into v_price from course_packages where id = p_package_id and is_active;
  if v_price is null then
    return jsonb_build_object('valid', false, 'reason', 'Package not available');
  end if;

  select * into c from coupons
   where lower(code) = lower(trim(p_code)) and is_active
     and (valid_from is null or valid_from <= now())
     and (valid_until is null or valid_until >= now())
     and (package_id is null or package_id = p_package_id)
     and (max_uses is null or used_count < max_uses);
  if not found then
    return jsonb_build_object('valid', false, 'reason', 'Coupon is not valid');
  end if;

  if exists (select 1 from coupon_redemptions where coupon_id = c.id and user_id = auth.uid()) then
    return jsonb_build_object('valid', false, 'reason', 'Coupon already used');
  end if;

  v_discount := case when c.discount_type = 'percent'
                     then round(v_price * least(c.discount_value, 100) / 100, 2)
                     else least(c.discount_value, v_price) end;

  return jsonb_build_object('valid', true, 'coupon_id', c.id, 'price_inr', v_price,
                            'discount_inr', v_discount, 'final_inr', v_price - v_discount);
end $$;

-- Called by the payment Edge Function (service role) after Razorpay is verified
-- and the payment row is set to status 'paid'. Safe to call twice.
create or replace function public.grant_package_after_payment(p_payment_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  p record;
  v_days int;
  v_count int;
begin
  select * into p from payments where id = p_payment_id for update;
  if not found then raise exception 'Payment not found'; end if;
  if p.status <> 'paid' then raise exception 'Payment is not marked as paid'; end if;
  if p.package_id is null then raise exception 'Payment has no package'; end if;
  if p.enrollments_granted_at is not null then return 0; end if;

  select validity_days into v_days from course_packages where id = p.package_id;

  insert into enrollments (user_id, course_id, package_id, payment_id, valid_from, valid_until, status)
  select p.user_id, pc.course_id, p.package_id, p.id, now(), now() + make_interval(days => v_days), 'active'
    from package_courses pc
   where pc.package_id = p.package_id
  on conflict (user_id, course_id) do update set
    valid_until = greatest(enrollments.valid_until, now()) + make_interval(days => v_days),
    status = 'active',
    package_id = excluded.package_id,
    payment_id = excluded.payment_id;
  get diagnostics v_count = row_count;

  if p.coupon_id is not null then
    insert into coupon_redemptions (coupon_id, user_id, payment_id)
    values (p.coupon_id, p.user_id, p.id)
    on conflict (coupon_id, user_id) do nothing;
    if found then
      update coupons set used_count = used_count + 1 where id = p.coupon_id;
    end if;
  end if;

  update payments set enrollments_granted_at = now() where id = p_payment_id;
  return v_count;
end $$;


-- =====================================================================
-- 8. ADMIN FUNCTIONS
-- =====================================================================

-- Give a student access to a course without payment, or add days
create or replace function public.admin_grant_enrollment(p_user_id uuid, p_course_id uuid, p_days int)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_days is null or p_days <= 0 then raise exception 'Days must be more than 0'; end if;

  insert into enrollments (user_id, course_id, valid_from, valid_until, status, granted_by)
  values (p_user_id, p_course_id, now(), now() + make_interval(days => p_days), 'active', auth.uid())
  on conflict (user_id, course_id) do update set
    valid_until = greatest(enrollments.valid_until, now()) + make_interval(days => p_days),
    status = 'active',
    granted_by = auth.uid()
  returning id into v_id;

  insert into activity_log (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'enrollment_granted', 'enrollments', v_id,
          jsonb_build_object('user_id', p_user_id, 'course_id', p_course_id, 'days', p_days));
  return v_id;
end $$;

-- "Extend" button on the Students screen
create or replace function public.admin_extend_enrollment(p_enrollment_id uuid, p_days int)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_until timestamptz;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_days is null or p_days <= 0 then raise exception 'Days must be more than 0'; end if;

  update enrollments
     set valid_until = greatest(valid_until, now()) + make_interval(days => p_days),
         status = 'active',
         granted_by = auth.uid()
   where id = p_enrollment_id
  returning valid_until into v_until;
  if v_until is null then raise exception 'Enrollment not found'; end if;

  insert into activity_log (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'enrollment_extended', 'enrollments', p_enrollment_id, jsonb_build_object('days', p_days));
  return v_until;
end $$;

-- "Reset devices" button
create or replace function public.admin_reset_devices(p_user_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  delete from user_devices where user_id = p_user_id;
  get diagnostics v_count = row_count;
  insert into activity_log (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'devices_reset', 'profiles', p_user_id, jsonb_build_object('removed', v_count));
  return v_count;
end $$;

-- Change someone's role (faculty, admin …)
create or replace function public.admin_set_role(p_user_id uuid, p_role public.app_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_role in ('admin','super_admin') and not public.is_super_admin() then
    raise exception 'Only the super admin can make someone an admin';
  end if;
  update profiles set role = p_role where id = p_user_id;
  insert into activity_log (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'role_changed', 'profiles', p_user_id, jsonb_build_object('role', p_role));
end $$;

-- "Send reminder to all" on the dashboard; returns how many students were told.
-- Can also run daily with pg_cron:
--   select cron.schedule('expiry-reminders', '30 3 * * *', $c$select public.send_expiry_reminders()$c$);
create or replace function public.send_expiry_reminders(p_days int default null)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_days int;
  v_count int;
begin
  if auth.uid() is not null and not public.is_admin() then raise exception 'Admins only'; end if;
  v_days := coalesce(p_days, (select (value #>> '{}')::int from app_settings where key = 'reminder_days'), 15);

  insert into notifications (user_id, kind, title, body, link)
  select e.user_id, 'expiry',
         'Your ' || p.name || ' ' || c.name || ' access ends on ' || to_char(e.valid_until, 'DD Mon YYYY'),
         'Renew now so your classes and mock tests are not interrupted.',
         '/profile'
    from enrollments e
    join courses c on c.id = e.course_id
    join programs p on p.id = c.program_id
   where e.status = 'active'
     and e.valid_until between now() and now() + make_interval(days => v_days)
     and not exists (
       select 1 from notifications n
        where n.user_id = e.user_id and n.kind = 'expiry'
          and n.created_at > now() - interval '3 days');
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- Numbers for the admin dashboard
create or replace function public.admin_dashboard_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;

  select jsonb_build_object(
    'active_students', (select count(distinct user_id) from enrollments
                         where status = 'active' and now() between valid_from and valid_until),
    'new_enrollments_this_month', (select count(*) from enrollments
                         where created_at >= date_trunc('month', now())),
    'revenue_this_month_inr', (select coalesce(sum(amount_inr), 0) from payments
                         where status = 'paid' and paid_at >= date_trunc('month', now())),
    'ending_in_15_days', (select count(distinct user_id) from enrollments
                         where status = 'active' and valid_until between now() and now() + interval '15 days'),
    'enrollments_by_course', (select coalesce(jsonb_agg(x order by x->>'program', (x->>'position')::int), '[]'::jsonb) from (
        select jsonb_build_object('course_id', c.id, 'program', p.name, 'course', c.name,
                                  'position', c.position,
                                  'active', count(e.id) filter (where e.status = 'active' and now() between e.valid_from and e.valid_until)) as x
          from courses c join programs p on p.id = c.program_id
          left join enrollments e on e.course_id = c.id
         group by c.id, p.name, c.name, c.position) s),
    'videos_ready', (select count(*) from videos where status = 'ready'),
    'videos_processing', (select count(*) from videos where status in ('uploading','processing')),
    'ebooks', (select count(*) from ebooks),
    'questions_by_type', (select coalesce(jsonb_object_agg(type, n), '{}'::jsonb)
                            from (select type, count(*) as n from questions group by type) q),
    'questions_in_review', (select count(*) from questions where status = 'in_review'),
    'open_doubts', (select count(*) from doubts where status = 'open')
  ) into v;
  return v;
end $$;

-- Internal functions: not callable from the app
revoke execute on function public._user_chapter_stats(uuid, uuid) from public, anon, authenticated;
revoke execute on function public._grade_attempt(uuid, public.attempt_status) from public, anon, authenticated;
revoke execute on function public.grant_package_after_payment(uuid) from public, anon, authenticated;
grant execute on function public.grant_package_after_payment(uuid) to service_role;


-- =====================================================================
-- 9. STORAGE BUCKETS
-- =====================================================================
--  ebooks             private · path <course_id>/<chapter_id>/<file>.pdf
--  question-exhibits  private · path <question_id>/<file>
--  thumbnails         public  · video thumbnails and course images
insert into storage.buckets (id, name, public) values
  ('ebooks', 'ebooks', false),
  ('question-exhibits', 'question-exhibits', false),
  ('thumbnails', 'thumbnails', true)
on conflict (id) do nothing;

drop policy if exists "ebooks: staff manage" on storage.objects;
create policy "ebooks: staff manage" on storage.objects for all to authenticated
  using (bucket_id = 'ebooks' and public.is_staff())
  with check (bucket_id = 'ebooks' and public.is_staff());

drop policy if exists "ebooks: enrolled students read" on storage.objects;
create policy "ebooks: enrolled students read" on storage.objects for select to authenticated
  using (bucket_id = 'ebooks'
         and public.has_course_access(public.try_uuid((storage.foldername(name))[1])));

drop policy if exists "exhibits: staff manage" on storage.objects;
create policy "exhibits: staff manage" on storage.objects for all to authenticated
  using (bucket_id = 'question-exhibits' and public.is_staff())
  with check (bucket_id = 'question-exhibits' and public.is_staff());

drop policy if exists "exhibits: signed-in read" on storage.objects;
create policy "exhibits: signed-in read" on storage.objects for select to authenticated
  using (bucket_id = 'question-exhibits');

drop policy if exists "thumbnails: staff manage" on storage.objects;
create policy "thumbnails: staff manage" on storage.objects for all to authenticated
  using (bucket_id = 'thumbnails' and public.is_staff())
  with check (bucket_id = 'thumbnails' and public.is_staff());


-- =====================================================================
-- 10. STARTING DATA
-- =====================================================================
insert into public.app_settings (key, value) values
  ('max_devices', '2'::jsonb),             -- devices per student
  ('video_complete_percent', '90'::jsonb), -- watched % that counts as complete
  ('reminder_days', '15'::jsonb)           -- warn this many days before access ends
on conflict (key) do nothing;

insert into public.programs (slug, name, short_name, position) values
  ('cma-usa', 'CMA USA', 'CMA', 1),
  ('cpa-usa', 'CPA USA', 'CPA', 2),
  ('technical-skills', 'Technical skills', 'Skills', 3)
on conflict (slug) do nothing;

insert into public.courses (program_id, slug, code, name, full_name, kind, exam_format, position, is_published)
select p.id, v.slug, v.code, v.name, v.full_name, v.kind::public.course_kind, v.exam_format, v.position, true
from (values
  ('cma-usa', 'cma-part-1', 'P1',  'Part 1', 'Financial Planning, Performance and Analytics', 'cma_part', '100 MCQs + 2 case-based questions · 4 hours', 1),
  ('cma-usa', 'cma-part-2', 'P2',  'Part 2', 'Strategic Financial Management',                'cma_part', '100 MCQs + 2 case-based questions · 4 hours', 2),
  ('cpa-usa', 'cpa-far',    'FAR', 'FAR',    'Financial Accounting and Reporting',            'cpa_core', '50 MCQs + 7 TBS · 4 hours', 1),
  ('cpa-usa', 'cpa-aud',    'AUD', 'AUD',    'Auditing and Attestation',                      'cpa_core', '78 MCQs + 7 TBS · 4 hours', 2),
  ('cpa-usa', 'cpa-reg',    'REG', 'REG',    'Taxation and Regulation',                       'cpa_core', '72 MCQs + 8 TBS · 4 hours', 3),
  ('cpa-usa', 'cpa-bar',    'BAR', 'BAR',    'Business Analysis and Reporting',               'cpa_discipline', '50 MCQs + 7 TBS · 4 hours', 4),
  ('cpa-usa', 'cpa-isc',    'ISC', 'ISC',    'Information Systems and Controls',              'cpa_discipline', '82 MCQs + 6 TBS · 4 hours', 5),
  ('cpa-usa', 'cpa-tcp',    'TCP', 'TCP',    'Tax Compliance and Planning',                   'cpa_discipline', '68 MCQs + 7 TBS · 4 hours', 6),
  ('technical-skills', 'advanced-excel', 'EXCEL', 'Advanced Excel', 'Advanced Excel for finance', 'skill', null, 1),
  ('technical-skills', 'power-bi',       'PBI',   'Power BI',       'Power BI dashboards',        'skill', null, 2)
) as v(program_slug, slug, code, name, full_name, kind, exam_format, position)
join public.programs p on p.slug = v.program_slug
on conflict (slug) do nothing;

-- CMA chapters (IMA sections). CPA and skills chapters: add from the admin panel.
insert into public.chapters (course_id, position, title, is_published)
select c.id, v.position, v.title, true
from (values
  ('cma-part-1', 1, 'External Financial Reporting Decisions'),
  ('cma-part-1', 2, 'Planning, Budgeting and Forecasting'),
  ('cma-part-1', 3, 'Performance Management'),
  ('cma-part-1', 4, 'Cost Management'),
  ('cma-part-1', 5, 'Internal Controls'),
  ('cma-part-1', 6, 'Technology and Analytics'),
  ('cma-part-2', 1, 'Financial Statement Analysis'),
  ('cma-part-2', 2, 'Corporate Finance'),
  ('cma-part-2', 3, 'Decision Analysis'),
  ('cma-part-2', 4, 'Risk Management'),
  ('cma-part-2', 5, 'Investment Decisions'),
  ('cma-part-2', 6, 'Professional Ethics')
) as v(course_slug, position, title)
join public.courses c on c.slug = v.course_slug
where not exists (select 1 from public.chapters x where x.course_id = c.id);

-- Packages start switched off: set price_inr and is_active = true from the admin panel.
insert into public.course_packages (slug, name, description, price_inr, validity_days, is_active) values
  ('cma-usa-full',   'CMA USA · Part 1 + Part 2', 'Videos, eBooks, chapter tests and mocks for both parts', null, 365, false),
  ('cpa-usa-full',   'CPA USA · all sections',    'FAR, AUD, REG and all three discipline sections',        null, 365, false),
  ('advanced-excel', 'Advanced Excel',            'Technical skills course',                                null, 365, false),
  ('power-bi',       'Power BI',                  'Technical skills course',                                null, 365, false)
on conflict (slug) do nothing;

insert into public.package_courses (package_id, course_id)
select pk.id, c.id
from (values
  ('cma-usa-full', 'cma-part-1'), ('cma-usa-full', 'cma-part-2'),
  ('cpa-usa-full', 'cpa-far'), ('cpa-usa-full', 'cpa-aud'), ('cpa-usa-full', 'cpa-reg'),
  ('cpa-usa-full', 'cpa-bar'), ('cpa-usa-full', 'cpa-isc'), ('cpa-usa-full', 'cpa-tcp'),
  ('advanced-excel', 'advanced-excel'),
  ('power-bi', 'power-bi')
) as v(pkg, course)
join public.course_packages pk on pk.slug = v.pkg
join public.courses c on c.slug = v.course
on conflict do nothing;

-- Done. Next: sign up in the app, then run the "make yourself super_admin" line at the top.
