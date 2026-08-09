import WorldGlobe from '../../../components/Common/WorldGlobe'

export default function HomeHero({ isAuthenticated, onClubAccess }) {
  return (
    <section className="hero">
      <div className="hero-bg-glow" />
      <div className="container hero-content-grid">
        <div className="hero-text">
          <div className="hero-badge">Sistema de Gestión de Competencias Deportivas</div>
          <h1 className="hero-title">
            Resultados en <span className="gradient-text">Tiempo Real</span>
            <br />
            para Competencias de Canotaje
          </h1>
          <p className="hero-subtitle">
            SportTrack gestiona eventos, inscripciones y cronometraje de regatas de velocidad (sprint). Resultados disponibles para el público al instante, sin necesidad de registro.
          </p>
          <div className="hero-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button onClick={onClubAccess} className="btn-acc-blue">
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
  )
}
