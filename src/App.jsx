import { Routes, Route } from 'react-router-dom'
import MainLayout from './components/Layout/MainLayout'
import Home from './pages/Home/Home'
import ClubDashboard from './pages/ClubAdmin/Dashboard'
import SuperDashboard from './pages/Super/Dashboard'
import LiveResults from './pages/Home/LiveResults'
import Login from './pages/Auth/Login'
import JudgesDashboard from './pages/Judges/JudgesDashboard'
import StarterDashboard from './pages/Judges/StarterDashboard'
import FinisherDashboard from './pages/Judges/FinisherDashboard'
import ManualTiming from './pages/Judges/ManualTiming'
import JuezControlDashboard from './pages/JuezControl/JuezControlDashboard'
import ProtectedRoute from './components/Common/ProtectedRoute'
import { useToast } from './context/ToastContext'
import ToastContainer from './components/Common/ToastContainer'
import JudgesLayout from './components/Layout/JudgesLayout'
import NotificationCenter from './components/Common/NotificationCenter'
import { useAuth } from './context/AuthContext'
import PlanDetails from './pages/Home/PlanDetails'
import { useLocation } from 'react-router-dom'

function App() {
    const { toasts, removeToast } = useToast()
    const { user } = useAuth()
    

    const location = useLocation();
    const isHomePage = location.pathname === '/';

    const roleStr = (user?.rol || user?.Rol || user?.role || '').toLowerCase();
    const isJudgeOrAdmin = user && (
        roleStr.includes('admin') || 
        roleStr.includes('superadmin') ||
        roleStr.includes('juezcontrol') || 
        roleStr.includes('control')
    );

    const showNotificationCenter = isJudgeOrAdmin && (
        location.pathname.startsWith('/club') || 
        location.pathname.startsWith('/super') || 
        location.pathname.startsWith('/admin') || 
        location.pathname.startsWith('/juez-control') || 
        location.pathname.startsWith('/jueces')
    );

    return (
        <>
            <Routes>
            {/* Rutas públicas */}
            <Route path="/login" element={<MainLayout><Login /></MainLayout>} />
            <Route path="/" element={<MainLayout><Home /></MainLayout>} />
            <Route path="/planes/:id" element={<MainLayout><PlanDetails /></MainLayout>} />
            <Route path="/resultados/:id" element={<MainLayout><LiveResults /></MainLayout>} />

            {/* Panel de Clubs (Protegido) */}
            <Route path="/club/*" element={
                <ProtectedRoute requiredRole="Club">
                    <MainLayout><ClubDashboard /></MainLayout>
                </ProtectedRoute>
            } />

            {/* Panel Admin/Federativo (Protegido) */}
            <Route path="/super/*" element={
                <ProtectedRoute requiredRole={['Admin', 'SuperAdmin']}>
                    <SuperDashboard />
                </ProtectedRoute>
            } />
            <Route path="/admin/*" element={
                <ProtectedRoute requiredRole={['Admin', 'SuperAdmin']}>
                    <SuperDashboard />
                </ProtectedRoute>
            } />

            {/* Panel Juez de Control (Protegido — rol JuezControl o Admin) */}
            <Route path="/juez-control/*" element={
                <ProtectedRoute requiredRole={['Admin', 'SuperAdmin', 'JuezControl']} requiereControlesLive>
                    <JudgesLayout>
                        <JuezControlDashboard />
                    </JudgesLayout>
                </ProtectedRoute>
            } />

            {/* Módulo de Jueces */}
            <Route path="/jueces" element={<ProtectedRoute requiredRole={['Admin', 'SuperAdmin', 'Largador', 'Cronometrista']} requiereControlesLive><JudgesLayout><JudgesDashboard /></JudgesLayout></ProtectedRoute>} />
            <Route path="/jueces/largador" element={<ProtectedRoute requiredRole={['Admin', 'SuperAdmin', 'Largador']} requiereControlesLive><JudgesLayout><StarterDashboard /></JudgesLayout></ProtectedRoute>} />
            <Route path="/jueces/llegada" element={<ProtectedRoute requiredRole={['Admin', 'SuperAdmin', 'Cronometrista']} requiereControlesLive><JudgesLayout><FinisherDashboard /></JudgesLayout></ProtectedRoute>} />
            <Route path="/jueces/carga-manual" element={<ProtectedRoute requiredRole={['Admin', 'SuperAdmin']} requiereControlesLive><JudgesLayout><ManualTiming /></JudgesLayout></ProtectedRoute>} />
        </Routes>
        {showNotificationCenter && <NotificationCenter isAdmin={isJudgeOrAdmin} />}
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        </>
    )
}

export default App


