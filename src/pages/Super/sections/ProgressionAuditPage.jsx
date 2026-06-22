import React from 'react';
import ProgressionAudit from '../../../components/Common/ProgressionAudit';
import { FileText } from 'lucide-react';

const ProgressionAuditPage = () => {
    return (
        <div className="gestion-section fade-in">
            <div className="section-header">
                <div>
                    <h2 className="gradient-text">
                        <FileText size={28} className="inline-icon mr-2" />
                        Auditoría de Progresión
                    </h2>
                    <p className="section-subtitle">
                        Rastreo de pasajes y asignación de carriles del motor de reglas.
                    </p>
                </div>
            </div>

            <div className="section-content">
                <ProgressionAudit eventoPrueba={{ nombre: 'K1 1000m Men', planProgresionAsignado: 'Plan D2' }} />
            </div>
        </div>
    );
};

export default ProgressionAuditPage;
