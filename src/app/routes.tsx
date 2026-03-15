import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { LoginPage, RegisterPage, ProtectedRoute } from '../features/auth'
import { DashboardPage } from '../features/dashboard'
import { CandidateManagementPage } from '../features/candidate'
import { AssessmentManagement } from '../features/assessment'
import { EvaluationReportPage } from '../features/evaluation'
import {
    InterviewWelcomePage,
    InterviewInstructionsPage,
    InterviewTechCheckPage,
    CandidateInterviewLive,
    InterviewCompletionPage,
} from '../features/interview'
import MainLayout from '../layouts/MainLayout'

export function AppRoutes() {
    const location = useLocation()

    const isAuthRoute =
        location.pathname === '/login' || location.pathname === '/register'

    const isCandidateFlow =
        location.pathname.startsWith('/candidate/') ||
        location.pathname === '/interview'

    if (isAuthRoute) {
        return (
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        )
    }

    if (isCandidateFlow) {
        return (
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
        )
    }

    return (
        <MainLayout>
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
        </MainLayout>
    )
}
