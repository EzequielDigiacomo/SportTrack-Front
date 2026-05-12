import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, ArrowLeft, Zap, Award, Smartphone, Globe, Shield, Activity, Timer, Users, Building2 } from 'lucide-react';
import './PlanDetails.css';

const PLAN_DATA = {
    bronce: {
        id: 'bronce',
        name: 'Plan Bronce',
        price: 'Digitalización',
        icon: <Award size={48} />,
        colorClass: 'bronze',
        description: 'Ideal para federaciones que recién comienzan su camino digital y necesitan organizar su base de datos sin complicaciones.',
        longDesc: 'El Plan Bronce está diseñado para eliminar el caos de las planillas de papel. Permite centralizar la nómina de atletas y clubes, asegurando que la información sea precisa y esté siempre disponible.',
        features: [
            { title: 'Gestión de Nómina', desc: 'Soporte para hasta 1,000 atletas con historial básico.' },
            { title: 'Red de Clubes', desc: 'Vincula hasta 15 clubes bajo tu federación.' },
            { title: 'Resultados Live', desc: 'Publica los tiempos finales automáticamente en la web.' },
            { title: 'Reportes PDF', desc: 'Genera clasificaciones oficiales listas para imprimir.' }
        ],
        cta: 'Comenzar con Bronce'
    },
    plata: {
        id: 'plata',
        name: 'Plan Plata',
        price: 'Gestión Activa',
        icon: <Smartphone size={48} />,
        colorClass: 'silver',
        description: 'La herramienta definitiva para la operación en campo. Pensado para federaciones con alta actividad competitiva.',
        longDesc: 'Con el Plan Plata, la federación toma el control total del evento desde dispositivos móviles. Olvídate de los walkie-talkies para dictar tiempos: los jueces cargan todo directamente al sistema.',
        features: [
            { title: 'Dashboards para Jueces', desc: 'Paneles específicos para Largador y Juez de Llegada.' },
            { title: 'App Móvil Pública', desc: 'Tus seguidores pueden seguir cada regata desde su celular.' },
            { title: 'Gestión Expandida', desc: 'Hasta 4,000 atletas y 40 clubes afiliados.' },
            { title: 'Validación en Vivo', desc: 'Verificación de tripulaciones antes de cada largada.' }
        ],
        cta: 'Elegir Plan Plata'
    },
    oro: {
        id: 'oro',
        name: 'Plan Oro',
        price: 'Tecnología Real-Time',
        icon: <Zap size={48} />,
        colorClass: 'gold',
        description: 'Élite tecnológica para competencias nacionales e internacionales. Máxima velocidad y precisión absoluta.',
        longDesc: 'El Plan Oro utiliza tecnología SignalR para una sincronización milimétrica. Lo que sucede en el agua se refleja en las pantallas del mundo en menos de 200 milisegundos.',
        features: [
            { title: 'SignalR Full Sync', desc: 'Sincronización instantánea entre todos los dispositivos del staff.' },
            { title: 'Atletas Ilimitados', desc: 'Sin restricciones de crecimiento para tu federación.' },
            { title: 'Exportación Avanzada', desc: 'Formatos Excel, CSV y JSON para análisis estadístico profundo.' },
            { title: 'Auditoría Forense', desc: 'Registro de cada cambio realizado en los tiempos para máxima transparencia.' }
        ],
        cta: 'Contactar para Plan Oro'
    }
};

const PlanDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const plan = PLAN_DATA[id?.toLowerCase()] || PLAN_DATA.plata;

    return (
        <div className="plan-details-page fade-in">
            <div className="container">
                <button className="btn-back-home" onClick={() => navigate('/')}>
                    <ArrowLeft size={20} /> Volver al Inicio
                </button>

                <div className="plan-detail-hero">
                    <div className={`plan-detail-icon ${plan.colorClass}`}>
                        {plan.icon}
                    </div>
                    <div className="plan-detail-title">
                        <span className="badge-category">{plan.price}</span>
                        <h1>{plan.name}</h1>
                        <p className="hero-subtitle">{plan.description}</p>
                    </div>
                </div>

                <div className="plan-detail-grid">
                    <div className="plan-main-info glass-effect">
                        <h2>¿Qué incluye este plan?</h2>
                        <p className="long-description">{plan.longDesc}</p>
                        
                        <div className="features-list-detailed">
                            {plan.features.map((f, i) => (
                                <div key={i} className="feature-item-detail">
                                    <div className="feature-dot"><Check size={16} /></div>
                                    <div className="feature-text">
                                        <strong>{f.title}</strong>
                                        <p>{f.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="plan-cta-sidebar glass-effect">
                        <div className="sidebar-header">
                            <h3>Impulsa tu Federación</h3>
                            <p>Eleva el estándar de tus competencias hoy mismo.</p>
                        </div>
                        <div className="sidebar-stats">
                            <div className="s-stat"><Users size={18} /> Nómina Digital</div>
                            <div className="s-stat"><Building2 size={18} /> Control de Clubes</div>
                            <div className="s-stat"><Globe size={18} /> Resultados Globales</div>
                        </div>
                        <button className={`btn-plan-cta ${plan.colorClass}`}>
                            {plan.cta}
                        </button>
                        <p className="sidebar-footer">Soporte técnico incluido en todos los planes.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlanDetails;
