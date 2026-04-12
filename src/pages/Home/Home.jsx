import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import EventoService from '../../services/EventoService'
import './Home.css'

function Home() {
    const { isAuthenticated, user } = useAuth()
    const navigate = useNavigate()
    const [ultimoEvento, setUltimoEvento] = useState(null)

    useEffect(() => {
        // Cargar el último evento finalizado
        EventoService.getAll().then(eventos => {
            const finalizados = eventos.filter(e => e.estado === 'Finalizado')
            if (finalizados.length > 0) {
                setUltimoEvento(finalizados[finalizados.length - 1])
            }
        }).catch(() => {})
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
                    <div className="hero-badge">🏅 Sistema Oficial de Canotaje</div>
                    <h1 className="hero-title">
                        Resultados en <span className="gradient-text">Tiempo Real</span>
                        <br />para Competencias de Canotaje
                    </h1>
                    <p className="hero-subtitle">
                        SportTrack gestiona eventos, inscripciones y cronometraje de regatas de velocidad (sprint).
                        Resultados disponibles para el público al instante, sin necesidad de registro.
                    </p>
                    <div className="hero-actions">
                        <a href="#eventos" className="btn-hero-primary">Ver Próximos Eventos</a>
                        <button onClick={handleClubAccess} className="btn-hero-secondary">
                            Acceso Clubes →
                        </button>
                    </div>
                </div>
            </section>

            {/* ── CARACTERÍSTICAS ── */}
            <section className="features-section container">
                <div className="features-grid">
                    <div className="feature-card glass-effect">
                        <div className="feature-icon">⚡</div>
                        <h3>Tiempo Real</h3>
                        <p>Los tiempos se actualizan en pantalla al instante gracias a tecnología WebSocket</p>
                    </div>
                    <div className="feature-card glass-effect">
                        <div className="feature-icon">🚣</div>
                        <h3>Todas las Categorías</h3>
                        <p>K1, K2, K4, C1, C2 en categorías Sub-10 hasta Mayores y distancias 200m a 5000m</p>
                    </div>
                    <div className="feature-card glass-effect">
                        <div className="feature-icon">📱</div>
                        <h3>Acceso Libre</h3>
                        <p>Cualquier persona puede ver los resultados desde cualquier dispositivo con solo un link</p>
                    </div>
                    <div className="feature-card glass-effect">
                        <div className="feature-icon">🏆</div>
                        <h3>Gestión de Clubes</h3>
                        <p>Los clubes inscriben a sus atletas y siguen su desempeño desde un panel privado</p>
                    </div>
                </div>
            </section>

            {/* ── ÚLTIMO EVENTO ── */}
            {ultimoEvento && (
                <section className="ultimo-evento-section container" id="eventos">
                    <div className="section-label">🏁 Último Evento Finalizado</div>
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

            {/* ── FOOTER SIMPLE ── */}
            <footer className="home-footer">
                <div className="footer-links">
                    <Link to="/login" className="footer-link-subtle">Acceso Staff / Federaciones</Link>
                </div>
                <p>© 2026 SportTrack · Sistema de Gestión de Canotaje Velocidad</p>
            </footer>
        </div>
    )
}

export default Home
