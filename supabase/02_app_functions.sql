-- =====================================================================
--  LMS update 1 · functions used by the React app screens
-- =====================================================================
--  Run AFTER 01_schema.sql. Safe to run again.
--  Supabase dashboard → SQL Editor → New query → paste → Run.
--
--  Student screens                 Admin screens
--    my_catalog()                    admin_recent_activity()
--    my_resume()                     admin_ending_soon()
--    my_recent_results()             admin_course_tree()
--    my_focus_areas()                admin_get_chapter()
--    get_chapter()                   admin_question_counts()
--    my_mock_tests()                 admin_list_questions()
--    my_account()                    admin_get_question()
--                                    admin_save_question()
--                                    admin_list_students()
--                                    admin_get_student()
--                                    admin_set_blocked()
-- =====================================================================


-- ---------- Labels ----------
-- 'CMA USA · Part 1', 'CPA USA · FAR', 'Advanced Excel'
create or replace function public.course_label(p_course_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select case when c.kind = 'skill' then c.name else p.name || ' · ' || c.name end
  from courses c join programs p on p.id = c.program_id
  where c.id = p_course_id;
$$;

-- 'CMA Part 1', 'CPA FAR', 'Advanced Excel'
create or replace function public.course_short_label(p_course_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select case when c.kind = 'skill' then c.name
              else coalesce(p.short_name, p.name) || ' ' || c.name end
  from courses c join programs p on p.id = c.program_id
  where c.id = p_course_id;
$$;

create or replace function public._reminder_days()
returns int language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::int from app_settings where key = 'reminder_days'), 15);
$$;

-- Course access grouped by program and end date (internal).
-- [{ "program": "CMA USA", "courses": "Part 1, Part 2", "valid_until": "...", "days_left": 227,
--    "status": "active" | "ending" | "expired", "enrollment_ids": [...] }]
create or replace function public._access_groups(p_user_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with e as (
    select e.id, e.valid_until, p.name as program, p.position as ppos,
           c.name as cname, c.position as cpos, c.kind,
           case
             when e.status <> 'active' or e.valid_until < now() then 'expired'
             when e.valid_until < now() + make_interval(days => public._reminder_days()) then 'ending'
             else 'active'
           end as st
    from enrollments e
    join courses c on c.id = e.course_id
    join programs p on p.id = c.program_id
    where e.user_id = p_user_id
  ),
  g as (
    select case when kind = 'skill' then cname else program end as program,
           min(ppos) as ppos,
           string_agg(cname, ', ' order by cpos) as courses,
           max(valid_until) as valid_until,
           min(st) as st,
           jsonb_agg(id order by cpos) as ids,
           bool_or(kind = 'skill') as is_skill
    from e
    group by case when kind = 'skill' then cname else program end, valid_until::date, st
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'program', g.program,
           'courses', case when g.is_skill then 'Technical skills' else g.courses end,
           'valid_until', g.valid_until,
           'days_left', greatest(0, ceil(extract(epoch from (g.valid_until - now())) / 86400))::int,
           'status', g.st,
           'enrollment_ids', g.ids
         ) order by (g.st = 'expired'), g.ppos, g.valid_until), '[]'::jsonb)
  from g;
$$;
revoke execute on function public._access_groups(uuid) from public, anon, authenticated;


-- ---------- Random tests: "tbs" picks any task-based simulation type ----------
-- (replaces the version in 01_schema.sql; random_config counts may now use
--  {"mcq": 30, "tbs": 6} or {"mcq": 40, "cbq": 1}, plus exact types)
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
                 and (q.type::text = k or (k = 'tbs' and q.type::text like 'tbs\_%'))
                 and (v_chapters is null or q.chapter_id = any(v_chapters))
                 and not exists (select 1 from attempt_questions aq0
                                  where aq0.attempt_id = v_attempt and aq0.question_id = q.id)
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


-- =====================================================================
-- STUDENT
-- =====================================================================

-- Every published course with the student's access and progress.
-- Used by the sidebar, the Courses tab and the "My courses" cards.
create or replace function public.my_catalog()
returns table (
  program_id uuid, program_slug text, program_name text, program_short text, program_position int,
  course_id uuid, course_code text, course_name text, full_name text, kind public.course_kind,
  course_position int, exam_format text,
  enrolled boolean, valid_until timestamptz, days_left int,
  chapters_total int, chapters_done int, progress_percent int)
