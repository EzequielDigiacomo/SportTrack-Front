import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import GestionResultadosSection from '../../components/SharedSections/GestionResultadosSection';
import './Judges.css';

const ManualTiming = () => {
    const navigate = useNavigate();

    return (
        <div className="manual-timing-page fade-in" style={{ padding: '3rem 2rem', minHeight: '100vh', background: 'var(--color-bg)' }}>
            <div className="container" style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <header style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '3.5rem' }}>
                    <button 
                        className="btn-admin-secondary" 
                        onClick={() => navigate('/jueces')}
                        style={{ padding: '0', width: '42px', height: '42px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="gradient-text" style={{ fontSize: '2.4rem', fontWeight: 800, margin: 0 }}>Carga Manual de Tiempos</h1>
                        <p style={{ color: '#94a3b8', margin: '0.3rem 0 0 0' }}>Módulo de emergencia para corregir o ingresar resultados manualmente.</p>
                    </div>
                </header>

                <div className="manual-timing-content">
                    <GestionResultadosSection 
                        viewMode="tiempos"
                        defaultTab="resultados"
                        isEmbedded={false}
                    />
                </div>

                <div className="alert-msg info" style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <span style={{ fontSize: '1.5rem' }}>💡</span>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                        <strong>Tip de Emergencia:</strong> Usá este panel si el sistema de cronometraje automático falla. Los cambios aquí son directos y afectan a la base de datos oficial.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ManualTiming;
