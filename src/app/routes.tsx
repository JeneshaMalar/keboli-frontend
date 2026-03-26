import React, { Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ProtectedRoute } from '../features/auth'
import MainLayout from '../layouts/MainLayout'

// Lazy-loaded pages
const LoginPage = React.lazy(() =>
  import('../features/auth').then((m) => ({ default: m.LoginPage })),
)
const RegisterPage = React.lazy(() =>
  import('../features/auth').then((m) => ({ default: m.RegisterPage })),
)
const DashboardPage = React.lazy(() =>
  import('../features/dashboard').then((m) => ({ default: m.DashboardPage })),
)
const CandidateManagementPage = React.lazy(() =>
  import('../features/candidate').then((m) => ({ default: m.CandidateManagementPage })),
)
const AssessmentManagement = React.lazy(() =>
  import('../features/assessment').then((m) => ({ default: m.AssessmentManagement })),
)
const EvaluationReportPage = React.lazy(() =>
  import('../features/evaluation').then((m) => ({ default: m.EvaluationReportPage })),
)

// Interview flow pages
const InterviewWelcomePage = React.lazy(() =>
  import('../features/interview').then((m) => ({ default: m.InterviewWelcomePage })),
)
const InterviewInstructionsPage = React.lazy(() =>
  import('../features/interview').then((m) => ({ default: m.InterviewInstructionsPage })),
)
const InterviewTechCheckPage = React.lazy(() =>
  import('../features/interview').then((m) => ({ default: m.InterviewTechCheckPage })),
)
const CandidateInterviewLive = React.lazy(() =>
  import('../features/interview').then((m) => ({ default: m.CandidateInterviewLive })),
)
const InterviewCompletionPage = React.lazy(() =>
  import('../features/interview').then((m) => ({ default: m.InterviewCompletionPage })),
)

const PageLoader = (): React.ReactElement => (
  <div className="flex h-screen w-full items-center justify-center bg-slate-50/50">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
  </div>
)

export function AppRoutes(): React.ReactElement {
  const location = useLocation()

  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register'

  const isCandidateFlow =
    location.pathname.startsWith('/candidate/') || location.pathname === '/interview'

  if (isAuthRoute) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    )
  }

  if (isCandidateFlow) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/candidate/welcome" element={<InterviewWelcomePage />} />
          <Route path="/candidate/instructions" element={<InterviewInstructionsPage />} />
          <Route path="/candidate/tech-check" element={<InterviewTechCheckPage />} />
          <Route path="/candidate/room" element={<CandidateInterviewLive />} />
          <Route path="/candidate/completion" element={<InterviewCompletionPage />} />
          <Route
            path="/interview"
            element={<Navigate to={`/candidate/welcome${location.search}`} replace />}
          />
          <Route
            path="*"
            element={<Navigate to={`/candidate/welcome${location.search}`} replace />}
          />
        </Routes>
      </Suspense>
    )
  }

  return (
    <MainLayout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assessments"
            element={
              <ProtectedRoute>
                <AssessmentManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidates"
            element={
              <ProtectedRoute>
                <CandidateManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/evaluation/:sessionId"
            element={
              <ProtectedRoute>
                <EvaluationReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interviews"
            element={
              <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest">
                Interview Management Module Coming Soon
              </div>
            }
          />
          <Route
            path="/settings"
            element={
              <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest">
                Platform Settings Coming Soon
              </div>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </MainLayout>
  )
}