language sql stable security definer set search_path = public as $$
  with en as (
    select e.course_id as crs, e.valid_until as vu,
           (e.status = 'active' and now() between e.valid_from and e.valid_until) as ok
    from enrollments e
    where e.user_id = auth.uid()
  ),
  st as (
    select s.course_id as crs,
           count(*)::int as ct,
           (count(*) filter (where s.is_complete))::int as cd,
           sum(s.items_total)::int as it,
           sum(s.items_done)::int as idn
    from public._user_chapter_stats(auth.uid(), null) s
    where s.course_id in (select crs from en where ok)
    group by s.course_id
  )
  select p.id, p.slug, p.name, coalesce(p.short_name, p.name), p.position,
         c.id, c.code, c.name, c.full_name, c.kind, c.position, c.exam_format,
         coalesce(en.ok, false),
         en.vu,
         case when en.vu is null then null
              else greatest(0, ceil(extract(epoch from (en.vu - now())) / 86400))::int end,
         coalesce(st.ct, (select count(*)::int from chapters ch where ch.course_id = c.id and ch.is_published)),
         coalesce(st.cd, 0),
         case when coalesce(st.it, 0) = 0 then 0 else round(100.0 * st.idn / st.it)::int end
  from courses c
  join programs p on p.id = c.program_id
  left join en on en.crs = c.id
  left join st on st.crs = c.id
  where c.is_published and p.is_published and auth.uid() is not null
  order by p.position, c.position;
$$;

-- Home "Continue learning" card: last chapter studied (or the first chapter
-- of the first course), its steps and the next video to watch.
create or replace function public.my_resume()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_ch uuid;
  v_course uuid;
  v_at timestamptz;
  s record;
  nv record;
begin
  if v_uid is null then return null; end if;

  select v.chapter_id, c.course_id, vp.updated_at into v_ch, v_course, v_at
    from video_progress vp
    join videos v on v.id = vp.video_id
    join chapters c on c.id = v.chapter_id
   where vp.user_id = v_uid and public.has_course_access(c.course_id)
   order by vp.updated_at desc
   limit 1;

  if v_ch is null then
    select c.id, c.course_id into v_ch, v_course
      from enrollments e
      join courses co on co.id = e.course_id
      join programs p on p.id = co.program_id
      join chapters c on c.course_id = co.id and c.is_published
     where e.user_id = v_uid and e.status = 'active' and now() between e.valid_from and e.valid_until
     order by p.position, co.position, c.position
     limit 1;
  end if;

  if v_ch is null then return null; end if;

  select * into s from public._user_chapter_stats(v_uid, v_course) x where x.chapter_id = v_ch;

  select v.id, v.title, v.position, v.duration_seconds, coalesce(vp.last_position_seconds, 0) as resume_at
    into nv
    from videos v
    left join video_progress vp on vp.video_id = v.id and vp.user_id = v_uid
   where v.chapter_id = v_ch and v.is_published and v.status = 'ready' and coalesce(vp.completed, false) = false
   order by v.position
   limit 1;

  return jsonb_build_object(
    'course_id', v_course,
    'course_label', public.course_label(v_course),
    'chapter_id', v_ch,
    'chapter_position', s.chapter_position,
    'chapter_title', s.title,
    'last_activity_at', v_at,
    'videos_total', s.videos_total, 'videos_done', s.videos_done,
    'ebooks_total', s.ebooks_total, 'ebooks_done', s.ebooks_done,
    'tests_total', s.tests_total, 'tests_done', s.tests_done,
    'progress_percent', s.progress_percent,
    'next_video', case when nv.id is null then null else jsonb_build_object(
        'id', nv.id, 'title', nv.title, 'position', nv.position,
        'duration_seconds', nv.duration_seconds, 'resume_at', nv.resume_at) end
  );
end $$;

-- Home and mobile "Recent results"
create or replace function public.my_recent_results(p_limit int default 5)
returns table (
  attempt_id uuid, test_id uuid, test_title text, test_kind public.test_kind,
  course_label text, chapter_id uuid, submitted_at timestamptz, percent numeric)
language sql stable security definer set search_path = public as $$
  select a.id, t.id, t.title, t.kind, public.course_short_label(t.course_id), t.chapter_id,
         a.submitted_at, a.percent
  from test_attempts a
  join tests t on t.id = a.test_id
  where a.user_id = auth.uid() and a.status <> 'in_progress'
  order by a.submitted_at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 5), 50));
$$;

