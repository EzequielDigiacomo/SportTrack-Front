import React from 'react';
import GestionResultadosSection from '../../components/SharedSections/GestionResultadosSection';
import './Judges.css';

const ManualTiming = () => {
    return (
        <div className="manual-timing-page fade-in">
            <div className="manual-timing-content">
                <GestionResultadosSection
                    viewMode="tiempos"
                    defaultTab="resultados"
                    isEmbedded={false}
                    isManualTiming
                />
            </div>

            <div className="alert-msg info manual-timing-tip">
                <span aria-hidden="true">💡</span>
                <p>
                    <strong>Tip de Emergencia:</strong> Usá este panel si el sistema de cronometraje automático falla. Los cambios aquí son directos y afectan a la base de datos oficial.
                </p>
            </div>
        </div>
    );
};

export default ManualTiming;
