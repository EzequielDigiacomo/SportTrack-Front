import React from 'react';
import { 
    Settings, 
    ShieldCheck, 
    Smartphone, 
    Tag, 
    Database, 
    Bell,
    Globe
} from 'lucide-react';
import '../../../components/SharedSections/AdminSections.css';

const ConfiguracionSection = () => {
    const panels = [
        {
            title: 'Sistema e Identidad',
            icon: <Globe size={24} />,
            color: 'var(--color-primary)',
            items: [
                { label: 'Información de la Federación', desc: 'Nombre, siglas y datos legales.' },
                { label: 'Branding y Logos', desc: 'Personalizar el logo y banners del sistema.' },
                { label: 'Redes Sociales', desc: 'Links para el pie de página y reportes.' }
            ]
        },
        {
            title: 'Reglas del Deporte',
            icon: <Tag size={24} />,
            color: 'var(--color-accent)',
            items: [
                { label: 'Categorías de Edad', desc: 'Definir rangos (Infantil, Menor, Senior, etc.).' },
                { label: 'Modalidades y Botes', desc: 'Configurar K1, K2, C1, C2, etc.' },
                { label: 'Distancias Oficiales', desc: '200m, 500m, 1000m, Maratón.' }
            ]
        },
        {
            title: 'Seguridad y Logs',
            icon: <ShieldCheck size={24} />,
            color: 'var(--color-secondary)',
            items: [
                { label: 'Roles de Usuario', desc: 'Permisos para delegados y administrativos.' },
                { label: 'Auditoría de Cambios', desc: 'Ver quién editó resultados o atletas.' },
                { label: 'Backups', desc: 'Exportar la base de datos completa.' }
            ]
        },
        {
            title: 'Notificaciones',
            icon: <Bell size={24} />,
            color: '#10B981',
            items: [
                { label: 'Emails de Confirmación', desc: 'Configurar plantillas de inscripción.' },
                { label: 'Alertas de Cierre', desc: 'Avisos automáticos a los clubes.' }
            ]
        }
    ];

    return (
        <div className="admin-section-container fade-in">
            <div className="admin-section-header">
                <div>
                    <h1>Configuración Global</h1>
                    <p className="section-subtitle">Ajustes generales del sistema SportTrack.</p>
                </div>
            </div>

            <div className="config-panels-grid">
                {panels.map((panel, idx) => (
                    <div key={idx} className="config-group-card glass-effect">
                        <div className="config-group-header">
                            <div className="config-group-icon" style={{ backgroundColor: `${panel.color}20`, color: panel.color }}>
                                {panel.icon}
                            </div>
                            <h3>{panel.title}</h3>
                        </div>
                        <div className="config-items-list">
                            {panel.items.map((item, iIdx) => (
                                <div key={iIdx} className="config-item-row clickable">
                                    <div className="config-item-info">
                                        <strong>{item.label}</strong>
                                        <span>{item.desc}</span>
                                    </div>
                                    <span className="item-arrow">→</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ConfiguracionSection;
