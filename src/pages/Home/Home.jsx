import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import EventoService from '../../services/EventoService'
import logo from '../../assets/logo-sporttrack.png'
import './Home.css'
import { 
  Check, X, Zap, Award, Activity, Smartphone, Timer, Globe as GlobeIcon, Shield, 
  Flag, Calendar, MapPin, Mail, MessageSquare, Send, LayoutGrid, Star, Layers, Sparkles, Tv 
} from 'lucide-react'
import WorldGlobe from '../../components/Common/WorldGlobe'

// Estructura completa de planes unificados
const plansData = {
  sigdef: {
    title: "Solo SIGDEF (Gestión)",
    subtitle: "Módulo Administrativo y Padrón Federativo",
    color: "#10b981",
    cardClass: "", 
    checkClass: "icon-check-green",
    btnFeaturedClass: "btn-acc-green",
    btnOutlineClass: "btn-acc-outline",
    tiers: [
      {
        id: "sigdef-s",
        name: "Plan Esencial",
        limit: "Hasta 500 atletas activos",
        price: "$50",
        period: "/mes",
        annualPrice: "Anual: $480/año (~$40/mes)",
        featured: false,
        icon: LayoutGrid,
        color: "#10b981",
        features: [
          "Panel de Control Único (Admin Federación)",
          "Padrón Digital Básico de Afiliados",
          "Categorización por edad automática",
          "Legajo de Datos Personales (DNI, Pasaporte)",
          "Validación básica de documentación interna",
          "Módulo de tutoría legal para atletas menores",
          "Exportación de planillas a Excel"
        ]
      },
      {
        id: "sigdef-m",
        name: "Plan Profesional",
        limit: "501 a 2,000 atletas activos",
        price: "$120",
        period: "/mes",
        annualPrice: "Anual: $1,150/año (~$96/mes)",
        featured: true,
        icon: Award,
        color: "#10b981",
        features: [
          "Todo lo del Plan Esencial",
          "Doble Dashboard (Federación + Clubes)",
          "Carga descentralizada desde cada Club",
          "Flujo de Aprobación Remota en tiempo real",
          "Gestión avanzada de fotos y legajos médicos",
          "Módulo de matrícula y control de afiliación",
          "Filtros avanzados por club, pago y vigencia"
        ]
      },
      {
        id: "sigdef-l",
        name: "Plan Ecosistema",
        limit: "Más de 2,000 atletas activos",
        price: "$250",
        period: "/mes",
        annualPrice: "Anual: $2,400/año (~$200/mes)",
        featured: false,
        icon: Star,
        color: "#10b981",
        features: [
          "Todo lo del Plan Profesional",
          "App Móvil Dedicada (Android / iOS)",
          "Mensajería interna oficial Federación-Clubes",
          "Centro de Notificaciones masivas con acuse",
          "Auditoría completa de logs y seguridad",
          "Resoluciones y circulares oficiales digitales",
          "Soporte multimedia de alta resolución"
        ]
      }
    ]
  },
  sporttrack: {
    title: "Solo SportTrack (Eventos)",
    subtitle: "Módulo de Competencias, Tiempos y Resultados",
    color: "#0070f3",
    cardClass: "st-theme",
    checkClass: "icon-check-blue",
    btnFeaturedClass: "btn-acc-blue",
    btnOutlineClass: "btn-acc-outline btn-acc-outline-blue",
    tiers: [
      {
        id: "st-s",
        name: "Plan Esencial",
        limit: "Hasta 500 atletas activos",
        price: "$40",
        period: "/mes",
        annualPrice: "Anual: $380/año (~$31/mes)",
        featured: false,
        icon: Timer,
        color: "#0070f3",
        features: [
          "Inscripción básica de atletas a regatas",
          "Pizarra de resultados en vivo (web pública)",
          "Consola para Juez Cronometrista",
          "Planillas de clasificación y series",
          "Soporte para 1 disciplina deportiva",
          "Reporte PDF automático de regatas",
          "Gráficos básicos de rendimiento"
        ]
      },
      {
        id: "st-m",
        name: "Plan Profesional",
        limit: "501 a 2,000 atletas activos",
        price: "$90",
        period: "/mes",
        annualPrice: "Anual: $860/año (~$71/mes)",
        featured: true,
        icon: Tv,
        color: "#0070f3",
        features: [
          "Todo lo del Plan Esencial",
          "Resultados en vivo dinámicos mediante SignalR",
          "Múltiples consolas de jueces (Largada + Llegada)",
          "Inscripción descentralizada directa por Clubes",
          "Control de penalidades y descalificaciones",
          "Cronograma interactivo de pruebas",
          "Filtros avanzados por series y categorías"
        ]
      },
      {
        id: "st-l",
        name: "Plan Ecosistema",
        limit: "Más de 2,000 atletas activos",
        price: "$190",
        period: "/mes",
        annualPrice: "Anual: $1,800/año (~$150/mes)",
        featured: false,
        icon: GlobeIcon,
        color: "#0070f3",
        features: [
          "Todo lo del Plan Profesional",
          "Globo terráqueo 3D interactivo de eventos",
          "Integración de telemetría y GPS en vivo",
          "Marca Blanca (Resultados en dominio propio)",
          "Soporte multidisciplinario avanzado",
          "API pública de resultados e integraciones",
          "Pantalla de resultados adaptada a Streaming/TV"
        ]
      }
    ]
  },
  duo: {
    title: "Pack Dúo (Ecosistema)",
    subtitle: "SIGDEF + SportTrack Integrados (Ahorro del 20%)",
    color: "#3daa94",
    cardClass: "duo-theme",
    checkClass: "icon-check-green",
    btnFeaturedClass: "btn-acc-green",
    btnOutlineClass: "btn-acc-outline",
    tiers: [
      {
        id: "duo-s",
        name: "Plan Esencial",
        limit: "Hasta 500 atletas activos",
        price: "$75",
        period: "/mes",
        annualPrice: "Anual: $720/año (~$60/mes)",
        featured: false,
        icon: Layers,
        color: "#3daa94",
        features: [
          "Plataformas integradas (SIGDEF + SportTrack)",
          "Sincronización básica de padrón a regatas",
          "Legajo básico y 1 consola de cronometrista",
          "Pizarra de resultados en vivo",
          "50% de descuento en setup inicial",
          "1.5% fee de inscripción en torneos de pago",
          "Soporte técnico prioritario por email"
        ]
      },
      {
        id: "duo-m",
        name: "Plan Profesional",
        limit: "501 a 2,000 atletas activos",
        price: "$170",
        period: "/mes",
        annualPrice: "Anual: $1,600/año (~$133/mes)",
        featured: true,
        icon: Sparkles,
        color: "#3daa94",
        features: [
          "SIGDEF Standard + SportTrack Standard",
          "Sincronización automática de atletas de clubes",
          "Inscripción descentralizada con validación",
          "Pagos unificados (Afiliación + Inscripción torneo)",
          "Consolas multi-juez SignalR sincronizadas",
          "Setup inicial e inducción técnica incluidos",
          "2.0% fee de inscripción en torneos de pago"
        ]
      },
      {
        id: "duo-l",
        name: "Plan Ecosistema",
        limit: "Más de 2,000 atletas activos",
        price: "$350",
        period: "/mes",
        annualPrice: "Anual: $3,360/año (~$280/mes)",
        featured: false,
        icon: Zap,
        color: "#3daa94",
        features: [
          "SIGDEF Premium + SportTrack Premium",
          "App Móvil Integrada (Legajo + Live Tracking)",
          "Marca Blanca (Dominio propio y logos incluidos)",
          "Mensajería y notificaciones masivas oficiales",
          "Globo 3D y telemetría avanzada de regatas",
          "Soporte VIP 24/7 y Setup prioritario incluido",
          "Fee de inscripción reducido al 1.0%"
        ]
      }
    ]
  }
};

