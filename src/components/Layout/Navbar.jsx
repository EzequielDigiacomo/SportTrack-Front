import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import logo from '../../assets/logo-sporttrack.png'
import './Navbar.css'

function Navbar() {
    const location = useLocation()
    const navigate = useNavigate()
    const { isAuthenticated, logout, user } = useAuth()
    const [isMenuOpen, setIsMenuOpen] = useState(false)

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

                <button
                    className="navbar-toggle"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    <span className="toggle-line"></span>
                </button>

                <div className={`navbar-menu ${isMenuOpen ? 'active' : ''}`}>
                    <Link to="/" className={`navbar-link ${isActive('/') ? 'active' : ''}`}>Inicio</Link>
                    
                    {isAuthenticated ? (
                        <>
                            {user?.rol === 'Club' && (
                                <Link to="/club" className={`navbar-link ${isActive('/club') ? 'active' : ''}`}>Mi Club</Link>
                            )}
                            {user?.rol === 'Admin' && (
                                <Link to="/super" className={`navbar-link ${isActive('/super') ? 'active' : ''}`}>Administrar</Link>
                            )}
                            <button onClick={handleLogout} className="btn-logout">Cerrar Sesión</button>
                        </>
                    ) : (
                        location.pathname !== '/login' && (
                            <Link to="/login" className="btn-login-nav">Ingreso Clubes</Link>
                        )
                    )}
                </div>
            </div>
        </nav>
    )
}

export default Navbar
