import { Activity, Globe as GlobeIcon, Shield, Timer } from 'lucide-react'

export default function HomeFeatures() {
  return (
    <section className="features-section container">
      <div className="features-grid">
        <div className="feature-card glass-effect">
          <div className="feature-icon-wrapper">
            <Activity size={32} />
          </div>
          <h3>Tiempo Real</h3>
          <p>Sincronización instantánea de tiempos mediante tecnología WebSocket y SignalR.</p>
        </div>
        <div className="feature-card glass-effect">
          <div className="feature-icon-wrapper">
            <Timer size={32} />
          </div>
          <h3>Cronometraje Pro</h3>
          <p>Soporte para todas las categorías (K1, K2, K4, C1, C2) y distancias oficiales.</p>
        </div>
        <div className="feature-card glass-effect">
          <div className="feature-icon-wrapper">
            <GlobeIcon size={32} />
          </div>
          <h3>Acceso Global</h3>
          <p>Resultados abiertos al público sin necesidad de registro desde cualquier dispositivo.</p>
        </div>
        <div className="feature-card glass-effect">
          <div className="feature-icon-wrapper">
            <Shield size={32} />
          </div>
          <h3>Seguridad SaaS</h3>
          <p>Gestión privada de clubes y atletas con backups automáticos y alta disponibilidad.</p>
        </div>
      </div>
    </section>
  )
}
