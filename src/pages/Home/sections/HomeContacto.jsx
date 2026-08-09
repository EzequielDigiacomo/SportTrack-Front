import { Mail, MessageSquare, Send } from 'lucide-react'

const selectArrowStyle = {
  marginBottom: 0,
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238a9bb5' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 1rem center',
}

export default function HomeContacto({ nivelInteres, setNivelInteres, onSubmit }) {
  return (
    <section className="contacto-section" id="contacto">
      <div className="contacto-title-wrapper">
        <h2>
          Ponete en <span style={{ color: '#0070f3' }}>Contacto</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '580px', margin: '0.5rem auto 0 auto', fontSize: '1.05rem', lineHeight: 1.6 }}>
          ¿Listo para digitalizar tu federación? Nuestro equipo te asesora personalmente.
        </p>
        <div className="app-line-decorator" />
      </div>

      <div className="contacto-grid">
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
            <a
              href="https://wa.me/5493412280901?text=Hola%20SportTrack%2C%20quiero%20conocer%20más%20sobre%20sus%20servicios"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-acc-blue"
              style={{ flex: 1, padding: '0.75rem 1rem !important', fontSize: '0.925rem' }}
            >
              <MessageSquare size={16} /> WhatsApp
            </a>
            <a
              href="mailto:info@sigdef.com.ar"
              className="btn-acc-outline btn-acc-outline-blue"
              style={{ flex: 1, padding: '0.75rem 1rem !important', fontSize: '0.925rem' }}
            >
              <Mail size={16} /> Email
            </a>
          </div>
        </div>

        <div className="contacto-form-card">
          <h4>
            <div className="contacto-form-icon-wrapper">
              <Send size={16} />
            </div>
            Envianos un Mensaje
          </h4>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              onSubmit?.()
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
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
                style={selectArrowStyle}
              >
                <option value="" style={{ background: '#0b0f19', color: '#64748b' }}>
                  Seleccioná un plan...
                </option>
                <optgroup label="🎁 Pack Dúo (Ecosistema Integrado)" style={{ background: '#0b0f19', color: '#ffffff', fontWeight: 600 }}>
                  <option value="Pack Dúo - Plan Esencial" style={{ background: '#0b0f19', color: '#cbd5e1' }}>
                    Pack Dúo — Plan Esencial (Hasta 200 atletas)
                  </option>
                  <option value="Pack Dúo - Plan Profesional" style={{ background: '#0b0f19', color: '#cbd5e1' }}>
                    Pack Dúo — Plan Profesional (Hasta 400 atletas)
                  </option>
                  <option value="Pack Dúo - Plan Ecosistema" style={{ background: '#0b0f19', color: '#cbd5e1' }}>
                    Pack Dúo — Plan Ecosistema (Ilimitado)
                  </option>
                </optgroup>
                <optgroup label="🔵 Solo SportTrack (Competencias)" style={{ background: '#0b0f19', color: '#ffffff', fontWeight: 600 }}>
                  <option value="Solo SportTrack - Plan Esencial" style={{ background: '#0b0f19', color: '#cbd5e1' }}>
                    Solo SportTrack — Plan Esencial (Hasta 200 atletas)
                  </option>
                  <option value="Solo SportTrack - Plan Profesional" style={{ background: '#0b0f19', color: '#cbd5e1' }}>
                    Solo SportTrack — Plan Profesional (Hasta 400 atletas)
                  </option>
                  <option value="Solo SportTrack - Plan Ecosistema" style={{ background: '#0b0f19', color: '#cbd5e1' }}>
                    Solo SportTrack — Plan Ecosistema (Ilimitado)
                  </option>
                </optgroup>
              </select>
            </div>

            <div className="contacto-form-group">
              <label htmlFor="contact-mensaje">Mensaje</label>
              <textarea
                id="contact-mensaje"
                rows={3}
                placeholder="Contanos cómo podemos ayudarte a crear tu software acorde a tus necesidades"
                className="contact-input-dark"
                style={{ marginBottom: 0, resize: 'vertical' }}
              />
            </div>

            <button type="submit" className="btn-acc-blue" style={{ width: '100%', marginTop: '0.75rem', height: 'auto', padding: '0.85rem' }}>
              Enviar Mensaje <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
