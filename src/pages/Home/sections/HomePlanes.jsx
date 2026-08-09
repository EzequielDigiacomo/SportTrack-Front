import { Check } from 'lucide-react'

const tabLabel = (tab) =>
  tab === 'duo' ? 'Pack Dúo' : tab === 'sporttrack' ? 'Solo SportTrack' : 'Solo SIGDEF'

const annualColorFor = (tab) =>
  tab === 'sporttrack' ? '#0070f3' : tab === 'duo' ? '#3daa94' : '#10b981'

export default function HomePlanes({
  plansData,
  selectedTab,
  onSelectTab,
  onSelectNivel,
  tabs = ['sporttrack', 'duo'],
  eyebrow = 'Módulo de Competencias y Tiempos',
}) {
  const currentPlan = plansData[selectedTab]

  return (
    <section className="pricing-section container" id="planes">
      <div className="section-header">
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
          {eyebrow}
        </span>
        <h2 className="gradient-text">Planes de Suscripción</h2>
      </div>

      <div className="pricing-tabs-wrapper">
        {tabs.map((tab) => {
          const activeClass =
            tab === 'sigdef' ? 'active-sigdef' : tab === 'sporttrack' ? 'active-sporttrack' : 'active-duo'
          return (
            <button
              key={tab}
              onClick={() => onSelectTab(tab)}
              className={`pricing-tab-btn ${selectedTab === tab ? activeClass : ''}`}
            >
              {plansData[tab]?.title}
            </button>
          )
        })}
      </div>

      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', margin: '0 0 4px 0' }}>{currentPlan.title}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>{currentPlan.subtitle}</p>
      </div>

      <div className="pricing-grid">
        {currentPlan.tiers.map((tier) => {
          const isFeatured = tier.featured
          const CardIcon = tier.icon
          const annualColor = annualColorFor(selectedTab)

          return (
            <div
              key={tier.id}
              className={`pricing-card ${isFeatured ? 'featured' : ''}`}
              style={{
                border: isFeatured ? `2px solid ${currentPlan.color}` : '1px solid rgba(255, 255, 255, 0.06)',
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
                  <span className="plan-price">
                    {tier.price}
                    <span>{tier.period}</span>
                  </span>
                  <span className="plan-yearly-equivalent" style={{ color: annualColor }}>
                    {tier.annualPrice}
                  </span>
                </div>
              </div>

              <ul className="plan-features" style={{ padding: 0 }}>
                {tier.features.map((feat, idx) => (
                  <li
                    key={idx}
                    style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', color: '#cbd5e1', fontSize: '0.9rem', marginBottom: 0 }}
                  >
                    <Check size={16} className={currentPlan.checkClass} />
                    {feat}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => onSelectNivel(`${tabLabel(selectedTab)} - ${tier.name}`)}
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
  )
}
