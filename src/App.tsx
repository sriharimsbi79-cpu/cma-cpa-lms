import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import { NotFound, RequireAuth, RequireStaff } from '@/components/Guards';
import StudentLayout from '@/components/StudentLayout';
import { PageLoader } from '@/components/ui';
import { ForgotPassword, Login, ResetPassword, Signup } from '@/pages/auth/AuthPages';
import Chapter from '@/pages/student/Chapter';
import Course from '@/pages/student/Course';
import Courses from '@/pages/student/Courses';
import Home from '@/pages/student/Home';
import MockTests from '@/pages/student/MockTests';
import Profile from '@/pages/student/Profile';
import TestIntro from '@/pages/student/TestIntro';

// Admin screens load only when someone opens /admin
const Dashboard = lazy(() => import('@/pages/admin/Dashboard'));
const Content = lazy(() => import('@/pages/admin/Content'));
const Questions = lazy(() => import('@/pages/admin/Questions'));
const QuestionBuilder = lazy(() => import('@/pages/admin/QuestionBuilder'));
const Students = lazy(() => import('@/pages/admin/Students'));
const Placeholder = lazy(() => import('@/pages/admin/Placeholder'));

const wrap = (el: JSX.Element) => <Suspense fallback={<PageLoader />}>{el}</Suspense>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        element={
          <RequireAuth>
            <StudentLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Home />} />
        <Route path="courses" element={<Courses />} />
        <Route path="courses/:courseId" element={<Course />} />
        <Route path="chapters/:chapterId" element={<Chapter />} />
        <Route path="mock-tests" element={<MockTests />} />
        <Route path="tests/:testId" element={<TestIntro />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route
        path="/admin"
        element={
          <RequireAuth>
            <RequireStaff>
              <AdminLayout />
            </RequireStaff>
          </RequireAuth>
        }
      >
        <Route index element={wrap(<Dashboard />)} />
        <Route path="content" element={wrap(<Content />)} />
        <Route path="questions" element={wrap(<Questions />)} />
        <Route path="questions/:questionId" element={wrap(<QuestionBuilder />)} />
        <Route path="students" element={wrap(<Students />)} />
        <Route path="mock-tests" element={wrap(<Placeholder kind="mock-tests" />)} />
        <Route path="payments" element={wrap(<Placeholder kind="payments" />)} />
        <Route path="settings" element={wrap(<Placeholder kind="settings" />)} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
