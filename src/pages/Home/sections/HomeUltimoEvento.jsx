import { Link } from 'react-router-dom'
import { Calendar, Flag, MapPin } from 'lucide-react'

export default function HomeUltimoEvento({ loading, ultimoEvento }) {
  if (loading || !ultimoEvento) return null

  return (
    <section className="ultimo-evento-section container" id="eventos">
      <div className="section-label">
        <Flag size={18} style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }} /> Último Evento Finalizado
      </div>
      <div className="ultimo-evento-card glass-effect">
        <div className="evento-info">
          <h2>{ultimoEvento.nombre}</h2>
          <p className="evento-meta">
            <Calendar size={14} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} />{' '}
            {new Date(ultimoEvento.fecha).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="evento-meta">
            <MapPin size={14} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} /> {ultimoEvento.ubicacion}
          </p>
        </div>
        <Link to={`/resultados/${ultimoEvento.id}`} className="btn-ver-resultados">
          Ver Resultados Completos →
        </Link>
      </div>
    </section>
  )
}
