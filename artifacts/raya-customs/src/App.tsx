import { lazy } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import RootLayout from '@/layouts/RootLayout';
import PortalGuard from '@/components/PortalGuard';
import StaffGuard from '@/components/StaffGuard';

const HomePage = lazy(() => import('@/pages/HomePage'));
const HsSearchPage = lazy(() => import('@/pages/HsSearchPage'));
const WorkflowPage = lazy(() => import('@/pages/WorkflowPage'));
const ProceduresPage = lazy(() => import('@/pages/ProceduresPage'));
const AuthoritiesPage = lazy(() => import('@/pages/AuthoritiesPage'));
const LawsPage = lazy(() => import('@/pages/LawsPage'));
const AsycudaPage = lazy(() => import('@/pages/AsycudaPage'));
const ActPage = lazy(() => import('@/pages/ActPage'));
const ContainerTrackPage = lazy(() => import('@/pages/ContainerTrackPage'));
const PortalPage = lazy(() => import('@/pages/PortalPage'));
const PortalDashboardPage = lazy(() => import('@/pages/PortalDashboardPage'));
const StaffPage = lazy(() => import('@/pages/StaffPage'));
const StaffAccountingPage = lazy(() => import('@/pages/StaffAccountingPage'));
const StaffRecordsPage = lazy(() => import('@/pages/StaffRecordsPage'));
const StaffAssistPage = lazy(() => import('@/pages/StaffAssistPage'));
const StaffDraftPage = lazy(() => import('@/pages/StaffDraftPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="workflow" element={<WorkflowPage />} />
        <Route path="procedures" element={<ProceduresPage />} />
        <Route path="hs-search" element={<HsSearchPage />} />
        <Route path="laws" element={<LawsPage />} />
        <Route path="authorities" element={<AuthoritiesPage />} />
        <Route path="asycuda" element={<AsycudaPage />} />
        <Route path="act" element={<ActPage />} />
        <Route path="track" element={<Navigate to="/staff/tracking" replace />} />

        <Route path="portal" element={<PortalPage />} />
        <Route element={<PortalGuard />}>
          <Route path="portal/dashboard" element={<PortalDashboardPage />} />
        </Route>

        <Route path="staff" element={<StaffPage />} />
        <Route element={<StaffGuard />}>
          <Route path="staff/accounting" element={<StaffAccountingPage />} />
          <Route path="staff/records" element={<StaffRecordsPage />} />
          <Route path="staff/assist" element={<StaffAssistPage />} />
          <Route path="staff/draft" element={<StaffDraftPage />} />
          <Route path="staff/tracking" element={<ContainerTrackPage staffMode />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}