-- Home "Focus areas": topics with the lowest scores so far
create or replace function public.my_focus_areas(p_limit int default 3)
returns table (label text, course_label text, chapter_label text, percent numeric, answered int)
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(trim(q.topic), ''), ch.title, 'General') as label,
         public.course_short_label(q.course_id),
         case when ch.id is null then null else 'Chapter ' || ch.position end,
         round(100 * avg(aq.fraction_correct)),
         count(*)::int
  from attempt_questions aq
  join test_attempts a on a.id = aq.attempt_id and a.user_id = auth.uid() and a.status <> 'in_progress'
  join questions q on q.id = aq.question_id
  left join chapters ch on ch.id = q.chapter_id
  where aq.fraction_correct is not null
  group by coalesce(nullif(trim(q.topic), ''), ch.title, 'General'), q.course_id, ch.id, ch.position
  order by 4 asc, 5 desc
  limit greatest(1, least(coalesce(p_limit, 3), 20));
$$;

-- Chapter page: videos with progress, eBook, chapter test
create or replace function public.get_chapter(p_chapter_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  c record;
  s record;
  v_videos jsonb;
  v_ebook jsonb;
  v_test jsonb;
begin
  select ch.*, co.name as course_name, p.name as program_name
    into c
    from chapters ch join courses co on co.id = ch.course_id join programs p on p.id = co.program_id
   where ch.id = p_chapter_id and (ch.is_published or public.is_staff());
  if not found then raise exception 'Chapter not found'; end if;
  if not public.has_course_access(c.course_id) then raise exception 'No access to this course'; end if;

  select * into s from public._user_chapter_stats(v_uid, c.course_id) x where x.chapter_id = p_chapter_id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', v.id, 'position', v.position, 'title', v.title,
           'duration_seconds', v.duration_seconds,
           'provider', v.provider, 'provider_video_id', v.provider_video_id,
           'completed', coalesce(vp.completed, false),
           'last_position_seconds', coalesce(vp.last_position_seconds, 0)
         ) order by v.position), '[]'::jsonb)
    into v_videos
    from videos v
    left join video_progress vp on vp.video_id = v.id and vp.user_id = v_uid
   where v.chapter_id = p_chapter_id and v.is_published and v.status = 'ready';

  select jsonb_build_object(
           'id', e.id, 'title', e.title, 'page_count', e.page_count, 'storage_path', e.storage_path,
           'allow_annotations', e.allow_annotations,
           'last_page', coalesce(ep.last_page, 1), 'completed', coalesce(ep.completed, false))
    into v_ebook
    from ebooks e
    left join ebook_progress ep on ep.ebook_id = e.id and ep.user_id = v_uid
   where e.chapter_id = p_chapter_id and e.is_published
   order by e.created_at
   limit 1;

  select jsonb_build_object(
           'id', t.id, 'title', t.title, 'duration_minutes', t.duration_minutes,
           'max_attempts', t.max_attempts,
           'question_count', case when t.selection_mode = 'fixed'
               then (select count(*) from test_questions tq join questions q on q.id = tq.question_id
                      where tq.test_id = t.id and q.status = 'published')
               else (select coalesce(sum(value::int), 0) from jsonb_each_text(coalesce(t.random_config->'counts', '{}'::jsonb))) end,
           'format', coalesce(t.description, ''),
           'attempts', (select count(*) from test_attempts a where a.test_id = t.id and a.user_id = v_uid and a.status <> 'in_progress'),
           'best_percent', (select max(a.percent) from test_attempts a where a.test_id = t.id and a.user_id = v_uid and a.status <> 'in_progress'),
           'in_progress_attempt_id', (select a.id from test_attempts a where a.test_id = t.id and a.user_id = v_uid
                                       and a.status = 'in_progress' and a.expires_at > now() limit 1))
    into v_test
    from tests t
   where t.chapter_id = p_chapter_id and t.kind = 'chapter_test' and t.status = 'published'
   order by t.position
   limit 1;

  return jsonb_build_object(
    'id', c.id, 'position', c.position, 'title', c.title,
    'course_id', c.course_id, 'course_label', public.course_label(c.course_id),
    'progress_percent', coalesce(s.progress_percent, 0),
    'videos_total', coalesce(s.videos_total, 0), 'videos_done', coalesce(s.videos_done, 0),
    'videos', v_videos, 'ebook', v_ebook, 'test', v_test);
end $$;

-- Mock tests tab: full mocks and practice sets for courses the student can open
create or replace function public.my_mock_tests()
returns table (
  test_id uuid, course_id uuid, course_label text, course_short_label text, exam_format text,
  kind public.test_kind, title text, duration_minutes int, question_count int,
  attempts_count int, last_percent numeric, last_submitted_at timestamptz,
  last_time_spent_seconds int, last_attempt_id uuid, in_progress_attempt_id uuid,
  practice_done int, max_attempts int)
