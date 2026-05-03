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

function App() {
    const { toasts, removeToast } = useToast()

    return (
        <>
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

            {/* Panel Juez de Control (Protegido — rol JuezControl o Admin) */}
            <Route path="/juez-control/*" element={
                <ProtectedRoute requiredRole={['Admin', 'JuezControl']}>
                    <JuezControlDashboard />
                </ProtectedRoute>
            } />

            {/* Módulo de Jueces */}
            <Route path="/jueces" element={<ProtectedRoute requiredRole={['Admin', 'Largador', 'Cronometrista']}><JudgesLayout><JudgesDashboard /></JudgesLayout></ProtectedRoute>} />
            <Route path="/jueces/largador" element={<ProtectedRoute requiredRole={['Admin', 'Largador']}><JudgesLayout><StarterDashboard /></JudgesLayout></ProtectedRoute>} />
            <Route path="/jueces/llegada" element={<ProtectedRoute requiredRole={['Admin', 'Cronometrista']}><JudgesLayout><FinisherDashboard /></JudgesLayout></ProtectedRoute>} />
            <Route path="/jueces/carga-manual" element={<ProtectedRoute requiredRole="Admin"><JudgesLayout><ManualTiming /></JudgesLayout></ProtectedRoute>} />
        </Routes>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        </>
    )
}

export default App


