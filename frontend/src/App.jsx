import { lazy, Suspense } from "react";
import { FullscreenLoader } from "./components/States";
import { Route, Routes } from "react-router-dom";

const Social = lazy(() => import("./pages/Social"));
const Plan = lazy(() => import("./pages/Plan"));
import Layout from "./components/Layout";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Grades = lazy(() => import("./pages/Grades"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Profile = lazy(() => import("./pages/Profile"));
const RequestDetail = lazy(() => import("./pages/RequestDetail"));
const Requests = lazy(() => import("./pages/Requests"));
const Schedule = lazy(() => import("./pages/Schedule"));

export default function App() {
  return (
    <Suspense fallback={<FullscreenLoader />}><Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="/social" element={<Social />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/grades" element={<Grades />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/requests/:id" element={<RequestDetail />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes></Suspense>
  );
}
