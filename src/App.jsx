import { Routes, Route } from 'react-router-dom'
import MainLayout from './components/Layout/MainLayout'
import Home from './pages/Home/Home'
import ClubDashboard from './pages/ClubAdmin/Dashboard'
import SuperDashboard from './pages/Super/Dashboard'
import LiveResults from './pages/Home/LiveResults'
import Login from './pages/Auth/Login'
import ProtectedRoute from './components/Common/ProtectedRoute'

function App() {
    return (
        <Routes>
            {/* Rutas públicas */}
            <Route path="/login" element={<MainLayout><Login /></MainLayout>} />
            <Route path="/" element={<MainLayout><Home /></MainLayout>} />
            <Route path="/resultados/:id" element={<MainLayout><LiveResults /></MainLayout>} />

            {/* Panel de Clubs (Protegido) */}
            <Route path="/club/*" element={
                <ProtectedRoute requiredRole="Club">
                    <MainLayout><ClubDashboard /></MainLayout>
                </ProtectedRoute>
            } />

            {/* Panel Admin/Federativo (Protegido) */}
            <Route path="/super/*" element={
                <ProtectedRoute requiredRole="Admin">
                    <SuperDashboard />
                </ProtectedRoute>
            } />
            <Route path="/admin/*" element={
                <ProtectedRoute requiredRole="Admin">
                    <SuperDashboard />
                </ProtectedRoute>
            } />
        </Routes>
    )
}

export default App