function Home() {
    const { isAuthenticated, user } = useAuth()
    const navigate = useNavigate()
    const [ultimoEvento, setUltimoEvento] = useState(null)
    const [loading, setLoading] = useState(true)

    // Estados para la comparación de planes y contacto
    const [selectedTab, setSelectedTab] = useState('sporttrack') // SportTrack por defecto para esta landing
    const [nivelInteres, setNivelInteres] = useState('')

    useEffect(() => {
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

    const selectNivel = (nivel) => {
        setNivelInteres(nivel)
        setTimeout(() => {
            document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
    }

    const currentPlan = plansData[selectedTab];

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
                        <div className="hero-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <button onClick={handleClubAccess} className="btn-acc-blue">
                                {isAuthenticated ? 'Ir a mi Panel' : 'Ingresar como Club'}
                            </button>
                            <a href="#planes" className="btn-acc-outline" style={{ display: 'inline-flex', alignItems: 'center' }}>
                                Ver Planes &nbsp; &rsaquo;
                            </a>
                        </div>
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
                    <div className="section-label"><Flag size={18} style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }} /> Último Evento Finalizado</div>
                    <div className="ultimo-evento-card glass-effect">
                        <div className="evento-info">
                            <h2>{ultimoEvento.nombre}</h2>
                            <p className="evento-meta"><Calendar size={14} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} /> {new Date(ultimoEvento.fecha).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p className="evento-meta"><MapPin size={14} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} /> {ultimoEvento.ubicacion}</p>
                        </div>
                        <Link to={`/resultados/${ultimoEvento.id}`} className="btn-ver-resultados">
                            Ver Resultados Completos →
                        </Link>
                    </div>
                </section>
            )}

            {/* ── PLANES DE SUSCRIPCIÓN (Imagen 2 - Con soporte para individual y dúo) ── */}
            <section className="pricing-section container" id="planes">
                <div className="section-header">
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                        Módulo de Competencias y Tiempos
                    </span>
                    <h2 className="gradient-text">Planes de Suscripción</h2>
                </div>

                {/* Selector de pestañas */}
                <div className="pricing-tabs-wrapper">
                    <button
                        onClick={() => setSelectedTab('sporttrack')}
                        className={`pricing-tab-btn ${selectedTab === 'sporttrack' ? 'active-sporttrack' : ''}`}
                    >
                        Solo SportTrack (Eventos)
                    </button>
                    <button
                        onClick={() => setSelectedTab('duo')}
                        className={`pricing-tab-btn ${selectedTab === 'duo' ? 'active-duo' : ''}`}
                    >
                        Pack Dúo (Ecosistema)
                    </button>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', margin: '0 0 4px 0' }}>{currentPlan.title}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>{currentPlan.subtitle}</p>
                </div>

                <div className="pricing-grid">
                    {currentPlan.tiers.map((tier) => {
                        const isFeatured = tier.featured;
                        const CardIcon = tier.icon;
                        const annualColor = selectedTab === 'sporttrack' ? '#0070f3' : selectedTab === 'duo' ? '#3daa94' : '#10b981';

                        return (
                            <div 
                                key={tier.id} 
                                className={`pricing-card ${isFeatured ? 'featured' : ''}`}
                                style={{
                                    border: isFeatured ? `2px solid ${currentPlan.color}` : '1px solid rgba(255, 255, 255, 0.06)'
                                }}
                            >
                                {isFeatured && (
                                    <div className="plan-badge" style={{ backgroundColor: currentPlan.color }}>
                                        MÁS POPULAR
                                    </div>
                                )}
                                
                                <div className="pricing-header">
                                    <div className="plan-icon-wrapper" style={{ color: isFeatured ? currentPlan.color : '#94a3b8' }}>
                                        <CardIcon size={24} />
                                    </div>
                                    <h3>{tier.name}</h3>
                                    <span className="plan-limits">{tier.limit}</span>
                                    
                                    <div className="plan-price-block">
                                        <span className="plan-price">{tier.price}<span>{tier.period}</span></span>
                                        <span className="plan-yearly-equivalent" style={{ color: annualColor }}>{tier.annualPrice}</span>
                                    </div>
                                </div>

                                <ul className="plan-features" style={{ padding: 0 }}>
                                    {tier.features.map((feat, idx) => (
                                        <li key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', color: '#cbd5e1', fontSize: '0.9rem', marginBottom: 0 }}>
                                            <Check size={16} className={currentPlan.checkClass} />
                                            {feat}
                                        </li>
                                    ))}
                                </ul>

                                <button 
                                    onClick={() => selectNivel(`${selectedTab === 'duo' ? 'Pack Dúo' : selectedTab === 'sporttrack' ? 'Solo SportTrack' : 'Solo SIGDEF'} - ${tier.name}`)}
                                    className={isFeatured ? currentPlan.btnFeaturedClass : currentPlan.btnOutlineClass} 
                                    style={{ marginTop: 'auto', width: '100%' }}
                                >
                                    Consultar Plan
                                </button>
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* ── SECCIÓN PONETE EN CONTACTO (Imagen 4) ── */}
            <section className="contacto-section" id="contacto">
                <div className="contacto-title-wrapper">
                    <h2>Ponete en <span style={{ color: '#0070f3' }}>Contacto</span></h2>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '580px', margin: '0.5rem auto 0 auto', fontSize: '1.05rem', lineHeight: 1.6 }}>
                        ¿Listo para digitalizar tu federación? Nuestro equipo te asesora personalmente.
                    </p>
                    <div className="app-line-decorator"></div>
                </div>

                <div className="contacto-grid">
                    {/* Contacto Directo */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="contacto-direct-card">
                            <h4>
                                <div className="contacto-direct-icon-wrapper">
                                    <Mail size={16} />
                                </div>
                                Contacto Directo
                            </h4>
                            
                            <div className="contacto-detail-group">
                                <div className="contacto-detail-label">Email</div>
                                <div className="contacto-detail-value">info@sigdef.com.ar</div>
                            </div>
                            
                            <div className="contacto-detail-group">
                                <div className="contacto-detail-label">WhatsApp</div>
                                <div className="contacto-detail-value">+54 9 341 228 0901</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <a href="https://wa.me/5493412280901?text=Hola%20SportTrack%2C%20quiero%20conocer%20más%20sobre%20sus%20servicios"
                                target="_blank" rel="noopener noreferrer"
                                className="btn-acc-blue" style={{ flex: 1, padding: '0.75rem 1rem !important', fontSize: '0.925rem' }}>
                                <MessageSquare size={16} /> WhatsApp
                            </a>
                            <a href="mailto:info@sigdef.com.ar"
                                className="btn-acc-outline btn-acc-outline-blue" style={{ flex: 1, padding: '0.75rem 1rem !important', fontSize: '0.925rem' }}>
                                <Mail size={16} /> Email
                            </a>
                        </div>
                    </div>

                    {/* Envianos un Mensaje */}
                    <div className="contacto-form-card">
                        <h4>
                            <div className="contacto-form-icon-wrapper">
                                <Send size={16} />
                            </div>
                            Envianos un Mensaje
                        </h4>
                        
                        <form onSubmit={(e) => { e.preventDefault(); alert('¡Mensaje enviado! Nos contactaremos pronto.'); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="contacto-form-group">
                                    <label htmlFor="contact-nombre">Nombre</label>
                                    <input id="contact-nombre" type="text" placeholder="Tu nombre" required className="contact-input-dark" style={{ marginBottom: 0 }} />
                                </div>
                                <div className="contacto-form-group">
                                    <label htmlFor="contact-org">Institución</label>
                                    <input id="contact-org" type="text" placeholder="Federación / Club" className="contact-input-dark" style={{ marginBottom: 0 }} />
                                </div>
                            </div>
                            
                            <div className="contacto-form-group">
                                <label htmlFor="contact-email">Email</label>
                                <input id="contact-email" type="email" placeholder="tuemail@institución.com" required className="contact-input-dark" style={{ marginBottom: 0 }} />
                            </div>
                            
                            <div className="contacto-form-group">
                                <label htmlFor="contact-nivel">Nivel de Interés</label>
                                <select
                                    id="contact-nivel"
                                    value={nivelInteres}
                                    onChange={(e) => setNivelInteres(e.target.value)}
                                    className="contact-input-dark"
                                    style={{
                                        marginBottom: 0,
                                        cursor: 'pointer',
                                        appearance: 'none',
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238a9bb5' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 1rem center',
                                    }}
                                >
                                    <option value="" style={{ background: '#0b0f19', color: '#64748b' }}>Seleccioná un plan...</option>
                                    <optgroup label="🎁 Pack Dúo (Ecosistema Integrado)" style={{ background: '#0b0f19', color: '#ffffff', fontWeight: 600 }}>
                                        <option value="Pack Dúo - Plan Esencial" style={{ background: '#0b0f19', color: '#cbd5e1' }}>Pack Dúo — Plan Esencial (Hasta 500 atletas)</option>
                                        <option value="Pack Dúo - Plan Profesional" style={{ background: '#0b0f19', color: '#cbd5e1' }}>Pack Dúo — Plan Profesional (501 a 2,000 atletas)</option>
                                        <option value="Pack Dúo - Plan Ecosistema" style={{ background: '#0b0f19', color: '#cbd5e1' }}>Pack Dúo — Plan Ecosistema (Más de 2,000 atletas)</option>
                                    </optgroup>
                                    <optgroup label="🔵 Solo SportTrack (Competencias)" style={{ background: '#0b0f19', color: '#ffffff', fontWeight: 600 }}>
                                        <option value="Solo SportTrack - Plan Esencial" style={{ background: '#0b0f19', color: '#cbd5e1' }}>Solo SportTrack — Plan Esencial (Hasta 500 atletas)</option>
                                        <option value="Solo SportTrack - Plan Profesional" style={{ background: '#0b0f19', color: '#cbd5e1' }}>Solo SportTrack — Plan Profesional (501 a 2,000 atletas)</option>
                                        <option value="Solo SportTrack - Plan Ecosistema" style={{ background: '#0b0f19', color: '#cbd5e1' }}>Solo SportTrack — Plan Ecosistema (Más de 2,000 atletas)</option>
                                    </optgroup>
                                </select>
                            </div>
                            
                            <div className="contacto-form-group">
                                <label htmlFor="contact-mensaje">Mensaje</label>
                                <textarea id="contact-mensaje" rows={3} placeholder="Contanos cómo podemos ayudarte a crear tu software acorde a tus necesidades" className="contact-input-dark" style={{ marginBottom: 0, resize: 'vertical' }}></textarea>
                            </div>

                            <button type="submit" className="btn-acc-blue" style={{ width: '100%', marginTop: '0.75rem', height: 'auto', padding: '0.85rem' }}>
                                Enviar Mensaje <Send size={16} />
                            </button>
                        </form>
                    </div>
                </div>
            </section>



            {/* ── FOOTER PREMIUM ── */}
            <footer className="home-footer-premium glass-effect" style={{ marginTop: 0 }}>
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
                        <a href="mailto:info@sigdef.com.ar" className="footer-link-premium">
                            <Mail size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> info@sigdef.com.ar
                        </a>
                        <a href="https://wa.me/5493412280901" className="footer-link-premium">
                            <Smartphone size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> WhatsApp Soporte
                        </a>
                    </div>

                    <div className="footer-nav">
                        <h4>Enlaces</h4>
                        <Link to="/login" className="footer-link-premium">Acceso Staff</Link>
                        <a href="#eventos" className="footer-link-premium">Eventos</a>
                        <a href="#planes" className="footer-link-premium">Planes</a>
                        <a href="#contacto" className="footer-link-premium">Contacto</a>
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
