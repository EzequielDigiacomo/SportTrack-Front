import React from 'react';

const StatusBadge = ({ estado }) => {
    const map = {
        'Programado': { color: '#60a5fa', label: 'Programado' },
        'EnCurso': { color: '#34d399', label: 'En Curso' },
        'Finalizado': { color: '#9ca3af', label: 'Finalizado' },
        'Cancelado': { color: '#f87171', label: 'Cancelado' },
    };

    const s = map[estado] || { color: '#9ca3af', label: estado };
    
    return (
        <span 
            className="estado-badge" 
            style={{ 
                background: s.color + '22', 
                color: s.color, 
                border: `1px solid ${s.color}55`,
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: '600',
                display: 'inline-block'
            }}
        >
            {s.label}
        </span>
    );
};

export default StatusBadge;