language sql stable security definer set search_path = public as $$
  select t.id, t.course_id, public.course_label(t.course_id), public.course_short_label(t.course_id),
         co.exam_format, t.kind, t.title, t.duration_minutes,
         case when t.selection_mode = 'fixed'
              then (select count(*)::int from test_questions tq join questions q on q.id = tq.question_id
                     where tq.test_id = t.id and q.status = 'published')
              else (select coalesce(sum(value::int), 0)::int from jsonb_each_text(coalesce(t.random_config->'counts', '{}'::jsonb))) end,
         (select count(*)::int from test_attempts a where a.test_id = t.id and a.user_id = auth.uid() and a.status <> 'in_progress'),
         la.percent, la.submitted_at, la.time_spent_seconds, la.id,
         (select a.id from test_attempts a where a.test_id = t.id and a.user_id = auth.uid()
           and a.status = 'in_progress' and a.expires_at > now() limit 1),
         (select count(distinct aq.question_id)::int
            from attempt_questions aq join test_attempts a on a.id = aq.attempt_id
           where a.test_id = t.id and a.user_id = auth.uid() and a.status <> 'in_progress' and aq.response is not null),
         t.max_attempts
  from tests t
  join courses co on co.id = t.course_id
  join programs p on p.id = co.program_id
  left join lateral (
    select a.id, a.percent, a.submitted_at, a.time_spent_seconds
    from test_attempts a
    where a.test_id = t.id and a.user_id = auth.uid() and a.status <> 'in_progress'
    order by a.submitted_at desc nulls last
    limit 1
  ) la on true
  where t.kind in ('full_mock', 'practice_set') and t.status = 'published'
    and public.has_course_access(t.course_id)
  order by p.position, co.position, case t.kind when 'full_mock' then 0 else 1 end, t.position, t.title;
$$;

-- Profile screen: details, access by program, devices, payments
create or replace function public.my_account()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'profile', (
      select jsonb_build_object(
        'id', p.id, 'full_name', p.full_name, 'email', p.email, 'phone', p.phone,
        'phone_verified', p.phone_verified, 'role', p.role, 'created_at', p.created_at,
        'target_exam_date', p.target_exam_date, 'target_course_id', p.target_course_id,
        'target_course_label', public.course_short_label(p.target_course_id),
        'is_blocked', p.is_blocked)
      from profiles p where p.id = auth.uid()),
    'access', public._access_groups(auth.uid()),
    'devices', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', d.id, 'device_id', d.device_id, 'device_name', d.device_name,
               'platform', d.platform, 'last_active_at', d.last_active_at) order by d.last_active_at desc), '[]'::jsonb)
      from user_devices d where d.user_id = auth.uid()),
    'max_devices', coalesce((select (value #>> '{}')::int from app_settings where key = 'max_devices'), 2),
    'payments', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', pay.id, 'package_name', coalesce(pk.name, 'Course access'), 'amount_inr', pay.amount_inr,
               'paid_at', pay.paid_at, 'invoice_number', pay.invoice_number) order by pay.paid_at desc), '[]'::jsonb)
      from payments pay left join course_packages pk on pk.id = pay.package_id
      where pay.user_id = auth.uid() and pay.status = 'paid')
  ) end;
$$;


-- =====================================================================
-- ADMIN
-- =====================================================================

-- Dashboard numbers (replaces the version in 01_schema.sql; adds the
-- new-enrolment split by program shown under "New enrolments")
create or replace function public.admin_dashboard_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;

  select jsonb_build_object(
    'active_students', (select count(distinct user_id) from enrollments
                         where status = 'active' and now() between valid_from and valid_until),
    'new_enrollments_this_month', (select count(distinct (e.user_id, coalesce(p.short_name, p.name)))
                         from enrollments e join courses c on c.id = e.course_id join programs p on p.id = c.program_id
                         where e.created_at >= date_trunc('month', now())),
    'new_enrollments_by_program', (select coalesce(jsonb_agg(jsonb_build_object('program', x.prog, 'count', x.n) order by x.pos), '[]'::jsonb)
                         from (select coalesce(p.short_name, p.name) as prog, min(p.position) as pos,
                                      count(distinct e.user_id) as n
                                 from enrollments e join courses c on c.id = e.course_id join programs p on p.id = c.program_id
                                where e.created_at >= date_trunc('month', now())
                                group by coalesce(p.short_name, p.name)) x),
    'revenue_this_month_inr', (select sum(amount_inr) from payments
                         where status = 'paid' and paid_at >= date_trunc('month', now())),
    'ending_in_15_days', (select count(distinct user_id) from enrollments
                         where status = 'active'
                           and valid_until between now() and now() + make_interval(days => public._reminder_days())),
    'enrollments_by_course', (select coalesce(jsonb_agg(x order by (x->>'program_position')::int, (x->>'position')::int), '[]'::jsonb) from (
        select jsonb_build_object('course_id', c.id, 'program', p.name, 'course', public.course_short_label(c.id),
                                  'position', c.position, 'program_position', p.position,
                                  'active', count(e.id) filter (where e.status = 'active' and now() between e.valid_from and e.valid_until)) as x
          from courses c join programs p on p.id = c.program_id
          left join enrollments e on e.course_id = c.id
         where c.is_published
         group by c.id, p.name, p.position, c.position) s),
    'videos_ready', (select count(*) from videos where status = 'ready'),
    'videos_processing', (select count(*) from videos where status in ('uploading','processing')),
    'ebooks', (select count(*) from ebooks),
    'questions_by_type', (select jsonb_build_object(
                            'mcq', count(*) filter (where type = 'mcq'),
                            'tbs', count(*) filter (where type::text like 'tbs_%'),
                            'cbq', count(*) filter (where type = 'cbq')) from questions),
    'questions_in_review', (select count(*) from questions where status = 'in_review'),
    'open_doubts', (select count(*) from doubts where status = 'open')
  ) into v;
  return v;
