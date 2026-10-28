# [Your Academy] LMS: CMA USA, CPA USA and Technical skills

React 18 + TypeScript + Tailwind CSS + Supabase (same stack as Lovable).
One codebase covers the student web app, the mobile layout (bottom tabs below 1024px) and the admin panel (`/admin`).

## Run it on your computer

```bash
npm install
npm run dev        # opens http://localhost:8080
```

With no `.env` file the app runs in **demo mode** with sample data, so you can click through every screen.
Demo login: any email and password.

## Connect your Supabase database

1. In the Supabase SQL editor run `supabase/01_schema.sql` (you already did this), then run **`supabase/02_app_functions.sql`**. The app needs both.
2. Copy `.env.example` to `.env` and fill in:
   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Sign up in the app, then make yourself admin in the SQL editor:
   ```sql
   update profiles set role = 'super_admin' where email = 'you@example.com';
   ```

## Use it in Lovable

Push this folder to a GitHub repo, then in Lovable connect that repo (GitHub sync). Lovable will pick up the code as is.

## Screens

| Student (desktop + mobile) | Admin |
|---|---|
| Login, Sign up, Forgot / Reset password | Dashboard |
| Home (continue chapter, exam countdown, results, weak areas) | Content (courses → chapters → videos, eBook, chapter test) |
| Courses → Part / Section → chapter list | Question bank (MCQ, TBS, CBQ filters) + bulk upload |
| Chapter (videos → eBook → chapter test, notes, ask a doubt) | Question builder (all 8 question types, preview, review flow) |
| Mock tests | Mock tests list + builder |
| Exam screen (timer, palette, flag, calculator, submit) | Students (search, extend access, grant course, reset devices, block) |
| Result + answer review | Payments, packages, coupons |
| Profile (details, validity, devices, payments, logout) | Settings (branding, device limit, reminders, staff roles) |

## Change before launch

- `src/components/ui.tsx`: `BRAND_NAME` and `BRAND_INITIALS`
- `src/pages/student/Profile.tsx`: `SUPPORT_CONTACT`
- `src/index.css`: `--brand` color
- `index.html`: page title

## Screens with sample data only (UI ready, database not connected yet)

These screens work and look final, but use sample data from `src/data/exam.ts` and `src/data/adminDemo.ts`. Each one shows a "not connected" note.

- Student: exam screen (`/tests/:id/attempt`) and result + answer review (`/results/:attemptId`). Scoring runs in the browser with the same rules as the database (`src/lib/grading.ts`). To connect: use `start_test_attempt`, `get_attempt`, `save_attempt_response`, `submit_test_attempt`.
- Admin: Mock tests list and builder, Bulk upload (reads and checks a real CSV file, import not connected), Payments / Packages / Coupons, Settings.
- Sample prices on the Payments screen are placeholders.

## Not built yet

- Secure video player (VdoCipher): placeholder in `src/components/VideoPlayer.tsx`
- Razorpay checkout and webhooks, GST invoices

## Folder map

```
src/
  pages/student/   Home, Courses, Course, Chapter, MockTests, TestIntro, Profile
  pages/admin/     Dashboard, Content, Questions, QuestionBuilder, Students
  pages/auth/      Login, Signup, Forgot / Reset password
  components/      Layouts, UI kit, Toast, Notifications, VideoPlayer, QuestionView
  lib/             Supabase client, queries, React Query hooks, auth, types
  data/demo.ts     Sample data for demo mode
supabase/          01_schema.sql, 02_app_functions.sql
```
