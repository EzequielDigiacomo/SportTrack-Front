import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import EventoService from '../../services/EventoService'
import logo from '../../assets/logo-sporttrack.png'
import './Home.css'
import Skeleton from '../../components/Common/Skeleton'
import { Check, X, Zap, Award, Activity, Smartphone, Share2, FileSpreadsheet, Timer, Globe as GlobeIcon, Shield, Flag, Calendar, MapPin, Mail } from 'lucide-react'
import WorldGlobe from '../../components/Common/WorldGlobe'

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
                <div className="container hero-content-grid">
                    <div className="hero-text">
                        <div className="hero-badge">Sistema de Gestión de Competencias Deportivas</div>
                        <h1 className="hero-title">
                            Resultados en <span className="gradient-text">Tiempo Real</span>
                            <br />para Competencias de Canotaje
                        </h1>
                        <p className="hero-subtitle">
                            SportTrack gestiona eventos, inscripciones y cronometraje de regatas de velocidad (sprint).
                            Resultados disponibles para el público al instante, sin necesidad de registro.
                        </p>
                    </div>

                    <div className="hero-visual">
                        <WorldGlobe />
                    </div>
                </div>
            </section>

            {/* ── CARACTERÍSTICAS ── */}
            <section className="features-section container">
                <div className="features-grid">
                    <div className="feature-card glass-effect">
                        <div className="feature-icon-wrapper"><Activity size={32} /></div>
                        <h3>Tiempo Real</h3>
                        <p>Sincronización instantánea de tiempos mediante tecnología WebSocket y SignalR.</p>
                    </div>
                    <div className="feature-card glass-effect">
                        <div className="feature-icon-wrapper"><Timer size={32} /></div>
                        <h3>Cronometraje Pro</h3>
                        <p>Soporte para todas las categorías (K1, K2, K4, C1, C2) y distancias oficiales.</p>
                    </div>
                    <div className="feature-card glass-effect">
                        <div className="feature-icon-wrapper"><GlobeIcon size={32} /></div>
                        <h3>Acceso Global</h3>
                        <p>Resultados abiertos al público sin necesidad de registro desde cualquier dispositivo.</p>
                    </div>
                    <div className="feature-card glass-effect">
                        <div className="feature-icon-wrapper"><Shield size={32} /></div>
                        <h3>Seguridad SaaS</h3>
                        <p>Gestión privada de clubes y atletas con backups automáticos y alta disponibilidad.</p>
                    </div>
                </div>
            </section>

            {/* ── ÚLTIMO EVENTO ── */}
            {!loading && ultimoEvento && (
                <section className="ultimo-evento-section container" id="eventos">
                    <div className="section-label"><Flag size={18} style={{ marginRight: '8px' }} /> Último Evento Finalizado</div>
                    <div className="ultimo-evento-card glass-effect">
                        <div className="evento-info">
                            <h2>{ultimoEvento.nombre}</h2>
                            <p className="evento-meta"><Calendar size={14} style={{ marginRight: '6px' }} /> {new Date(ultimoEvento.fecha).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p className="evento-meta"><MapPin size={14} style={{ marginRight: '6px' }} /> {ultimoEvento.ubicacion}</p>
                        </div>
                        <Link to={`/resultados/${ultimoEvento.id}`} className="btn-ver-resultados">
                            Ver Resultados Completos →
                        </Link>
                    </div>
                </section>
            )}

            {/* ── PLANES DE SUSCRIPCIÓN ── */}
            <section className="pricing-section container" id="planes">
                <div className="section-header">
                    <h2 className="gradient-text">Planes de Suscripción</h2>
                    <p>Elegí el nivel de tecnología para tu federación</p>
                </div>

                <div className="pricing-grid">
                    {/* PLAN BRONCE */}
                    <div className="pricing-card glass-effect">
                        <div className="pricing-header">
                            <div className="plan-icon bronze"><Award size={32} /></div>
                            <h3>Plan Bronce</h3>
                            <div className="plan-price">Digitalización</div>
                        </div>
                        <ul className="plan-features">
                            <li><Check size={18} className="icon-check" /> 1000 Atletas</li>
                            <li><Check size={18} className="icon-check" /> 15 Clubes Afiliados</li>
                            <li><Check size={18} className="icon-check" /> Carga Manual de Resultados</li>
                            <li><Check size={18} className="icon-check" /> Reportes en PDF</li>
                            <li><Check size={18} className="icon-check" /> Live Results (Web)</li>
                            <li className="disabled"><X size={18} /> Dashboards de Jueces</li>
                            <li className="disabled"><X size={18} /> App Móvil</li>
                        </ul>
                        <Link to="/planes/bronce" className="btn-plan-secondary">Saber más</Link>
                    </div>

                    {/* PLAN PLATA */}
                    <div className="pricing-card glass-effect featured">
                        <div className="plan-badge">MÁS POPULAR</div>
                        <div className="pricing-header">
                            <div className="plan-icon silver"><Smartphone size={32} /></div>
                            <h3>Plan Plata</h3>
                            <div className="plan-price">Gestión Activa</div>
                        </div>
                        <ul className="plan-features">
                            <li><Check size={18} className="icon-check" /> 4,000 Atletas</li>
                            <li><Check size={18} className="icon-check" /> 40 Clubes Afiliados</li>
                            <li><Check size={18} className="icon-check" /> Dashboards para Jueces</li>
                            <li><Check size={18} className="icon-check" /> App Móvil (Public)</li>
                            <li><Check size={18} className="icon-check" /> Live Results (Web)</li>
                            <li className="disabled"><X size={18} /> SignalR Sync (Real-Time)</li>
                            <li className="disabled"><X size={18} /> Auditoría Total</li>

                        </ul>
                        <Link to="/planes/plata" className="btn-plan-primary">Comenzar Ahora</Link>
                    </div>

                    {/* PLAN ORO */}
                    <div className="pricing-card glass-effect">
                        <div className="pricing-header">
                            <div className="plan-icon gold"><Zap size={32} /></div>
                            <h3>Plan Oro</h3>
                            <div className="plan-price">Tecnología Real-Time</div>
                        </div>
                        <ul className="plan-features">
                            <li><Check size={18} className="icon-check" /> Atletas Ilimitados</li>
                            <li><Check size={18} className="icon-check" /> Clubes Ilimitados</li>
                            <li><Check size={18} className="icon-check" /> SignalR Full Sync</li>
                            <li><Check size={18} className="icon-check" /> App Móvil Full (Admin)</li>
                            <li><Check size={18} className="icon-check" /> Exportación Excel/CSV</li>
                            <li><Check size={18} className="icon-check" /> Auditoría de Tiempos</li>
                            <li><Check size={18} className="icon-check" /> Soporte 24/7</li>
                        </ul>
                        <Link to="/planes/oro" className="btn-plan-secondary">Contactar Ventas</Link>
                    </div>
                </div>
            </section>

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
                            Desarrollado por <span className="digitech-brand">El Capote</span>
                        </div>
                    </div>

                    <div className="footer-contact">
                        <h4>Contacto</h4>
                        <a href="mailto:contacto@digitech.com" className="footer-link-premium"><Mail size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> contacto@digitech.com</a>
                        <a href="https://wa.me/5493412280901" className="footer-link-premium"><Smartphone size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> WhatsApp Soporte</a>
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