end $$;

create or replace function public.admin_recent_activity(p_limit int default 10)
returns table (
  id bigint, action text, created_at timestamptz, actor_name text, actor_role public.app_role,
  subject_name text, title text, code text, course_label text, chapter_label text, details jsonb)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  return query
  select l.id, l.action, l.created_at, ap.full_name, ap.role,
         sp.full_name,
         l.details->>'title', l.details->>'code',
         public.course_short_label(coalesce(public.try_uuid(l.details->>'course_id'), ch.course_id)),
         case when ch.id is null then null else 'Chapter ' || ch.position end,
         l.details
  from activity_log l
  left join profiles ap on ap.id = l.actor_id
  left join profiles sp on sp.id = public.try_uuid(l.details->>'user_id')
  left join chapters ch on ch.id = public.try_uuid(l.details->>'chapter_id')
  order by l.created_at desc, l.id desc
  limit greatest(1, least(coalesce(p_limit, 10), 100));
end $$;

-- Students whose access ends soon (one row per student and program)
create or replace function public.admin_ending_soon(p_days int default null, p_limit int default 20)
returns table (user_id uuid, full_name text, phone text, program text, valid_until timestamptz, total_count int)
language plpgsql stable security definer set search_path = public as $$
declare v_days int := coalesce(p_days, public._reminder_days());
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  return query
  with x as (
    select e.user_id as uid, pr.full_name as nm, pr.phone as ph,
           case when c.kind = 'skill' then c.name else p.name end as prog,
           min(e.valid_until) as vu
    from enrollments e
    join profiles pr on pr.id = e.user_id
    join courses c on c.id = e.course_id
    join programs p on p.id = c.program_id
    where e.status = 'active' and e.valid_until between now() and now() + make_interval(days => v_days)
    group by e.user_id, pr.full_name, pr.phone, case when c.kind = 'skill' then c.name else p.name end
  )
  select uid, nm, ph, prog, vu, (select count(distinct uid)::int from x)
  from x
  order by vu
  limit greatest(1, least(coalesce(p_limit, 20), 200));
end $$;

-- Courses & content tree
create or replace function public.admin_course_tree()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'name', p.name, 'short_name', p.short_name, 'slug', p.slug,
           'courses', (
             select coalesce(jsonb_agg(jsonb_build_object(
                      'id', c.id, 'code', c.code, 'name', c.name, 'full_name', c.full_name,
                      'kind', c.kind, 'is_published', c.is_published,
                      'chapters', (
                        select coalesce(jsonb_agg(jsonb_build_object(
                                 'id', ch.id, 'position', ch.position, 'title', ch.title,
                                 'is_published', ch.is_published,
                                 'videos_total', (select count(*) from videos v where v.chapter_id = ch.id),
                                 'videos_processing', (select count(*) from videos v where v.chapter_id = ch.id
                                                        and v.status in ('uploading','processing'))
                               ) order by ch.position), '[]'::jsonb)
                        from chapters ch where ch.course_id = c.id)
                    ) order by c.position), '[]'::jsonb)
             from courses c where c.program_id = p.id)
         ) order by p.position), '[]'::jsonb)
    into v
    from programs p;
  return v;
end $$;

