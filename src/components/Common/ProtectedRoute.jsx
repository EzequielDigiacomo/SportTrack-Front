import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * ProtectedRoute: Redirige al login si el usuario no está autenticado
 * o si no tiene el rol requerido.
 */
const ProtectedRoute = ({ children, requiredRole }) => {
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

    // Rol incorrecto → home
    if (requiredRole) {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (!roles.includes(user?.rol)) {
            return <Navigate to="/" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
