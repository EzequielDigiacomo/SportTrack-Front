import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import EventoService from '../../services/EventoService'
import logo from '../../assets/logo-sporttrack.png'
import './Home.css'
import Skeleton from '../../components/Common/Skeleton'

function Home() {
    const { isAuthenticated, user } = useAuth()
    const navigate = useNavigate()
    const [ultimoEvento, setUltimoEvento] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Cargar el último evento finalizado
        setLoading(true)
        EventoService.getAll().then(eventos => {
            const finalizados = eventos.filter(e => e.estado === 'Finalizado')
            if (finalizados.length > 0) {
                setUltimoEvento(finalizados[finalizados.length - 1])
            }
        })
        .catch(() => { })
        .finally(() => setLoading(false))
    }, [])

    const handleClubAccess = () => {
        if (isAuthenticated && user?.rol === 'Club') navigate('/club')
        else navigate('/login')
    }

    return (
        <div className="home-page fade-in">

            {/* ── HERO ── */}
            <section className="hero">
                <div className="hero-bg-glow" />
                <div className="container hero-content">
                    <div className="hero-badge">Sistema Oficial de la Federación Ecuatoriana de Canotaje</div>
                    <h1 className="hero-title">
                        Resultados en <span className="gradient-text">Tiempo Real</span>
                        <br />para Competencias de Canotaje
                    </h1>
                    <p className="hero-subtitle">
                        SportTrack gestiona eventos, inscripciones y cronometraje de regatas de velocidad (sprint).
                        Resultados disponibles para el público al instante, sin necesidad de registro.
                    </p>
                    <div className="hero-actions-placeholder" />
                </div>
            </section>

            {/* ── CARACTERÍSTICAS ── */}
            <section className="features-section container">
                <div className="features-grid">
                    <div className="feature-card glass-effect">
                        <div className="feature-icon premium-icon-timer"></div>
                        <h3>Tiempo Real</h3>
                        <p>Los tiempos se actualizan en pantalla al instante gracias a tecnología WebSocket</p>
                    </div>
                    <div className="feature-card glass-effect">
                        <div className="feature-icon premium-icon-stats"></div>
                        <h3>Todas las Categorías</h3>
                        <p>K1, K2, K4, C1, C2 en categorías Sub-10 hasta Mayores y distancias 200m a 5000m</p>
                    </div>
                    <div className="feature-card glass-effect">
                        <div className="feature-icon premium-icon-global"></div>
                        <h3>Acceso Libre</h3>
                        <p>Cualquier persona puede ver los resultados desde cualquier dispositivo con solo un link</p>
                    </div>
                    <div className="feature-card glass-effect">
                        <div className="feature-icon premium-icon-club"></div>
                        <h3>Gestión de Clubes</h3>
                        <p>Los clubes inscriben a sus atletas y siguen su desempeño desde un panel privado</p>
                    </div>
                </div>
            </section>

            {/* ── ÚLTIMO EVENTO ── */}
            {(loading || ultimoEvento) && (
                <section className="ultimo-evento-section container" id="eventos">
                    <div className="section-label">🏁 Último Evento Finalizado</div>
                    {loading ? (
                        <div className="ultimo-evento-card glass-effect" style={{ padding: '2rem' }}>
                            <div className="evento-info">
                                <Skeleton width="250px" height="32px" variant="rounded" className="mb-md" />
                                <Skeleton width="180px" height="20px" variant="rounded" className="mb-sm" />
                                <Skeleton width="150px" height="20px" variant="rounded" />
                            </div>
                            <Skeleton width="180px" height="45px" variant="rounded" />
                        </div>
                    ) : (
                        <div className="ultimo-evento-card glass-effect">
                            <div className="evento-info">
                                <h2>{ultimoEvento.nombre}</h2>
                                <p className="evento-meta">📅 {new Date(ultimoEvento.fecha).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                <p className="evento-meta">📍 {ultimoEvento.ubicacion}</p>
                            </div>
                            <Link to={`/resultados/${ultimoEvento.id}`} className="btn-ver-resultados">
                                Ver Resultados Completos →
                            </Link>
                        </div>
                    )}
                </section>
            )}

            {/* ── CTA CLUBES ── */}
            <section className="cta-section">
                <div className="cta-glow" />
                <div className="container cta-content">
                    <h2>¿Sos representante de un club?</h2>
                    <p>Inscribí a tus atletas, gestioná tu nómina y seguí los resultados de tu equipo en cada competencia.</p>
                    <button onClick={handleClubAccess} className="btn-cta">
                        {isAuthenticated ? 'Ir a Mi Panel' : 'Ingresar como Club'}
                    </button>
                </div>
            </section>

            {/* ── FOOTER PREMIUM ── */}
            <footer className="home-footer-premium glass-effect">
                <div className="container footer-content">
                    <div className="footer-main-info">
                        <div className="footer-logo">
                            <img src={logo} alt="SportTrack" className="navbar-logo-img" />
                            <span className="navbar-title gradient-text">SportTrack</span>
                        </div>
                        <p className="footer-company-desc">
                            Llevando el canotaje al siguiente nivel con tecnología de vanguardia y resultados en tiempo real.
                        </p>
                        <div className="footer-developer">
                            Desarrollado por <span className="digitech-brand">EzTechsolution</span>
                        </div>
                    </div>

                    <div className="footer-contact">
                        <h4>Contacto</h4>
                        <a href="mailto:contacto@digitech.com" className="footer-link-premium">📧 contacto@digitech.com</a>
                        <a href="https://wa.me/549123456789" className="footer-link-premium">📱 WhatsApp Soporte</a>
                    </div>

                    <div className="footer-nav">
                        <h4>Enlaces</h4>
                        <Link to="/login" className="footer-link-premium">Acceso Staff</Link>
                        <a href="#eventos" className="footer-link-premium">Eventos</a>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>© 2026 SportTrack · Todos los derechos reservados.</p>
                </div>
            </footer>
        </div>
    )
}

export default Home
