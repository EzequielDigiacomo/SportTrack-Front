import { Link } from 'react-router-dom'
import { Mail, Smartphone } from 'lucide-react'
import logo from '../../../assets/logo-sporttrack.png'

export default function HomeFooter() {
  return (
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
          <Link to="/login" className="footer-link-premium">
            Acceso Staff
          </Link>
          <a href="#eventos" className="footer-link-premium">
            Eventos
          </a>
          <a href="#planes" className="footer-link-premium">
            Planes
          </a>
          <a href="#contacto" className="footer-link-premium">
            Contacto
          </a>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2026 SportTrack · Todos los derechos reservados.</p>
      </div>
    </footer>
  )
}