-- One chapter with everything the content editor shows
create or replace function public.admin_get_chapter(p_chapter_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  c record;
  v jsonb;
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  select * into c from chapters where id = p_chapter_id;
  if not found then raise exception 'Chapter not found'; end if;

  select jsonb_build_object(
    'id', c.id, 'course_id', c.course_id, 'position', c.position, 'title', c.title,
    'description', c.description, 'is_published', c.is_published,
    'course_label', public.course_label(c.course_id),
    'videos', (select coalesce(jsonb_agg(jsonb_build_object(
                 'id', vd.id, 'position', vd.position, 'title', vd.title,
                 'duration_seconds', vd.duration_seconds, 'status', vd.status,
                 'processing_percent', vd.processing_percent, 'is_published', vd.is_published,
                 'thumbnail_url', vd.thumbnail_url, 'provider_video_id', vd.provider_video_id
               ) order by vd.position, vd.created_at), '[]'::jsonb)
               from videos vd where vd.chapter_id = c.id),
    'ebook', (select jsonb_build_object(
                 'id', e.id, 'title', e.title, 'storage_path', e.storage_path, 'page_count', e.page_count,
                 'file_size_bytes', e.file_size_bytes, 'block_download', e.block_download,
                 'watermark', e.watermark, 'allow_annotations', e.allow_annotations,
                 'is_published', e.is_published, 'created_at', e.created_at)
              from ebooks e where e.chapter_id = c.id order by e.created_at limit 1),
    'test', (select jsonb_build_object(
                 'id', t.id, 'title', t.title, 'duration_minutes', t.duration_minutes,
                 'max_attempts', t.max_attempts, 'selection_mode', t.selection_mode,
                 'random_config', t.random_config, 'show_answers_after_submit', t.show_answers_after_submit,
                 'status', t.status,
                 'question_count', (select count(*) from test_questions tq where tq.test_id = t.id),
                 'description', t.description)
             from tests t where t.chapter_id = c.id and t.kind = 'chapter_test' order by t.position limit 1)
  ) into v;
  return v;
end $$;

create or replace function public.admin_question_counts()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  select jsonb_build_object(
    'all', count(*),
    'mcq', count(*) filter (where type = 'mcq'),
    'tbs', count(*) filter (where type::text like 'tbs_%'),
    'cbq', count(*) filter (where type = 'cbq'),
    'in_review', count(*) filter (where status = 'in_review'))
  into v from questions;
  return v;
end $$;

-- Question bank list. p_type: null | 'mcq' | 'tbs' | 'cbq' | any exact question type
create or replace function public.admin_list_questions(
  p_type text default null, p_course_id uuid default null, p_chapter_id uuid default null,
  p_difficulty public.difficulty_level default null, p_status public.publish_status default null,
  p_search text default null, p_limit int default 25, p_offset int default 0)
returns table (
  id uuid, code text, stem text, type public.question_type, difficulty public.difficulty_level,
  status public.publish_status, topic text, course_label text, chapter_label text,
  percent_correct numeric, times_answered int, updated_at timestamptz, total_count int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  return query
  select q.id, q.code, q.stem, q.type, q.difficulty, q.status, q.topic,
         public.course_short_label(q.course_id),
         case when ch.id is null then null else 'Ch ' || ch.position || ' · ' || coalesce(nullif(q.topic, ''), ch.title) end,
         acc.percent_correct, coalesce(acc.times_answered, 0),
         q.updated_at,
         (count(*) over ())::int
  from questions q
  left join chapters ch on ch.id = q.chapter_id
  left join question_accuracy acc on acc.question_id = q.id
  where (p_type is null
         or (p_type = 'tbs' and q.type::text like 'tbs_%')
         or q.type::text = p_type)
    and (p_course_id is null or q.course_id = p_course_id)
    and (p_chapter_id is null or q.chapter_id = p_chapter_id)
    and (p_difficulty is null or q.difficulty = p_difficulty)
    and (p_status is null or q.status = p_status)
    and (coalesce(trim(p_search), '') = ''
         or q.code ilike '%' || trim(p_search) || '%'
         or q.stem ilike '%' || trim(p_search) || '%')
  order by q.updated_at desc
  limit greatest(1, least(coalesce(p_limit, 25), 200))
  offset greatest(0, coalesce(p_offset, 0));
end $$;

-- One question with its answer key, exhibits and the tests it is in
create or replace function public.admin_get_question(p_question_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  select jsonb_build_object(
    'id', q.id, 'code', q.code, 'course_id', q.course_id, 'chapter_id', q.chapter_id,
    'type', q.type, 'difficulty', q.difficulty, 'topic', q.topic, 'stem', q.stem,
    'content', q.content, 'points', q.points, 'partial_credit', q.partial_credit,
    'time_guide_minutes', q.time_guide_minutes, 'status', q.status, 'reviewer_id', q.reviewer_id,
    'answer_key', k.answer_key, 'explanation', k.explanation,
    'exhibits', (select coalesce(jsonb_agg(jsonb_build_object('id', ex.id, 'title', ex.title,
                   'storage_path', ex.storage_path, 'description', ex.description) order by ex.position), '[]'::jsonb)
                 from question_exhibits ex where ex.question_id = q.id),
    'test_ids', (select coalesce(jsonb_agg(tq.test_id), '[]'::jsonb) from test_questions tq where tq.question_id = q.id))
  into v
  from questions q
  left join question_answer_keys k on k.question_id = q.id
  where q.id = p_question_id;
  if v is null then raise exception 'Question not found'; end if;
  return v;
end $$;

-- Create or update a question, its answer key and which tests use it.
-- p: { id?, course_id, chapter_id?, type, difficulty, topic?, stem, content, points,
--      partial_credit, time_guide_minutes?, status, reviewer_id?, answer_key, explanation?, test_ids? }
create or replace function public.admin_save_question(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := public.try_uuid(p->>'id');
  v_status public.publish_status := coalesce(nullif(p->>'status', ''), 'draft')::public.publish_status;
  v_reviewer uuid := public.try_uuid(p->>'reviewer_id');
  v_old_reviewer uuid;
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  if coalesce(trim(p->>'stem'), '') = '' then raise exception 'Question text is required'; end if;
  if public.try_uuid(p->>'course_id') is null then raise exception 'Course is required'; end if;
  if v_status in ('in_review', 'published') and (p->'answer_key' is null or p->'answer_key' = 'null'::jsonb) then
    raise exception 'Add the answer key before sending for review';
  end if;

  if v_id is not null then
    select reviewer_id into v_old_reviewer from questions where id = v_id;
    if not found then raise exception 'Question not found'; end if;
  end if;

  -- only an admin or the assigned reviewer can publish
  if v_status = 'published' and not public.is_admin()
     and coalesce(v_old_reviewer, v_reviewer) is distinct from auth.uid() then
    raise exception 'Only an admin or the reviewer can publish';
  end if;

  if v_id is null then
    insert into questions (course_id, chapter_id, type, difficulty, topic, stem, content, points,
                           partial_credit, time_guide_minutes, status, reviewer_id)
    values (public.try_uuid(p->>'course_id'), public.try_uuid(p->>'chapter_id'),
            (p->>'type')::public.question_type,
            coalesce(nullif(p->>'difficulty', ''), 'medium')::public.difficulty_level,
            nullif(p->>'topic', ''), p->>'stem', coalesce(p->'content', '{}'::jsonb),
            coalesce(nullif(p->>'points', '')::numeric, 1),
            coalesce((p->>'partial_credit')::boolean, true),
            nullif(p->>'time_guide_minutes', '')::int,
            v_status, v_reviewer)
    returning id into v_id;
  else
    update questions set
      course_id = public.try_uuid(p->>'course_id'),
      chapter_id = public.try_uuid(p->>'chapter_id'),
      type = (p->>'type')::public.question_type,
      difficulty = coalesce(nullif(p->>'difficulty', ''), 'medium')::public.difficulty_level,
      topic = nullif(p->>'topic', ''),
      stem = p->>'stem',
      content = coalesce(p->'content', '{}'::jsonb),
      points = coalesce(nullif(p->>'points', '')::numeric, 1),
      partial_credit = coalesce((p->>'partial_credit')::boolean, true),
      time_guide_minutes = nullif(p->>'time_guide_minutes', '')::int,
      status = v_status,
      reviewer_id = v_reviewer,
      reviewed_at = case when v_status = 'published' then now() else reviewed_at end
    where id = v_id;
  end if;

  if p->'answer_key' is not null and p->'answer_key' <> 'null'::jsonb then
    insert into question_answer_keys (question_id, answer_key, explanation)
    values (v_id, p->'answer_key', nullif(p->>'explanation', ''))
    on conflict (question_id) do update set answer_key = excluded.answer_key, explanation = excluded.explanation;
  end if;

  if jsonb_typeof(p->'test_ids') = 'array' then
    delete from test_questions tq
     where tq.question_id = v_id
       and tq.test_id not in (select public.try_uuid(x) from jsonb_array_elements_text(p->'test_ids') x where public.try_uuid(x) is not null);
    insert into test_questions (test_id, question_id, position, testlet_no)
    select t.id, v_id,
           coalesce((select max(position) + 1 from test_questions where test_id = t.id), 1),
           case when (p->>'type') = 'mcq' then 1 else 2 end
      from tests t
     where t.id in (select public.try_uuid(x) from jsonb_array_elements_text(p->'test_ids') x)
    on conflict (test_id, question_id) do nothing;
  end if;

  return v_id;
end $$;

-- Students list. p_filter: 'all' | 'active' | 'ending' | 'expired'
create or replace function public.admin_list_students(
  p_filter text default 'all', p_search text default null, p_limit int default 25, p_offset int default 0)
returns table (
  id uuid, full_name text, email text, phone text, courses text,
  valid_until timestamptz, status text, progress_percent int, last_active_at timestamptz,
  created_at timestamptz, is_blocked boolean, total_count int)
language plpgsql stable security definer set search_path = public as $$
declare v_days int := public._reminder_days();
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  return query
  with base as (
    select pr.id as uid, pr.full_name as nm, pr.email as em, pr.phone as ph,
           pr.created_at as joined, pr.is_blocked as blocked,
           (select string_agg(distinct case when c.kind = 'skill' then c.name else p.name end, ', ')
              from enrollments e join courses c on c.id = e.course_id join programs p on p.id = c.program_id
             where e.user_id = pr.id) as crs,
           (select min(e.valid_until) from enrollments e
             where e.user_id = pr.id and e.status = 'active' and e.valid_until >= now()) as next_end,
           (select max(e.valid_until) from enrollments e where e.user_id = pr.id) as last_end,
           greatest(
             (select max(vp.updated_at) from video_progress vp where vp.user_id = pr.id),
             (select max(a.started_at) from test_attempts a where a.user_id = pr.id),
             (select max(d.last_active_at) from user_devices d where d.user_id = pr.id)) as last_seen
    from profiles pr
    where pr.role = 'student'
      and (coalesce(trim(p_search), '') = ''
           or pr.full_name ilike '%' || trim(p_search) || '%'
           or pr.email ilike '%' || trim(p_search) || '%'
           or pr.phone ilike '%' || trim(p_search) || '%')
  ),
  st as (
    select b.*,
           case
             when b.next_end is null then case when b.last_end is null then 'none' else 'expired' end
             when b.next_end < now() + make_interval(days => v_days) then 'ending'
             else 'active'
           end as stat
    from base b
  )
  select st.uid, st.nm, st.em, st.ph, st.crs,
         coalesce(st.next_end, st.last_end), st.stat,
         (select case when sum(s.items_total) > 0 then round(100.0 * sum(s.items_done) / sum(s.items_total))::int else 0 end
            from public._user_chapter_stats(st.uid, null) s
           where s.course_id in (select e.course_id from enrollments e where e.user_id = st.uid)),
         st.last_seen, st.joined, st.blocked,
         (count(*) over ())::int
  from st
  where coalesce(p_filter, 'all') = 'all' or st.stat = p_filter
  order by case st.stat when 'ending' then 0 when 'active' then 1 when 'expired' then 2 else 3 end,
           coalesce(st.next_end, st.last_end) nulls last, st.nm
  limit greatest(1, least(coalesce(p_limit, 25), 200))
  offset greatest(0, coalesce(p_offset, 0));
end $$;

create or replace function public.admin_get_student(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  select jsonb_build_object(
    'id', pr.id, 'full_name', pr.full_name, 'email', pr.email, 'phone', pr.phone,
    'created_at', pr.created_at, 'is_blocked', pr.is_blocked, 'role', pr.role,
    'access', public._access_groups(pr.id),
    'devices_in_use', (select count(*) from user_devices d where d.user_id = pr.id),
    'max_devices', coalesce((select (value #>> '{}')::int from app_settings where key = 'max_devices'), 2),
    'blocked_attempts_today', (select count(*) from activity_log l
                                where l.actor_id = pr.id and l.action = 'device_blocked'
                                  and l.created_at > date_trunc('day', now())))
  into v
  from profiles pr where pr.id = p_user_id;
  if v is null then raise exception 'Student not found'; end if;
  return v;
end $$;

create or replace function public.admin_set_blocked(p_user_id uuid, p_blocked boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_user_id = auth.uid() then raise exception 'You cannot block yourself'; end if;
  update profiles set is_blocked = coalesce(p_blocked, false) where id = p_user_id;
  insert into activity_log (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), case when p_blocked then 'student_blocked' else 'student_unblocked' end,
          'profiles', p_user_id, jsonb_build_object('user_id', p_user_id));
end $$;

-- Done.
