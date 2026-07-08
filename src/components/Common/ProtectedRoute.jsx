import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PlanGuard from './PlanGuard';
import { canAccessSportTrack, extractPlanFromUser } from '../../utils/planHelpers';

/**
 * ProtectedRoute: Redirige al login si el usuario no está autenticado
 * o si no tiene el rol requerido.
 * También verifica el acceso según el plan SaaS.
 */
const ProtectedRoute = ({ children, requiredRole, requiereControlesLive }) => {
    const { isAuthenticated, user, loading } = useAuth();

    // Mientras carga el contexto de auth, no redirigir todavía
    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0a0c12'
            }}>
                <div style={{
                    width: 40, height: 40,
                    border: '3px solid rgba(255,255,255,0.1)',
                    borderTopColor: '#0096ff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }} />
            </div>
        );
    }

    // No autenticado → login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Guard de plan: verifica acceso a SportTrack (excepto SuperAdmin)
    const rol = user?.rol || user?.role || '';
    const isSuperAdmin = rol === 'SuperAdmin' || rol === 'SUPERADMIN';

    if (!isSuperAdmin) {
        const plan = extractPlanFromUser(user);
        if (!plan) {
            return <PlanGuard user={{ ...user, plan: null }}>{children}</PlanGuard>;
        }
        if (!canAccessSportTrack(plan)) {
            return <PlanGuard requiereSportTrack user={{ ...user, plan }}>{children}</PlanGuard>;
        }
        if (requiereControlesLive) {
            return <PlanGuard requiereControlesLive user={user}>{children}</PlanGuard>;
        }
    }

    // Rol incorrecto → home
    if (requiredRole) {
        const roleStr = user?.rol || user?.Rol || user?.role || '';
        const userRoles = roleStr.toLowerCase().split(/[,;]/).map(r => r.trim());
        const requiredRoles = Array.isArray(requiredRole) ? requiredRole.map(r => r.toLowerCase()) : [requiredRole.toLowerCase()];
        
        // El usuario debe tener AL MENOS UNO de los roles requeridos
        const hasAccess = requiredRoles.some(r => userRoles.includes(r));
        
        if (!hasAccess) {
            console.warn(`[ProtectedRoute] Access denied. Required: ${requiredRoles.join(',')}. User has: ${userRoles.join(',')}`);
            return <Navigate to="/" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
