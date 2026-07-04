import React from 'react';
import { ShieldOff } from 'lucide-react';

/**
 * PlanGuard: Muestra una pantalla de "Plan no compatible" si el usuario
 * no tiene acceso al sistema o feature según su plan SaaS.
 */
const PlanGuard = ({ children, requiereSportTrack, requiereControlesLive, user }) => {
    const plan = user?.plan;
    const rol = user?.rol || user?.role || '';
    const isSuperAdmin = rol === 'SuperAdmin' || rol === 'SUPERADMIN';

    // SuperAdmin siempre pasa
    if (isSuperAdmin) return children;

    // Sin plan asignado
    if (!plan) {
        return <PlanBloqueado motivo="Tu cuenta no tiene un plan SaaS asignado. Contactá al administrador." />;
    }

    if (requiereSportTrack && !plan.accesoSportTrack) {
        return <PlanBloqueado motivo="Tu plan actual no incluye acceso al sistema SportTrack. Para habilitar este acceso, actualizá tu plan a SportTrack o Pack Dúo." />;
    }

    if (requiereControlesLive && !plan.accesoControlesLive) {
        return <PlanBloqueadoFeature
            titulo="Función exclusiva del Plan L"
            motivo="Los paneles de control en vivo (Largador, Cronometrista, Juez de Control) están disponibles únicamente en los planes de nivel L."
            planActual={plan.nombre}
        />;
    }

    return children;
};

const PlanBloqueado = ({ motivo }) => (
    <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-primary, #0a0c12)',
        padding: '2rem'
    }}>
        <div style={{
            maxWidth: '480px',
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '20px',
            padding: '3rem 2.5rem',
            textAlign: 'center',
            backdropFilter: 'blur(12px)'
        }}>
            <div style={{
                width: 72, height: 72,
                borderRadius: '50%',
                background: 'rgba(239,68,68,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.5rem'
            }}>
                <ShieldOff size={36} color="#ef4444" />
            </div>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9' }}>
                Acceso no disponible
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 2rem' }}>
                {motivo}
            </p>
            <div style={{
                padding: '0.75rem 1rem',
                background: 'rgba(239,68,68,0.08)',
                borderRadius: '10px',
                border: '1px solid rgba(239,68,68,0.2)',
                fontSize: '0.8rem',
                color: '#fca5a5'
            }}>
                💡 Planes: <strong>SportTrack S/M/L</strong> (solo SportTrack) · <strong>Pack Dúo S/M/L</strong> (SIGDEF + SportTrack)
            </div>
        </div>
    </div>
);

const PlanBloqueadoFeature = ({ titulo, motivo, planActual }) => (
    <div style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
    }}>
        <div style={{
            maxWidth: '480px',
            width: '100%',
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: '16px',
            padding: '2.5rem 2rem',
            textAlign: 'center'
        }}>
            <div style={{
                width: 60, height: 60,
                borderRadius: '50%',
                background: 'rgba(245,158,11,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.25rem'
            }}>
                <ShieldOff size={30} color="#f59e0b" />
            </div>
            <h3 style={{ margin: '0 0 0.6rem', fontSize: '1.2rem', fontWeight: 700, color: '#f1f5f9' }}>
                {titulo}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
                {motivo}
            </p>
            {planActual && (
                <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>
                    Tu plan actual: <strong style={{ color: '#94a3b8' }}>{planActual}</strong>
                </p>
            )}
        </div>
    </div>
);

export default PlanGuard;
export { PlanBloqueadoFeature };
