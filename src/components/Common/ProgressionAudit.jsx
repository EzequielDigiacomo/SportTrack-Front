import React from 'react';
import './ProgressionAudit.css';

const ProgressionAudit = ({ eventoPrueba, auditData }) => {
  if (!eventoPrueba) {
    return <div>Seleccione un evento para ver la auditoría de progresión.</div>;
  }

  // Ejemplo de auditData esperado si no viene del backend aún:
  // [
  //   { atleta: "Juan P.", eliminatoria: "Heat 2 (1º 👉 L5)", semifinal: "Semi 3 (2º 👉 L4)", final: "Final A (1º 👉 L6)", plan: "Plan D2" },
  //   ...
  // ]

  const data = auditData || [];
  return (
    <div className="progression-audit-container glass-effect">
      <h3>Auditoría de Progresión</h3>
      <div className="audit-header">
        <p><strong>Evento:</strong> {eventoPrueba.nombre || 'K1 1000m Men'}</p>
        <p><strong>Plan Asignado al Evento:</strong> <span className="badge">{eventoPrueba.planProgresionAsignado || 'Plan D2'}</span></p>
      </div>

      <div className="audit-table-wrapper">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Atleta</th>
              <th>Eliminatoria (Origen)</th>
              <th>Semifinal (Paso Intermedio)</th>
              <th>Final A (Destino)</th>
              <th>Plan Utilizado</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx}>
                <td><strong>{row.atleta}</strong></td>
                <td>{row.eliminatoria}</td>
                <td>{row.semifinal}</td>
                <td>{row.final}</td>
                <td><span className="badge badge-light">{row.plan || eventoPrueba?.planProgresionAsignado || '—'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProgressionAudit;
