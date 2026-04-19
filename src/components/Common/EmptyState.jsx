import React from 'react';
import { Inbox } from 'lucide-react';

const EmptyState = ({ 
    message = "No hay registros encontrados", 
    icon: Icon = Inbox,
    description
}) => {
    return (
        <div className="empty-state-container fade-in" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            color: 'var(--color-text-muted)',
            textAlign: 'center',
            gap: '1rem'
        }}>
            <div className="empty-icon-wrapper" style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
                <Icon size={40} strokeWidth={1.5} />
            </div>
            <h3 style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: '1.2rem' }}>{message}</h3>
            {description && <p style={{ margin: 0, maxWidth: '300px', fontSize: '0.9rem' }}>{description}</p>}
        </div>
    );
};

export default EmptyState;
