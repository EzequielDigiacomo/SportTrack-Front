import { Link, useLocation, useNavigate } from 'react-router-dom'
import { User, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import logo from '../../assets/logo-sporttrack.png'
import './Navbar.css'

function Navbar() {
    const location = useLocation()
    const navigate = useNavigate()
    const { isAuthenticated, logout, user } = useAuth()

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/'
        return location.pathname.startsWith(path)
    }

    return (
        <nav className="navbar glass-effect">
            <div className="navbar-container container">
                <Link to="/" className="navbar-brand">
                    <img src={logo} alt="SportTrack Logo" className="navbar-logo-img" />
                    <span className="navbar-title gradient-text">SportTrack</span>
                </Link>

                {isAuthenticated ? (
                    /* Usuario logueado: menú con links de rol + logout */
                    <>
                        <div className="navbar-actions">
                            <button 
                                className="btn-icon-nav" 
                                onClick={() => {
                                    if (!user?.rol) { navigate('/'); return; }
                                    const role = user.rol.trim().toLowerCase();
                                    if (role === 'admin') navigate('/super');
                                    else if (role === 'club') navigate('/club');
                                    else if (role === 'largador' || role === 'cronometrista') navigate('/jueces');
                                    else navigate('/');
                                }}
                                title="Mi Dashboard"
                            >
                                <User size={22} color="var(--color-primary)" />
                            </button>
                            <button 
                                className="btn-icon-nav danger" 
                                onClick={handleLogout}
                                title="Cerrar Sesión"
                            >
                                <LogOut size={22} color="var(--color-error)" />
                            </button>
                        </div>
                    </>
                ) : (
                    /* Usuario NO logueado: botón Acceder directo, sin hamburguesa */
                    location.pathname !== '/login' && (
                        <Link to="/login" className="btn-login-nav">Acceder</Link>
                    )
                )}
            </div>
        </nav>
    )
}

export default Navbar
