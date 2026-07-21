import React from 'react';
import GestionResultadosSection from '../../components/SharedSections/GestionResultadosSection';
import { Info } from 'lucide-react';
import './JuezControl.css';

const JuezControlDashboard = () => {
    const [isVisible, setIsVisible] = React.useState(true);
    const [isExiting, setIsExiting] = React.useState(false);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            handleClose();
        }, 10000);
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => setIsVisible(false), 500);
    };

    return (
        <div className="jc-layout">
            {isVisible && (
                <div className={`jc-info-banner fade-in ${isExiting ? 'jc-banner-exit' : ''}`} style={{ position: 'relative' }}>
                    <span className="jc-info-icon" style={{ display: 'inline-flex', alignItems: 'center' }}><Info size={16} /></span>
                    <p>
                        Acceso de <strong>Juez de Control</strong>: podés consultar el cronograma,
                        ver la grilla de largada de cada serie, registrar y validar resultados oficiales.
                        La carga manual de tiempos solo está disponible para administradores.
                    </p>
                    <button
                        onClick={handleClose}
                        style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            opacity: 0.5,
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        ✕
                    </button>
                </div>
            )}

            <GestionResultadosSection
                viewMode="resultados"
                defaultTab="startList"
                isEmbedded={true}
            />
        </div>
    );
};

export default JuezControlDashboard;
