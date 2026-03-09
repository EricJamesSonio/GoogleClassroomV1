import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ClassesPage from './pages/classes/ClassesPage'
import ClassDetailPage from './pages/classes/ClassDetailPage'
import MeetingRoomPage from './pages/meetings/MeetingRoomPage'
import InvitationsPage from './pages/invitations/InvitationsPage'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/classes" element={<ProtectedRoute><ClassesPage /></ProtectedRoute>} />
      <Route path="/classes/:classId" element={<ProtectedRoute><ClassDetailPage /></ProtectedRoute>} />
      <Route path="/meetings/:meetingId" element={<ProtectedRoute><MeetingRoomPage /></ProtectedRoute>} />
      <Route path="/invitations" element={<ProtectedRoute><InvitationsPage /></ProtectedRoute>} />
    </Routes>
  )
}